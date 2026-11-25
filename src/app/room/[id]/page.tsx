import { Suspense } from "react";
import { isRoomId, singleParam } from "@/lib/room";
import { InvalidRoom, RoomFallback } from "@/components/workspace/fallback";
import { WorkspaceClient } from "@/components/workspace/workspace-client";

export const metadata = {
  title: "Room · Tandem",
};

export default function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<RoomFallback />}>
      <RoomGate params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function RoomGate({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!isRoomId(id)) return <InvalidRoom />;
  return (
    <WorkspaceClient
      roomId={id}
      initialName={singleParam(query.name)}
      seed={singleParam(query.seed) === "1"}
      embed={singleParam(query.embed) === "1"}
    />
  );
}
