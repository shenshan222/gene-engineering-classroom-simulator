import { describe, expect, it } from "vitest";

import { getRestrictionEnzyme } from "@/src/content/enzymeLibrary";
import { getWorksheetTask } from "@/src/content/worksheetTasks";
import { circularizeMolecule } from "@/src/domain/circular";
import { digestMolecule, manualCut } from "@/src/domain/cutting";
import {
  canLigate,
  flipFragment,
  openRecipientAtCut,
  tryInsert,
} from "@/src/domain/ligation";
import { reverseComplement } from "@/src/domain/sequence";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type {
  DNAFragment,
  LigationLearningTask,
  Molecule,
} from "@/src/domain/types";

function getLigationTask(taskId: string): LigationLearningTask {
  const task = getWorksheetTask(taskId);
  if (!task || task.taskKind !== "ligation") {
    throw new Error(`Missing ligation task: ${taskId}`);
  }
  return task;
}

function donorInsert(
  donor: Molecule,
  enzymeId: "ecoRI" | "munI",
): DNAFragment {
  const sites = scanRestrictionSites(
    donor,
    getRestrictionEnzyme(enzymeId),
  );
  const digest = digestMolecule(donor, sites);
  const insert = digest.fragments[1];
  if (!insert) {
    throw new Error("Expected a fragment between two donor cuts.");
  }
  return insert;
}

describe("fragment orientation and ligation", () => {
  const ecoRI = getRestrictionEnzyme("ecoRI");

  it("flips sequence, features and cohesive ends together", () => {
    const task = getLigationTask("worksheet-4-ecori-muni");
    const insert = donorInsert(task.initialMolecules[1], "ecoRI");
    const flipped = flipFragment(insert);

    expect(flipped.orientation).toBe("reverse");
    expect(flipped.topStrand).toBe(reverseComplement(insert.topStrand));
    expect(flipped.leftEnd.side).toBe("left");
    expect(flipped.leftEnd.protrudingStrand).toBe(
      insert.rightEnd.protrudingStrand === "top" ? "bottom" : "top",
    );
    expect(flipped.features[0].end - flipped.features[0].start).toBe(18);
  });

  it("rejects cohesive-to-blunt ligation", () => {
    const task = getLigationTask("worksheet-1-linear-ecori");
    const target = task.initialMolecules[0];
    const [site] = scanRestrictionSites(target, ecoRI);
    const cohesive = digestMolecule(target, [site]).fragments[0].rightEnd;
    const manual = manualCut(target, 5);
    if (!manual.ok) {
      throw new Error("Expected a manual cut.");
    }
    const blunt = manual.fragments[1].leftEnd;

    expect(canLigate(cohesive, blunt)).toEqual({
      compatible: false,
      reason: "OVERHANG_TYPE_MISMATCH",
    });
  });

  it("completes worksheet activity 1 in either insert orientation", () => {
    const task = getLigationTask("worksheet-1-linear-ecori");
    const target = task.initialMolecules[0];
    const donor = task.initialMolecules[1];
    const [targetSite] = scanRestrictionSites(target, ecoRI);
    const recipient = openRecipientAtCut(target, targetSite);
    const insert = donorInsert(donor, "ecoRI");
    const candidates = tryInsert(recipient, insert);

    expect(candidates).toHaveLength(2);
    expect(candidates.map((candidate) => candidate.orientation)).toEqual([
      "forward",
      "reverse",
    ]);
    for (const candidate of candidates) {
      expect(candidate.product.topology).toBe("linear");
      expect(candidate.product.topStrand).toHaveLength(
        target.topStrand.length + insert.topStrand.length,
      );
      expect(candidate.leftJunction.compatible).toBe(true);
      expect(candidate.rightJunction.compatible).toBe(true);
    }
  });

  it("completes worksheet activity 2 as a circular recombinant", () => {
    const task = getLigationTask("worksheet-2-circular-ecori");
    const target = circularizeMolecule(task.initialMolecules[0]);
    const donor = task.initialMolecules[1];
    const [targetSite] = scanRestrictionSites(target, ecoRI);
    const recipient = openRecipientAtCut(target, targetSite);
    const insert = donorInsert(donor, "ecoRI");
    const [candidate] = tryInsert(recipient, insert);

    expect(candidate).toBeDefined();
    expect(candidate.product.topology).toBe("circular");
    expect(candidate.product.topStrand).toHaveLength(
      target.topStrand.length + insert.topStrand.length,
    );
  });

  it("completes activity 5 with EcoRI/MunI compatible ends", () => {
    const task = getLigationTask("worksheet-4-ecori-muni");
    const plasmid = circularizeMolecule(task.initialMolecules[0]);
    const targetGene = task.initialMolecules[1];
    const munI = getRestrictionEnzyme("munI");
    const [plasmidSite] = scanRestrictionSites(plasmid, munI);
    const recipient = openRecipientAtCut(plasmid, plasmidSite);
    const insert = donorInsert(targetGene, "ecoRI");
    const [candidate] = tryInsert(recipient, insert);

    expect(candidate).toBeDefined();
    expect(candidate.product.topology).toBe("circular");
    expect(
      candidate.product.features.some((feature) => feature.type === "marker"),
    ).toBe(true);
    expect(
      candidate.product.features.some((feature) => feature.type === "gene"),
    ).toBe(true);

    const circularJunctionSequence =
      candidate.product.topStrand + candidate.product.topStrand.slice(0, 5);
    expect(circularJunctionSequence).toContain("CAATTC");
    expect(circularJunctionSequence).toContain("GAATTG");
  });
});
