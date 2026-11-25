export type TextDelta = Array<{
  retain?: number;
  insert?: unknown;
  delete?: number;
}>;

export function adjustCaret(caret: number, delta: TextDelta): number {
  let index = 0;
  let next = caret;
  for (const step of delta) {
    if (typeof step.retain === "number" && step.retain > 0) {
      index += step.retain;
      continue;
    }
    if (step.insert !== undefined) {
      const length = insertedLength(step.insert);
      if (index <= caret) next += length;
      index += length;
      continue;
    }
    if (typeof step.delete === "number" && step.delete > 0) {
      if (index < next) {
        next = index + Math.max(0, next - index - step.delete);
      }
    }
  }
  return Math.max(0, next);
}

export function diffToActions(
  prev: string,
  next: string,
): { index: number; deleteLen: number; insert: string } {
  if (prev === next) return { index: 0, deleteLen: 0, insert: "" };
  let start = 0;
  while (start < prev.length && start < next.length && prev[start] === next[start]) {
    start += 1;
  }
  let prevEnd = prev.length;
  let nextEnd = next.length;
  while (prevEnd > start && nextEnd > start && prev[prevEnd - 1] === next[nextEnd - 1]) {
    prevEnd -= 1;
    nextEnd -= 1;
  }
  return {
    index: start,
    deleteLen: prevEnd - start,
    insert: next.slice(start, nextEnd),
  };
}

export type PlannedInput = {
  deleteFrom: number;
  deleteLen: number;
  insertAt: number;
  insert: string;
  caret: number;
};

export function planTextInput(
  length: number,
  selection: { start: number; end: number },
  inputType: string,
  data: string,
): PlannedInput | null {
  const start = clamp(Math.min(selection.start, selection.end), 0, length);
  const end = clamp(Math.max(selection.start, selection.end), 0, length);
  const insertText =
    inputType === "insertParagraph" || inputType === "insertLineBreak" ? "\n" : data;

  if (
    inputType === "insertText" ||
    inputType === "insertFromPaste" ||
    inputType === "insertParagraph" ||
    inputType === "insertLineBreak" ||
    inputType === "insertCompositionText"
  ) {
    return {
      deleteFrom: start,
      deleteLen: end - start,
      insertAt: start,
      insert: insertText,
      caret: start + insertText.length,
    };
  }

  if (inputType === "deleteContentBackward") {
    if (end > start) {
      return { deleteFrom: start, deleteLen: end - start, insertAt: start, insert: "", caret: start };
    }
    if (start === 0) {
      return { deleteFrom: 0, deleteLen: 0, insertAt: 0, insert: "", caret: 0 };
    }
    return { deleteFrom: start - 1, deleteLen: 1, insertAt: start - 1, insert: "", caret: start - 1 };
  }

  if (inputType === "deleteContentForward" || inputType === "deleteContent") {
    if (end > start) {
      return { deleteFrom: start, deleteLen: end - start, insertAt: start, insert: "", caret: start };
    }
    if (start >= length) {
      return { deleteFrom: start, deleteLen: 0, insertAt: start, insert: "", caret: start };
    }
    return { deleteFrom: start, deleteLen: 1, insertAt: start, insert: "", caret: start };
  }

  if (inputType === "deleteByCut") {
    return { deleteFrom: start, deleteLen: end - start, insertAt: start, insert: "", caret: start };
  }

  return null;
}

function insertedLength(insert: unknown): number {
  if (typeof insert === "string") return insert.length;
  if (Array.isArray(insert)) return insert.length;
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
