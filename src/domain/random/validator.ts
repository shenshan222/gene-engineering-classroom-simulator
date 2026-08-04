import { findRestrictionEnzyme } from "@/src/content/enzymeLibrary";
import { circularizeMolecule } from "@/src/domain/circular";
import {
  solveLigationTask,
  solvePCRTask,
} from "@/src/domain/random/solver";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type {
  LigationLearningTask,
  PCRLearningTask,
  ProductSignature,
} from "@/src/domain/types";

export interface LigationValidationReport {
  valid: boolean;
  exactRestrictionSiteCounts: boolean;
  expectedFragmentsExist: boolean;
  solutionCount: number;
  errors: readonly string[];
  validProducts: readonly ProductSignature[];
}

export interface PCRValidationReport {
  valid: boolean;
  uniqueCorrectPair: boolean;
  solutionCount: number;
  errors: readonly string[];
  solutions: ReturnType<typeof solvePCRTask>;
}

export function validateLigationTask(
  task: LigationLearningTask,
): LigationValidationReport {
  const errors: string[] = [];
  const rule = task.completionRule;
  if (!rule) {
    return {
      valid: false,
      exactRestrictionSiteCounts: false,
      expectedFragmentsExist: false,
      solutionCount: 0,
      errors: ["题目缺少完成规则。"],
      validProducts: [],
    };
  }
  const recipient = task.initialMolecules.find(
    (molecule) => molecule.id === rule.recipientMoleculeId,
  );
  const donor = task.initialMolecules.find(
    (molecule) => molecule.id === rule.donorMoleculeId,
  );
  const recipientEnzyme = findRestrictionEnzyme(rule.recipientEnzymeId);
  const donorEnzyme = findRestrictionEnzyme(rule.donorEnzymeId);
  const recipientForScan =
    recipient && rule.finalTopology === "circular"
      ? circularizeMolecule(recipient)
      : recipient;
  const exactRestrictionSiteCounts = Boolean(
    recipientForScan &&
      donor &&
      recipientEnzyme &&
      donorEnzyme &&
      scanRestrictionSites(recipientForScan, recipientEnzyme).length === 1 &&
      scanRestrictionSites(donor, donorEnzyme).length === 2,
  );
  if (!exactRestrictionSiteCounts) {
    errors.push("受体或供体的目标限制酶位点数量不符合要求。");
  }
  const solutions = solveLigationTask(task);
  const expectedFragmentsExist = solutions.length > 0;
  if (!expectedFragmentsExist) {
    errors.push("没有找到可同时完成两个接头的目的片段。");
  }
  return {
    valid: errors.length === 0,
    exactRestrictionSiteCounts,
    expectedFragmentsExist,
    solutionCount: solutions.length,
    errors,
    validProducts: solutions.map((solution) => solution.signature),
  };
}


function samePrimerPair(
  first: readonly string[],
  second: readonly string[],
): boolean {
  return (
    first.length === second.length &&
    [...first].sort().every((id, index) => id === [...second].sort()[index])
  );
}

export function validatePCRTask(task: PCRLearningTask): PCRValidationReport {
  const errors: string[] = [];
  const solutions = solvePCRTask(task);
  const uniqueCorrectPair =
    solutions.length === 1 &&
    solutions[0].templateId === task.correctTemplateId &&
    samePrimerPair(solutions[0].primerPair, task.correctPrimerPair);
  if (!uniqueCorrectPair) {
    errors.push("候选引物中不存在唯一且与标准答案一致的有效组合。");
  }
  return {
    valid: errors.length === 0,
    uniqueCorrectPair,
    solutionCount: solutions.length,
    errors,
    solutions,
  };
}
