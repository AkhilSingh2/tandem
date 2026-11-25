"use client";

import { BRIEF_THREAD } from "@/lib/board";
import { CommentThread } from "@/components/comments";
import { CollaborativeEditor } from "@/components/editor";
import { useRoom } from "@/components/workspace/room-provider";

export function Brief() {
  const { doc, user } = useRoom();
  return (
    <div className="grid h-full min-h-0 gap-4 overflow-y-auto px-3 py-4 md:grid-cols-[minmax(0,1fr)_320px] md:px-5">
      <article className="panel min-h-[28rem] px-5 py-6 md:px-8">
        <p className="text-xs tracking-[0.18em] text-faint uppercase">Shared brief</p>
        <h2 className="mt-2 font-display text-4xl">The story you tell together</h2>
        <CollaborativeEditor
          ytext={doc.getText("brief")}
          label="Shared brief"
          testId="brief-editor"
          placeholder="Start the brief. Someone else can type in the same sentence."
          className="mt-6 font-display text-xl"
        />
      </article>
      <aside className="panel h-fit p-4">
        <CommentThread doc={doc} threadId={BRIEF_THREAD} user={user} label="Notes on the brief" />
      </aside>
    </div>
  );
}
