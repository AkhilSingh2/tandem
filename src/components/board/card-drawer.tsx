"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  cardNotes,
  deleteCard,
  ensureCardNotes,
  readCards,
  updateCard,
  type Priority,
} from "@/lib/board";
import { CommentThread } from "@/components/comments";
import { CollaborativeEditor } from "@/components/editor";
import { useRoom } from "@/components/workspace/room-provider";
import { useDocSlice } from "@/components/workspace/use-doc";

export function CardDrawer({ cardId, onClose }: { cardId: string | null; onClose: () => void }) {
  const { doc, user } = useRoom();
  const cards = useDocSlice(doc, "drawer-cards", readCards);
  const card = cards.find((item) => item.id === cardId) ?? null;
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!cardId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cardId, onClose]);

  return (
    <AnimatePresence>
      {cardId ? (
        <motion.div className="fixed inset-0 z-30 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="absolute inset-0 bg-ink/30" aria-label="Close role details" onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-dialog-title"
            className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-elev p-5 shadow-lift"
            initial={reduce ? false : { x: 28 }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: 28 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            {card ? (
              <CardForm cardId={card.id} company={card.company} onClose={onClose} />
            ) : (
              <div>
                <h2 id="card-dialog-title" className="font-display text-3xl">
                  This role was removed
                </h2>
                <button type="button" className="btn btn-ghost mt-4" onClick={onClose} autoFocus>
                  Close
                </button>
              </div>
            )}
            {card ? <CommentThread doc={doc} threadId={card.id} user={user} /> : null}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CardForm({ cardId, company, onClose }: { cardId: string; company: string; onClose: () => void }) {
  const { doc } = useRoom();
  const cards = useDocSlice(doc, `card-${cardId}`, readCards);
  const card = cards.find((item) => item.id === cardId);
  const [armed, setArmed] = useState(false);
  const notes = cardNotes(doc, cardId);

  if (!card) return null;

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs tracking-wide text-faint uppercase">Role</p>
        <button type="button" className="btn btn-ghost btn-tiny" onClick={onClose} autoFocus>
          Close
        </button>
      </div>
      <h2 id="card-dialog-title" className="font-display text-4xl leading-none">
        {company}
      </h2>
      <p className="text-xs text-faint">Short fields keep the latest edit. Notes and the brief merge character by character.</p>
      <Field label="Company" value={card.company} onChange={(value) => updateCard(doc, cardId, { company: value })} />
      <Field label="Role" value={card.role} onChange={(value) => updateCard(doc, cardId, { role: value })} />
      <Field label="Location" value={card.location} onChange={(value) => updateCard(doc, cardId, { location: value })} />
      <Field
        label="Compensation"
        value={card.compensation}
        onChange={(value) => updateCard(doc, cardId, { compensation: value })}
      />
      <Field label="Link" value={card.url} onChange={(value) => updateCard(doc, cardId, { url: value })} />
      <label className="text-sm text-muted">
        Priority
        <select
          className="field mt-1"
          value={card.priority}
          onChange={(event) => updateCard(doc, cardId, { priority: event.target.value as Priority })}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>
      <div>
        <p className="text-sm text-muted">Shared notes</p>
        <p className="mb-2 text-xs text-faint">Character-level merge, same as the brief.</p>
        {notes ? (
          <CollaborativeEditor
            ytext={notes}
            label={`Notes for ${card.company}`}
            placeholder="What do you want to remember about this loop?"
            className="field min-h-28"
          />
        ) : (
          <button type="button" className="btn btn-ghost btn-tiny" onClick={() => ensureCardNotes(doc, cardId)}>
            Start shared notes
          </button>
        )}
      </div>
      {armed ? (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-danger btn-tiny"
            onClick={() => {
              deleteCard(doc, cardId);
              onClose();
            }}
          >
            Delete {card.company}
          </button>
          <button type="button" className="btn btn-ghost btn-tiny" onClick={() => setArmed(false)}>
            Keep it
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-danger btn-tiny self-start" onClick={() => setArmed(true)}>
          Delete role
        </button>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-muted">
      {label}
      <input className="field mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
