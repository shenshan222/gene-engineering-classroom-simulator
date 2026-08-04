"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

export interface DragPayload {
  type: "tool" | "fragment";
  id: string;
}

export interface DropTarget {
  kind: "bond" | "molecule" | "recipient-gap" | "none";
  moleculeId?: string;
  bondIndex?: number;
}

interface UsePointerDragOptions {
  payload: DragPayload;
  onDrop: (payload: DragPayload, target: DropTarget) => void;
}

interface DragOrigin {
  pointerId: number;
  x: number;
  y: number;
}

function readDropTarget(x: number, y: number): DropTarget {
  const element = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>("[data-drop-kind]");
  if (!element) {
    return { kind: "none" };
  }

  const kind = element.dataset.dropKind as DropTarget["kind"] | undefined;
  if (!kind) {
    return { kind: "none" };
  }

  return {
    kind,
    moleculeId: element.dataset.moleculeId,
    bondIndex:
      element.dataset.bondIndex === undefined
        ? undefined
        : Number(element.dataset.bondIndex),
  };
}

export function usePointerDrag({
  payload,
  onDrop,
}: UsePointerDragOptions) {
  const originRef = useRef<DragOrigin | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }
    originRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const origin = originRef.current;
    if (!origin || origin.pointerId !== event.pointerId) {
      return;
    }
    const next = {
      x: event.clientX - origin.x,
      y: event.clientY - origin.y,
    };
    if (!dragging && Math.hypot(next.x, next.y) > 6) {
      draggingRef.current = true;
      setDragging(true);
    }
    setOffset(next);
  }

  function finishDrag(event: PointerEvent<HTMLElement>) {
    const origin = originRef.current;
    if (!origin || origin.pointerId !== event.pointerId) {
      return;
    }
    if (draggingRef.current) {
      suppressClickRef.current = true;
      onDrop(payload, readDropTarget(event.clientX, event.clientY));
    }
    originRef.current = null;
    draggingRef.current = false;
    setOffset({ x: 0, y: 0 });
    setDragging(false);
  }

  const style: CSSProperties = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    zIndex: dragging ? 30 : undefined,
    touchAction: "none",
  };

  return {
    dragging,
    style,
    consumeClick() {
      const shouldSuppress = suppressClickRef.current;
      suppressClickRef.current = false;
      return shouldSuppress;
    },
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
    },
  };
}
