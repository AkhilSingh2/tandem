"use client";

import { useState } from "react";
import type * as Y from "yjs";
import { addComment, deleteComment, readComments } from "@/lib/board";
import { formatTime, type PresenceUser } from "@/lib/users";
import { useDocSlice } from "@/components/workspace/use-doc";

export function CommentThread({
  doc,
  threadId,
  user,
  label = "Comments",
}: {
  doc: Y.Doc;
  threadId: string;
  user: PresenceUser;
  label?: string;
}) {
  const comments = useDocSlice(doc, `comments:${threadId}`, (current) => readComments(current, threadId));
  const [body, setBody] = useState("");

  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{label}</h3>
      <ol className="flex flex-col gap-2">
        {comments.length === 0 ? <li className="text-sm text-faint">No comments yet.</li> : null}
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-2xl border border-line bg-sunken px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="size-2.5 rounded-full" style={{ background: comment.color }} aria-hidden />
              <span className="font-medium">{comment.author}</span>
              <time className="text-faint" dateTime={new Date(comment.createdAt).toISOString()}>
                {formatTime(comment.createdAt)}
              </time>
              {comment.author === user.name ? (
                <button
                  type="button"
                  className="ml-auto text-xs text-faint underline-offset-2 hover:underline"
                  onClick={() => deleteComment(doc, threadId, comment.id)}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-6 whitespace-pre-wrap">{comment.body}</p>
          </li>
        ))}
      </ol>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          addComment(doc, threadId, { author: user.name, color: user.color, body });
          setBody("");
        }}
      >
        <label className="text-sm text-muted" htmlFor={`comment-${threadId}`}>
          Write a comment
        </label>
        <textarea
          id={`comment-${threadId}`}
          className="field min-h-20 resize-y"
          value={body}
          maxLength={2000}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Leave a note for the other person"
        />
        <button type="submit" className="btn btn-primary btn-tiny self-start" disabled={!body.trim()}>
          Post comment
        </button>
      </form>
    </section>
  );
}
