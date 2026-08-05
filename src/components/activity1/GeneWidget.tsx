"use client";

import { useState, type RefObject } from "react";

import { BasePairCell } from "@/src/components/activity1/BasePairCell";
import { StickyEndHandle } from "@/src/components/activity1/StickyEndHandle";
import { findRestrictionEnzyme } from "@/src/content/enzymeLibrary";
import { scanRestrictionSites } from "@/src/domain/restriction";
import { useCanvasDrag } from "@/src/hooks/useCanvasDrag";
import type {
  Activity1Tool,
  CanvasDNAObject,
  EndReference,
} from "@/src/state/activity1Workbench";

interface GeneWidgetProps {
  canvasRef: RefObject<HTMLDivElement | null>;
  object: CanvasDNAObject;
  activeTool: Activity1Tool;
  canCircularizeObject?: boolean;
  selectedEnd: EndReference | null;
  invalidBond: { objectId: string; bondIndex: number } | null;
  eventSequence: number;
  headerActionLabel?: string;
  headerActionSelected?: boolean;
  compatibleEnds?: Partial<Record<"left" | "right", boolean>>;
  onBringToFront: (objectId: string) => void;
  onCircularize: (objectId: string) => void;
  onCut: (objectId: string, bondIndex: number) => void;
  onEndSelect: (end: EndReference) => void;
  onHeaderAction?: (objectId: string) => void;
  onMove: (objectId: string, x: number, y: number) => void;
}

export function GeneWidget({
  canvasRef,
  object,
  activeTool,
  canCircularizeObject = true,
  selectedEnd,
  invalidBond,
  eventSequence,
  headerActionLabel,
  headerActionSelected = false,
  compatibleEnds = {},
  onBringToFront,
  onCircularize,
  onCut,
  onEndSelect,
  onHeaderAction,
  onMove,
}: GeneWidgetProps) {
  const [previewBondIndex, setPreviewBondIndex] = useState<number | null>(null);
  const drag = useCanvasDrag({
    canvasRef,
    objectId: object.id,
    x: object.x,
    y: object.y,
    onBringToFront,
    onMove,
  });
  const bases = Array.from(object.topStrand);
  const leftSelectable = Boolean(object.leftEnd.createdBy);
  const rightSelectable = Boolean(object.rightEnd.createdBy);
  const selectedEnzyme = findRestrictionEnzyme(activeTool);
  const restrictionSites = selectedEnzyme
    ? scanRestrictionSites(
        {
          id: object.id,
          name: object.name,
          topology: object.topology,
          topStrand: object.topStrand,
          features: object.features,
          foldedRegions: object.foldedRegions,
          sourceTaskId: object.sourceTaskId,
        },
        selectedEnzyme,
      )
    : [];
  const previewSite = restrictionSites.find(
    (site) => site.topBondIndex === previewBondIndex,
  );
  const validCutBonds = new Set(
    restrictionSites.map((site) => site.topBondIndex),
  );
  const canCircularize =
    activeTool === "circularize" &&
    canCircularizeObject &&
    object.topology === "linear" &&
    object.kind === "molecule";

  function featureAt(index: number) {
    return object.features.find(
      (feature) => index >= feature.start && index < feature.end,
    )?.type;
  }

  function isFolded(index: number) {
    return object.foldedRegions.some(
      (region) => index >= region.start && index < region.end,
    );
  }

  function endSelected(side: "left" | "right") {
    return selectedEnd?.objectId === object.id && selectedEnd.side === side;
  }

  function isPreviewOverhang(index: number) {
    if (!previewSite) return false;
    const start = Math.min(
      previewSite.topBondIndex,
      previewSite.bottomBondIndex,
    );
    const end = Math.max(
      previewSite.topBondIndex,
      previewSite.bottomBondIndex,
    );
    return index >= start && index < end;
  }

  return (
    <article
      aria-label={`${object.name}，${object.topStrand.length} 个碱基对，可拖动 DNA 组件`}
      className={`gene-widget ${drag.dragging ? "dragging" : ""} ${
        object.kind === "product" ? "completed-product" : ""
      } ${headerActionSelected ? "selected-template" : ""}`}
      style={{
        left: object.x,
        top: object.y,
        zIndex: object.zIndex,
        ...drag.dragStyle,
      }}
      {...drag.pointerHandlers}
    >
      <header className="gene-widget-header">
        <span className="drag-dots" aria-hidden="true">
          ⠿
        </span>
        <strong>{object.name}</strong>
        <span className={`topology-label ${object.topology}`}>
          {object.topology === "circular" ? "环状" : "线性"}
        </span>
        <span>{object.topStrand.length} bp</span>
        {(canCircularize || headerActionLabel) && (
          <button
            aria-pressed={headerActionSelected}
            className="widget-action"
            data-no-drag
            onClick={() =>
              onHeaderAction
                ? onHeaderAction(object.id)
                : onCircularize(object.id)
            }
            type="button"
          >
            {headerActionLabel ?? "连接成环"}
          </button>
        )}
      </header>

      <div className="gene-sequence">
        {leftSelectable ? (
          <StickyEndHandle
            compatible={compatibleEnds.left ?? false}
            disabled={activeTool !== "ligase"}
            end={object.leftEnd}
            objectName={object.name}
            onSelect={() =>
              onEndSelect({ objectId: object.id, side: "left" })
            }
            selected={endSelected("left")}
          />
        ) : (
          <div className="strand-labels" aria-hidden="true">
            <span>5′</span>
            <span>3′</span>
          </div>
        )}

        <div className="base-pair-strip">
          {bases.map((base, index) => (
            <BasePairCell
              base={base}
              bondEnabled={activeTool === "ecoRI" || activeTool === "munI"}
              bondIndex={index + 1}
              featureType={featureAt(index)}
              folded={isFolded(index)}
              hasBondAfter={index < bases.length - 1}
              invalid={
                invalidBond?.objectId === object.id &&
                invalidBond.bondIndex === index + 1
              }
              invalidSequence={eventSequence}
              key={`${object.id}:base-${index}`}
              objectName={object.name}
              onPreview={setPreviewBondIndex}
              onCut={(bondIndex) => onCut(object.id, bondIndex)}
              overhangPreview={isPreviewOverhang(index)}
              topCutPreview={previewSite?.topBondIndex === index + 1}
              bottomCutPreview={previewSite?.bottomBondIndex === index + 1}
              validCutSite={validCutBonds.has(index + 1)}
            />
          ))}
        </div>

        {rightSelectable ? (
          <StickyEndHandle
            compatible={compatibleEnds.right ?? false}
            disabled={activeTool !== "ligase"}
            end={object.rightEnd}
            objectName={object.name}
            onSelect={() =>
              onEndSelect({ objectId: object.id, side: "right" })
            }
            selected={endSelected("right")}
          />
        ) : (
          <div className="strand-labels ending" aria-hidden="true">
            <span>3′</span>
            <span>5′</span>
          </div>
        )}
      </div>
    </article>
  );
}
