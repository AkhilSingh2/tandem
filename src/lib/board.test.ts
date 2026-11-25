import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  addCard,
  addComment,
  cardsInColumn,
  clearStrokes,
  deleteCard,
  moveCard,
  planMove,
  readCards,
  readComments,
  readStrokes,
  seedRoom,
  addStroke,
} from "@/lib/board";

function merged(left: Y.Doc, right: Y.Doc) {
  Y.applyUpdate(left, Y.encodeStateAsUpdate(right, Y.encodeStateVector(left)));
  Y.applyUpdate(right, Y.encodeStateAsUpdate(left, Y.encodeStateVector(right)));
}

describe("board operations", () => {
  it("adds, moves, and deletes a card", () => {
    const doc = new Y.Doc();
    const id = addCard(doc, { company: "Linear", role: "Product Engineer", columnId: "wishlist" });
    expect(cardsInColumn(readCards(doc), "wishlist").map((card) => card.company)).toEqual(["Linear"]);
    const second = addCard(doc, { company: "Notion", role: "Web Platform", columnId: "wishlist" });
    const cards = readCards(doc);
    const notion = cards.find((card) => card.id === second);
    const planned = planMove(cards, id, second);
    expect(planned?.columnId).toBe("wishlist");
    expect(planned && notion && planned.rank < notion.rank).toBe(true);
    moveCard(doc, id, "interview", planned?.rank ?? 10);
    expect(readCards(doc).find((card) => card.id === id)?.columnId).toBe("interview");
    deleteCard(doc, id);
    expect(readCards(doc).some((card) => card.id === id)).toBe(false);
  });

  it("merges cards added offline on two replicas", () => {
    const left = new Y.Doc();
    const right = new Y.Doc();
    Y.applyUpdate(right, Y.encodeStateAsUpdate(left));
    addCard(left, { company: "Linear", role: "Product Engineer" });
    addCard(right, { company: "Stripe", role: "Full-stack Engineer" });
    merged(left, right);
    const names = (doc: Y.Doc) => readCards(doc).map((card) => card.company).sort();
    expect(names(left)).toEqual(["Linear", "Stripe"]);
    expect(names(right)).toEqual(names(left));
  });

  it("merges concurrent inserts in the brief", () => {
    const left = new Y.Doc();
    const right = new Y.Doc();
    left.getText("brief").insert(0, "Hello");
    Y.applyUpdate(right, Y.encodeStateAsUpdate(left));
    left.getText("brief").insert(5, " Ava");
    right.getText("brief").insert(5, " Maya");
    merged(left, right);
    const text = left.getText("brief").toString();
    expect(text).toBe(right.getText("brief").toString());
    expect(text.startsWith("Hello")).toBe(true);
    expect(text).toContain("Ava");
    expect(text).toContain("Maya");
  });

  it("appends comments without dropping either side", () => {
    const left = new Y.Doc();
    const right = new Y.Doc();
    const id = addCard(left, { company: "Linear", role: "Product Engineer" });
    Y.applyUpdate(right, Y.encodeStateAsUpdate(left));
    addComment(left, id, { author: "Akhil", color: "#9a3412", body: "Prep the story." });
    addComment(right, id, { author: "Maya", color: "#1e3a8a", body: "Ask about the loop." });
    merged(left, right);
    const bodies = readComments(left, id).map((comment) => comment.body).sort();
    expect(bodies).toEqual(readComments(right, id).map((comment) => comment.body).sort());
    expect(bodies).toEqual(["Ask about the loop.", "Prep the story."]);
  });

  it("undoes a local card add and ignores the seeded history", () => {
    const doc = new Y.Doc();
    const undo = new Y.UndoManager(doc);
    seedRoom(doc);
    expect(readCards(doc)).toHaveLength(5);
    undo.undo();
    expect(readCards(doc)).toHaveLength(5);
    addCard(doc, { company: "Supabase", role: "Product Engineer" });
    expect(readCards(doc)).toHaveLength(6);
    undo.undo();
    expect(readCards(doc).some((card) => card.company === "Supabase")).toBe(false);
    undo.redo();
    expect(readCards(doc).some((card) => card.company === "Supabase")).toBe(true);
  });

  it("clears strokes in one undoable step", () => {
    const doc = new Y.Doc();
    const undo = new Y.UndoManager(doc);
    addStroke(doc, { id: "stroke_1", color: "#9a3412", width: 3, points: "0,0 10,10", author: "Akhil" });
    undo.stopCapturing();
    clearStrokes(doc);
    expect(readStrokes(doc)).toHaveLength(0);
    undo.undo();
    expect(readStrokes(doc)).toHaveLength(1);
  });
});
