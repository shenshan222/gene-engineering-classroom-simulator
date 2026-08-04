import { getWorksheetTask } from "@/src/content/worksheetTasks";
import { calculateAmplicons, comparePrimers } from "@/src/domain/pcr";
import type {
  Amplicon,
  DNAEnd,
  Molecule,
  PCRLearningTask,
  Primer,
} from "@/src/domain/types";
import type {
  Activity1Feedback,
  CanvasDNAObject,
} from "@/src/state/activity1Workbench";

export interface PCRPrimerObject {
  id: string;
  name: string;
  sequence5to3: string;
  x: number;
  y: number;
  zIndex: number;
}

export interface PCRSnapshot {
  templates: readonly CanvasDNAObject[];
  primers: readonly PCRPrimerObject[];
  selectedTemplateId: string;
  selectedPrimerIds: readonly string[];
  amplicons: readonly Amplicon[];
  feedback: Activity1Feedback;
  completed: boolean;
  nextZIndex: number;
}

export interface PCRState {
  task: PCRLearningTask;
  present: PCRSnapshot;
  past: readonly PCRSnapshot[];
  future: readonly PCRSnapshot[];
}

export type PCRAction =
  | { type: "SELECT_TEMPLATE"; templateId: string }
  | { type: "TOGGLE_PRIMER"; primerId: string }
  | { type: "BRING_TEMPLATE_TO_FRONT"; objectId: string }
  | { type: "BRING_PRIMER_TO_FRONT"; primerId: string }
  | { type: "MOVE_TEMPLATE"; objectId: string; x: number; y: number }
  | { type: "MOVE_PRIMER"; primerId: string; x: number; y: number }
  | { type: "RUN_PCR" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET" };

export function loadPCRTask(taskId = "worksheet-3-pcr"): PCRLearningTask {
  const task = getWorksheetTask(taskId);
  if (!task || task.taskKind !== "pcr") {
    throw new Error("PCR worksheet data is missing.");
  }
  return task;
}

function resolvePCRTask(
  taskOrId?: string | PCRLearningTask,
): PCRLearningTask {
  if (!taskOrId) return loadPCRTask();
  return typeof taskOrId === "string" ? loadPCRTask(taskOrId) : taskOrId;
}

function naturalEnd(side: "left" | "right"): DNAEnd {
  return {
    type: "blunt",
    sequence5to3: "",
    protrudingStrand: null,
    side,
    createdBy: null,
  };
}

function templateObject(
  molecule: Molecule,
  y: number,
  zIndex: number,
): CanvasDNAObject {
  return {
    id: molecule.id,
    kind: "molecule",
    name: molecule.name,
    topology: molecule.topology,
    topStrand: molecule.topStrand,
    leftEnd: naturalEnd("left"),
    rightEnd: naturalEnd("right"),
    features: molecule.features,
    foldedRegions: molecule.foldedRegions ?? [],
    sourceMoleculeId: molecule.id,
    sourceTaskId: molecule.sourceTaskId,
    x: 48,
    y,
    zIndex,
  };
}

function primerObject(
  primer: Primer,
  index: number,
  startY: number,
): PCRPrimerObject {
  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    id: primer.id,
    name: primer.name,
    sequence5to3: primer.sequence5to3,
    x: 58 + column * 310,
    y: startY + row * 112,
    zIndex: 10 + index,
  };
}

export function createPCRSnapshot(
  taskOrId?: string | PCRLearningTask,
): PCRSnapshot {
  const task = resolvePCRTask(taskOrId);
  const primerStartY = 48 + task.templateMolecules.length * 194 + 48;
  return {
    templates: task.templateMolecules.map((template, index) =>
      templateObject(template, 48 + index * 194, index + 1),
    ),
    primers: task.primers.map((primer, index) =>
      primerObject(primer, index, primerStartY),
    ),
    selectedTemplateId: task.templateMolecules[0].id,
    selectedPrimerIds: [],
    amplicons: [],
    feedback: {
      kind: "info",
      message: "选择一条模板和两条引物；所有对象都可以自由拖动。",
    },
    completed: false,
    nextZIndex: 20,
  };
}

export function createPCRState(
  taskOrId?: string | PCRLearningTask,
): PCRState {
  const task = resolvePCRTask(taskOrId);
  return { task, present: createPCRSnapshot(task), past: [], future: [] };
}

function commit(state: PCRState, next: PCRSnapshot): PCRState {
  return {
    task: state.task,
    present: next,
    past: [...state.past.slice(-49), state.present],
    future: [],
  };
}

function selectedPrimers(state: PCRState): readonly Primer[] {
  const snapshot = state.present;
  return snapshot.selectedPrimerIds
    .map((id) => state.task.primers.find((primer) => primer.id === id))
    .filter((primer): primer is Primer => Boolean(primer));
}

function runPCR(state: PCRState): PCRSnapshot {
  const snapshot = state.present;
  const task = state.task;
  const template = task.templateMolecules.find(
    (candidate) => candidate.id === snapshot.selectedTemplateId,
  );
  const primers = selectedPrimers(state);
  if (!template || primers.length !== 2) {
    return {
      ...snapshot,
      feedback: {
        kind: "error",
        message: "运行 PCR 前，请选择一条 DNA 模板和两条引物。",
      },
    };
  }
  const amplicons = calculateAmplicons(template, primers[0], primers[1]);
  const correctPair = new Set(task.correctPrimerPair);
  const selectedPairCorrect =
    primers.every((primer) => correctPair.has(primer.id)) &&
    template.id === task.correctTemplateId &&
    amplicons.length > 0;
  const relation = comparePrimers(primers[0], primers[1]);
  const relationText =
    relation === "same"
      ? "两条引物序列相同"
      : relation === "reverseComplement"
        ? "两条引物互为反向互补"
        : "两条引物序列不同";
  return {
    ...snapshot,
    amplicons,
    completed: snapshot.completed || selectedPairCorrect,
    feedback: selectedPairCorrect
      ? {
          kind: "success",
          message: `选择正确：${primers[0].name}和${primers[1].name}的 3′端相向，可扩增${template.name}。`,
        }
      : amplicons.length > 0
        ? {
            kind: "success",
            message: `${relationText}；当前组合得到 ${amplicons.length} 种扩增产物。`,
          }
        : {
            kind: "error",
            message: `${relationText}，但没有形成方向相向的有效扩增区段。`,
          },
  };
}

export function pcrReducer(state: PCRState, action: PCRAction): PCRState {
  const snapshot = state.present;
  switch (action.type) {
    case "SELECT_TEMPLATE":
      return {
        ...state,
        present: {
          ...snapshot,
          selectedTemplateId: action.templateId,
          amplicons: [],
          feedback: { kind: "info", message: "模板已选择，请再选择两条引物。" },
        },
      };
    case "TOGGLE_PRIMER": {
      const selected = snapshot.selectedPrimerIds.includes(action.primerId);
      const nextIds = selected
        ? snapshot.selectedPrimerIds.filter((id) => id !== action.primerId)
        : [...snapshot.selectedPrimerIds.slice(-1), action.primerId];
      return {
        ...state,
        present: {
          ...snapshot,
          selectedPrimerIds: nextIds,
          amplicons: [],
          feedback: {
            kind: "info",
            message:
              nextIds.length === 2
                ? "已选择两条引物，可以运行 PCR。"
                : "请选择另一条引物。",
          },
        },
      };
    }
    case "BRING_TEMPLATE_TO_FRONT":
      return {
        ...state,
        present: {
          ...snapshot,
          templates: snapshot.templates.map((template) =>
            template.id === action.objectId
              ? { ...template, zIndex: snapshot.nextZIndex }
              : template,
          ),
          nextZIndex: snapshot.nextZIndex + 1,
        },
      };
    case "BRING_PRIMER_TO_FRONT":
      return {
        ...state,
        present: {
          ...snapshot,
          primers: snapshot.primers.map((primer) =>
            primer.id === action.primerId
              ? { ...primer, zIndex: snapshot.nextZIndex }
              : primer,
          ),
          nextZIndex: snapshot.nextZIndex + 1,
        },
      };
    case "MOVE_TEMPLATE":
      return commit(state, {
        ...snapshot,
        templates: snapshot.templates.map((template) =>
          template.id === action.objectId
            ? { ...template, x: action.x, y: action.y }
            : template,
        ),
      });
    case "MOVE_PRIMER":
      return commit(state, {
        ...snapshot,
        primers: snapshot.primers.map((primer) =>
          primer.id === action.primerId
            ? { ...primer, x: action.x, y: action.y }
            : primer,
        ),
      });
    case "RUN_PCR": {
      const next = runPCR(state);
      return next === snapshot ? state : commit(state, next);
    }
    case "UNDO": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        task: state.task,
        present: previous,
        past: state.past.slice(0, -1),
        future: [snapshot, ...state.future],
      };
    }
    case "REDO": {
      const [next, ...remaining] = state.future;
      if (!next) return state;
      return {
        task: state.task,
        present: next,
        past: [...state.past, snapshot],
        future: remaining,
      };
    }
    case "RESET":
      return createPCRState(state.task);
    default:
      return state;
  }
}
