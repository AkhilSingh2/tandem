"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { InvalidRoom, RoomFallback } from "@/components/workspace/fallback";
import { WorkspaceClient } from "@/components/workspace/workspace-client";
import { STATIC_DEMO } from "@/lib/demo/static-demo";
import { isRoomId } from "@/lib/room";

/** /room/?id=… — the room route for the static demo build, which has no dynamic routes. */
export default function RoomByQueryPage() {
  return (
    <Suspense fallback={<RoomFallback />}>
      <RoomByQuery />
    </Suspense>
  );
}

function RoomByQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";

  useEffect(() => {
    if (STATIC_DEMO || !isRoomId(id)) return;
    const rest = new URLSearchParams(params.toString());
    rest.delete("id");
    const search = rest.toString();
    router.replace(`/room/${id}${search ? `?${search}` : ""}`);
  }, [id, params, router]);

  if (!isRoomId(id)) return <InvalidRoom />;
  if (!STATIC_DEMO) return <RoomFallback />;
  return (
    <WorkspaceClient
      roomId={id}
      initialName={params.get("name") ?? undefined}
      seed={params.get("seed") === "1"}
      embed={params.get("embed") === "1"}
    />
  );
}
