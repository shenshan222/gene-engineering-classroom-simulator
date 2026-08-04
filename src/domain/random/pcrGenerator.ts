import { getWorksheetTask } from "@/src/content/worksheetTasks";
import { randomDNAWithoutMotifs } from "@/src/domain/random/dnaFactory";
import {
  createSeededRandom,
  normalizeSeed,
  type SeededRandom,
} from "@/src/domain/random/prng";
import {
  validatePCRTask,
  type PCRValidationReport,
} from "@/src/domain/random/validator";
import { reverseComplement } from "@/src/domain/sequence";
import type {
  Difficulty,
  Molecule,
  PCRLearningTask,
  Primer,
} from "@/src/domain/types";

export interface PCRGeneratorConfig {
  seed: string;
  difficulty: Extract<Difficulty, "basic" | "standard">;
  maxAttempts?: number;
}

export interface GeneratedPCRTask {
  task: PCRLearningTask;
  report: PCRValidationReport;
}

interface PrimerCandidate {
  role: "forward" | "reverse" | "distractor";
  sequence5to3: string;
}

function nonBindingPrimer(
  template: string,
  length: number,
  used: ReadonlySet<string>,
  rng: SeededRandom,
): string {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const candidate = randomDNAWithoutMotifs(
      length,
      [],
      rng.fork(`non-binding-${attempt}`),
    );
    if (
      !template.includes(candidate) &&
      !template.includes(reverseComplement(candidate)) &&
      !used.has(candidate)
    ) {
      return candidate;
    }
  }
  throw new Error("Unable to create a non-binding primer distractor.");
}

function generatePCRCandidate(
  seed: string,
  difficulty: PCRGeneratorConfig["difficulty"],
  attempt: number,
): PCRLearningTask {
  const rng = createSeededRandom(seed).fork(`pcr-selection-${attempt}`);
  const templateLength =
    difficulty === "basic" ? rng.integer(48, 58) : rng.integer(60, 72);
  const primerLength =
    difficulty === "basic" ? rng.integer(10, 11) : rng.integer(11, 13);
  const templateSequence = randomDNAWithoutMotifs(
    templateLength,
    [],
    rng.fork("template"),
  );
  const forwardSequence = templateSequence.slice(0, primerLength);
  const rightTopSequence = templateSequence.slice(-primerLength);
  const reverseSequence = reverseComplement(rightTopSequence);
  const wrongLeftSequence = reverseComplement(forwardSequence);
  const used = new Set([
    forwardSequence,
    reverseSequence,
    rightTopSequence,
    wrongLeftSequence,
  ]);
  const candidates: PrimerCandidate[] = [
    { role: "forward", sequence5to3: forwardSequence },
    { role: "reverse", sequence5to3: reverseSequence },
    { role: "distractor", sequence5to3: rightTopSequence },
    { role: "distractor", sequence5to3: wrongLeftSequence },
  ];
  const randomDistractorCount = difficulty === "basic" ? 2 : 4;
  for (let index = 0; index < randomDistractorCount; index += 1) {
    const sequence = nonBindingPrimer(
      templateSequence,
      primerLength,
      used,
      rng.fork(`distractor-${index}`),
    );
    used.add(sequence);
    candidates.push({ role: "distractor", sequence5to3: sequence });
  }

  const shuffled = rng.shuffle(candidates);
  const taskId = `generated-pcr-${normalizeSeed(seed)}-${attempt}`;
  const primers: Primer[] = shuffled.map((candidate, index) => ({
    id: `${taskId}-primer-${index + 1}`,
    name: `引物 ${index + 1}`,
    sequence5to3: candidate.sequence5to3,
    source: "generated",
  }));
  const forwardIndex = shuffled.findIndex(
    (candidate) => candidate.role === "forward",
  );
  const reverseIndex = shuffled.findIndex(
    (candidate) => candidate.role === "reverse",
  );
  const template: Molecule = {
    id: `${taskId}-template`,
    name: "PCR 模板 DNA",
    topology: "linear",
    topStrand: templateSequence,
    features: [
      {
        id: `${taskId}-target-region`,
        type: "gene",
        label: "目标扩增区",
        start: primerLength,
        end: templateLength - primerLength,
        color: "gene",
      },
    ],
    sourceTaskId: taskId,
  };

  return {
    id: taskId,
    worksheetNumber: "3",
    displayLabel: "随机训练 · 活动 3",
    taskKind: "pcr",
    title: "为目标区段选择一对 PCR 引物",
    objective: "从候选引物中找出分别位于模板两侧、3′端相向的一对引物。",
    instructions: [
      "观察模板 DNA 两端的碱基序列。",
      "选择一条正向引物和一条反向引物。",
      "运行 PCR，检查是否得到覆盖绿色目标区的扩增产物。",
    ],
    availableTools: ["primer", "pcr"],
    templateMolecules: [template],
    primers,
    correctTemplateId: template.id,
    correctPrimerPair: [
      primers[forwardIndex].id,
      primers[reverseIndex].id,
    ],
    hints: [
      "正向引物与模板左端上链序列相同。",
      "反向引物应是模板右端上链序列的反向互补序列。",
      difficulty === "standard"
        ? "候选项更多，可先判断每条引物可能的延伸方向。"
        : "两条正确引物的 3′端必须朝向绿色目标区。",
    ],
    teacherAnswer: `正确组合为${primers[forwardIndex].name}和${primers[reverseIndex].name}，扩增产物长度为 ${templateLength} bp。`,
    metadata: {
      source: "generated",
      taskType: "pcr-selection",
      difficulty,
      seed: normalizeSeed(seed),
      generationAttempt: attempt,
    },
  };
}

function fallbackPCRTask(
  requestedSeed: string,
  difficulty: PCRGeneratorConfig["difficulty"],
): GeneratedPCRTask {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = generatePCRCandidate(
      "BIO-PCR-TESTED-FALLBACK",
      difficulty,
      attempt,
    );
    const report = validatePCRTask(candidate);
    if (report.valid) {
      return {
        task: {
          ...candidate,
          displayLabel: "随机训练 · 活动 3",
          metadata: {
            source: "generated",
            taskType: "pcr-selection",
            difficulty,
            seed: normalizeSeed(requestedSeed),
            generationAttempt: attempt,
            usedFallback: true,
          },
        },
        report,
      };
    }
  }
  const worksheet = getWorksheetTask("worksheet-3-pcr");
  if (!worksheet || worksheet.taskKind !== "pcr") {
    throw new Error("The PCR fallback task is missing.");
  }
  return {
    task: {
      ...worksheet,
      displayLabel: "随机训练 · 活动 3",
      metadata: {
        source: "generated",
        taskType: "pcr-selection",
        difficulty,
        seed: normalizeSeed(requestedSeed),
        usedFallback: true,
      },
    },
    report: validatePCRTask(worksheet),
  };
}

export function generateValidatedPCRTask(
  config: PCRGeneratorConfig,
): GeneratedPCRTask {
  const seed = normalizeSeed(config.seed);
  const maxAttempts = config.maxAttempts ?? 200;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const task = generatePCRCandidate(seed, config.difficulty, attempt);
      const report = validatePCRTask(task);
      if (report.valid) {
        return { task, report };
      }
    } catch {
      // Keep retries deterministic and never expose an invalid candidate.
    }
  }
  return fallbackPCRTask(seed, config.difficulty);
}
