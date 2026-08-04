import { describe, expect, it } from "vitest";

import { getRestrictionEnzyme } from "@/src/content/enzymeLibrary";
import { getWorksheetTask } from "@/src/content/worksheetTasks";
import { circularizeMolecule } from "@/src/domain/circular";
import { digestMolecule } from "@/src/domain/cutting";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type { LigationLearningTask } from "@/src/domain/types";

function getLigationTask(taskId: string): LigationLearningTask {
  const task = getWorksheetTask(taskId);
  if (!task || task.taskKind !== "ligation") {
    throw new Error(`Missing ligation task: ${taskId}`);
  }
  return task;
}

describe("multi-site and circular digestion", () => {
  const ecoRI = getRestrictionEnzyme("ecoRI");

  it("creates three fragments when linear donor DNA has two cuts", () => {
    const task = getLigationTask("worksheet-1-linear-ecori");
    const donor = task.initialMolecules[1];
    const sites = scanRestrictionSites(donor, ecoRI);
    const digest = digestMolecule(donor, sites);

    expect(digest.fragments).toHaveLength(3);
    expect(digest.fragments[1].topStrand).toBe("AATTCTCGGTATG");
    expect(digest.fragments[1].leftEnd).toMatchObject({
      sequence5to3: "AATT",
      protrudingStrand: "top",
    });
    expect(digest.fragments[1].rightEnd).toMatchObject({
      sequence5to3: "AATT",
      protrudingStrand: "bottom",
    });
  });

  it("opens circular DNA into one full-length linear fragment", () => {
    const task = getLigationTask("worksheet-2-circular-ecori");
    const circular = circularizeMolecule(task.initialMolecules[0]);
    const sites = scanRestrictionSites(circular, ecoRI);
    const digest = digestMolecule(circular, sites);

    expect(sites).toHaveLength(1);
    expect(digest.fragments).toHaveLength(1);
    expect(digest.fragments[0].topStrand).toHaveLength(
      circular.topStrand.length,
    );
    expect(digest.fragments[0].topStrand.startsWith("AATTC")).toBe(true);
  });

  it("creates two fragments from a circular molecule cut at two sites", () => {
    const task = getLigationTask("worksheet-2-circular-ecori");
    const circularDonor = circularizeMolecule(task.initialMolecules[1]);
    const sites = scanRestrictionSites(circularDonor, ecoRI);
    const digest = digestMolecule(circularDonor, sites);

    expect(sites).toHaveLength(2);
    expect(digest.fragments).toHaveLength(2);
    expect(
      digest.fragments.reduce(
        (total, fragment) => total + fragment.topStrand.length,
        0,
      ),
    ).toBe(circularDonor.topStrand.length);
  });

  it("remaps a marker feature when a plasmid is opened away from it", () => {
    const task = getLigationTask("worksheet-4-ecori-muni");
    const circularPlasmid = circularizeMolecule(task.initialMolecules[0]);
    const munI = getRestrictionEnzyme("munI");
    const sites = scanRestrictionSites(circularPlasmid, munI);
    const digest = digestMolecule(circularPlasmid, sites);
    const marker = digest.fragments[0].features.find(
      (feature) => feature.type === "marker",
    );

    expect(sites).toHaveLength(1);
    expect(marker).toBeDefined();
    expect((marker?.end ?? 0) - (marker?.start ?? 0)).toBe(18);
  });
});
