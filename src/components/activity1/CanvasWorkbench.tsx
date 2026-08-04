"use client";

import { useRef } from "react";

import { GeneWidget } from "@/src/components/activity1/GeneWidget";
import type {
  Activity1Snapshot,
  EndReference,
} from "@/src/state/activity1Workbench";

interface CanvasWorkbenchProps {
  snapshot: Activity1Snapshot;
  circularizableObjectId: string;
  onBringToFront: (objectId: string) => void;
  onCircularize: (objectId: string) => void;
  onCut: (objectId: string, bondIndex: number) => void;
  onEndSelect: (end: EndReference) => void;
  onMove: (objectId: string, x: number, y: number) => void;
}

export function CanvasWorkbench({
  snapshot,
  circularizableObjectId,
  onBringToFront,
  onCircularize,
  onCut,
  onEndSelect,
  onMove,
}: CanvasWorkbenchProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const minimumWidth = Math.max(
    1460,
    ...snapshot.objects.map(
      (object) => object.x + object.topStrand.length * 27 + 220,
    ),
  );

  return (
    <div className="canvas-viewport">
      <section
        aria-label="活动 1 DNA 自由实验画布"
        className={`activity-canvas tool-${snapshot.activeTool}`}
        ref={canvasRef}
        style={{ minWidth: minimumWidth }}
      >
        <div className="canvas-axis-label" aria-hidden="true">
          自由实验区 · 可拖动 DNA
        </div>
        {snapshot.objects.map((object) => (
          <GeneWidget
            activeTool={snapshot.activeTool}
            canCircularizeObject={
              object.sourceMoleculeId === circularizableObjectId
            }
            canvasRef={canvasRef}
            eventSequence={snapshot.eventSequence}
            invalidBond={snapshot.invalidBond}
            key={object.id}
            object={object}
            onBringToFront={onBringToFront}
            onCircularize={onCircularize}
            onCut={onCut}
            onEndSelect={onEndSelect}
            onMove={onMove}
            selectedEnd={snapshot.selectedEnd}
          />
        ))}
      </section>
    </div>
  );
}
