"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  COLUMNS,
  addCard,
  cardsInColumn,
  moveCard,
  planMove,
  readCards,
  readComments,
  type Card,
  type Priority,
} from "@/lib/board";
import { useRoom } from "@/components/workspace/room-provider";
import { useDocSlice } from "@/components/workspace/use-doc";

export function Kanban({ onOpen }: { onOpen: (cardId: string) => void }) {
  const { doc } = useRoom();
  const board = useDocSlice(doc, "kanban", (current) => {
    const cards = readCards(current);
    const counts: Record<string, number> = {};
    for (const card of cards) counts[card.id] = readComments(current, card.id).length;
    return { cards, counts };
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const active = board.cards.find((card) => card.id === activeId) ?? null;

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));
  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (!event.over) return;
    const planned = planMove(board.cards, String(event.active.id), String(event.over.id));
    if (!planned) return;
    const current = board.cards.find((card) => card.id === String(event.active.id));
    if (current && current.columnId === planned.columnId && current.rank === planned.rank) return;
    moveCard(doc, String(event.active.id), planned.columnId, planned.rank);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto px-3 pt-3 pb-6 snap-x md:px-5">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            id={column.id}
            name={column.name}
            hint={column.hint}
            cards={cardsInColumn(board.cards, column.id)}
            counts={board.counts}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>{active ? <CardFace card={active} count={board.counts[active.id] ?? 0} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({
  id,
  name,
  hint,
  cards,
  counts,
  onOpen,
}: {
  id: string;
  name: string;
  hint: string;
  cards: Card[];
  counts: Record<string, number>;
  onOpen: (cardId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${id}` });
  const [open, setOpen] = useState(false);

  return (
    <section
      className="flex w-[min(82vw,280px)] shrink-0 snap-start flex-col rounded-3xl border border-line bg-sunken/80 p-3"
      aria-label={name}
    >
      <header className="mb-3 flex items-start justify-between gap-2 px-1">
        <div>
          <h2 className="font-display text-xl leading-none">{name}</h2>
          <p className="mt-1 text-xs text-faint">{hint}</p>
        </div>
        <span className="rounded-full bg-elev px-2 py-1 text-xs text-muted">{cards.length}</span>
      </header>
      <div
        ref={setNodeRef}
        className={`flex min-h-40 flex-1 flex-col gap-2 rounded-2xl p-1 ${isOver ? "bg-accent/10" : ""}`}
      >
        <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} count={counts[card.id] ?? 0} onOpen={onOpen} />
          ))}
        </SortableContext>
        {cards.length === 0 ? <p className="px-2 py-6 text-center text-sm text-faint">Drop a role here</p> : null}
      </div>
      {open ? (
        <AddRoleForm columnId={id} columnName={name} onDone={() => setOpen(false)} />
      ) : (
        <button type="button" className="btn btn-ghost btn-tiny mt-3" onClick={() => setOpen(true)}>
          Add role to {name}
        </button>
      )}
    </section>
  );
}

function SortableCard({ card, count, onOpen }: { card: Card; count: number; onOpen: (cardId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const origin = useRef<{ x: number; y: number } | null>(null);
  const { onKeyDown, onPointerDown, ...rest } = listeners ?? {};
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...rest}
      aria-label={`${card.company}, ${card.role}`}
      onPointerDown={(event) => {
        origin.current = { x: event.clientX, y: event.clientY };
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        const start = origin.current;
        if (start && (Math.abs(event.clientX - start.x) > 6 || Math.abs(event.clientY - start.y) > 6)) return;
        onOpen(card.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onOpen(card.id);
          return;
        }
        onKeyDown?.(event);
      }}
    >
      <CardFace card={card} count={count} />
    </article>
  );
}

function CardFace({ card, count, overlay = false }: { card: Card; count: number; overlay?: boolean }) {
  return (
    <div className={`rounded-2xl border border-line bg-elev shadow-lift ${overlay ? "rotate-1" : ""}`}>
      <div className={`h-1.5 rounded-t-2xl priority-${card.priority}`} />
      <div className="px-3 py-3 text-left">
        <p className="text-[11px] text-faint uppercase">{card.company}</p>
        <h3 className="mt-1 font-medium leading-snug">{card.role}</h3>
        <p className="mt-2 text-xs text-muted">
          {[card.location, card.compensation].filter(Boolean).join(" · ") || "Details open in the card"}
        </p>
        <p className="mt-2 text-xs text-faint">
          {labelPriority(card.priority)}
          {count > 0 ? ` · ${count} comment${count === 1 ? "" : "s"}` : ""}
        </p>
      </div>
    </div>
  );
}

function AddRoleForm({
  columnId,
  columnName,
  onDone,
}: {
  columnId: string;
  columnName: string;
  onDone: () => void;
}) {
  const { doc } = useRoom();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");

  return (
    <form
      className="mt-3 flex flex-col gap-2"
      aria-label={`Add a role to ${columnName}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!company.trim() || !role.trim()) return;
        addCard(doc, { company, role, location, columnId, priority: "medium" });
        onDone();
      }}
    >
      <label className="text-xs text-muted">
        Company
        <input className="field mt-1" value={company} onChange={(event) => setCompany(event.target.value)} required />
      </label>
      <label className="text-xs text-muted">
        Role
        <input className="field mt-1" value={role} onChange={(event) => setRole(event.target.value)} required />
      </label>
      <label className="text-xs text-muted">
        Location
        <input className="field mt-1" value={location} onChange={(event) => setLocation(event.target.value)} />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-tiny">
          Add to pipeline
        </button>
        <button type="button" className="btn btn-ghost btn-tiny" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function labelPriority(priority: Priority): string {
  if (priority === "high") return "High priority";
  if (priority === "low") return "Low priority";
  return "Medium priority";
}
