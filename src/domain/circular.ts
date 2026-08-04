import type { Molecule } from "@/src/domain/types";
import { normalizeDNASequence } from "@/src/domain/sequence";

export function normalizeCircularIndex(index: number, length: number): number {
  if (!Number.isInteger(index)) {
    throw new RangeError("Circular index must be an integer.");
  }
  if (length <= 0) {
    throw new RangeError("Circular sequence length must be positive.");
  }
  return ((index % length) + length) % length;
}

export function rotateCircularSequence(
  input: string,
  startIndex: number,
): string {
  const sequence = normalizeDNASequence(input);
  const start = normalizeCircularIndex(startIndex, sequence.length);
  return sequence.slice(start) + sequence.slice(0, start);
}

export function circularSlice(
  input: string,
  startIndex: number,
  length: number,
): string {
  const sequence = normalizeDNASequence(input);
  if (!Number.isInteger(length) || length < 0 || length > sequence.length) {
    throw new RangeError(
      "Circular slice length must be between zero and the sequence length.",
    );
  }
  if (length === 0) {
    return "";
  }
  return rotateCircularSequence(sequence, startIndex).slice(0, length);
}

export function circularizeMolecule(molecule: Molecule): Molecule {
  return {
    ...molecule,
    topology: "circular",
    features: [...molecule.features],
    foldedRegions: molecule.foldedRegions
      ? [...molecule.foldedRegions]
      : undefined,
  };
}
