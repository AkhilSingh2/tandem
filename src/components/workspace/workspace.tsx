"use client";

import { useEffect, useRef, useState } from "react";
import { Kanban } from "@/components/board/kanban";
import { CardDrawer } from "@/components/board/card-drawer";
import { Brief } from "@/components/brief/brief";
import { Sketch } from "@/components/sketch/sketch";
import { LiveCursors } from "@/components/workspace/presence";
import { RoomProvider, useRoom, type CursorPoint } from "@/components/workspace/room-provider";
import { Topbar } from "@/components/workspace/topbar";

export function Workspace({
  roomId,
  initialName,
  seed,
  embed,
}: {
  roomId: string;
  initialName?: string;
  seed: boolean;
  embed: boolean;
}) {
  return (
    <RoomProvider roomId={roomId} initialName={initialName} seed={seed} embed={embed}>
      <WorkspaceShell roomId={roomId} embed={embed} />
    </RoomProvider>
  );
}

function WorkspaceShell({ roomId, embed }: { roomId: string; embed: boolean }) {
  const { user, status, undoManager, setCursor } = useRoom();
  const [surface, setSurface] = useState<CursorPoint["surface"]>("pipeline");
  const [openCard, setOpenCard] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = `${user.name} · Tandem`;
    return () => {
      document.title = previous;
    };
  }, [user.name]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoManager.undo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        undoManager.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoManager]);

  const track = (event: React.PointerEvent) => {
    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0 || bounds.height === 0) return;
    setCursor({
      xPct: clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100),
      yPct: clamp(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100),
      surface,
    });
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      {embed ? (
        <p className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-xs text-muted">
          <span className="size-2 rounded-full" style={{ background: user.color }} aria-hidden />
          {user.name} · this pane is a real client
        </p>
      ) : null}
      <Topbar roomId={roomId} surface={surface} onSurface={setSurface} />
      {status === "disconnected" ? (
        <p className="bg-warn/15 px-4 py-2 text-sm text-ink" role="status">
          Offline. Edits stay in this browser and merge when the socket reconnects.
        </p>
      ) : null}
      <div
        ref={surfaceRef}
        className="relative min-h-0 flex-1"
        onPointerMove={track}
        onPointerLeave={() => setCursor(null)}
      >
        <section
          role="tabpanel"
          id="panel-pipeline"
          aria-labelledby="tab-pipeline"
          hidden={surface !== "pipeline"}
          className="h-full"
        >
          <Kanban onOpen={setOpenCard} />
          <CardDrawer cardId={surface === "pipeline" ? openCard : null} onClose={() => setOpenCard(null)} />
        </section>
        <section role="tabpanel" id="panel-brief" aria-labelledby="tab-brief" hidden={surface !== "brief"} className="h-full">
          <Brief />
        </section>
        <section role="tabpanel" id="panel-sketch" aria-labelledby="tab-sketch" hidden={surface !== "sketch"} className="h-full">
          <Sketch />
        </section>
        <LiveCursors surface={surface} />
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
