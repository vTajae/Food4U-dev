"use server";

// Login / register server action (was the action in app/routes/_auth.login.tsx).
import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { z } from "zod";
import UserService from "~/api/services/userService";
import { commitSession, getSession, startSession } from "~/lib/session";

const credentials = z.object({
  username: z.string().email("Enter a valid email address.").trim(),
  password: z.string().min(6, "Use at least 6 characters.").trim(),
  actionType: z.enum(["login", "register"]),
});

export type AuthState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "registered"; message: string };

export async function authenticate(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    actionType: formData.get("actionType"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const { username, password, actionType } = parsed.data;
  const userService = new UserService(env);

  if (actionType === "register") {
    const result = await userService.registerUser({ username, password });
    if (!result.success) {
      return { status: "error", message: result.message };
    }
    const session = await getSession();
    session.data.welcome = { isComplete: false };
    await commitSession(session);
    return { status: "registered", message: "Account created. Log in to continue." };
  }

  const result = await userService.loginUser({ username, password }, env);
  if (!result.success || !result.user) {
    return { status: "error", message: result.message || "Invalid email or password." };
  }

  try {
    // Every sign-in gets a fresh session id (no session fixation). An anonymous
    // session's flags, such as the post-signup welcome step, carry over.
    const previous = await getSession();
    await startSession({ ...(previous.data.auth ? {} : previous.data), auth: result.user, token: result.token });
  } catch (error) {
    console.error("Sign-in could not start a session:", (error as Error).name);
    return { status: "error", message: "We couldn't sign you in right now. Please try again." };
  }
  // Login depends on D1 and the session store only. The backend profile is ensured by the dashboard,
  // which can show a proper "service unavailable" state if the backend is asleep.
  redirect("/dashboard");
}
