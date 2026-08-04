import { findRestrictionEnzyme } from "@/src/content/enzymeLibrary";
import { circularizeMolecule } from "@/src/domain/circular";
import { digestMolecule } from "@/src/domain/cutting";
import { openRecipientAtCut, tryInsert } from "@/src/domain/ligation";
import { calculateAmplicons } from "@/src/domain/pcr";
import {
  productSignature,
  productSignatureKey,
} from "@/src/domain/random/canonical";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type {
  LigationLearningTask,
  Molecule,
  Orientation,
  PCRLearningTask,
  Primer,
  ProductSignature,
} from "@/src/domain/types";

export interface LigationSolution {
  product: Molecule;
  signature: ProductSignature;
  orientation: Orientation;
  recipientSiteStart: number;
  insertFragmentId: string;
}

export interface PCRSolution {
  templateId: string;
  primerPair: readonly [string, string];
  amplicons: ReturnType<typeof calculateAmplicons>;
}

function includesFeature(molecule: Molecule, featureId: string): boolean {
  return molecule.features.some(
    (feature) =>
      feature.id === featureId || feature.id.startsWith(`${featureId}:`),
  );
}

export function solveLigationTask(
  task: LigationLearningTask,
): LigationSolution[] {
  const rule = task.completionRule;
  if (!rule) {
    throw new Error(`Task ${task.id} has no ligation completion rule.`);
  }
  const initialRecipient = task.initialMolecules.find(
    (molecule) => molecule.id === rule.recipientMoleculeId,
  );
  const donor = task.initialMolecules.find(
    (molecule) => molecule.id === rule.donorMoleculeId,
  );
  const recipientEnzyme = findRestrictionEnzyme(rule.recipientEnzymeId);
  const donorEnzyme = findRestrictionEnzyme(rule.donorEnzymeId);
  if (!initialRecipient || !donor || !recipientEnzyme || !donorEnzyme) {
    return [];
  }

  const recipient =
    rule.finalTopology === "circular" && initialRecipient.topology === "linear"
      ? circularizeMolecule(initialRecipient)
      : initialRecipient;
  const recipientSites = scanRestrictionSites(recipient, recipientEnzyme);
  const donorSites = scanRestrictionSites(donor, donorEnzyme);
  if (recipientSites.length === 0 || donorSites.length < 2) {
    return [];
  }
  const donorFragments = digestMolecule(donor, donorSites).fragments;
  const solutions = new Map<string, LigationSolution>();

  for (const site of recipientSites) {
    const opened = openRecipientAtCut(recipient, site);
    for (const fragment of donorFragments) {
      for (const candidate of tryInsert(opened, fragment)) {
        if (
          candidate.product.topology !== rule.finalTopology ||
          !rule.requiredFeatureIds.every((id) =>
            includesFeature(candidate.product, id),
          )
        ) {
          continue;
        }
        const signature = productSignature(
          candidate.product,
          rule.requiredFeatureIds,
        );
        const key = productSignatureKey(signature);
        solutions.set(key, {
          product: candidate.product,
          signature,
          orientation: candidate.orientation,
          recipientSiteStart: site.siteStart,
          insertFragmentId: fragment.id,
        });
      }
    }
  }

  return [...solutions.values()];
}

function orderedPrimerPair(
  first: Primer,
  second: Primer,
): readonly [string, string] {
  return first.id < second.id
    ? [first.id, second.id]
    : [second.id, first.id];
}

export function solvePCRTask(task: PCRLearningTask): PCRSolution[] {
  const solutions: PCRSolution[] = [];
  for (const template of task.templateMolecules) {
    for (let firstIndex = 0; firstIndex < task.primers.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < task.primers.length;
        secondIndex += 1
      ) {
        const first = task.primers[firstIndex];
        const second = task.primers[secondIndex];
        const amplicons = calculateAmplicons(template, first, second);
        if (amplicons.length > 0) {
          solutions.push({
            templateId: template.id,
            primerPair: orderedPrimerPair(first, second),
            amplicons,
          });
        }
      }
    }
  }
  return solutions;
}
