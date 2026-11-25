"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6">
      <h1 className="font-display text-4xl">The room hit a snag.</h1>
      <p className="text-muted">The board is still on this machine. Try the connection again.</p>
      <button type="button" className="btn btn-primary self-start" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
