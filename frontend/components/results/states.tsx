import { Skeleton } from "~/components/ui/skeleton";

// Three skeleton cards shaped like recommendation cards, plus a polite status line.
export function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <p role="status" className="text-body-sm text-ink-muted">
        Finding meal ideas…
      </p>
      <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="mt-2 flex gap-3">
              <Skeleton className="h-11 w-32 rounded-md" />
              <Skeleton className="h-11 w-28 rounded-md" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Empty state: an invitation to act, with one small single-color line drawing.
export function EmptyResults() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 96 64"
        className="h-16 w-24 text-ink-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 40c0 11 18 18 40 18s40-7 40-18H8Z" />
        <path d="M14 40c2-6 9-10 16-12" />
        <path d="M48 12c-6 0-10 4-10 9h20c0-5-4-9-10-9Z" />
        <path d="M30 30c6-4 12-6 18-6s12 2 18 6" />
        <path d="M62 24c3-4 7-6 12-6" />
        <path d="M56 8v4M48 4v6M40 8v4" />
      </svg>
      <div className="flex flex-col gap-1">
        <p className="text-heading-sm text-ink">No suggestions yet</p>
        <p className="max-w-sm text-body-md text-ink-muted">
          Ask a question above, or tap one of the suggestions to get started.
        </p>
      </div>
    </div>
  );
}
