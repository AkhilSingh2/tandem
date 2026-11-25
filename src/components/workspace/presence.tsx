"use client";

import { useEffect, useState } from "react";
import { initials } from "@/lib/users";
import { useRoom, type CursorPoint, type StrokeDraft } from "@/components/workspace/room-provider";

type AwarenessLike = {
  clientID: number;
  getStates: () => Map<number, { user?: { name?: string; color?: string }; cursor?: CursorPoint | null; draft?: StrokeDraft | null }>;
  on: (event: "change", fn: () => void) => void;
  off: (event: "change", fn: () => void) => void;
};

export type Peer = {
  clientId: number;
  name: string;
  color: string;
  self: boolean;
  cursor: CursorPoint | null;
  draft: StrokeDraft | null;
};

export function usePeers(): Peer[] {
  const { provider } = useRoom();
  const [peers, setPeers] = useState<Peer[]>([]);

  useEffect(() => {
    const awareness = provider.awareness as AwarenessLike | null;
    if (!awareness) return;
    let frame = 0;
    const publish = () => setPeers(readPeers(awareness));
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(publish);
    };
    awareness.on("change", onChange);
    publish();
    return () => {
      awareness.off("change", onChange);
      cancelAnimationFrame(frame);
    };
  }, [provider]);

  return peers;
}

export function PresenceStack() {
  const peers = usePeers();
  return (
    <ul className="flex items-center pl-1" aria-label="People in this room">
      {peers.map((peer) => (
        <li key={peer.clientId} className="-ml-1.5 first:ml-0">
          <span
            className="grid size-8 place-items-center rounded-full border-2 border-bg text-[11px] font-semibold text-white"
            style={{ background: peer.color }}
            title={peer.self ? `${peer.name} (you)` : peer.name}
            aria-label={peer.self ? `${peer.name}, you, online` : `${peer.name}, online`}
          >
            {initials(peer.name)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LiveCursors({ surface }: { surface: CursorPoint["surface"] }) {
  const peers = usePeers();
  const remote = peers.filter((peer) => !peer.self && peer.cursor?.surface === surface && peer.cursor);
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {remote.map((peer) => (
        <div
          key={peer.clientId}
          className="cursor-chip absolute"
          style={{ left: `${peer.cursor!.xPct}%`, top: `${peer.cursor!.yPct}%` }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill={peer.color}>
            <path d="M2 1.5 14.5 8.2 8.4 9.4 6.2 15.2Z" />
          </svg>
          <span
            className="ml-3 -mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
            style={{ background: peer.color }}
          >
            {peer.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function readPeers(awareness: AwarenessLike): Peer[] {
  const peers: Peer[] = [];
  awareness.getStates().forEach((state, clientId) => {
    const record = state;
    if (!record.user?.name) return;
    peers.push({
      clientId,
      name: record.user.name,
      color: record.user.color || "#9a3412",
      self: clientId === awareness.clientID,
      cursor: record.cursor ?? null,
      draft: record.draft ?? null,
    });
  });
  return peers.sort((a, b) => Number(b.self) - Number(a.self) || a.name.localeCompare(b.name));
}
