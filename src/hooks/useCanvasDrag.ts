"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
} from "react";

interface DragOrigin {
  pointerId: number;
  clientX: number;
  clientY: number;
  maxX: number;
  maxY: number;
}

interface UseCanvasDragOptions {
  canvasRef: RefObject<HTMLDivElement | null>;
  objectId: string;
  x: number;
  y: number;
  onBringToFront: (objectId: string) => void;
  onMove: (objectId: string, x: number, y: number) => void;
}

export function useCanvasDrag({
  canvasRef,
  objectId,
  x,
  y,
  onBringToFront,
  onMove,
}: UseCanvasDragOptions) {
  const originRef = useRef<DragOrigin | null>(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (
      event.button !== 0 ||
      (event.target as HTMLElement).closest("[data-no-drag]")
    ) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    originRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      maxX: Math.max(16, canvas.clientWidth - event.currentTarget.offsetWidth - 16),
      maxY: Math.max(16, canvas.clientHeight - event.currentTarget.offsetHeight - 16),
    };
    onBringToFront(objectId);
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const origin = originRef.current;
    if (!origin || origin.pointerId !== event.pointerId) {
      return;
    }
    const rawX = event.clientX - origin.clientX;
    const rawY = event.clientY - origin.clientY;
    if (!draggingRef.current && Math.hypot(rawX, rawY) > 4) {
      draggingRef.current = true;
      setDragging(true);
    }
    const nextOffset = {
      x: Math.min(origin.maxX - x, Math.max(16 - x, rawX)),
      y: Math.min(origin.maxY - y, Math.max(16 - y, rawY)),
    };
    offsetRef.current = nextOffset;
    setOffset(nextOffset);
  }

  function finish(event: PointerEvent<HTMLElement>) {
    const origin = originRef.current;
    if (!origin || origin.pointerId !== event.pointerId) {
      return;
    }
    if (draggingRef.current) {
      onMove(
        objectId,
        Math.round(x + offsetRef.current.x),
        Math.round(y + offsetRef.current.y),
      );
    }
    originRef.current = null;
    draggingRef.current = false;
    offsetRef.current = { x: 0, y: 0 };
    setDragging(false);
    setOffset({ x: 0, y: 0 });
  }

  const dragStyle: CSSProperties = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
  };

  return {
    dragging,
    dragStyle,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}
