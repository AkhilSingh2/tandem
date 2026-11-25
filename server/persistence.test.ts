import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import { openSqliteStore } from "./persistence";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("sqlite persistence", () => {
  it("round-trips a Yjs document snapshot", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tandem-db-"));
    directories.push(dir);
    const file = path.join(dir, "nested", "tandem.sqlite");
    const doc = new Y.Doc();
    doc.getText("brief").insert(0, "persisted offline");
    const snapshot = Y.encodeStateAsUpdate(doc);

    const store = openSqliteStore(file);
    await store.save("rdemo1234", snapshot);
    await store.close();

    const again = openSqliteStore(file);
    const loaded = await again.load("rdemo1234");
    expect(await again.load("missing-room")).toBeNull();
    await again.close();

    const restored = new Y.Doc();
    Y.applyUpdate(restored, loaded!);
    expect(restored.getText("brief").toString()).toBe("persisted offline");
  });
});
