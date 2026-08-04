import { describe, expect, it } from "vitest";

import { getRestrictionEnzyme } from "@/src/content/enzymeLibrary";
import { getWorksheetTask } from "@/src/content/worksheetTasks";
import {
  calculateAmplicons,
  comparePrimers,
  findPrimerBindings,
} from "@/src/domain/pcr";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type {
  LigationLearningTask,
  Molecule,
  PCRLearningTask,
} from "@/src/domain/types";
import {
  activity1Reducer,
  createLigationState,
  type Activity1State,
  type CanvasDNAObject,
  type EndReference,
  type LigationTaskId,
} from "@/src/state/activity1Workbench";
import { createPCRState, pcrReducer } from "@/src/state/pcrWorkbench";

function getLigationTask(taskId: LigationTaskId): LigationLearningTask {
  const task = getWorksheetTask(taskId);
  if (!task || task.taskKind !== "ligation") {
    throw new Error(`Missing ligation task: ${taskId}`);
  }
  return task;
}

function getPCRTask(): PCRLearningTask {
  const task = getWorksheetTask("worksheet-3-pcr");
  if (!task || task.taskKind !== "pcr") {
    throw new Error("Missing PCR task.");
  }
  return task;
}

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

function cutFirstSite(
  state: Activity1State,
  object: CanvasDNAObject,
  enzymeId: "ecoRI" | "munI",
): Activity1State {
  const enzyme = getRestrictionEnzyme(enzymeId);
  const [site] = scanRestrictionSites(asMolecule(object), enzyme);
  if (!site) {
    throw new Error(`Missing ${enzyme.name} site in ${object.name}.`);
  }
  return activity1Reducer(state, {
    type: "CUT_AT",
    objectId: object.id,
    bondIndex: site.topBondIndex,
    enzymeId,
  });
}

function enzymeEnd(
  object: CanvasDNAObject,
  side: "left" | "right",
): EndReference {
  const end = side === "left" ? object.leftEnd : object.rightEnd;
  if (!end.createdBy) {
    throw new Error(`${object.name} has no enzyme-created ${side} end.`);
  }
  return { objectId: object.id, side };
}

function completeCircularLigationTask(
  taskId: "worksheet-2-circular-ecori" | "worksheet-4-ecori-muni",
  recipientEnzyme: "ecoRI" | "munI",
): Activity1State {
  const task = getLigationTask(taskId);
  const [recipientSource, donorSource] = task.initialMolecules;
  let state = createLigationState(taskId);
  state = activity1Reducer(state, {
    type: "CIRCULARIZE",
    objectId: recipientSource.id,
  });
  const circularRecipient = state.present.objects.find(
    (object) => object.sourceMoleculeId === recipientSource.id,
  );
  if (!circularRecipient) throw new Error("Missing circular recipient.");
  state = cutFirstSite(state, circularRecipient, recipientEnzyme);

  let donorObject = state.present.objects.find(
    (object) => object.sourceMoleculeId === donorSource.id,
  );
  if (!donorObject) throw new Error("Missing donor.");
  state = cutFirstSite(state, donorObject, "ecoRI");
  donorObject = state.present.objects.find(
    (object) =>
      object.sourceMoleculeId === donorSource.id &&
      scanRestrictionSites(
        asMolecule(object),
        getRestrictionEnzyme("ecoRI"),
      ).length > 0,
  );
  if (!donorObject) throw new Error("Missing donor second site.");
  state = cutFirstSite(state, donorObject, "ecoRI");

  const openedRecipient = state.present.objects.find(
    (object) =>
      object.sourceMoleculeId === recipientSource.id &&
      object.leftEnd.createdBy &&
      object.rightEnd.createdBy,
  );
  const insert = state.present.objects.find(
    (object) =>
      object.sourceMoleculeId === donorSource.id &&
      object.leftEnd.createdBy &&
      object.rightEnd.createdBy,
  );
  if (!openedRecipient || !insert) {
    throw new Error("Missing recipient or insert ends.");
  }
  state = activity1Reducer(state, {
    type: "LIGATE_ENDS",
    first: enzymeEnd(openedRecipient, "right"),
    second: enzymeEnd(insert, "left"),
  });
  const partial = state.present.objects.find(
    (object) =>
      object.leftEnd.createdBy &&
      object.rightEnd.createdBy &&
      object.sourceMoleculeId.includes(recipientSource.id),
  );
  if (!partial) throw new Error("Missing partial circular product.");
  return activity1Reducer(state, {
    type: "LIGATE_ENDS",
    first: enzymeEnd(partial, "left"),
    second: enzymeEnd(partial, "right"),
  });
}

describe("activity 2 free-canvas route", () => {
  it("circularizes, opens and rebuilds a circular recombinant DNA", () => {
    const task = getLigationTask("worksheet-2-circular-ecori");
    let state = createLigationState(task.id as LigationTaskId);
    state = activity1Reducer(state, {
      type: "CIRCULARIZE",
      objectId: task.initialMolecules[0].id,
    });

    expect(state.present.objects[0].topology).toBe("circular");

    state = completeCircularLigationTask(
      "worksheet-2-circular-ecori",
      "ecoRI",
    );
    expect(state.present.completed).toBe(true);
    expect(
      state.present.objects.some(
        (object) => object.kind === "product" && object.topology === "circular",
      ),
    ).toBe(true);
  });
});

describe("activity 5 free-canvas route", () => {
  it("uses MunI outside the marker and preserves the marker gene", () => {
    const state = completeCircularLigationTask(
      "worksheet-4-ecori-muni",
      "munI",
    );
    const product = state.present.objects.find(
      (object) => object.kind === "product",
    );

    expect(state.present.completed).toBe(true);
    expect(product?.topology).toBe("circular");
    expect(product?.features.some((feature) => feature.type === "marker")).toBe(
      true,
    );
    expect(product?.features.some((feature) => feature.type === "gene")).toBe(
      true,
    );
  });
});

describe("activity 4 PCR engine and state", () => {
  const task = getPCRTask();
  const sequence7 = task.templateMolecules[0];
  const primer1 = task.primers[0];
  const primer4 = task.primers[3];

  it("finds inward-facing primer 1 and primer 4 bindings", () => {
    const bindings1 = findPrimerBindings(sequence7, primer1);
    const bindings4 = findPrimerBindings(sequence7, primer4);
    const products = calculateAmplicons(sequence7, primer1, primer4);

    expect(bindings1).toContainEqual(
      expect.objectContaining({ start: 0, extensionDirection: "right" }),
    );
    expect(bindings4).toContainEqual(
      expect.objectContaining({ extensionDirection: "left" }),
    );
    expect(products).toHaveLength(1);
    expect(products[0].sequence).toBe(sequence7.topStrand);
  });

  it("identifies the repeated-end primer pair for sequence 9", () => {
    const primer5 = task.primers[4];
    const primer6 = task.primers[5];
    const sequence9 = task.templateMolecules[2];

    expect(comparePrimers(primer5, primer6)).toBe("reverseComplement");
    const products = calculateAmplicons(sequence9, primer5, primer6);
    expect(products).toHaveLength(1);
    expect(products[0].sequence).toBe(sequence9.topStrand);
  });

  it("marks the activity complete after running PCR with primers 1 and 4", () => {
    let state = createPCRState();
    state = pcrReducer(state, { type: "TOGGLE_PRIMER", primerId: "primer-1" });
    state = pcrReducer(state, { type: "TOGGLE_PRIMER", primerId: "primer-4" });
    state = pcrReducer(state, { type: "RUN_PCR" });

    expect(state.present.completed).toBe(true);
    expect(state.present.amplicons).toHaveLength(1);
    expect(state.present.feedback.kind).toBe("success");
  });
});
