import { stickyEndDisplay } from "@/src/components/activity1/stickyEndDisplay";
import type { DNAEnd } from "@/src/domain/types";

interface StickyEndHandleProps {
  compatible: boolean;
  disabled: boolean;
  end: DNAEnd;
  objectName: string;
  selected: boolean;
  onSelect: () => void;
}

export function StickyEndHandle({
  compatible,
  disabled,
  end,
  objectName,
  selected,
  onSelect,
}: StickyEndHandleProps) {
  const display = stickyEndDisplay(end);
  const endName =
    end.type === "blunt"
      ? "平末端"
      : `${end.type === "fivePrime" ? "5′" : "3′"}-${end.sequence5to3} 黏性末端`;

  return (
    <button
      aria-label={`选择${objectName}${end.side === "left" ? "左侧" : "右侧"}${endName}${compatible ? "，可连接" : ""}`}
      aria-pressed={selected}
      className={`sticky-end ${end.side} end-${end.type} strand-${end.protrudingStrand ?? "none"} ${selected ? "selected" : ""} ${compatible ? "compatible" : ""}`}
      data-no-drag
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      {[display.top, display.bottom].map((row) => (
        <span
          aria-hidden="true"
          className={`sticky-end-row ${row.strand} ${row.protruding ? "protruding" : "recessed"}`}
          key={row.strand}
        >
          <span className="sticky-end-terminal">
            {row.terminalPosition === "start" ? row.terminalLabel : ""}
          </span>
          <span className="sticky-end-bases">
            {row.bases.map((base, index) => (
              <span
                className={`sticky-end-base ${base ? "unpaired" : "gap"}`}
                key={`${row.strand}-${index}`}
              >
                {base ?? ""}
              </span>
            ))}
          </span>
          <span className="sticky-end-terminal">
            {row.terminalPosition === "end" ? row.terminalLabel : ""}
          </span>
        </span>
      ))}
      {compatible && (
        <span aria-hidden="true" className="end-compatible-mark">
          ✓
        </span>
      )}
    </button>
  );
}
