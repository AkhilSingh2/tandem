"use client";

import { useEffect, useState } from "react";
import { readTitle, setTitle } from "@/lib/board";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-provider";
import { PresenceStack } from "@/components/workspace/presence";
import { useRoom, type CursorPoint } from "@/components/workspace/room-provider";
import { useDocSlice } from "@/components/workspace/use-doc";
import { roomHref } from "@/lib/demo/static-demo";

const TABS: Array<{ id: CursorPoint["surface"]; label: string }> = [
  { id: "pipeline", label: "Pipeline" },
  { id: "brief", label: "Brief" },
  { id: "sketch", label: "Sketch" },
];

export function Topbar({
  roomId,
  surface,
  onSurface,
}: {
  roomId: string;
  surface: CursorPoint["surface"];
  onSurface: (surface: CursorPoint["surface"]) => void;
}) {
  const { doc, undoManager, status, user, setName, embed } = useRoom();
  const title = useDocSlice(doc, "title", readTitle);
  const [copied, setCopied] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const sync = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };
    sync();
    undoManager.on("stack-item-added", sync);
    undoManager.on("stack-item-popped", sync);
    return () => {
      undoManager.off("stack-item-added", sync);
      undoManager.off("stack-item-popped", sync);
    };
  }, [undoManager]);

  const share = async () => {
    const url = `${window.location.origin}${roomHref(roomId, {}, true)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <header className="flex flex-col gap-2 border-b border-line px-3 py-2 lg:flex-row lg:items-center lg:px-4">
      <div className="flex min-w-0 items-center gap-3 lg:flex-1">
        {embed ? null : <Brand />}
        <label className="min-w-0 flex-1">
          <span className="sr-only">Room title</span>
          <input
            className="w-full min-w-0 bg-transparent font-display text-lg outline-none"
            value={title}
            aria-label="Room title"
            onChange={(event) => setTitle(doc, event.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
      <div role="tablist" aria-label="Workspace" className="flex rounded-full border border-line bg-elev p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={surface === tab.id}
            aria-controls={`panel-${tab.id}`}
            className={`rounded-full px-3 py-1.5 text-sm ${surface === tab.id ? "bg-ink text-bg" : "text-muted"}`}
            onClick={() => onSurface(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className="btn btn-ghost btn-tiny" onClick={() => undoManager.undo()} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="btn btn-ghost btn-tiny" onClick={() => undoManager.redo()} disabled={!canRedo}>
          Redo
        </button>
      </div>
      <Status status={status} />
      <PresenceStack />
      <label className="sr-only" htmlFor="your-name">
        Your name
      </label>
      <input
        id="your-name"
        className="w-28 shrink-0 rounded-full border border-line bg-sunken px-3 py-1.5 text-sm"
        value={user.name}
        aria-label="Your name"
        maxLength={40}
        onChange={(event) => setName(event.target.value)}
      />
      <button type="button" className="btn btn-primary btn-tiny" onClick={() => void share()}>
        {copied ? "Copied" : "Share"}
      </button>
      <ThemeToggle />
      </div>
    </header>
  );
}

function Status({ status }: { status: "connecting" | "connected" | "disconnected" }) {
  const label = status === "connected" ? "Live" : status === "connecting" ? "Connecting" : "Offline";
  const tone = status === "connected" ? "bg-good" : status === "connecting" ? "bg-warn" : "bg-faint";
  return (
    <span data-testid="connection" data-status={status} className="inline-flex items-center gap-1.5 text-xs text-muted" role="status">
      <span className={`size-2 rounded-full ${tone}`} aria-hidden />
      {label}
    </span>
  );
}
