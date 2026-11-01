"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitWelcome, type WelcomeResult } from "~/app/(app)/welcome/actions";
import type { Suggestion } from "~/api/schemas/refs";
import type { WelcomeFormData } from "~/api/schemas/welcome";
import { useFormContext } from "~/components/form/context";
import QuestionComponent from "~/components/form/questionBase";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { plainLabel } from "~/lib/refs/conditions";

interface Question {
  questionId: number;
  questionText: string;
  queryKey: WelcomeFormData["submission"][number]["queryKey"];
}

// Same five questions and ids as the Remix form.
const questions: Question[] = [
  { questionId: 5, questionText: "What cuisines do you enjoy?", queryKey: "cuisines" },
  { questionId: 5555, questionText: "Do you follow a particular diet?", queryKey: "diets" },
  { questionId: 1, questionText: "Do you have a medical condition?", queryKey: "icd10cm" },
  { questionId: 11, questionText: "Any allergies or foods you avoid?", queryKey: "conditions" },
  { questionId: 555, questionText: "What do you usually spend per meal?", queryKey: "price" },
];

// Onboarding stepper: one question per screen, progress, review.
export function OnboardingStepper() {
  const { state, goToNextStep, goToPreviousStep, clearCurrentDraft } = useFormContext();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<Extract<WelcomeResult, { ok: false }> | null>(null);

  const total = questions.length;
  const step = Math.min(state.currentStep, total); // total == review
  const isReview = step >= total;
  const progress = Math.round((Math.min(step, total) / total) * 100);

  const payload: WelcomeFormData = {
    submission: state.answers
      .map((q) => {
        const info = questions.find((x) => x.questionId === q.questionId);
        return info ? { questionId: q.questionId, queryKey: info.queryKey, answers: q.answers } : null;
      })
      .filter((x): x is WelcomeFormData["submission"][number] => x !== null),
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitWelcome(payload);
      if (result && !result.ok) {
        setError(result);
        toast.error(result.message);
      } else {
        clearCurrentDraft();
      }
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-reading-max flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="font-data text-data-caps uppercase text-ink-muted">
          {isReview ? "Review" : `Step ${step + 1} of ${total}`}
        </p>
        <div
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-1 w-full overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <h1 className="font-display text-display-md text-ink">
          {isReview ? "Here's what we'll check against" : "Tell us about you"}
        </h1>
      </header>

      {isReview ? (
        <section className="flex flex-col gap-6 rounded-lg border border-line bg-surface p-6">
          {questions.map((q) => {
            const answers = (state.answers.find((a) => a.questionId === q.questionId)?.answers ??
              []) as Suggestion[];
            return (
              <div key={q.questionId} className="flex flex-col gap-2">
                <h2 className="text-heading-sm text-ink">{q.questionText}</h2>
                {answers.length === 0 ? (
                  <p className="text-body-sm text-ink-muted">Skipped</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {answers.map((a, i) => (
                      <li key={i}>
                        <Badge>{plainLabel(a.code, a.name ?? a.value)}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {error && (
            <div role="alert" className="text-body-sm text-avoid">
              <p>{error.message}</p>
              {error.waking && <a href="/welcome" className="underline">Reload and try again</a>}
            </div>
          )}
        </section>
      ) : (
        <QuestionComponent {...questions[step]} />
      )}

      {/* Pinned to the bottom on phones; inline on larger screens. */}
      <div className="fixed inset-x-0 bottom-16 z-30 flex gap-3 border-t border-line bg-surface px-gutter-mobile py-3 md:static md:border-0 md:bg-transparent md:px-0 md:py-0">
        <Button
          type="button"
          variant="tertiary"
          onClick={goToPreviousStep}
          disabled={step === 0 || pending}
        >
          Back
        </Button>
        {isReview ? (
          <Button type="button" onClick={submit} disabled={pending} aria-busy={pending} className="ml-auto">
            {pending ? "Saving…" : "Save profile"}
          </Button>
        ) : (
          <Button type="button" onClick={goToNextStep} className="ml-auto">
            {step === total - 1 ? "Review" : "Continue"}
          </Button>
        )}
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
    </div>
  );
}
