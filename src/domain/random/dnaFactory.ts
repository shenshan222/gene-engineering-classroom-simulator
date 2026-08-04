import type { SeededRandom } from "@/src/domain/random/prng";
import { gcContent } from "@/src/domain/sequence";

const BASES = ["A", "T", "C", "G"] as const;

export function randomDNA(length: number, rng: SeededRandom): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new RangeError("DNA length must be a positive integer.");
  }
  return Array.from({ length }, () => rng.pick(BASES)).join("");
}

export function randomDNAWithoutMotifs(
  length: number,
  forbiddenMotifs: readonly string[],
  rng: SeededRandom,
): string {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const sequence = randomDNA(length, rng.fork(`background-${attempt}`));
    const gc = gcContent(sequence);
    if (
      gc >= 0.3 &&
      gc <= 0.7 &&
      forbiddenMotifs.every((motif) => !sequence.includes(motif))
    ) {
      return sequence;
    }
  }
  throw new Error("Unable to create a motif-free classroom DNA sequence.");
}

export function insertMotif(
  sequence: string,
  motif: string,
  position: number,
): string {
  if (!Number.isInteger(position) || position < 0 || position > sequence.length) {
    throw new RangeError("Motif insertion position is outside the sequence.");
  }
  return sequence.slice(0, position) + motif + sequence.slice(position);
}
