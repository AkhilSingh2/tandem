"use client";

import { useEffect, useRef, useState } from "react";
import type * as Y from "yjs";

export function useDocSlice<T>(doc: Y.Doc, key: string, read: (doc: Y.Doc) => T): T {
  const readRef = useRef(read);
  const [slot, setSlot] = useState<{ key: string; value: T }>(() => ({ key, value: read(doc) }));

  if (slot.key !== key) {
    setSlot({ key, value: read(doc) });
  }

  useEffect(() => {
    readRef.current = read;
  });

  useEffect(() => {
    const update = () => setSlot({ key, value: readRef.current(doc) });
    doc.on("update", update);
    return () => {
      doc.off("update", update);
    };
  }, [doc, key]);

  return slot.key === key ? slot.value : read(doc);
}
