import type { DNAEnd } from "@/src/domain/types";

export type DisplayStrand = "top" | "bottom";

export interface StickyEndRowDisplay {
  strand: DisplayStrand;
  bases: readonly (string | null)[];
  protruding: boolean;
  terminalLabel: "3′" | "5′";
  terminalPosition: "start" | "end";
}

export interface StickyEndDisplay {
  top: StickyEndRowDisplay;
  bottom: StickyEndRowDisplay;
  overhangLength: number;
}

function terminalLabel(
  side: DNAEnd["side"],
  strand: DisplayStrand,
): "3′" | "5′" {
  if (strand === "top") {
    return side === "left" ? "5′" : "3′";
  }
  return side === "left" ? "3′" : "5′";
}

function rowDisplay(
  end: DNAEnd,
  strand: DisplayStrand,
  overhangLength: number,
): StickyEndRowDisplay {
  const protruding = end.type !== "blunt" && end.protrudingStrand === strand;
  const displayedSequence =
    strand === "bottom"
      ? Array.from(end.sequence5to3).reverse()
      : Array.from(end.sequence5to3);
  const terminalPosition =
    end.type === "blunt"
      ? end.side === "left"
        ? "start"
        : "end"
      : end.side === "left"
        ? protruding
          ? "start"
          : "end"
        : protruding
          ? "end"
          : "start";

  return {
    strand,
    bases: protruding
      ? displayedSequence
      : Array.from({ length: overhangLength }, () => null),
    protruding,
    terminalLabel: terminalLabel(end.side, strand),
    terminalPosition,
  };
}

export function stickyEndDisplay(end: DNAEnd): StickyEndDisplay {
  const overhangLength = Math.max(1, end.sequence5to3.length);
  return {
    top: rowDisplay(end, "top", overhangLength),
    bottom: rowDisplay(end, "bottom", overhangLength),
    overhangLength,
  };
}
