"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { IndexeddbPersistence } from "y-indexeddb";
import type * as Y from "yjs";
import { ensureRootTypes, seedRoom } from "@/lib/board";
import { createId } from "@/lib/ids";
import { colorForUser, type PresenceUser } from "@/lib/users";
import { websocketUrl } from "@/lib/ws-url";
import { STATIC_DEMO } from "@/lib/demo/static-demo";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export type CursorPoint = {
  xPct: number;
  yPct: number;
  surface: "pipeline" | "brief" | "sketch";
};

export type StrokeDraft = {
  color: string;
  width: number;
  points: string;
};

type Handle = {
  doc: Y.Doc;
  provider: HocuspocusProvider;
  undoManager: Y.UndoManager;
  indexeddb: IndexeddbPersistence;
};

type RoomContextValue = {
  doc: Y.Doc;
  provider: HocuspocusProvider;
  undoManager: Y.UndoManager;
  status: ConnectionStatus;
  synced: boolean;
  user: PresenceUser;
  embed: boolean;
  setName: (name: string) => void;
  setCursor: (cursor: CursorPoint | null) => void;
  setDraft: (draft: StrokeDraft | null) => void;
};

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({
  roomId,
  initialName,
  seed,
  embed,
  children,
}: {
  roomId: string;
  initialName?: string;
  seed: boolean;
  embed: boolean;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<PresenceUser>(() => loadIdentity(embed, initialName));
  const [handle, setHandle] = useState<Handle | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [synced, setSynced] = useState(false);
  const userId = user.id;

  useEffect(() => {
    let cancelled = false;
    let provider: HocuspocusProvider | null = null;
    let indexeddb: IndexeddbPersistence | null = null;
    let doc: Y.Doc | null = null;

    const onStatus = ({ status: next }: { status: ConnectionStatus }) => {
      if (!cancelled) setStatus(next);
    };
    const onSynced = ({ state }: { state: boolean }) => {
      if (!cancelled) setSynced(state);
      if (state && seed && doc) seedRoom(doc);
    };

    void (async () => {
      const [Y, providerMod, idbMod] = await Promise.all([
        import("yjs"),
        import("@hocuspocus/provider"),
        import("y-indexeddb"),
      ]);
      if (cancelled) return;
      doc = new Y.Doc();
      ensureRootTypes(doc);
      const undoManager = new Y.UndoManager(doc, { captureTimeout: 500 });
      if (STATIC_DEMO) {
        // GitHub Pages build: no websocket server, so clients sync across tabs instead.
        const { BroadcastProvider } = await import("@/lib/demo/broadcast-provider");
        if (cancelled) {
          doc.destroy();
          return;
        }
        provider = new BroadcastProvider({ name: roomId, document: doc }) as unknown as HocuspocusProvider;
      } else {
        provider = new providerMod.HocuspocusProvider({
          url: websocketUrl(),
          name: roomId,
          document: doc,
        });
      }
      indexeddb = new idbMod.IndexeddbPersistence(`tandem:${roomId}:${userId}`, doc);
      provider.on("status", onStatus);
      provider.on("synced", onSynced);
      provider.setAwarenessField("cursor", null);
      provider.setAwarenessField("draft", null);
      if (provider.synced && seed) seedRoom(doc);
      if (!cancelled) setHandle({ doc, provider, undoManager, indexeddb });
    })();

    return () => {
      cancelled = true;
      provider?.off("status", onStatus);
      provider?.off("synced", onSynced);
      provider?.destroy();
      void indexeddb?.destroy();
      doc?.destroy();
      setHandle(null);
    };
  }, [roomId, seed, userId]);

  useEffect(() => {
    handle?.provider.setAwarenessField("user", user);
  }, [handle, user]);

  const setName = useCallback(
    (name: string) => {
      const nextName = name.slice(0, 40);
      const store = embed ? sessionStorage : localStorage;
      setUser((current) => {
        const next = { ...current, name: nextName, color: colorForUser(nextName || "Guest", current.id) };
        store.setItem("tandem:name", next.name);
        return next;
      });
    },
    [embed],
  );

  const setCursor = useCallback(
    (cursor: CursorPoint | null) => {
      if (!handle) return;
      const state = cursorState(handle.provider);
      if (cursor == null) {
        cancelAnimationFrame(state.frame);
        state.frame = 0;
        handle.provider.setAwarenessField("cursor", null);
        return;
      }
      state.pending = cursor;
      if (state.frame) return;
      state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        handle.provider.setAwarenessField("cursor", state.pending);
      });
    },
    [handle],
  );

  const setDraft = useCallback(
    (draft: StrokeDraft | null) => {
      handle?.provider.setAwarenessField("draft", draft);
    },
    [handle],
  );

  const value = useMemo<RoomContextValue | null>(() => {
    if (!handle) return null;
    return {
      doc: handle.doc,
      provider: handle.provider,
      undoManager: handle.undoManager,
      status,
      synced,
      user,
      embed,
      setName,
      setCursor,
      setDraft,
    };
  }, [embed, handle, setCursor, setDraft, setName, status, synced, user]);

  if (!value) {
    return <p className="px-6 py-10 text-muted">Connecting this room…</p>;
  }

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const value = useContext(RoomContext);
  if (!value) throw new Error("useRoom must be used inside a room");
  return value;
}

const cursorFrames = new WeakMap<object, { frame: number; pending: CursorPoint | null }>();

function cursorState(provider: object) {
  let state = cursorFrames.get(provider);
  if (!state) {
    state = { frame: 0, pending: null };
    cursorFrames.set(provider, state);
  }
  return state;
}

function loadIdentity(embed: boolean, initialName?: string): PresenceUser {
  const store = embed ? sessionStorage : localStorage;
  let id = store.getItem("tandem:uid");
  if (!id) {
    id = createId("user");
    store.setItem("tandem:uid", id);
  }
  const name = (initialName?.trim() || store.getItem("tandem:name") || "Akhil").slice(0, 40) || "Akhil";
  store.setItem("tandem:name", name);
  return { id, name, color: colorForUser(name, id) };
}
