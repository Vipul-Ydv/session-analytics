export function Loading({ what }: { what: string }) {
  return <p className="py-10 text-muted">Loading {what}…</p>;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-line bg-surface p-4">
      <p className="font-medium">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm hover:border-ink">
          Try again
        </button>
      )}
    </div>
  );
}
