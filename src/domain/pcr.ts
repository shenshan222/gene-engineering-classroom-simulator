import {
  findAllOccurrences,
  reverseComplement,
} from "@/src/domain/sequence";
import type {
  Amplicon,
  Molecule,
  Primer,
  PrimerBindingSite,
} from "@/src/domain/types";

export type PrimerRelation = "same" | "reverseComplement" | "different";

export function comparePrimers(a: Primer, b: Primer): PrimerRelation {
  if (a.sequence5to3 === b.sequence5to3) {
    return "same";
  }
  if (reverseComplement(a.sequence5to3) === b.sequence5to3) {
    return "reverseComplement";
  }
  return "different";
}

export function findPrimerBindings(
  template: Molecule,
  primer: Primer,
): PrimerBindingSite[] {
  const bindings: PrimerBindingSite[] = [];
  for (const start of findAllOccurrences(
    template.topStrand,
    primer.sequence5to3,
  )) {
    bindings.push({
      primerId: primer.id,
      strand: "bottom",
      start,
      end: start + primer.sequence5to3.length,
      extensionDirection: "right",
    });
  }

  const reverseBindingPattern = reverseComplement(primer.sequence5to3);
  for (const start of findAllOccurrences(
    template.topStrand,
    reverseBindingPattern,
  )) {
    bindings.push({
      primerId: primer.id,
      strand: "top",
      start,
      end: start + primer.sequence5to3.length,
      extensionDirection: "left",
    });
  }

  return bindings;
}

export function calculateAmplicons(
  template: Molecule,
  primerA: Primer,
  primerB: Primer,
): Amplicon[] {
  const bindings = [
    ...findPrimerBindings(template, primerA),
    ...findPrimerBindings(template, primerB),
  ];
  const rightward = bindings.filter(
    (binding) => binding.extensionDirection === "right",
  );
  const leftward = bindings.filter(
    (binding) => binding.extensionDirection === "left",
  );
  const products = new Map<string, Amplicon>();

  for (const forward of rightward) {
    for (const reverse of leftward) {
      if (
        forward.primerId === reverse.primerId ||
        forward.start >= reverse.start
      ) {
        continue;
      }
      const start = forward.start;
      const end = reverse.end;
      const product: Amplicon = {
        start,
        end,
        length: end - start,
        forwardPrimerId: forward.primerId,
        reversePrimerId: reverse.primerId,
        sequence: template.topStrand.slice(start, end),
      };
      products.set(
        `${start}:${end}:${forward.primerId}:${reverse.primerId}`,
        product,
      );
    }
  }

  return [...products.values()].sort(
    (a, b) => a.length - b.length || a.start - b.start,
  );
}
