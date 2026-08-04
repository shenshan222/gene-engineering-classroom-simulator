"use client";

import type { RefObject } from "react";

import { useCanvasDrag } from "@/src/hooks/useCanvasDrag";
import type { PCRPrimerObject } from "@/src/state/pcrWorkbench";

interface PrimerWidgetProps {
  canvasRef: RefObject<HTMLDivElement | null>;
  primer: PCRPrimerObject;
  selected: boolean;
  onBringToFront: (primerId: string) => void;
  onMove: (primerId: string, x: number, y: number) => void;
  onSelect: (primerId: string) => void;
}

export function PrimerWidget({
  canvasRef,
  primer,
  selected,
  onBringToFront,
  onMove,
  onSelect,
}: PrimerWidgetProps) {
  const drag = useCanvasDrag({
    canvasRef,
    objectId: primer.id,
    x: primer.x,
    y: primer.y,
    onBringToFront,
    onMove,
  });

  return (
    <article
      aria-label={`${primer.name}，可拖动单链引物`}
      className={`primer-widget ${selected ? "selected" : ""} ${
        drag.dragging ? "dragging" : ""
      }`}
      style={{
        left: primer.x,
        top: primer.y,
        zIndex: primer.zIndex,
        ...drag.dragStyle,
      }}
      {...drag.pointerHandlers}
    >
      <header>
        <span aria-hidden="true">⠿</span>
        <strong>{primer.name}</strong>
        <button
          aria-pressed={selected}
          data-no-drag
          onClick={() => onSelect(primer.id)}
          type="button"
        >
          {selected ? "已选择" : "选择"}
        </button>
      </header>
      <div className="primer-strand">
        <span>5′</span>
        {Array.from(primer.sequence5to3).map((base, index) => (
          <span className="primer-base" key={`${primer.id}:${index}`}>
            {base}
          </span>
        ))}
        <span>3′</span>
      </div>
    </article>
  );
}
