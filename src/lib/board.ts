import * as Y from "yjs";
import { createId } from "@/lib/ids";
import { RANK_GAP, rankBetween } from "@/lib/ranks";

export const COLUMNS = [
  { id: "wishlist", name: "Wishlist", hint: "Roles worth a closer look" },
  { id: "applied", name: "Applied", hint: "Out in the world" },
  { id: "screen", name: "Screen", hint: "Recruiter or hiring manager" },
  { id: "interview", name: "Interview", hint: "Loops in motion" },
  { id: "offer", name: "Offer", hint: "Decisions on the table" },
] as const;

export type ColumnId = (typeof COLUMNS)[number]["id"];
export type Priority = "low" | "medium" | "high";

export type Card = {
  id: string;
  columnId: string;
  company: string;
  role: string;
  location: string;
  compensation: string;
  url: string;
  priority: Priority;
  rank: number;
  createdAt: number;
};

export type Comment = {
  id: string;
  author: string;
  color: string;
  body: string;
  createdAt: number;
};

export type Stroke = {
  id: string;
  color: string;
  width: number;
  points: string;
  author: string;
};

export type NewCard = {
  company: string;
  role: string;
  columnId?: string;
  location?: string;
  compensation?: string;
  url?: string;
  priority?: Priority;
  notes?: string;
};

export const SEED_ORIGIN = "tandem-seed";
export const BRIEF_THREAD = "brief";

const PRIORITIES: Priority[] = ["low", "medium", "high"];

export function compareCards(a: Card, b: Card): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function readCards(doc: Y.Doc): Card[] {
  const cards: Card[] = [];
  doc.getMap("cards").forEach((value, key) => {
    if (!(value instanceof Y.Map)) return;
    cards.push({
      id: stringField(value, "id", key),
      columnId: stringField(value, "columnId", "wishlist"),
      company: stringField(value, "company", ""),
      role: stringField(value, "role", ""),
      location: stringField(value, "location", ""),
      compensation: stringField(value, "compensation", ""),
      url: stringField(value, "url", ""),
      priority: priorityField(value.get("priority")),
      rank: numberField(value.get("rank"), 0),
      createdAt: numberField(value.get("createdAt"), 0),
    });
  });
  return cards.sort(compareCards);
}

export function cardsInColumn(cards: Card[], columnId: string): Card[] {
  return cards.filter((card) => card.columnId === columnId).sort(compareCards);
}

export function readTitle(doc: Y.Doc): string {
  const title = doc.getMap("meta").get("title");
  return typeof title === "string" && title.trim() ? title : "Untitled search";
}

export function setTitle(doc: Y.Doc, title: string): void {
  doc.transact(() => {
    doc.getMap("meta").set("title", title.slice(0, 80));
  });
}

export function addCard(doc: Y.Doc, input: NewCard): string {
  const id = createId("card");
  const columnId = input.columnId && isColumn(input.columnId) ? input.columnId : "wishlist";
  const siblings = cardsInColumn(readCards(doc), columnId);
  const rank = siblings.length > 0 ? siblings[siblings.length - 1].rank + RANK_GAP : RANK_GAP;
  const notes = input.notes?.slice(0, 4000) ?? "";
  doc.transact(() => {
    const card = new Y.Map<unknown>();
    card.set("id", id);
    card.set("columnId", columnId);
    card.set("company", input.company.trim().slice(0, 80));
    card.set("role", input.role.trim().slice(0, 120));
    card.set("location", (input.location ?? "").trim().slice(0, 80));
    card.set("compensation", (input.compensation ?? "").trim().slice(0, 40));
    card.set("url", (input.url ?? "").trim().slice(0, 300));
    card.set("priority", input.priority ?? "medium");
    card.set("rank", rank);
    card.set("createdAt", Date.now());
    doc.getMap("cards").set(id, card);
    const noteMap = doc.getMap<Y.Text>("notes");
    const text = new Y.Text();
    if (notes) text.insert(0, notes);
    noteMap.set(id, text);
  });
  return id;
}

export function updateCard(doc: Y.Doc, cardId: string, patch: Partial<NewCard> & { rank?: number }): void {
  const card = getCard(doc, cardId);
  if (!card) return;
  doc.transact(() => {
    if (patch.company != null) card.set("company", patch.company.slice(0, 80));
    if (patch.role != null) card.set("role", patch.role.slice(0, 120));
    if (patch.location != null) card.set("location", patch.location.slice(0, 80));
    if (patch.compensation != null) card.set("compensation", patch.compensation.slice(0, 40));
    if (patch.url != null) card.set("url", patch.url.slice(0, 300));
    if (patch.priority != null) card.set("priority", patch.priority);
    if (patch.columnId != null && isColumn(patch.columnId)) card.set("columnId", patch.columnId);
    if (typeof patch.rank === "number" && Number.isFinite(patch.rank)) card.set("rank", patch.rank);
  });
}

export function moveCard(doc: Y.Doc, cardId: string, columnId: string, rank: number): void {
  if (!isColumn(columnId)) return;
  updateCard(doc, cardId, { columnId, rank });
  const packed = cardsInColumn(readCards(doc), columnId);
  for (let index = 1; index < packed.length; index += 1) {
    if (Math.abs(packed[index].rank - packed[index - 1].rank) < 1e-6) {
      rebalanceColumn(doc, columnId);
      break;
    }
  }
}

export function rebalanceColumn(doc: Y.Doc, columnId: string): void {
  const packed = cardsInColumn(readCards(doc), columnId);
  doc.transact(() => {
    packed.forEach((card, index) => {
      getCard(doc, card.id)?.set("rank", (index + 1) * RANK_GAP);
    });
  });
}

export function deleteCard(doc: Y.Doc, cardId: string): void {
  doc.transact(() => {
    doc.getMap("cards").delete(cardId);
    doc.getMap("notes").delete(cardId);
    const comments = doc.getMap("comments");
    const prefix = commentPrefix(cardId);
    const keys: string[] = [];
    comments.forEach((_, key) => {
      if (key.startsWith(prefix)) keys.push(key);
    });
    for (const key of keys) comments.delete(key);
  });
}

export function planMove(
  cards: Card[],
  activeId: string,
  overId: string,
): { columnId: string; rank: number } | null {
  const active = cards.find((card) => card.id === activeId);
  if (!active || overId === activeId) return null;

  const columnId = overId.startsWith("col:")
    ? overId.slice(4)
    : cards.find((card) => card.id === overId)?.columnId;
  if (!columnId || !isColumn(columnId)) return null;

  const columnCards = cards.filter((card) => card.columnId === columnId && card.id !== activeId).sort(compareCards);
  if (overId.startsWith("col:")) {
    const last = columnCards.at(-1);
    return { columnId, rank: last ? last.rank + RANK_GAP : RANK_GAP };
  }

  const overIndex = columnCards.findIndex((card) => card.id === overId);
  if (overIndex < 0) return null;
  const before = overIndex > 0 ? columnCards[overIndex - 1].rank : null;
  const after = columnCards[overIndex]?.rank ?? null;
  return { columnId, rank: rankBetween(before, after) };
}

export function readComments(doc: Y.Doc, threadId: string): Comment[] {
  const comments: Comment[] = [];
  const prefix = commentPrefix(threadId);
  doc.getMap("comments").forEach((value, key) => {
    if (!key.startsWith(prefix) || !(value instanceof Y.Map)) return;
    const body = stringField(value, "body", "").trim();
    if (!body) return;
    comments.push({
      id: stringField(value, "id", key.slice(prefix.length)),
      author: stringField(value, "author", "Guest"),
      color: stringField(value, "color", "#9a3412"),
      body,
      createdAt: numberField(value.get("createdAt"), 0),
    });
  });
  return comments.sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
}

export function addComment(
  doc: Y.Doc,
  threadId: string,
  input: { author: string; color: string; body: string },
): void {
  const body = input.body.trim().slice(0, 2000);
  if (!body) return;
  const id = createId("comment");
  doc.transact(() => {
    const comment = new Y.Map<unknown>();
    comment.set("id", id);
    comment.set("author", input.author.slice(0, 40) || "Guest");
    comment.set("color", input.color);
    comment.set("body", body);
    comment.set("createdAt", Date.now());
    doc.getMap("comments").set(commentKey(threadId, id), comment);
  });
}

export function deleteComment(doc: Y.Doc, threadId: string, commentId: string): void {
  doc.getMap("comments").delete(commentKey(threadId, commentId));
}

export function cardNotes(doc: Y.Doc, cardId: string): Y.Text | null {
  const notes = doc.getMap("notes").get(cardId);
  return notes instanceof Y.Text ? notes : null;
}

export function ensureCardNotes(doc: Y.Doc, cardId: string): Y.Text {
  const notes = doc.getMap<Y.Text>("notes");
  const existing = notes.get(cardId);
  if (existing instanceof Y.Text) return existing;
  let created = new Y.Text();
  doc.transact(() => {
    const current = notes.get(cardId);
    if (current instanceof Y.Text) {
      created = current;
      return;
    }
    notes.set(cardId, created);
  });
  return notes.get(cardId) instanceof Y.Text ? (notes.get(cardId) as Y.Text) : created;
}

export function readStrokes(doc: Y.Doc): Stroke[] {
  const strokes: Stroke[] = [];
  const list = doc.getArray("strokes");
  list.forEach((value) => {
    if (!(value instanceof Y.Map)) return;
    const points = stringField(value, "points", "");
    if (!points) return;
    strokes.push({
      id: stringField(value, "id", createId("stroke")),
      color: stringField(value, "color", "#9a3412"),
      width: numberField(value.get("width"), 3),
      points,
      author: stringField(value, "author", "Guest"),
    });
  });
  return strokes;
}

export function addStroke(doc: Y.Doc, stroke: Stroke): void {
  if (!stroke.points.trim()) return;
  doc.transact(() => {
    const item = new Y.Map<unknown>();
    item.set("id", stroke.id);
    item.set("color", stroke.color);
    item.set("width", stroke.width);
    item.set("points", stroke.points.slice(0, 20_000));
    item.set("author", stroke.author.slice(0, 40));
    doc.getArray<Y.Map<unknown>>("strokes").push([item]);
  });
}

export function clearStrokes(doc: Y.Doc): void {
  const strokes = doc.getArray("strokes");
  if (strokes.length === 0) return;
  doc.transact(() => {
    strokes.delete(0, strokes.length);
  });
}

const SAMPLES: NewCard[] = [
  {
    company: "Linear",
    role: "Product Engineer",
    columnId: "interview",
    location: "Remote",
    compensation: "$190–220k",
    url: "https://linear.app/careers",
    priority: "high",
    notes: "Loop is system design plus product sense. Open with how Tandem merges offline edits instead of locking the document.",
  },
  {
    company: "Vercel",
    role: "Software Engineer, Product",
    columnId: "screen",
    location: "New York or remote",
    compensation: "$180–210k",
    url: "https://vercel.com/careers",
    priority: "high",
    notes: "They will ask how the Next.js app stays a thin client while the websocket server owns persistence.",
  },
  {
    company: "Stripe",
    role: "Full-stack Engineer",
    columnId: "applied",
    location: "Seattle",
    compensation: "$200–240k",
    url: "https://stripe.com/jobs",
    priority: "medium",
  },
  {
    company: "Notion",
    role: "Web Platform",
    columnId: "wishlist",
    location: "San Francisco",
    compensation: "$185–215k",
    priority: "medium",
  },
  {
    company: "Figma",
    role: "Editor Engineer",
    columnId: "wishlist",
    location: "Remote, US",
    compensation: "$190–230k",
    priority: "low",
    notes: "Multiplayer editor territory. The sketch tab is the honest toy version of this problem.",
  },
];

const BRIEF = `Week of November 24

The story
Akhilendra is interviewing as a product-minded full-stack engineer. Tandem is the proof: a multiplayer job-hunt studio with live cursors, presence, and edits that merge after someone goes offline.

This week
- Drag a role on one side and watch the other pane move.
- Type in this brief at the same time. Neither sentence should erase the other.
- Sketch a system, disconnect, keep drawing, then reconnect.

Open questions
- Which loop leads with the offline-merge story?
- What should a take-home emphasize: the board, or the sync server?`;

export function seedRoom(doc: Y.Doc): void {
  const meta = doc.getMap("meta");
  if (meta.get("seeded") === true) return;
  doc.transact(() => {
    if (meta.get("seeded") === true) return;
    meta.set("seeded", true);
    meta.set("title", "Spring 2026 search");
    let linearId = "";
    for (const sample of SAMPLES) {
      const id = addCard(doc, sample);
      if (sample.company === "Linear") linearId = id;
    }
    const brief = doc.getText("brief");
    if (brief.length === 0) brief.insert(0, BRIEF);
    if (linearId) {
      addComment(doc, linearId, {
        author: "Maya",
        color: "#1e3a8a",
        body: "Lead with the CRDT story in the system-design round. The board is the prop, the merge is the point.",
      });
    }
    addComment(doc, BRIEF_THREAD, {
      author: "Maya",
      color: "#1e3a8a",
      body: "Left a note on the Linear card. The second paragraph of this brief is the one I would say out loud.",
    });
  }, SEED_ORIGIN);
}

export function ensureRootTypes(doc: Y.Doc): void {
  doc.getMap("meta");
  doc.getMap("cards");
  doc.getMap("comments");
  doc.getMap("notes");
  doc.getText("brief");
  doc.getArray("strokes");
}

function commentPrefix(threadId: string): string {
  return `${threadId}::`;
}

function commentKey(threadId: string, commentId: string): string {
  return `${commentPrefix(threadId)}${commentId}`;
}

function getCard(doc: Y.Doc, cardId: string): Y.Map<unknown> | null {
  const card = doc.getMap("cards").get(cardId);
  return card instanceof Y.Map ? card : null;
}

function isColumn(value: string): value is ColumnId {
  return COLUMNS.some((column) => column.id === value);
}

function stringField(map: Y.Map<unknown>, key: string, fallback: string): string {
  const value = map.get(key);
  return typeof value === "string" ? value : fallback;
}

function numberField(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function priorityField(value: unknown): Priority {
  return PRIORITIES.includes(value as Priority) ? (value as Priority) : "medium";
}
