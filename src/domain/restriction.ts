import { normalizeCircularIndex } from "@/src/domain/circular";
import { digestMolecule } from "@/src/domain/cutting";
import { findAllOccurrences } from "@/src/domain/sequence";
import type {
  CutResult,
  Molecule,
  OverhangType,
  RestrictionEnzyme,
  RestrictionSite,
} from "@/src/domain/types";

function overhangType(enzyme: RestrictionEnzyme): OverhangType {
  if (enzyme.topCutOffset === enzyme.bottomCutOffset) {
    return "blunt";
  }
  return enzyme.topCutOffset < enzyme.bottomCutOffset
    ? "fivePrime"
    : "threePrime";
}

export function scanRestrictionSites(
  molecule: Molecule,
  enzyme: RestrictionEnzyme,
): RestrictionSite[] {
  const circular = molecule.topology === "circular";
  const length = molecule.topStrand.length;
  const sequenceStart = Math.min(
    enzyme.topCutOffset,
    enzyme.bottomCutOffset,
  );
  const sequenceEnd = Math.max(
    enzyme.topCutOffset,
    enzyme.bottomCutOffset,
  );

  return findAllOccurrences(
    molecule.topStrand,
    enzyme.recognition,
    circular,
  ).map((siteStart) => {
    const rawTopBond = siteStart + enzyme.topCutOffset;
    const rawBottomBond = siteStart + enzyme.bottomCutOffset;
    return {
      id: `${molecule.id}:${enzyme.id}:${siteStart}`,
      moleculeId: molecule.id,
      enzymeId: enzyme.id,
      recognition: enzyme.recognition,
      siteStart,
      topBondIndex: circular
        ? normalizeCircularIndex(rawTopBond, length)
        : rawTopBond,
      bottomBondIndex: circular
        ? normalizeCircularIndex(rawBottomBond, length)
        : rawBottomBond,
      overhangType: overhangType(enzyme),
      overhangSequence5to3:
        enzyme.topCutOffset === enzyme.bottomCutOffset
          ? ""
          : enzyme.recognition.slice(sequenceStart, sequenceEnd),
      createdBy: enzyme.id,
    };
  });
}

export function applyRestrictionCut(
  molecule: Molecule,
  enzyme: RestrictionEnzyme,
  siteStart: number,
): CutResult {
  const normalizedStart =
    molecule.topology === "circular"
      ? normalizeCircularIndex(siteStart, molecule.topStrand.length)
      : siteStart;
  const site = scanRestrictionSites(molecule, enzyme).find(
    (candidate) => candidate.siteStart === normalizedStart,
  );

  if (!site) {
    return { ok: false, reason: "RECOGNITION_SITE_MISMATCH" };
  }

  const digest = digestMolecule(molecule, [site]);
  return {
    ok: true,
    cut: site,
    fragments: digest.fragments,
  };
}
