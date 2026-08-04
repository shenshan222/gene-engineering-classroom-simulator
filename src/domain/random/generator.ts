import {
  getRestrictionEnzyme,
  restrictionEnzymes,
  type RestrictionEnzymeId,
} from "@/src/content/enzymeLibrary";
import { getWorksheetTask } from "@/src/content/worksheetTasks";
import { circularizeMolecule } from "@/src/domain/circular";
import { randomDNAWithoutMotifs } from "@/src/domain/random/dnaFactory";
import {
  generateValidatedPCRTask,
  type GeneratedPCRTask,
} from "@/src/domain/random/pcrGenerator";
import {
  createSeededRandom,
  normalizeSeed,
  type SeededRandom,
} from "@/src/domain/random/prng";
import {
  validateLigationTask,
  type LigationValidationReport,
  type PCRValidationReport,
} from "@/src/domain/random/validator";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type {
  Difficulty,
  LearningTask,
  LigationLearningTask,
  Molecule,
  RandomTaskType,
} from "@/src/domain/types";

export interface RandomGeneratorConfig {
  seed: string;
  difficulty: Extract<Difficulty, "basic" | "standard">;
  maxAttempts?: number;
}

export type LinearLigationGeneratorConfig = RandomGeneratorConfig;

export interface GeneratedLigationTask {
  task: LigationLearningTask;
  report: LigationValidationReport;
}

export interface GeneratedRandomTask {
  task: LearningTask;
  report: LigationValidationReport | PCRValidationReport;
}

const ENZYME_IDS = ["ecoRI", "munI"] as const;
const FORBIDDEN_MOTIFS = Object.values(restrictionEnzymes).map(
  (enzyme) => enzyme.recognition,
);

function otherEnzymeId(enzymeId: RestrictionEnzymeId): RestrictionEnzymeId {
  return enzymeId === "ecoRI" ? "munI" : "ecoRI";
}

function segment(length: number, rng: SeededRandom): string {
  return randomDNAWithoutMotifs(length, FORBIDDEN_MOTIFS, rng);
}

function generatedLigationTask(
  taskType: Extract<RandomTaskType, "linear-ligation" | "circular-ligation">,
  seed: string,
  difficulty: RandomGeneratorConfig["difficulty"],
  attempt: number,
): LigationLearningTask {
  const activityNumber = taskType === "linear-ligation" ? "1" : "2";
  const circular = taskType === "circular-ligation";
  const rng = createSeededRandom(seed).fork(`${taskType}-${attempt}`);
  const enzymeId = rng.pick(ENZYME_IDS);
  const enzyme = getRestrictionEnzyme(enzymeId);
  const distractorId = otherEnzymeId(enzymeId);
  const recipientLeftLength = rng.integer(7, 13);
  const recipientRightLength = rng.integer(7, 13);
  const donorLeftLength = rng.integer(6, 10);
  const donorRightLength = rng.integer(6, 10);
  const geneLength = rng.integer(10, 20);
  const sequenceRng = rng.fork("sequences");
  const recipientSequence =
    segment(recipientLeftLength, sequenceRng.fork("recipient-left")) +
    enzyme.recognition +
    segment(recipientRightLength, sequenceRng.fork("recipient-right"));
  const geneSequence = segment(geneLength, sequenceRng.fork("gene"));
  const donorSequence =
    segment(donorLeftLength, sequenceRng.fork("donor-left")) +
    enzyme.recognition +
    geneSequence +
    enzyme.recognition +
    segment(donorRightLength, sequenceRng.fork("donor-right"));
  const taskId = `generated-${circular ? "circular" : "linear"}-${normalizeSeed(seed)}-${attempt}`;
  const recipient: Molecule = {
    id: `${taskId}-recipient`,
    name: circular ? "待环化受体 DNA" : "受体 DNA",
    topology: "linear",
    topStrand: recipientSequence,
    features: [],
    sourceTaskId: taskId,
  };
  const geneFeatureId = `${taskId}-target-gene`;
  const donor: Molecule = {
    id: `${taskId}-donor`,
    name: "供体 DNA",
    topology: "linear",
    topStrand: donorSequence,
    features: [
      {
        id: geneFeatureId,
        type: "gene",
        label: "目的基因",
        start: donorLeftLength + enzyme.recognition.length,
        end: donorLeftLength + enzyme.recognition.length + geneLength,
        color: "gene",
      },
    ],
    sourceTaskId: taskId,
  };

  return {
    id: taskId,
    worksheetNumber: activityNumber,
    displayLabel: `随机训练 · 活动 ${activityNumber}`,
    taskKind: "ligation",
    title: circular
      ? `构建含目的基因的环状重组 DNA`
      : `${enzyme.name}切割线性 DNA 并连接目的基因`,
    objective: circular
      ? `先将受体环化，再用${enzyme.name}打开受体并插入绿色目的基因。`
      : `找出${enzyme.name}位点，切下绿色目的基因并插入受体 DNA。`,
    instructions: [
      ...(circular ? ["先用首尾连接工具将受体 DNA 环化。"] : []),
      `用${enzyme.name}切开受体的唯一识别位点。`,
      `切开供体 DNA 的两个${enzyme.name}位点。`,
      `用 DNA 连接酶完成${circular ? "两个接头并重新闭环" : "目的片段插入"}。`,
    ],
    availableTools: [
      ...(circular ? ["circularize"] : []),
      enzymeId,
      ...(difficulty === "standard" ? [distractorId] : []),
      "dnaLigase",
    ],
    initialMolecules: [recipient, donor],
    defaultEnzymeId: enzymeId,
    completionRule: {
      recipientMoleculeId: recipient.id,
      donorMoleculeId: donor.id,
      recipientEnzymeId: enzymeId,
      donorEnzymeId: enzymeId,
      finalTopology: circular ? "circular" : "linear",
      requiredFeatureIds: [geneFeatureId],
    },
    hints: [
      `${enzyme.name}识别 5′-${enzyme.recognition}-3′，切口位于第 ${enzyme.topCutOffset} 个碱基之后。`,
      circular
        ? "环状受体被单点切开后会展开为一条带两个黏性末端的线性 DNA。"
        : "目的基因位于供体 DNA 的两个识别位点之间。",
      ...(difficulty === "standard"
        ? [`${getRestrictionEnzyme(distractorId).name}是本题的干扰工具。`]
        : []),
    ],
    teacherAnswer: circular
      ? `先环化受体；用${enzyme.name}单点打开受体并双切供体，将带目的基因片段连接后重新闭合成环。`
      : `受体含 1 个${enzyme.name}位点，供体含 2 个；把供体中带目的基因的双酶切片段接入受体。`,
    metadata: {
      source: "generated",
      taskType,
      difficulty,
      seed: normalizeSeed(seed),
      generationAttempt: attempt,
    },
  };
}

function simpleLigationLayoutIsValid(task: LigationLearningTask): boolean {
  const rule = task.completionRule!;
  const selected = getRestrictionEnzyme(
    rule.recipientEnzymeId as RestrictionEnzymeId,
  );
  const distractor = getRestrictionEnzyme(
    otherEnzymeId(rule.recipientEnzymeId as RestrictionEnzymeId),
  );
  const [initialRecipient, donor] = task.initialMolecules;
  const recipient =
    rule.finalTopology === "circular"
      ? circularizeMolecule(initialRecipient)
      : initialRecipient;
  return (
    scanRestrictionSites(recipient, selected).length === 1 &&
    scanRestrictionSites(donor, selected).length === 2 &&
    scanRestrictionSites(recipient, distractor).length === 0 &&
    scanRestrictionSites(donor, distractor).length === 0
  );
}

function withValidatedProducts(
  task: LigationLearningTask,
  report: LigationValidationReport,
): LigationLearningTask {
  return {
    ...task,
    completionRule: {
      ...task.completionRule!,
      validProducts: report.validProducts,
    },
  };
}

function worksheetFallback(
  taskType: Exclude<RandomTaskType, "pcr-selection">,
  seed: string,
  difficulty: RandomGeneratorConfig["difficulty"],
): GeneratedLigationTask {
  const taskIdByType = {
    "linear-ligation": "worksheet-1-linear-ecori",
    "circular-ligation": "worksheet-2-circular-ecori",
    "compatible-ends": "worksheet-4-ecori-muni",
  } as const;
  const source = getWorksheetTask(taskIdByType[taskType]);
  if (!source || source.taskKind !== "ligation") {
    throw new Error(`The tested ${taskType} fallback task is missing.`);
  }
  const task: LigationLearningTask = {
    ...source,
    id: `generated-fallback-${taskType}-${normalizeSeed(seed)}`,
    displayLabel: `随机训练 · 活动 ${source.worksheetNumber}`,
    metadata: {
      source: "generated",
      taskType,
      difficulty,
      seed: normalizeSeed(seed),
      usedFallback: true,
    },
  };
  const report = validateLigationTask(task);
  return { task: withValidatedProducts(task, report), report };
}

function generateValidatedSimpleLigationTask(
  taskType: Extract<RandomTaskType, "linear-ligation" | "circular-ligation">,
  config: RandomGeneratorConfig,
): GeneratedLigationTask {
  const seed = normalizeSeed(config.seed);
  for (let attempt = 0; attempt < (config.maxAttempts ?? 200); attempt += 1) {
    try {
      const task = generatedLigationTask(
        taskType,
        seed,
        config.difficulty,
        attempt,
      );
      if (!simpleLigationLayoutIsValid(task)) continue;
      const report = validateLigationTask(task);
      if (report.valid) {
        return { task: withValidatedProducts(task, report), report };
      }
    } catch {
      // Deterministic retry; invalid candidates are never shown.
    }
  }
  return worksheetFallback(taskType, seed, config.difficulty);
}

function generatedCompatibleEndsTask(
  seed: string,
  difficulty: RandomGeneratorConfig["difficulty"],
  attempt: number,
): LigationLearningTask {
  const rng = createSeededRandom(seed).fork(`compatible-ends-${attempt}`);
  const recipientEnzymeId = rng.pick(ENZYME_IDS);
  const donorEnzymeId = otherEnzymeId(recipientEnzymeId);
  const recipientEnzyme = getRestrictionEnzyme(recipientEnzymeId);
  const donorEnzyme = getRestrictionEnzyme(donorEnzymeId);
  const sequenceRng = rng.fork("sequences");
  const markerLeftLength = rng.integer(6, 10);
  const markerRightLength = rng.integer(6, 10);
  const spacerLength = rng.integer(5, 9);
  const tailLength = rng.integer(6, 10);
  const donorLeftLength = rng.integer(6, 10);
  const donorRightLength = rng.integer(6, 10);
  const geneLength = rng.integer(10, 20);
  const markerSequence =
    segment(markerLeftLength, sequenceRng.fork("marker-left")) +
    donorEnzyme.recognition +
    segment(markerRightLength, sequenceRng.fork("marker-right"));
  const recipientSequence =
    markerSequence +
    segment(spacerLength, sequenceRng.fork("spacer")) +
    recipientEnzyme.recognition +
    segment(tailLength, sequenceRng.fork("tail"));
  const geneSequence = segment(geneLength, sequenceRng.fork("gene"));
  const donorSequence =
    segment(donorLeftLength, sequenceRng.fork("donor-left")) +
    donorEnzyme.recognition +
    geneSequence +
    donorEnzyme.recognition +
    segment(donorRightLength, sequenceRng.fork("donor-right"));
  const taskId = `generated-compatible-${normalizeSeed(seed)}-${attempt}`;
  const markerFeatureId = `${taskId}-marker-gene`;
  const geneFeatureId = `${taskId}-target-gene`;
  const recipient: Molecule = {
    id: `${taskId}-plasmid`,
    name: "待环化质粒",
    topology: "linear",
    topStrand: recipientSequence,
    features: [
      {
        id: markerFeatureId,
        type: "marker",
        label: "标记基因",
        start: 0,
        end: markerSequence.length,
        color: "marker",
      },
    ],
    sourceTaskId: taskId,
  };
  const donor: Molecule = {
    id: `${taskId}-donor`,
    name: "目的基因供体",
    topology: "linear",
    topStrand: donorSequence,
    features: [
      {
        id: geneFeatureId,
        type: "gene",
        label: "目的基因",
        start: donorLeftLength + donorEnzyme.recognition.length,
        end: donorLeftLength + donorEnzyme.recognition.length + geneLength,
        color: "gene",
      },
    ],
    sourceTaskId: taskId,
  };

  return {
    id: taskId,
    worksheetNumber: "4",
    displayLabel: "随机训练 · 活动 4",
    taskKind: "ligation",
    title: "利用兼容黏性末端构建重组质粒",
    objective: "选择不会破坏红色标记基因的质粒切点，并连接绿色目的基因。",
    instructions: [
      "先将质粒首尾连接成环。",
      `比较质粒上的${recipientEnzyme.name}与${donorEnzyme.name}位点，避开标记基因内部切点。`,
      "切下绿色目的基因，利用兼容黏性末端完成两个接头。",
    ],
    availableTools: ["circularize", "ecoRI", "munI", "dnaLigase"],
    initialMolecules: [recipient, donor],
    defaultEnzymeId: recipientEnzymeId,
    completionRule: {
      recipientMoleculeId: recipient.id,
      donorMoleculeId: donor.id,
      recipientEnzymeId,
      donorEnzymeId,
      finalTopology: "circular",
      requiredFeatureIds: [markerFeatureId, geneFeatureId],
    },
    hints: [
      `${recipientEnzyme.name}和${donorEnzyme.name}都会产生 5′-AATT 黏性末端。`,
      difficulty === "basic"
        ? `${recipientEnzyme.name}位点位于标记基因外，适合打开质粒。`
        : "先根据红色功能区判断哪个质粒切点不会破坏标记基因。",
    ],
    teacherAnswer: `用${recipientEnzyme.name}在标记基因外打开质粒，用${donorEnzyme.name}切下目的基因；两种酶产生兼容的 AATT 黏性末端。`,
    metadata: {
      source: "generated",
      taskType: "compatible-ends",
      difficulty,
      seed: normalizeSeed(seed),
      generationAttempt: attempt,
    },
  };
}

function compatibleLayoutIsValid(task: LigationLearningTask): boolean {
  const rule = task.completionRule!;
  const [initialRecipient, donor] = task.initialMolecules;
  const recipient = circularizeMolecule(initialRecipient);
  const recipientEnzyme = getRestrictionEnzyme(
    rule.recipientEnzymeId as RestrictionEnzymeId,
  );
  const donorEnzyme = getRestrictionEnzyme(
    rule.donorEnzymeId as RestrictionEnzymeId,
  );
  const marker = initialRecipient.features.find(
    (feature) => feature.type === "marker",
  );
  const [safeSite] = scanRestrictionSites(recipient, recipientEnzyme);
  const [markerSite] = scanRestrictionSites(recipient, donorEnzyme);
  return Boolean(
    marker &&
      safeSite &&
      markerSite &&
      scanRestrictionSites(recipient, recipientEnzyme).length === 1 &&
      scanRestrictionSites(recipient, donorEnzyme).length === 1 &&
      scanRestrictionSites(donor, donorEnzyme).length === 2 &&
      scanRestrictionSites(donor, recipientEnzyme).length === 0 &&
      markerSite.siteStart >= marker.start &&
      markerSite.siteStart + donorEnzyme.recognition.length <= marker.end &&
      (safeSite.siteStart < marker.start || safeSite.siteStart >= marker.end),
  );
}

export function generateValidatedCompatibleEndsTask(
  config: RandomGeneratorConfig,
): GeneratedLigationTask {
  const seed = normalizeSeed(config.seed);
  for (let attempt = 0; attempt < (config.maxAttempts ?? 200); attempt += 1) {
    try {
      const task = generatedCompatibleEndsTask(
        seed,
        config.difficulty,
        attempt,
      );
      if (!compatibleLayoutIsValid(task)) continue;
      const report = validateLigationTask(task);
      if (report.valid) {
        return { task: withValidatedProducts(task, report), report };
      }
    } catch {
      // Deterministic retry; invalid candidates are never shown.
    }
  }
  return worksheetFallback("compatible-ends", seed, config.difficulty);
}

export function generateValidatedLinearLigationTask(
  config: LinearLigationGeneratorConfig,
): GeneratedLigationTask {
  return generateValidatedSimpleLigationTask("linear-ligation", config);
}

export function generateValidatedCircularLigationTask(
  config: RandomGeneratorConfig,
): GeneratedLigationTask {
  return generateValidatedSimpleLigationTask("circular-ligation", config);
}

export function generateValidatedRandomTask(
  config: RandomGeneratorConfig & { taskType: RandomTaskType },
): GeneratedRandomTask {
  switch (config.taskType) {
    case "linear-ligation":
      return generateValidatedLinearLigationTask(config);
    case "circular-ligation":
      return generateValidatedCircularLigationTask(config);
    case "pcr-selection":
      return generateValidatedPCRTask(config) satisfies GeneratedPCRTask;
    case "compatible-ends":
      return generateValidatedCompatibleEndsTask(config);
  }
}
