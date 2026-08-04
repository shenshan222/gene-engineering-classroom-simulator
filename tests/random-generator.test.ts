import { describe, expect, it } from "vitest";

import { getRestrictionEnzyme } from "@/src/content/enzymeLibrary";
import { generateValidatedLinearLigationTask } from "@/src/domain/random/generator";
import { createSeededRandom } from "@/src/domain/random/prng";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type { Molecule } from "@/src/domain/types";
import {
  activity1Reducer,
  createLigationState,
  type CanvasDNAObject,
  type EndReference,
} from "@/src/state/activity1Workbench";

function asMolecule(object: CanvasDNAObject): Molecule {
  return {
    id: object.id,
    name: object.name,
    topology: object.topology,
    topStrand: object.topStrand,
    features: object.features,
    foldedRegions: object.foldedRegions,
    sourceTaskId: object.sourceTaskId,
  };
}

function endReference(
  object: CanvasDNAObject,
  side: "left" | "right",
): EndReference {
  return { objectId: object.id, side };
}

describe("seeded random task infrastructure", () => {
  it("replays the same random stream and keeps forked streams stable", () => {
    const first = createSeededRandom("BIO-SAME-SEED");
    const second = createSeededRandom("BIO-SAME-SEED");

    expect(Array.from({ length: 8 }, () => first.next())).toEqual(
      Array.from({ length: 8 }, () => second.next()),
    );
    expect(first.fork("sequence").integer(1, 1000)).toBe(
      second.fork("sequence").integer(1, 1000),
    );
  });

  it("generates identical task JSON from the same seed and settings", () => {
    const first = generateValidatedLinearLigationTask({
      seed: "BIO-REPLAY-01",
      difficulty: "standard",
    });
    const second = generateValidatedLinearLigationTask({
      seed: "BIO-REPLAY-01",
      difficulty: "standard",
    });

    expect(first).toEqual(second);
  });

  it("changes the DNA content when the seed changes", () => {
    const first = generateValidatedLinearLigationTask({
      seed: "BIO-CHANGE-01",
      difficulty: "basic",
    });
    const second = generateValidatedLinearLigationTask({
      seed: "BIO-CHANGE-02",
      difficulty: "basic",
    });

    expect(first.task.initialMolecules.map((molecule) => molecule.topStrand)).not
      .toEqual(second.task.initialMolecules.map((molecule) => molecule.topStrand));
  });

  it("can complete a generated task through the real cut-and-ligate reducer", () => {
    const { task } = generateValidatedLinearLigationTask({
      seed: "BIO-REDUCER-01",
      difficulty: "basic",
    });
    const enzymeId = task.defaultEnzymeId as "ecoRI" | "munI";
    const enzyme = getRestrictionEnzyme(enzymeId);
    const [recipientSource, donorSource] = task.initialMolecules;
    let state = createLigationState(task);

    for (const source of [recipientSource, donorSource]) {
      const object = state.present.objects.find(
        (candidate) => candidate.sourceMoleculeId === source.id,
      )!;
      const [site] = scanRestrictionSites(asMolecule(object), enzyme);
      state = activity1Reducer(state, {
        type: "CUT_AT",
        objectId: object.id,
        bondIndex: site.topBondIndex,
        enzymeId,
      });
    }
    const donorWithSecondSite = state.present.objects.find(
      (object) =>
        object.sourceMoleculeId === donorSource.id &&
        scanRestrictionSites(asMolecule(object), enzyme).length > 0,
    )!;
    const [secondSite] = scanRestrictionSites(
      asMolecule(donorWithSecondSite),
      enzyme,
    );
    state = activity1Reducer(state, {
      type: "CUT_AT",
      objectId: donorWithSecondSite.id,
      bondIndex: secondSite.topBondIndex,
      enzymeId,
    });

    const insert = state.present.objects.find(
      (object) =>
        object.sourceMoleculeId === donorSource.id &&
        object.leftEnd.createdBy &&
        object.rightEnd.createdBy &&
        object.features.some((feature) => feature.type === "gene"),
    )!;
    const recipientLeft = state.present.objects.find(
      (object) =>
        object.sourceMoleculeId === recipientSource.id &&
        object.rightEnd.createdBy,
    )!;
    const recipientRight = state.present.objects.find(
      (object) =>
        object.sourceMoleculeId === recipientSource.id &&
        object.leftEnd.createdBy,
    )!;
    state = activity1Reducer(state, {
      type: "LIGATE_ENDS",
      first: endReference(recipientLeft, "right"),
      second: endReference(insert, "left"),
    });
    const partial = state.present.objects.find(
      (object) =>
        object.sourceMoleculeId.includes(recipientSource.id) &&
        object.rightEnd.createdBy,
    )!;
    state = activity1Reducer(state, {
      type: "LIGATE_ENDS",
      first: endReference(partial, "right"),
      second: endReference(recipientRight, "left"),
    });

    expect(state.present.completed).toBe(true);
    expect(state.present.objects.some((object) => object.kind === "product")).toBe(
      true,
    );
  });
});

describe("random linear ligation task properties", () => {
  it("validates 1000 basic and 1000 standard classroom seeds", () => {
    for (const difficulty of ["basic", "standard"] as const) {
      for (let index = 0; index < 1000; index += 1) {
        const result = generateValidatedLinearLigationTask({
          seed: `BIO-BATCH-${difficulty}-${index}`,
          difficulty,
        });
        const [recipient, donor] = result.task.initialMolecules;
        const enzyme = getRestrictionEnzyme(
          result.task.defaultEnzymeId as "ecoRI" | "munI",
        );

        expect(result.report.valid).toBe(true);
        expect(result.report.exactRestrictionSiteCounts).toBe(true);
        expect(result.report.expectedFragmentsExist).toBe(true);
        expect(result.report.validProducts.length).toBeGreaterThan(0);
        expect(scanRestrictionSites(recipient, enzyme)).toHaveLength(1);
        expect(scanRestrictionSites(donor, enzyme)).toHaveLength(2);
        expect(result.task.metadata?.seed).toBe(
          `BIO-BATCH-${difficulty}-${index}`.toUpperCase(),
        );
        expect(result.task.metadata?.usedFallback).not.toBe(true);
      }
    }
  });
});
