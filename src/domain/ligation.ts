import { digestMolecule } from "@/src/domain/cutting";
import { reverseComplement } from "@/src/domain/sequence";
import type {
  DNAEnd,
  DNAFragment,
  FoldedRegion,
  InsertCandidate,
  LigationCheck,
  MolecularCut,
  Molecule,
  MoleculeSegment,
  OpenedRecipient,
  SequenceFeature,
} from "@/src/domain/types";

function flipStrand(
  strand: DNAEnd["protrudingStrand"],
): DNAEnd["protrudingStrand"] {
  if (strand === "top") {
    return "bottom";
  }
  if (strand === "bottom") {
    return "top";
  }
  return null;
}

function flipEnd(end: DNAEnd, side: DNAEnd["side"]): DNAEnd {
  return {
    ...end,
    side,
    protrudingStrand: flipStrand(end.protrudingStrand),
  };
}

export function flipFragment(fragment: DNAFragment): DNAFragment {
  const length = fragment.topStrand.length;
  const features = fragment.features.map((feature) => ({
    ...feature,
    start: length - feature.end,
    end: length - feature.start,
  }));
  const foldedRegions = (fragment.foldedRegions ?? []).map((region) => ({
    ...region,
    start: length - region.end,
    end: length - region.start,
  }));

  features.sort((a, b) => a.start - b.start);
  foldedRegions.sort((a, b) => a.start - b.start);

  return {
    ...fragment,
    id: `${fragment.id}:flipped`,
    topStrand: reverseComplement(fragment.topStrand),
    leftEnd: flipEnd(fragment.rightEnd, "left"),
    rightEnd: flipEnd(fragment.leftEnd, "right"),
    orientation:
      fragment.orientation === "forward" ? "reverse" : "forward",
    features,
    foldedRegions,
  };
}

export function canLigate(a: DNAEnd, b: DNAEnd): LigationCheck {
  if (a.side === b.side) {
    return { compatible: false, reason: "END_SIDES_DO_NOT_MEET" };
  }

  if (a.type !== b.type) {
    return { compatible: false, reason: "OVERHANG_TYPE_MISMATCH" };
  }

  if (a.type === "blunt" && b.type === "blunt") {
    return { compatible: true };
  }

  if (a.sequence5to3 !== b.sequence5to3) {
    return { compatible: false, reason: "OVERHANG_SEQUENCE_MISMATCH" };
  }

  if (
    a.protrudingStrand === null ||
    b.protrudingStrand === null ||
    a.protrudingStrand === b.protrudingStrand
  ) {
    return {
      compatible: false,
      reason: "PROTRUDING_STRANDS_DO_NOT_MEET",
    };
  }

  return { compatible: true };
}

function toSegment(fragment: DNAFragment): MoleculeSegment {
  return {
    topStrand: fragment.topStrand,
    features: [...fragment.features],
    foldedRegions: [...(fragment.foldedRegions ?? [])],
  };
}

function emptySegment(): MoleculeSegment {
  return {
    topStrand: "",
    features: [],
    foldedRegions: [],
  };
}

export function openRecipientAtCut(
  molecule: Molecule,
  cut: MolecularCut,
): OpenedRecipient {
  const digest = digestMolecule(molecule, [cut]);

  if (molecule.topology === "linear") {
    const [prefix, suffix] = digest.fragments;
    if (!prefix || !suffix) {
      throw new Error("A linear recipient cut must produce two fragments.");
    }
    return {
      id: `${molecule.id}:opened:${cut.id}`,
      name: molecule.name,
      sourceMoleculeId: molecule.id,
      sourceTaskId: molecule.sourceTaskId,
      finalTopology: "linear",
      prefix: toSegment(prefix),
      suffix: toSegment(suffix),
      prefixEnd: prefix.rightEnd,
      suffixEnd: suffix.leftEnd,
    };
  }

  const [backbone] = digest.fragments;
  if (!backbone) {
    throw new Error("A circular recipient cut must produce one backbone.");
  }
  return {
    id: `${molecule.id}:opened:${cut.id}`,
    name: molecule.name,
    sourceMoleculeId: molecule.id,
    sourceTaskId: molecule.sourceTaskId,
    finalTopology: "circular",
    prefix: toSegment(backbone),
    suffix: emptySegment(),
    prefixEnd: backbone.rightEnd,
    suffixEnd: backbone.leftEnd,
  };
}

function shiftFeatures(
  features: readonly SequenceFeature[],
  offset: number,
): SequenceFeature[] {
  return features.map((feature) => ({
    ...feature,
    start: feature.start + offset,
    end: feature.end + offset,
  }));
}

function shiftFoldedRegions(
  regions: readonly FoldedRegion[],
  offset: number,
): FoldedRegion[] {
  return regions.map((region) => ({
    ...region,
    start: region.start + offset,
    end: region.end + offset,
  }));
}

function assembleProduct(
  recipient: OpenedRecipient,
  insert: DNAFragment,
): Molecule {
  const prefixLength = recipient.prefix.topStrand.length;
  const insertLength = insert.topStrand.length;
  return {
    id: `${recipient.sourceMoleculeId}:recombinant:${insert.id}`,
    name: `重组${recipient.name}`,
    topology: recipient.finalTopology,
    topStrand:
      recipient.prefix.topStrand +
      insert.topStrand +
      recipient.suffix.topStrand,
    features: [
      ...shiftFeatures(recipient.prefix.features, 0),
      ...shiftFeatures(insert.features, prefixLength),
      ...shiftFeatures(
        recipient.suffix.features,
        prefixLength + insertLength,
      ),
    ],
    foldedRegions: [
      ...shiftFoldedRegions(recipient.prefix.foldedRegions, 0),
      ...shiftFoldedRegions(insert.foldedRegions ?? [], prefixLength),
      ...shiftFoldedRegions(
        recipient.suffix.foldedRegions,
        prefixLength + insertLength,
      ),
    ],
    sourceTaskId: recipient.sourceTaskId,
  };
}

export function tryInsert(
  recipient: OpenedRecipient,
  insert: DNAFragment,
): InsertCandidate[] {
  const orientations = [insert, flipFragment(insert)];
  const candidates: InsertCandidate[] = [];

  for (const orientedInsert of orientations) {
    const leftJunction = canLigate(
      recipient.prefixEnd,
      orientedInsert.leftEnd,
    );
    const rightJunction = canLigate(
      orientedInsert.rightEnd,
      recipient.suffixEnd,
    );

    if (leftJunction.compatible && rightJunction.compatible) {
      candidates.push({
        orientation: orientedInsert.orientation,
        insert: orientedInsert,
        leftJunction,
        rightJunction,
        product: assembleProduct(recipient, orientedInsert),
      });
    }
  }

  return candidates;
}
