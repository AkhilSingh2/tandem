"use client";

import { useState } from "react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-provider";
import { randomString } from "@/lib/ids";
import { roomHref } from "@/lib/demo/static-demo";

export function DemoSplit() {
  const [room] = useState(() => `demo-${randomString(8)}`);
  const panes = [
    { name: "Akhil", seed: "1", caption: "Akhil's client" },
    { name: "Maya", seed: "0", caption: "Maya's client" },
  ];

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <Brand />
        <p className="max-w-xl text-sm text-muted">
          Two live clients, one room. Nothing is replayed — each pane has its own cursor, name, and Yjs document.
        </p>
        <div className="flex items-center gap-2">
          <a className="btn btn-ghost btn-tiny" href={roomHref(room, { name: "Akhil", seed: "1" }, true)}>
            Open single view
          </a>
          <ThemeToggle />
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1">
        {panes.map((pane) => (
          <figure key={pane.name} className="flex min-h-0 flex-col border-line md:border-r md:last:border-r-0">
            <figcaption className="px-3 py-1.5 text-xs tracking-wide text-faint uppercase">{pane.caption}</figcaption>
            <iframe
              title={`${pane.name}'s live Tandem client`}
              src={roomHref(room, { name: pane.name, seed: pane.seed, embed: "1" }, true)}
              className="min-h-0 w-full flex-1 border-0 bg-bg"
            />
          </figure>
        ))}
      </div>
    </div>
  );
}
