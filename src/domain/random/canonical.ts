import { reverseComplement } from "@/src/domain/sequence";
import type { Molecule, ProductSignature } from "@/src/domain/types";

function rotations(sequence: string): string[] {
  return Array.from(
    { length: sequence.length },
    (_, index) => sequence.slice(index) + sequence.slice(0, index),
  );
}

export function canonicalCircularSequence(sequence: string): string {
  return [...rotations(sequence), ...rotations(reverseComplement(sequence))].sort()[0];
}

export function productSignature(
  molecule: Molecule,
  requiredFeatureIds: readonly string[] = [],
): ProductSignature {
  return {
    topology: molecule.topology,
    canonicalSequence:
      molecule.topology === "circular"
        ? canonicalCircularSequence(molecule.topStrand)
        : molecule.topStrand,
    requiredFeatureIds: [...requiredFeatureIds].sort(),
  };
}

export function productSignatureKey(signature: ProductSignature): string {
  return `${signature.topology}:${signature.canonicalSequence}:${[
    ...signature.requiredFeatureIds,
  ]
    .sort()
    .join(",")}`;
}
