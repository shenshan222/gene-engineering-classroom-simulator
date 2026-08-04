import { describe, expect, it } from "vitest";

import {
  getRestrictionEnzyme,
  restrictionEnzymes,
} from "@/src/content/enzymeLibrary";
import {
  getWorksheetTask,
  worksheetTasks,
} from "@/src/content/worksheetTasks";
import { normalizeDNASequence, reverseComplement } from "@/src/domain/sequence";

describe("restriction enzyme library", () => {
  it("contains the worksheet enzymes and their cut offsets", () => {
    expect(getRestrictionEnzyme("ecoRI")).toMatchObject({
      recognition: "GAATTC",
      topCutOffset: 1,
      bottomCutOffset: 5,
    });
    expect(getRestrictionEnzyme("munI")).toMatchObject({
      recognition: "CAATTG",
      topCutOffset: 1,
      bottomCutOffset: 5,
    });
  });

  it("stores palindromic recognition sequences in 5′→3′ form", () => {
    for (const enzyme of Object.values(restrictionEnzymes)) {
      expect(reverseComplement(enzyme.recognition)).toBe(enzyme.recognition);
    }
  });
});

describe("worksheet content", () => {
  it("preserves worksheet numbering 1, 2, 4 and 5", () => {
    expect(worksheetTasks.map((task) => task.worksheetNumber)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("has unique task and molecule identifiers", () => {
    const taskIds = worksheetTasks.map((task) => task.id);
    expect(new Set(taskIds).size).toBe(taskIds.length);

    const moleculeIds = worksheetTasks.flatMap((task) =>
      task.taskKind === "pcr"
        ? task.templateMolecules.map((molecule) => molecule.id)
        : task.initialMolecules.map((molecule) => molecule.id),
    );
    expect(new Set(moleculeIds).size).toBe(moleculeIds.length);
  });

  it("contains valid DNA and valid folded-region coordinates", () => {
    for (const task of worksheetTasks) {
      const molecules =
        task.taskKind === "pcr"
          ? task.templateMolecules
          : task.initialMolecules;

      for (const molecule of molecules) {
        expect(normalizeDNASequence(molecule.topStrand)).toBe(
          molecule.topStrand,
        );
        for (const region of molecule.foldedRegions ?? []) {
          expect(region.start).toBeGreaterThanOrEqual(0);
          expect(region.end).toBeGreaterThan(region.start);
          expect(region.end).toBeLessThanOrEqual(molecule.topStrand.length);
        }
      }
    }
  });

  it("records primer 1 and primer 4 as the sequence 7 pair", () => {
    const task = getWorksheetTask("worksheet-3-pcr");
    expect(task?.taskKind).toBe("pcr");
    if (!task || task.taskKind !== "pcr") {
      throw new Error("PCR worksheet task is missing.");
    }

    expect(task.correctPrimerPair).toEqual(["primer-1", "primer-4"]);
    expect(task.primers).toHaveLength(6);
  });

  it("places the EcoRI site inside the activity 5 marker gene", () => {
    const task = getWorksheetTask("worksheet-4-ecori-muni");
    expect(task?.taskKind).toBe("ligation");
    if (!task || task.taskKind !== "ligation") {
      throw new Error("Activity 5 is missing.");
    }

    const plasmid = task.initialMolecules.find(
      (molecule) => molecule.id === "worksheet-5-plasmid",
    );
    const marker = plasmid?.features.find(
      (feature) => feature.type === "marker",
    );
    const siteStart = plasmid?.topStrand.indexOf("GAATTC") ?? -1;

    expect(plasmid).toBeDefined();
    expect(marker).toBeDefined();
    expect(siteStart).toBeGreaterThanOrEqual(marker?.start ?? Number.MAX_VALUE);
    expect(siteStart + 6).toBeLessThanOrEqual(marker?.end ?? -1);
    expect(plasmid?.topStrand).toContain("CAATTG");
  });
});
