"use client";

import { DNAEndView } from "@/src/components/DNAEndView";
import {
  usePointerDrag,
  type DragPayload,
  type DropTarget,
} from "@/src/hooks/usePointerDrag";
import type { DNAFragment, OpenedRecipient } from "@/src/domain/types";

interface DraggableFragmentProps {
  fragment: DNAFragment;
  selected: boolean;
  onSelect: (fragmentId: string) => void;
  onFlip: (fragmentId: string) => void;
  onDrop: (payload: DragPayload, target: DropTarget) => void;
}

function DraggableFragment({
  fragment,
  selected,
  onSelect,
  onFlip,
  onDrop,
}: DraggableFragmentProps) {
  const drag = usePointerDrag({
    payload: { type: "fragment", id: fragment.id },
    onDrop,
  });

  return (
    <article
      className={`fragment-card ${selected ? "selected" : ""} ${
        drag.dragging ? "dragging" : ""
      }`}
      onClick={(event) => {
        if (drag.consumeClick()) {
          event.preventDefault();
          return;
        }
        onSelect(fragment.id);
      }}
      style={drag.style}
      {...drag.pointerHandlers}
    >
      <header>
        <div>
          <strong>{fragment.name}</strong>
          <small>
            {fragment.topStrand.length} bp ·{" "}
            {fragment.orientation === "forward" ? "正向" : "反向"}
          </small>
        </div>
        <span className="drag-grip" aria-hidden="true">
          ⠿
        </span>
      </header>
      <div className="fragment-ends">
        <DNAEndView compact end={fragment.leftEnd} />
        <span className="fragment-line" aria-hidden="true" />
        <DNAEndView compact end={fragment.rightEnd} />
      </div>
      <code title={fragment.topStrand}>
        5′-{fragment.topStrand.slice(0, 34)}
        {fragment.topStrand.length > 34 ? "…" : ""}-3′
      </code>
      <div className="fragment-actions">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onSelect(fragment.id);
          }}
          type="button"
        >
          {selected ? "已选择" : "选择"}
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onFlip(fragment.id);
          }}
          type="button"
        >
          翻转 180°
        </button>
      </div>
    </article>
  );
}

interface FragmentTrayProps {
  fragments: readonly DNAFragment[];
  selectedFragmentId: string | null;
  openedRecipient: OpenedRecipient | null;
  onSelect: (fragmentId: string) => void;
  onFlip: (fragmentId: string) => void;
  onDrop: (payload: DragPayload, target: DropTarget) => void;
  onLigate: () => void;
}

export function FragmentTray({
  fragments,
  selectedFragmentId,
  openedRecipient,
  onSelect,
  onFlip,
  onDrop,
  onLigate,
}: FragmentTrayProps) {
  return (
    <section className="panel-section" aria-labelledby="fragment-title">
      <div className="section-heading">
        <span className="step-number">04</span>
        <h2 id="fragment-title">片段托盘</h2>
      </div>
      {fragments.length === 0 ? (
        <div className="empty-state">
          供体 DNA 至少切开两处后，这里会出现可拖动片段。
        </div>
      ) : (
        <div className="fragment-list">
          {fragments.map((fragment) => (
            <DraggableFragment
              fragment={fragment}
              key={fragment.id}
              onDrop={onDrop}
              onFlip={onFlip}
              onSelect={onSelect}
              selected={fragment.id === selectedFragmentId}
            />
          ))}
        </div>
      )}

      <div
        className={`recipient-gap ${openedRecipient ? "ready" : ""}`}
        data-drop-kind="recipient-gap"
      >
        <strong>
          {openedRecipient ? `${openedRecipient.name} 的插入口` : "等待受体切口"}
        </strong>
        <p>
          {openedRecipient
            ? "把片段拖到这里，或选择片段后点击连接。"
            : "受体 DNA 恰好切开一处后，将形成两个待连接末端。"}
        </p>
        {openedRecipient && (
          <div className="gap-ends">
            <DNAEndView end={openedRecipient.prefixEnd} />
            <span>插入片段</span>
            <DNAEndView end={openedRecipient.suffixEnd} />
          </div>
        )}
      </div>

      <button
        className="primary full-width"
        disabled={!openedRecipient || !selectedFragmentId}
        onClick={onLigate}
        type="button"
      >
        使用 DNA 连接酶
      </button>
    </section>
  );
}
