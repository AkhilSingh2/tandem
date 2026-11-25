import Link from "next/link";
import { Brand } from "@/components/brand";

export function RoomFallback({ label = "Opening the room" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <Brand />
        <p className="text-sm text-muted">{label}</p>
      </div>
      <div className="grid flex-1 grid-flow-col gap-3 overflow-hidden px-4 pb-6 auto-cols-[minmax(220px,1fr)]">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="panel h-72 animate-pulse bg-elev/70" />
        ))}
      </div>
    </div>
  );
}

export function InvalidRoom() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6">
      <p className="text-sm font-medium tracking-wide text-accent-text uppercase">Room link</p>
      <h1 className="font-display text-4xl">That room id is not one Tandem will open.</h1>
      <p className="text-muted">Room links are short codes, like the ones created from the start page.</p>
      <Link className="btn btn-primary self-start" href="/">
        Back home
      </Link>
    </main>
  );
}
