import {
  circularSlice,
  normalizeCircularIndex,
} from "@/src/domain/circular";
import type {
  CutResult,
  DNAEnd,
  DNAFragment,
  DigestResult,
  FoldedRegion,
  MolecularCut,
  Molecule,
  OverhangType,
  SequenceFeature,
} from "@/src/domain/types";

interface CutEndPair {
  leftProductEnd: DNAEnd;
  rightProductEnd: DNAEnd;
}

function naturalEnd(side: DNAEnd["side"]): DNAEnd {
  return {
    type: "blunt",
    sequence5to3: "",
    protrudingStrand: null,
    side,
    createdBy: null,
  };
}

export function getCutEndPair(cut: MolecularCut): CutEndPair {
  if (cut.overhangType === "blunt") {
    return {
      leftProductEnd: {
        type: "blunt",
        sequence5to3: "",
        protrudingStrand: null,
        side: "right",
        createdBy: cut.createdBy,
      },
      rightProductEnd: {
        type: "blunt",
        sequence5to3: "",
        protrudingStrand: null,
        side: "left",
        createdBy: cut.createdBy,
      },
    };
  }

  const leftProtrudingStrand =
    cut.overhangType === "fivePrime" ? "bottom" : "top";
  const rightProtrudingStrand =
    cut.overhangType === "fivePrime" ? "top" : "bottom";

  return {
    leftProductEnd: {
      type: cut.overhangType,
      sequence5to3: cut.overhangSequence5to3,
      protrudingStrand: leftProtrudingStrand,
      side: "right",
      createdBy: cut.createdBy,
    },
    rightProductEnd: {
      type: cut.overhangType,
      sequence5to3: cut.overhangSequence5to3,
      protrudingStrand: rightProtrudingStrand,
      side: "left",
      createdBy: cut.createdBy,
    },
  };
}

function sourceIntervals(
  start: number,
  end: number,
  totalLength: number,
): Array<readonly [number, number]> {
  if (start <= end) {
    return [[start, end]];
  }
  return [
    [start, totalLength],
    [0, end],
  ];
}

function sliceFeatures(
  features: readonly SequenceFeature[],
  sliceStart: number,
  sliceEnd: number,
  totalLength: number,
  circular: boolean,
): SequenceFeature[] {
  const pieces: SequenceFeature[] = [];
  const shifts = circular ? [-totalLength, 0, totalLength] : [0];

  for (const feature of features) {
    let pieceIndex = 0;
    for (const [intervalStart, intervalEnd] of sourceIntervals(
      feature.start,
      feature.end,
      totalLength,
    )) {
      for (const shift of shifts) {
        const shiftedStart = intervalStart + shift;
        const shiftedEnd = intervalEnd + shift;
        const overlapStart = Math.max(sliceStart, shiftedStart);
        const overlapEnd = Math.min(sliceEnd, shiftedEnd);

        if (overlapStart < overlapEnd) {
          pieces.push({
            ...feature,
            id: `${feature.id}:slice-${pieceIndex}`,
            start: overlapStart - sliceStart,
            end: overlapEnd - sliceStart,
          });
          pieceIndex += 1;
        }
      }
    }
  }

  return pieces;
}

function sliceFoldedRegions(
  regions: readonly FoldedRegion[],
  sliceStart: number,
  sliceEnd: number,
  totalLength: number,
  circular: boolean,
): FoldedRegion[] {
  const pieces: FoldedRegion[] = [];
  const shifts = circular ? [-totalLength, 0, totalLength] : [0];

  for (const region of regions) {
    for (const [intervalStart, intervalEnd] of sourceIntervals(
      region.start,
      region.end,
      totalLength,
    )) {
      for (const shift of shifts) {
        const overlapStart = Math.max(sliceStart, intervalStart + shift);
        const overlapEnd = Math.min(sliceEnd, intervalEnd + shift);
        if (overlapStart < overlapEnd) {
          pieces.push({
            ...region,
            start: overlapStart - sliceStart,
            end: overlapEnd - sliceStart,
          });
        }
      }
    }
  }

  return pieces;
}

function makeFragment(
  molecule: Molecule,
  start: number,
  end: number,
  leftEnd: DNAEnd,
  rightEnd: DNAEnd,
  fragmentIndex: number,
  circular: boolean,
): DNAFragment {
  const length = end - start;
  const topStrand = circular
    ? circularSlice(molecule.topStrand, start, length)
    : molecule.topStrand.slice(start, end);
  const features = sliceFeatures(
    molecule.features,
    start,
    end,
    molecule.topStrand.length,
    circular,
  );
  const foldedRegions = sliceFoldedRegions(
    molecule.foldedRegions ?? [],
    start,
    end,
    molecule.topStrand.length,
    circular,
  );

  return {
    id: `${molecule.id}:fragment-${fragmentIndex}`,
    name: `${molecule.name} 片段 ${fragmentIndex + 1}`,
    topStrand,
    leftEnd,
    rightEnd,
    orientation: "forward",
    features,
    foldedRegions,
    sourceMoleculeId: molecule.id,
  };
}

function validateAndNormalizeCuts(
  molecule: Molecule,
  cuts: readonly MolecularCut[],
): MolecularCut[] {
  const length = molecule.topStrand.length;
  const normalized = cuts.map((cut) => {
    if (cut.moleculeId !== molecule.id) {
      throw new RangeError("Cut does not belong to the supplied molecule.");
    }

    if (molecule.topology === "circular") {
      return {
        ...cut,
        topBondIndex: normalizeCircularIndex(cut.topBondIndex, length),
        bottomBondIndex: normalizeCircularIndex(cut.bottomBondIndex, length),
      };
    }

    if (
      !Number.isInteger(cut.topBondIndex) ||
      cut.topBondIndex <= 0 ||
      cut.topBondIndex >= length ||
      !Number.isInteger(cut.bottomBondIndex) ||
      cut.bottomBondIndex < 0 ||
      cut.bottomBondIndex > length
    ) {
      throw new RangeError("Linear DNA cut index is outside the molecule.");
    }

    return { ...cut };
  });

  normalized.sort((a, b) => a.topBondIndex - b.topBondIndex);
  for (let index = 1; index < normalized.length; index += 1) {
    if (
      normalized[index - 1].topBondIndex === normalized[index].topBondIndex
    ) {
      throw new RangeError("Two cuts cannot share the same top-strand bond.");
    }
  }

  return normalized;
}

export function digestMolecule(
  molecule: Molecule,
  cuts: readonly MolecularCut[],
): DigestResult {
  if (cuts.length === 0) {
    throw new RangeError("At least one cut is required.");
  }

  const sortedCuts = validateAndNormalizeCuts(molecule, cuts);
  const fragments: DNAFragment[] = [];

  if (molecule.topology === "linear") {
    const boundaries = [
      0,
      ...sortedCuts.map((cut) => cut.topBondIndex),
      molecule.topStrand.length,
    ];

    for (let index = 0; index < boundaries.length - 1; index += 1) {
      const previousCut = sortedCuts[index - 1];
      const nextCut = sortedCuts[index];
      const leftEnd = previousCut
        ? getCutEndPair(previousCut).rightProductEnd
        : naturalEnd("left");
      const rightEnd = nextCut
        ? getCutEndPair(nextCut).leftProductEnd
        : naturalEnd("right");
      fragments.push(
        makeFragment(
          molecule,
          boundaries[index],
          boundaries[index + 1],
          leftEnd,
          rightEnd,
          index,
          false,
        ),
      );
    }
  } else {
    const totalLength = molecule.topStrand.length;
    for (let index = 0; index < sortedCuts.length; index += 1) {
      const currentCut = sortedCuts[index];
      const nextCut = sortedCuts[(index + 1) % sortedCuts.length];
      const start = currentCut.topBondIndex;
      const end =
        nextCut.topBondIndex > start
          ? nextCut.topBondIndex
          : nextCut.topBondIndex + totalLength;
      fragments.push(
        makeFragment(
          molecule,
          start,
          end,
          getCutEndPair(currentCut).rightProductEnd,
          getCutEndPair(nextCut).leftProductEnd,
          index,
          true,
        ),
      );
    }
  }

  return {
    moleculeId: molecule.id,
    sourceTopology: molecule.topology,
    cuts: sortedCuts,
    fragments,
  };
}

export function manualCut(
  molecule: Molecule,
  bondIndex: number,
): CutResult {
  const length = molecule.topStrand.length;
  const valid = molecule.topology === "circular"
    ? Number.isInteger(bondIndex) && bondIndex >= 0 && bondIndex <= length
    : Number.isInteger(bondIndex) && bondIndex > 0 && bondIndex < length;

  if (!valid) {
    return { ok: false, reason: "INVALID_BOND_INDEX" };
  }

  const normalizedBond =
    molecule.topology === "circular"
      ? normalizeCircularIndex(bondIndex, length)
      : bondIndex;
  const cut: MolecularCut = {
    id: `${molecule.id}:manual:${normalizedBond}`,
    moleculeId: molecule.id,
    topBondIndex: normalizedBond,
    bottomBondIndex: normalizedBond,
    overhangType: "blunt" satisfies OverhangType,
    overhangSequence5to3: "",
    createdBy: "manualScissors",
  };
  const digest = digestMolecule(molecule, [cut]);

  return { ok: true, cut, fragments: digest.fragments };
}
