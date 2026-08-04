import { describe, expect, it } from "vitest";

import { getRestrictionEnzyme } from "@/src/content/enzymeLibrary";
import { circularizeMolecule } from "@/src/domain/circular";
import {
  generateValidatedCircularLigationTask,
  generateValidatedCompatibleEndsTask,
  generateValidatedRandomTask,
} from "@/src/domain/random/generator";
import { generateValidatedPCRTask } from "@/src/domain/random/pcrGenerator";
import { solvePCRTask } from "@/src/domain/random/solver";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type {
  LigationLearningTask,
  Molecule,
  RandomTaskType,
} from "@/src/domain/types";
import {
  activity1Reducer,
  createLigationState,
  type Activity1State,
  type CanvasDNAObject,
  type EndReference,
} from "@/src/state/activity1Workbench";
import { createPCRState, pcrReducer } from "@/src/state/pcrWorkbench";

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

function end(object: CanvasDNAObject, side: "left" | "right"): EndReference {
  return { objectId: object.id, side };
}

function cutFirstSite(
  state: Activity1State,
  object: CanvasDNAObject,
  enzymeId: "ecoRI" | "munI",
): Activity1State {
  const [site] = scanRestrictionSites(
    asMolecule(object),
    getRestrictionEnzyme(enzymeId),
  );
  if (!site) throw new Error(`Missing ${enzymeId} site in ${object.name}.`);
  return activity1Reducer(state, {
    type: "CUT_AT",
    objectId: object.id,
    bondIndex: site.topBondIndex,
    enzymeId,
  });
}

function completeGeneratedCircularTask(
  task: LigationLearningTask,
): Activity1State {
  const rule = task.completionRule!;
  const recipientEnzymeId = rule.recipientEnzymeId as "ecoRI" | "munI";
  const donorEnzymeId = rule.donorEnzymeId as "ecoRI" | "munI";
  let state = createLigationState(task);
  state = activity1Reducer(state, {
    type: "CIRCULARIZE",
    objectId: rule.recipientMoleculeId,
  });
  const circularRecipient = state.present.objects.find(
    (object) => object.sourceMoleculeId === rule.recipientMoleculeId,
  )!;
  state = cutFirstSite(state, circularRecipient, recipientEnzymeId);

  let donorObject = state.present.objects.find(
    (object) => object.sourceMoleculeId === rule.donorMoleculeId,
  )!;
  state = cutFirstSite(state, donorObject, donorEnzymeId);
  donorObject = state.present.objects.find(
    (object) =>
      object.sourceMoleculeId === rule.donorMoleculeId &&
      scanRestrictionSites(
        asMolecule(object),
        getRestrictionEnzyme(donorEnzymeId),
      ).length > 0,
  )!;
  state = cutFirstSite(state, donorObject, donorEnzymeId);

  const openedRecipient = state.present.objects.find(
    (object) =>
      object.sourceMoleculeId === rule.recipientMoleculeId &&
      object.leftEnd.createdBy &&
      object.rightEnd.createdBy,
  )!;
  const insert = state.present.objects.find(
    (object) =>
      object.sourceMoleculeId === rule.donorMoleculeId &&
      object.leftEnd.createdBy &&
      object.rightEnd.createdBy &&
      object.features.some((feature) => feature.type === "gene"),
  )!;
  state = activity1Reducer(state, {
    type: "LIGATE_ENDS",
    first: end(openedRecipient, "right"),
    second: end(insert, "left"),
  });
  const partial = state.present.objects.find(
    (object) =>
      object.sourceMoleculeId.includes(rule.recipientMoleculeId) &&
      object.leftEnd.createdBy &&
      object.rightEnd.createdBy,
  )!;
  return activity1Reducer(state, {
    type: "LIGATE_ENDS",
    first: end(partial, "left"),
    second: end(partial, "right"),
  });
}

describe("generated later activities use the real workbenches", () => {
  it("completes a generated circular-DNA task", () => {
    const { task } = generateValidatedCircularLigationTask({
      seed: "BIO-CIRCULAR-ROUTE",
      difficulty: "basic",
    });
    const state = completeGeneratedCircularTask(task);

    expect(state.present.completed).toBe(true);
    expect(
      state.present.objects.some(
        (object) => object.kind === "product" && object.topology === "circular",
      ),
    ).toBe(true);
  });

  it("completes a compatible-end task while preserving marker and target gene", () => {
    const { task } = generateValidatedCompatibleEndsTask({
      seed: "BIO-COMPATIBLE-ROUTE",
      difficulty: "standard",
    });
    const state = completeGeneratedCircularTask(task);
    const product = state.present.objects.find(
      (object) => object.kind === "product",
    );

    expect(state.present.completed).toBe(true);
    expect(product?.features.some((feature) => feature.type === "marker")).toBe(
      true,
    );
    expect(product?.features.some((feature) => feature.type === "gene")).toBe(
      true,
    );
  });

  it("completes a generated PCR task only with its validated primer pair", () => {
    const { task } = generateValidatedPCRTask({
      seed: "BIO-PCR-ROUTE",
      difficulty: "standard",
    });
    let state = createPCRState(task);
    for (const primerId of task.correctPrimerPair) {
      state = pcrReducer(state, { type: "TOGGLE_PRIMER", primerId });
    }
    state = pcrReducer(state, { type: "RUN_PCR" });

    expect(state.present.completed).toBe(true);
    expect(state.present.amplicons).toHaveLength(1);
    expect(state.present.amplicons[0].sequence).toBe(
      task.templateMolecules[0].topStrand,
    );
  });
});

describe("random activity 2, 3 and 4 properties", () => {
  it("validates 1000 seeds per difficulty for every later activity", () => {
    const taskTypes: readonly RandomTaskType[] = [
      "circular-ligation",
      "pcr-selection",
      "compatible-ends",
    ];
    for (const taskType of taskTypes) {
      for (const difficulty of ["basic", "standard"] as const) {
        for (let index = 0; index < 1000; index += 1) {
          const result = generateValidatedRandomTask({
            taskType,
            seed: `BIO-${taskType}-${difficulty}-${index}`,
            difficulty,
          });

          expect(result.report.valid).toBe(true);
          expect(result.task.metadata?.usedFallback).not.toBe(true);
          expect(result.task.metadata?.taskType).toBe(taskType);

          if (result.task.taskKind === "pcr") {
            const solutions = solvePCRTask(result.task);
            expect(solutions).toHaveLength(1);
            expect(solutions[0].templateId).toBe(
              result.task.correctTemplateId,
            );
            expect(new Set(solutions[0].primerPair)).toEqual(
              new Set(result.task.correctPrimerPair),
            );
            continue;
          }

          const rule = result.task.completionRule!;
          const recipient = circularizeMolecule(
            result.task.initialMolecules.find(
              (molecule) => molecule.id === rule.recipientMoleculeId,
            )!,
          );
          const donor = result.task.initialMolecules.find(
            (molecule) => molecule.id === rule.donorMoleculeId,
          )!;
          expect(
            scanRestrictionSites(
              recipient,
              getRestrictionEnzyme(
                rule.recipientEnzymeId as "ecoRI" | "munI",
              ),
            ),
          ).toHaveLength(1);
          expect(
            scanRestrictionSites(
              donor,
              getRestrictionEnzyme(
                rule.donorEnzymeId as "ecoRI" | "munI",
              ),
            ),
          ).toHaveLength(2);
        }
      }
    }
  });
});
