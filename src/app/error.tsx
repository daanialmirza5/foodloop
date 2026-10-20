"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Something went wrong</h1>
      <p className="mt-2 text-muted">The error has been logged. Please try again.</p>
      <button onClick={reset} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
