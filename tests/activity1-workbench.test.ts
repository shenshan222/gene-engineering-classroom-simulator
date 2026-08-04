import { describe, expect, it } from "vitest";

import { getRestrictionEnzyme } from "@/src/content/enzymeLibrary";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type { Molecule } from "@/src/domain/types";
import {
  activity1Reducer,
  createActivity1State,
  type Activity1State,
  type CanvasDNAObject,
  type EndReference,
} from "@/src/state/activity1Workbench";

const ecoRI = getRestrictionEnzyme("ecoRI");

function asMolecule(object: CanvasDNAObject): Molecule {
  return {
    id: object.id,
    name: object.name,
    topology: "linear",
    topStrand: object.topStrand,
    features: object.features,
    foldedRegions: object.foldedRegions,
    sourceTaskId: object.sourceTaskId,
  };
}

function cutAtFirstEcoRISite(
  state: Activity1State,
  object: CanvasDNAObject,
): Activity1State {
  const [site] = scanRestrictionSites(asMolecule(object), ecoRI);
  if (!site) {
    throw new Error(`No EcoRI site in ${object.name}.`);
  }
  return activity1Reducer(state, {
    type: "CUT_AT",
    objectId: object.id,
    bondIndex: site.topBondIndex,
  });
}

function enzymeEnd(
  object: CanvasDNAObject,
  side: "left" | "right",
): EndReference | null {
  const end = side === "left" ? object.leftEnd : object.rightEnd;
  return end.createdBy ? { objectId: object.id, side } : null;
}

describe("activity 1 free-canvas workbench", () => {
  it("starts with two independently positioned DNA components", () => {
    const state = createActivity1State();

    expect(state.present.objects).toHaveLength(2);
    expect(state.present.objects.map((object) => object.name)).toEqual([
      "DNA 序列 1",
      "DNA 序列 2",
    ]);
    expect(state.present.objects[0].x).not.toBe(state.present.objects[1].x);
    expect(state.present.activeTool).toBe("move");
  });

  it("rejects a non-recognition bond without changing history", () => {
    const initial = createActivity1State();
    const target = initial.present.objects[0];
    const result = activity1Reducer(initial, {
      type: "CUT_AT",
      objectId: target.id,
      bondIndex: 2,
    });

    expect(result.present.objects).toHaveLength(2);
    expect(result.present.feedback.kind).toBe("error");
    expect(result.present.invalidBond).toEqual({
      objectId: target.id,
      bondIndex: 2,
    });
    expect(result.past).toHaveLength(0);
  });

  it("replaces the recipient DNA with two draggable fragments", () => {
    const initial = createActivity1State();
    const target = initial.present.objects.find(
      (object) => object.sourceMoleculeId === "worksheet-1-sequence-1",
    );
    if (!target) {
      throw new Error("Missing activity 1 recipient.");
    }
    const cut = cutAtFirstEcoRISite(initial, target);
    const recipientFragments = cut.present.objects.filter(
      (object) => object.sourceMoleculeId === target.sourceMoleculeId,
    );

    expect(recipientFragments).toHaveLength(2);
    expect(recipientFragments.every((object) => object.kind === "fragment")).toBe(
      true,
    );
    expect(cut.past).toHaveLength(1);
  });

  it("cuts the donor twice and exposes its middle insert", () => {
    let state = createActivity1State();
    const donor = state.present.objects.find(
      (object) => object.sourceMoleculeId === "worksheet-1-sequence-2",
    );
    if (!donor) {
      throw new Error("Missing activity 1 donor.");
    }
    state = cutAtFirstEcoRISite(state, donor);
    const remainingSiteObject = state.present.objects.find(
      (object) =>
        object.sourceMoleculeId === donor.sourceMoleculeId &&
        scanRestrictionSites(asMolecule(object), ecoRI).length > 0,
    );
    if (!remainingSiteObject) {
      throw new Error("Missing donor fragment with the second EcoRI site.");
    }
    state = cutAtFirstEcoRISite(state, remainingSiteObject);
    const donorFragments = state.present.objects.filter(
      (object) => object.sourceMoleculeId === donor.sourceMoleculeId,
    );
    const insert = donorFragments.find(
      (object) => object.leftEnd.createdBy && object.rightEnd.createdBy,
    );

    expect(donorFragments).toHaveLength(3);
    expect(insert?.topStrand).toBe("AATTCTCGGTATG");
  });

  it("completes activity 1 by joining both compatible insert ends", () => {
    let state = createActivity1State();
    const [target, donor] = state.present.objects;
    state = cutAtFirstEcoRISite(state, target);
    state = cutAtFirstEcoRISite(
      state,
      state.present.objects.find(
        (object) => object.sourceMoleculeId === donor.sourceMoleculeId,
      )!,
    );
    const donorWithSecondSite = state.present.objects.find(
      (object) =>
        object.sourceMoleculeId === donor.sourceMoleculeId &&
        scanRestrictionSites(asMolecule(object), ecoRI).length > 0,
    );
    if (!donorWithSecondSite) {
      throw new Error("Missing second donor cut.");
    }
    state = cutAtFirstEcoRISite(state, donorWithSecondSite);

    const insert = state.present.objects.find(
      (object) =>
        object.sourceMoleculeId === donor.sourceMoleculeId &&
        object.leftEnd.createdBy &&
        object.rightEnd.createdBy,
    );
    const recipientLeft = state.present.objects.find(
      (object) =>
        object.sourceMoleculeId === target.sourceMoleculeId &&
        object.rightEnd.createdBy,
    );
    const recipientRight = state.present.objects.find(
      (object) =>
        object.sourceMoleculeId === target.sourceMoleculeId &&
        object.leftEnd.createdBy,
    );
    if (!insert || !recipientLeft || !recipientRight) {
      throw new Error("Missing fragments required for ligation.");
    }

    state = activity1Reducer(state, {
      type: "LIGATE_ENDS",
      first: enzymeEnd(recipientLeft, "right")!,
      second: enzymeEnd(insert, "left")!,
    });
    const partial = state.present.objects.find(
      (object) =>
        object.rightEnd.createdBy &&
        object.topStrand.endsWith(insert.topStrand),
    );
    if (!partial) {
      throw new Error("First ligation did not produce the partial product.");
    }
    state = activity1Reducer(state, {
      type: "LIGATE_ENDS",
      first: enzymeEnd(partial, "right")!,
      second: enzymeEnd(recipientRight, "left")!,
    });

    expect(state.present.completed).toBe(true);
    expect(
      state.present.objects.some((object) => object.kind === "product"),
    ).toBe(true);
    expect(state.present.feedback.message).toContain("正确插入");
  });
});
