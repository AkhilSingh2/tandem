import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";

type Message =
  | { kind: "hello" | "sync"; from: number; vector: Uint8Array }
  | { kind: "update"; from: number; update: Uint8Array }
  | { kind: "awareness"; from: number; update: Uint8Array };

/**
 * Stand-in for HocuspocusProvider in the static demo. Tabs and iframes on the same
 * origin sync the Yjs document and presence over a BroadcastChannel, so the
 * two-person demo still shows real CRDT merges without a websocket server.
 */
export class BroadcastProvider {
  readonly awareness: Awareness;
  synced = false;
  private readonly channel: BroadcastChannel;
  private readonly listeners = new Map<string, Set<(payload: never) => void>>();
  private readonly remote = Symbol("broadcast");
  private syncTimer = 0;

  constructor(private readonly options: { name: string; document: Y.Doc }) {
    const doc = options.document;
    this.awareness = new Awareness(doc);
    this.channel = new BroadcastChannel(`tandem-demo:${options.name}`);
    this.channel.onmessage = (event: MessageEvent<Message>) => this.receive(event.data);
    doc.on("update", this.onDocUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);
    window.addEventListener("beforeunload", this.leave);
    this.post({ kind: "hello", from: doc.clientID, vector: Y.encodeStateVector(doc) });
    queueMicrotask(() => this.emit("status", { status: "connected" }));
    // Peers answer the hello straight away; after a short wait, treat the room as synced.
    this.syncTimer = window.setTimeout(() => {
      this.synced = true;
      this.emit("synced", { state: true });
    }, 350);
  }

  on(event: string, listener: (payload: never) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: (payload: never) => void) {
    this.listeners.get(event)?.delete(listener);
  }

  setAwarenessField(key: string, value: unknown) {
    this.awareness.setLocalStateField(key, value);
  }

  destroy() {
    window.clearTimeout(this.syncTimer);
    this.leave();
    window.removeEventListener("beforeunload", this.leave);
    this.options.document.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    this.awareness.destroy();
    this.channel.close();
    this.listeners.clear();
  }

  private emit(event: string, payload: unknown) {
    for (const listener of this.listeners.get(event) ?? []) (listener as (value: unknown) => void)(payload);
  }

  private post(message: Message) {
    try {
      this.channel.postMessage(message);
    } catch {
      // Channel already closed.
    }
  }

  private readonly leave = () => {
    removeAwarenessStates(this.awareness, [this.options.document.clientID], "local");
  };

  private readonly onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this.remote) return;
    this.post({ kind: "update", from: this.options.document.clientID, update });
  };

  private readonly onAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this.remote) return;
    const changed = added.concat(updated, removed);
    this.post({ kind: "awareness", from: this.options.document.clientID, update: encodeAwarenessUpdate(this.awareness, changed) });
  };

  private receive(message: Message) {
    const doc = this.options.document;
    if (message.from === doc.clientID) return;
    if (message.kind === "hello" || message.kind === "sync") {
      // Send what the other side is missing.
      this.post({ kind: "update", from: doc.clientID, update: Y.encodeStateAsUpdate(doc, message.vector) });
      if (message.kind === "sync") return;
      // Ask the newcomer for anything we lack, and share who is here.
      this.post({ kind: "sync", from: doc.clientID, vector: Y.encodeStateVector(doc) });
      this.post({
        kind: "awareness",
        from: doc.clientID,
        update: encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys())),
      });
      return;
    }
    if (message.kind === "update") {
      Y.applyUpdate(doc, message.update, this.remote);
      return;
    }
    if (message.kind === "awareness") applyAwarenessUpdate(this.awareness, message.update, this.remote);
  }
}
