import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import type { IncomingMessage, ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { isRoomId } from "../src/lib/room";
import { openStore, type DocumentStore } from "./persistence";

export type CollabServer = {
  port: number;
  url: string;
  httpUrl: string;
  store: DocumentStore;
  close: () => Promise<void>;
};

export async function createCollabServer(options: {
  port?: number;
  host?: string;
  databasePath?: string;
  databaseUrl?: string;
  debounce?: number;
  quiet?: boolean;
} = {}): Promise<CollabServer> {
  const store = await openStore({
    databasePath: options.databasePath,
    databaseUrl: options.databaseUrl,
  });
  const port = options.port ?? Number(process.env.WS_PORT ?? 1234);
  const host = options.host ?? process.env.WS_HOST ?? "0.0.0.0";
  const debounce = options.debounce ?? 400;

  const server = new Server({
    port,
    address: host,
    quiet: options.quiet ?? true,
    stopOnSignals: false,
    debounce,
    maxDebounce: Math.max(debounce * 5, 1000),
    unloadImmediately: true,
    extensions: [
      {
        async onLoadDocument({ documentName }: { documentName: string }) {
          if (!isRoomId(documentName)) {
            throw new Error("Invalid room id");
          }
        },
      },
      new Database({
        fetch: async ({ documentName }) => {
          const state = await store.load(documentName);
          return state ? Buffer.from(state) : null;
        },
        store: async ({ documentName, state }) => {
          await store.save(documentName, new Uint8Array(state));
        },
      }),
    ],
  });

  const original = server.requestHandler.bind(server);
  server.httpServer.removeAllListeners("request");
  server.httpServer.on("request", (request: IncomingMessage, response: ServerResponse) => {
    const pathname = request.url?.split("?")[0];
    if (pathname === "/health" || pathname === "/healthz") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, service: "tandem-ws", persistence: store.kind }));
      return;
    }
    void original(request, response);
  });

  await server.listen(port);
  const actualPort = server.address.port;

  return {
    port: actualPort,
    url: `ws://127.0.0.1:${actualPort}`,
    httpUrl: `http://127.0.0.1:${actualPort}`,
    store,
    async close() {
      await server.destroy();
      await store.close();
    },
  };
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  createCollabServer()
    .then((server) => {
      console.log(`Tandem websocket listening on ${server.url}`);
      console.log(`Health check ${server.httpUrl}/health`);
      console.log(`Persistence: ${server.store.label}`);
      const shutdown = () => {
        void server.close().then(() => process.exit(0));
      };
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
