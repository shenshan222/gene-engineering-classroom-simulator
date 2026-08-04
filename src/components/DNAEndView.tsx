import type { DNAEnd } from "@/src/domain/types";

interface DNAEndViewProps {
  end: DNAEnd;
  compact?: boolean;
}

function endTypeLabel(end: DNAEnd): string {
  if (end.type === "blunt") {
    return "平末端";
  }
  return `${end.type === "fivePrime" ? "5′" : "3′"}-${end.sequence5to3}`;
}

export function DNAEndView({ end, compact = false }: DNAEndViewProps) {
  return (
    <span
      className={`dna-end end-${end.type} ${compact ? "compact" : ""}`}
      title={`${endTypeLabel(end)}；${end.protrudingStrand ?? "无突出链"}`}
    >
      {endTypeLabel(end)}
    </span>
  );
}
