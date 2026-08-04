import { describe, expect, it } from "vitest";

import { getRestrictionEnzyme } from "@/src/content/enzymeLibrary";
import { getWorksheetTask } from "@/src/content/worksheetTasks";
import { circularizeMolecule } from "@/src/domain/circular";
import { manualCut } from "@/src/domain/cutting";
import {
  applyRestrictionCut,
  scanRestrictionSites,
} from "@/src/domain/restriction";
import type { LigationLearningTask, Molecule } from "@/src/domain/types";

function getLigationTask(taskId: string): LigationLearningTask {
  const task = getWorksheetTask(taskId);
  if (!task || task.taskKind !== "ligation") {
    throw new Error(`Missing ligation task: ${taskId}`);
  }
  return task;
}

describe("restriction site scanning and single cuts", () => {
  const ecoRI = getRestrictionEnzyme("ecoRI");

  it("finds the worksheet activity 1 EcoRI sites", () => {
    const task = getLigationTask("worksheet-1-linear-ecori");
    expect(scanRestrictionSites(task.initialMolecules[0], ecoRI)).toHaveLength(
      1,
    );
    expect(scanRestrictionSites(task.initialMolecules[1], ecoRI)).toHaveLength(
      2,
    );
  });

  it("rejects a restriction enzyme dropped outside its recognition site", () => {
    const task = getLigationTask("worksheet-1-linear-ecori");
    expect(applyRestrictionCut(task.initialMolecules[0], ecoRI, 0)).toEqual({
      ok: false,
      reason: "RECOGNITION_SITE_MISMATCH",
    });
  });

  it("creates complementary 5-prime AATT ends after an EcoRI cut", () => {
    const task = getLigationTask("worksheet-1-linear-ecori");
    const molecule = task.initialMolecules[0];
    const [site] = scanRestrictionSites(molecule, ecoRI);
    const result = applyRestrictionCut(molecule, ecoRI, site.siteStart);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected a successful EcoRI cut.");
    }
    expect(result.fragments).toHaveLength(2);
    expect(result.fragments[0].rightEnd).toMatchObject({
      type: "fivePrime",
      sequence5to3: "AATT",
      protrudingStrand: "bottom",
      side: "right",
    });
    expect(result.fragments[1].leftEnd).toMatchObject({
      type: "fivePrime",
      sequence5to3: "AATT",
      protrudingStrand: "top",
      side: "left",
    });
  });

  it("allows a manual blunt cut at any internal linear bond", () => {
    const task = getLigationTask("worksheet-1-linear-ecori");
    const result = manualCut(task.initialMolecules[0], 5);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected a successful manual cut.");
    }
    expect(result.fragments).toHaveLength(2);
    expect(result.fragments[0].rightEnd).toMatchObject({
      type: "blunt",
      sequence5to3: "",
      createdBy: "manualScissors",
    });
  });

  it("finds a recognition site that crosses a circular origin", () => {
    const molecule: Molecule = {
      id: "cross-origin",
      name: "跨首尾环状 DNA",
      topology: "circular",
      topStrand: "AATTCAAG",
      features: [],
      sourceTaskId: "test",
    };
    const [site] = scanRestrictionSites(molecule, ecoRI);

    expect(site.siteStart).toBe(7);
    expect(site.topBondIndex).toBe(0);
    expect(site.bottomBondIndex).toBe(4);
    const result = applyRestrictionCut(molecule, ecoRI, 7);
    expect(result.ok && result.fragments).toHaveLength(1);
  });

  it("opens a circular molecule with one manual cut", () => {
    const task = getLigationTask("worksheet-2-circular-ecori");
    const circular = circularizeMolecule(task.initialMolecules[0]);
    const result = manualCut(circular, circular.topStrand.length);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected a successful circular manual cut.");
    }
    expect(result.cut.topBondIndex).toBe(0);
    expect(result.fragments).toHaveLength(1);
    expect(result.fragments[0].topStrand).toBe(circular.topStrand);
  });
});
