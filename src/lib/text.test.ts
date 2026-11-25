import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { adjustCaret, diffToActions, planTextInput } from "@/lib/text";

describe("adjustCaret", () => {
  it("shifts when a remote insert lands before the caret", () => {
    const doc = new Y.Doc();
    const text = doc.getText("brief");
    text.insert(0, "Hello");
    let caret = -1;
    text.observe((event) => {
      caret = adjustCaret(5, event.delta);
    });
    text.insert(0, "X");
    expect(caret).toBe(6);
  });

  it("keeps the caret when the insert is after it", () => {
    const doc = new Y.Doc();
    const text = doc.getText("brief");
    text.insert(0, "Hello");
    let caret = -1;
    text.observe((event) => {
      caret = adjustCaret(1, event.delta);
    });
    text.insert(5, "!");
    expect(caret).toBe(1);
  });

  it("pulls the caret left when characters before it are deleted", () => {
    const doc = new Y.Doc();
    const text = doc.getText("brief");
    text.insert(0, "Hello");
    let caret = -1;
    text.observe((event) => {
      caret = adjustCaret(5, event.delta);
    });
    text.delete(1, 1);
    expect(text.toString()).toBe("Hllo");
    expect(caret).toBe(4);
  });
});

describe("planTextInput", () => {
  it("replaces a selection with typed text", () => {
    expect(planTextInput(5, { start: 1, end: 4 }, "insertText", "i")).toEqual({
      deleteFrom: 1,
      deleteLen: 3,
      insertAt: 1,
      insert: "i",
      caret: 2,
    });
  });

  it("deletes the character before the caret", () => {
    expect(planTextInput(5, { start: 3, end: 3 }, "deleteContentBackward", "")?.caret).toBe(2);
  });
});

describe("diffToActions", () => {
  it("describes a middle insertion", () => {
    expect(diffToActions("Hello", "HeXllo")).toEqual({ index: 2, deleteLen: 0, insert: "X" });
  });

  it("describes a replacement", () => {
    expect(diffToActions("cats", "cuts")).toEqual({ index: 1, deleteLen: 1, insert: "u" });
  });
});
