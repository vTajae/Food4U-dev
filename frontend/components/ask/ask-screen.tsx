"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import type { SearchResultFood } from "~/api/schemas/suggestion";
import { AskBox } from "~/components/ask/ask-box";
import { RecommendationCard } from "~/components/results/recommendation-card";
import { EmptyResults, ResultsSkeleton } from "~/components/results/states";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { BACKEND_WAKING_MESSAGE } from "~/lib/backend-messages";
import { cn } from "~/lib/utils";

type Suggestion = { label: string; action: string; queryKey: string; text: string };

// The former three red ActionButtons, as suggestion chips.
const suggestions: Suggestion[] = [
  { label: "Suggest a meal", action: "suggest", queryKey: "randomMeal", text: "I'm hungry" },
  { label: "Find a recipe", action: "recipie", queryKey: "newRecipie", text: "Let's cook something" },
  { label: "Which diets fit me?", action: "diet", queryKey: "dietSuggest", text: "What diets support my eating habits?" },
];

type Status = "idle" | "loading" | "done" | "error";
type Query = { action: string; queryKey: string; text: string };

export function AskScreen({ profileChips }: { profileChips: string[] }) {
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<SearchResultFood[]>([]);

  const [failure, setFailure] = useState<{ message: string; retryable: boolean } | null>(null);
  const [lastQuery, setLastQuery] = useState<Query | null>(null);

  function showFailure(message: string, retryable: boolean) {
    setFailure({ message, retryable });
    setStatus("error");
    toast.error(message);
  }

  async function run(body: Query) {
    setStatus("loading");
    setFailure(null);
    setLastQuery(body);
    try {
      const fd = new FormData();
      fd.set("action", body.action);
      fd.set("queryKey", body.queryKey);
      fd.set("query", body.text);
      const res = await fetch("/api/suggestion", { method: "POST", body: fd });
      const data = (await res.json()) as { meal?: SearchResultFood[]; error?: string; retryable?: boolean };
      if (!res.ok) {
        showFailure(data?.error ?? "Couldn't get meal ideas. Please try again.", res.status !== 401 && data?.retryable !== false);
        return;
      }
      if (!Array.isArray(data?.meal)) {
        showFailure("Couldn't get meal ideas. Please try again.", true);
        return;
      }
      setResults(data.meal);
      setStatus("done");
    } catch (error) {
      showFailure(error instanceof TypeError ? BACKEND_WAKING_MESSAGE : "Couldn't get meal ideas. Please try again.", true);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="mx-auto flex w-full max-w-reading-max flex-col gap-5">
        <h1 className="font-display text-display-md text-ink md:text-display-lg">
          What should I eat?
        </h1>

        <AskBox
          busy={status === "loading"}
          onAsk={(query) => run({ action: "meal", queryKey: "general", text: query })}
        />

        <ul aria-label="Suggestions" className="-mx-gutter-mobile flex gap-2 overflow-x-auto px-gutter-mobile pb-1 md:mx-0 md:flex-wrap md:px-0">
          {suggestions.map((s) => (
            <li key={s.action} className="shrink-0">
              <button
                type="button"
                disabled={status === "loading"}
                onClick={() => run(s)}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-surface px-4 font-body text-label-sm text-ink transition-colors hover:border-line-strong hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
                )}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>

        {profileChips.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
            <span>Your profile:</span>
            {profileChips.map((chip) => (
              <Badge key={chip}>{chip}</Badge>
            ))}
            <Link href="/welcome" className="text-primary underline-offset-4 hover:underline">
              Edit
            </Link>
          </p>
        )}
      </section>

      <section aria-live="polite" className="flex flex-col gap-4">
        {status === "loading" && <ResultsSkeleton />}
        {status === "idle" && <EmptyResults />}
        {status === "error" && failure && (
          <div role="alert" className="mx-auto flex w-full max-w-reading-max flex-col items-start gap-4 rounded-lg border border-care bg-care-tint p-6 text-ink">
            <p className="text-body-md">{failure.message}</p>
            {failure.retryable && lastQuery && (
              <Button variant="secondary" onClick={() => run(lastQuery)}>Retry</Button>
            )}
          </div>
        )}
        {status === "done" && results.length === 0 && (
          <div className="rounded-lg border border-line bg-surface px-6 py-10 text-center">
            <p className="text-heading-sm text-ink">No matches for that</p>
            <p className="mt-1 text-body-md text-ink-muted">Try different words, or one of the suggestions above.</p>
          </div>
        )}
        {status === "done" && results.length > 0 && (
          <>
            <h2 className="font-data text-data-caps uppercase text-ink-muted">
              {results.length} {results.length === 1 ? "suggestion" : "suggestions"}
            </h2>
            <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {results.map((item, index) => (
                <li key={item.fdcId ?? index}>
                  <RecommendationCard item={item} index={index} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
