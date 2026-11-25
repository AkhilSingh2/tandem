"use client";

import dynamic from "next/dynamic";
import { RoomFallback } from "@/components/workspace/fallback";

const Workspace = dynamic(() => import("@/components/workspace/workspace").then((mod) => mod.Workspace), {
  ssr: false,
  loading: () => <RoomFallback />,
});

export function WorkspaceClient(props: {
  roomId: string;
  initialName?: string;
  seed: boolean;
  embed: boolean;
}) {
  return <Workspace {...props} />;
}
