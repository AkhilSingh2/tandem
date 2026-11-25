"use client";

import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { adjustCaret, diffToActions, planTextInput, type TextDelta } from "@/lib/text";

type Selection = { start: number; end: number };

export function CollaborativeEditor({
  ytext,
  label,
  testId,
  placeholder,
  className = "",
}: {
  ytext: Y.Text;
  label: string;
  testId?: string;
  placeholder: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let composing = false;
    let nextCaret: number | null = null;

    const paint = (caret: number | null) => {
      const value = ytext.toString();
      if ((element.textContent ?? "") !== value) {
        element.textContent = value;
      }
      if (caret != null && document.activeElement === element) {
        placeCaret(element, caret);
      }
    };

    const applyDomDiff = () => {
      const dom = element.textContent ?? "";
      const current = ytext.toString();
      if (dom === current) return;
      const change = diffToActions(current, dom);
      nextCaret = change.index + change.insert.length;
      ytext.doc?.transact(() => {
        if (change.deleteLen > 0) ytext.delete(change.index, change.deleteLen);
        if (change.insert) ytext.insert(change.index, change.insert);
      });
    };

    const onBeforeInput = (event: InputEvent) => {
      if (composing || event.isComposing) return;
      const plan = planTextInput(ytext.length, readSelection(element), event.inputType, event.data ?? pasteText(event));
      if (!plan) return;
      event.preventDefault();
      if (plan.deleteLen === 0 && plan.insert === "") return;
      nextCaret = plan.caret;
      ytext.doc?.transact(() => {
        if (plan.deleteLen > 0) ytext.delete(plan.deleteFrom, plan.deleteLen);
        if (plan.insert) ytext.insert(plan.insertAt, plan.insert);
      });
    };

    const onInput = () => {
      if (composing) return;
      applyDomDiff();
    };

    const onCompositionStart = () => {
      composing = true;
    };

    const onCompositionEnd = () => {
      composing = false;
      applyDomDiff();
    };

    const onObserve = (event: Y.YTextEvent) => {
      if (composing) return;
      if (nextCaret != null) {
        const caret = nextCaret;
        nextCaret = null;
        paint(caret);
        return;
      }
      const focused = document.activeElement === element;
      const current = focused ? readSelection(element).end : null;
      paint(current == null ? null : adjustCaret(current, event.delta as TextDelta));
    };

    paint(null);
    ytext.observe(onObserve);
    element.addEventListener("beforeinput", onBeforeInput);
    element.addEventListener("input", onInput);
    element.addEventListener("compositionstart", onCompositionStart);
    element.addEventListener("compositionend", onCompositionEnd);
    return () => {
      ytext.unobserve(onObserve);
      element.removeEventListener("beforeinput", onBeforeInput);
      element.removeEventListener("input", onInput);
      element.removeEventListener("compositionstart", onCompositionStart);
      element.removeEventListener("compositionend", onCompositionEnd);
    };
  }, [ytext]);

  return (
    <div
      ref={ref}
      role="textbox"
      aria-multiline="true"
      aria-label={label}
      data-testid={testId}
      data-placeholder={placeholder}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      className={`editor ${className}`}
    />
  );
}

function pasteText(event: InputEvent): string {
  return event.dataTransfer?.getData("text/plain") ?? "";
}

function readSelection(root: HTMLElement): Selection {
  const selection = window.getSelection();
  const length = root.textContent?.length ?? 0;
  if (!selection || selection.rangeCount === 0 || !selection.anchorNode || !root.contains(selection.anchorNode)) {
    return { start: length, end: length };
  }
  const range = selection.getRangeAt(0);
  return {
    start: offsetWithin(root, range.startContainer, range.startOffset),
    end: offsetWithin(root, range.endContainer, range.endOffset),
  };
}

function offsetWithin(root: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(container, offset);
  return range.toString().length;
}

function placeCaret(root: HTMLElement, offset: number) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  const node = root.firstChild;
  if (node && node.nodeType === Node.TEXT_NODE) {
    const length = node.textContent?.length ?? 0;
    range.setStart(node, Math.max(0, Math.min(offset, length)));
  } else {
    range.setStart(root, 0);
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}
