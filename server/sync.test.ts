import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { createCollabServer, type CollabServer } from "./index";

const cleanup: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((fn) => fn()));
});

async function startServer() {
  const dir = await mkdtemp(path.join(tmpdir(), "tandem-ws-"));
  const server = await createCollabServer({
    port: 0,
    host: "127.0.0.1",
    databasePath: path.join(dir, "tandem.sqlite"),
    debounce: 20,
    quiet: true,
  });
  cleanup.push(async () => {
    await server.close();
    await rm(dir, { recursive: true, force: true });
  });
  return server;
}

function connect(server: CollabServer, name: string, doc = new Y.Doc()) {
  const provider = new HocuspocusProvider({
    url: server.url,
    name,
    document: doc,
  });
  cleanup.push(async () => {
    provider.destroy();
  });
  return { provider, doc };
}

async function waitFor(predicate: () => boolean, label: string) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > 8000) {
      throw new Error(`Timed out waiting for ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("websocket sync", () => {
  it("answers the health check", async () => {
    const server = await startServer();
    const response = await fetch(`${server.httpUrl}/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, service: "tandem-ws", persistence: "sqlite" });
  });

  it("syncs two clients and keeps edits made while one is disconnected", async () => {
    const server = await startServer();
    const room = `room${Date.now().toString(36)}`;
    const left = connect(server, room);
    const right = connect(server, room);
    await waitFor(() => left.provider.synced && right.provider.synced, "initial sync");

    left.doc.getText("brief").insert(0, "Hello");
    await waitFor(() => right.doc.getText("brief").toString() === "Hello", "live insert");

    right.provider.disconnect();
    await waitFor(() => !right.provider.synced, "disconnect");
    left.doc.getText("brief").insert(5, " from Akhil");
    right.doc.getText("brief").insert(5, " from Maya");
    right.provider.connect();

    await waitFor(() => {
      const a = left.doc.getText("brief").toString();
      const b = right.doc.getText("brief").toString();
      return a === b && a.includes("Akhil") && a.includes("Maya") && a.startsWith("Hello");
    }, "offline merge");
  });

  it("reloads a room from sqlite after the server restarts", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tandem-restart-"));
    cleanup.push(() => rm(dir, { recursive: true, force: true }));
    const databasePath = path.join(dir, "tandem.sqlite");
    const room = "restartroom1";
    const first = await createCollabServer({
      port: 0,
      host: "127.0.0.1",
      databasePath,
      debounce: 20,
      quiet: true,
    });
    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({ url: first.url, name: room, document: doc });
    await waitFor(() => provider.synced, "restart sync");
    doc.getText("brief").insert(0, "still here");
    await waitFor(() => !provider.hasUnsyncedChanges, "stored locally on the client");
    provider.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await first.close();

    const second = await createCollabServer({
      port: 0,
      host: "127.0.0.1",
      databasePath,
      debounce: 20,
      quiet: true,
    });
    cleanup.push(() => second.close());
    const restored = new Y.Doc();
    const again = new HocuspocusProvider({ url: second.url, name: room, document: restored });
    cleanup.push(async () => {
      again.destroy();
    });
    await waitFor(() => restored.getText("brief").toString() === "still here", "reload");
    provider.destroy();
  });
});
