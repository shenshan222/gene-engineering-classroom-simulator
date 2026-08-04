import { describe, expect, it } from "vitest";

import {
  complement,
  findAllOccurrences,
  gcContent,
  normalizeDNASequence,
  reverse,
  reverseComplement,
} from "@/src/domain/sequence";

describe("DNA sequence utilities", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeDNASequence(" at gc\n")).toBe("ATGC");
  });

  it("rejects empty or invalid sequences", () => {
    expect(() => normalizeDNASequence("")).toThrow(RangeError);
    expect(() => normalizeDNASequence("ATUG")).toThrow(RangeError);
  });

  it("calculates complement without changing strand order", () => {
    expect(complement("ATGC")).toBe("TACG");
  });

  it("reverses and reverse-complements a strand", () => {
    expect(reverse("ATGC")).toBe("CGTA");
    expect(reverseComplement("ATGC")).toBe("GCAT");
  });

  it("matches the complementary strand in worksheet sequence 1", () => {
    expect(complement("ATAGCATGCTATCCATGAATTCGGCATAC")).toBe(
      "TATCGTACGATAGGTACTTAAGCCGTATG",
    );
  });

  it("calculates GC content as a ratio", () => {
    expect(gcContent("ATGC")).toBe(0.5);
  });

  it("finds overlapping occurrences in linear DNA", () => {
    expect(findAllOccurrences("AAAA", "AA")).toEqual([0, 1, 2]);
  });

  it("finds recognition sites that cross a circular boundary", () => {
    expect(findAllOccurrences("AATTCAAG", "GAATTC", true)).toEqual([7]);
    expect(findAllOccurrences("AATTCAAG", "GAATTC", false)).toEqual([]);
  });
});
