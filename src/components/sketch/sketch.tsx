"use client";

import { useRef, useState } from "react";
import { addStroke, clearStrokes, readStrokes } from "@/lib/board";
import { createId } from "@/lib/ids";
import { useRoom } from "@/components/workspace/room-provider";
import { useDocSlice } from "@/components/workspace/use-doc";
import { usePeers } from "@/components/workspace/presence";

const COLORS = ["#ff7a3c", "#60a5fa", "#2dd4bf", "#c084fc", "#fb7185"];

export function Sketch() {
  const { doc, user, setDraft } = useRoom();
  const strokes = useDocSlice(doc, "strokes", readStrokes);
  const peers = usePeers();
  const [color, setColor] = useState(user.color);
  const [width, setWidth] = useState(4);
  const [armed, setArmed] = useState(false);
  const drawing = useRef<string>("");
  const [localPoints, setLocalPoints] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  const pointFromEvent = (event: React.PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const x = clamp(((event.clientX - rect.left) / rect.width) * 1000, 0, 1000);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 1000, 0, 1000);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const finish = () => {
    const points = drawing.current;
    drawing.current = "";
    setLocalPoints("");
    setDraft(null);
    if (points.split(" ").length < 2) return;
    addStroke(doc, { id: createId("stroke"), color, width, points, author: user.name });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-3 py-3 md:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Stroke color">
          {COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              role="radio"
              aria-checked={color === swatch}
              aria-label={`Color ${swatch}`}
              className={`size-7 rounded-full border-2 ${color === swatch ? "border-ink" : "border-transparent"}`}
              style={{ background: swatch }}
              onClick={() => setColor(swatch)}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Width
          <input
            type="range"
            min={2}
            max={12}
            value={width}
            aria-valuetext={`${width} pixels`}
            onChange={(event) => setWidth(Number(event.target.value))}
          />
        </label>
        {armed ? (
          <button
            type="button"
            className="btn btn-danger btn-tiny"
            onClick={() => {
              clearStrokes(doc);
              setArmed(false);
            }}
          >
            Clear the board
          </button>
        ) : (
          <button type="button" className="btn btn-ghost btn-tiny" onClick={() => setArmed(true)}>
            Clear sketch
          </button>
        )}
        <p className="text-xs text-faint">Strokes are normalized, so both panes draw on the same page.</p>
      </div>
      <div className="panel relative min-h-0 flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          data-testid="sketch-board"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="h-full w-full touch-none bg-sunken"
          role="img"
          aria-label="Shared sketch"
          onPointerDown={(event) => {
            const point = pointFromEvent(event);
            if (!point) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drawing.current = point;
            setLocalPoints(point);
          }}
          onPointerMove={(event) => {
            if (!drawing.current) return;
            const point = pointFromEvent(event);
            if (!point) return;
            const points = `${drawing.current} ${point}`;
            drawing.current = points;
            setLocalPoints(points);
            setDraft({ color, width, points });
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
        >
          {strokes.map((stroke) => (
            <polyline
              key={stroke.id}
              points={stroke.points}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {peers
            .filter((peer) => !peer.self && peer.draft)
            .map((peer) => (
              <polyline
                key={`draft-${peer.clientId}`}
                points={peer.draft!.points}
                fill="none"
                stroke={peer.draft!.color}
                strokeWidth={peer.draft!.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
            ))}
          {localPoints ? (
            <polyline points={localPoints} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </svg>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
