"use client";

import { useSyncExternalStore } from "react";
import { STATIC_DEMO } from "@/lib/demo/static-demo";

const subscribe = () => () => {};
const visible = () => STATIC_DEMO && new URLSearchParams(window.location.search).get("embed") !== "1";

/** Small fixed note on the hosted demo. Hidden inside the embedded panes of /demo. */
export function DemoNote() {
  const show = useSyncExternalStore(subscribe, visible, () => false);
  if (!show) return null;
  return (
    <div
      role="note"
      data-testid="demo-note"
      className="pointer-events-none fixed right-4 bottom-4 z-50 max-w-[calc(100vw-2rem)] rounded-full border border-line bg-elev px-3 py-2 text-xs text-muted shadow-[var(--shadow)]"
    >
      Demo mode · sample data, synced between tabs in your browser
    </div>
  );
}
