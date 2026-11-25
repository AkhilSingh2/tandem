"use client";

import dynamic from "next/dynamic";

const DemoSplit = dynamic(() => import("@/components/demo/demo-split").then((mod) => mod.DemoSplit), {
  ssr: false,
  loading: () => (
    <main id="main" className="grid min-h-dvh place-items-center px-6 text-muted">
      Opening two clients…
    </main>
  ),
});

export function DemoClient() {
  return <DemoSplit />;
}
