import { describe, expect, it } from "vitest";

import { stickyEndDisplay } from "@/src/components/activity1/stickyEndDisplay";
import type { DNAEnd } from "@/src/domain/types";

function end(overrides: Partial<DNAEnd>): DNAEnd {
  return {
    type: "fivePrime",
    sequence5to3: "AATT",
    protrudingStrand: "top",
    side: "left",
    createdBy: "ecoRI",
    ...overrides,
  };
}

describe("sticky-end display model", () => {
  it("shows a left top-strand EcoRI overhang in the 5-prime direction", () => {
    const display = stickyEndDisplay(end({ side: "left" }));

    expect(display.top).toMatchObject({
      bases: ["A", "A", "T", "T"],
      protruding: true,
      terminalLabel: "5′",
      terminalPosition: "start",
    });
    expect(display.bottom).toMatchObject({
      bases: [null, null, null, null],
      protruding: false,
      terminalLabel: "3′",
      terminalPosition: "end",
    });
  });

  it("reverses bottom-strand letters for a right EcoRI overhang", () => {
    const display = stickyEndDisplay(
      end({ side: "right", protrudingStrand: "bottom" }),
    );

    expect(display.top).toMatchObject({
      bases: [null, null, null, null],
      terminalLabel: "3′",
      terminalPosition: "start",
    });
    expect(display.bottom).toMatchObject({
      bases: ["T", "T", "A", "A"],
      protruding: true,
      terminalLabel: "5′",
      terminalPosition: "end",
    });
  });

  it("places both labels on the exposed side for a blunt end", () => {
    const display = stickyEndDisplay(
      end({
        type: "blunt",
        sequence5to3: "",
        protrudingStrand: null,
        side: "right",
      }),
    );

    expect(display.top).toMatchObject({
      bases: [null],
      protruding: false,
      terminalLabel: "3′",
      terminalPosition: "end",
    });
    expect(display.bottom).toMatchObject({
      bases: [null],
      protruding: false,
      terminalLabel: "5′",
      terminalPosition: "end",
    });
  });
});
