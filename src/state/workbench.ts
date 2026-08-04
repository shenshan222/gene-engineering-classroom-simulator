import type {
  DNAFragment,
  LearningTask,
  MolecularCut,
  Molecule,
  OpenedRecipient,
} from "@/src/domain/types";

export type ToolId =
  | "ecoRI"
  | "munI"
  | "manualScissors"
  | "circularize"
  | "dnaLigase";

export type FeedbackKind = "info" | "success" | "warning" | "error";

export interface FeedbackItem {
  id: string;
  kind: FeedbackKind;
  message: string;
}

export interface BondSelection {
  moleculeId: string;
  bondIndex: number;
}

export interface WorkspaceSnapshot {
  taskId: string;
  molecules: readonly Molecule[];
  cutsByMolecule: Readonly<Record<string, readonly MolecularCut[]>>;
  fragments: readonly DNAFragment[];
  selectedToolId: ToolId | null;
  selectedBond: BondSelection | null;
  selectedFragmentId: string | null;
  openedRecipient: OpenedRecipient | null;
  result: Molecule | null;
  completed: boolean;
  feedback: readonly FeedbackItem[];
}

export interface WorkbenchState {
  present: WorkspaceSnapshot;
  past: readonly WorkspaceSnapshot[];
  future: readonly WorkspaceSnapshot[];
  showAnswer: boolean;
}

export type WorkbenchAction =
  | { type: "COMMIT"; snapshot: WorkspaceSnapshot }
  | { type: "PATCH"; snapshot: WorkspaceSnapshot }
  | { type: "LOAD_TASK"; task: LearningTask }
  | { type: "RESET_TASK"; task: LearningTask }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "TOGGLE_ANSWER" };

let feedbackSequence = 0;

export function createFeedback(
  message: string,
  kind: FeedbackKind = "info",
): FeedbackItem {
  feedbackSequence += 1;
  return {
    id: `feedback-${feedbackSequence}`,
    kind,
    message,
  };
}

export function appendFeedback(
  snapshot: WorkspaceSnapshot,
  message: string,
  kind: FeedbackKind = "info",
): WorkspaceSnapshot {
  return {
    ...snapshot,
    feedback: [...snapshot.feedback.slice(-7), createFeedback(message, kind)],
  };
}

export function createWorkspaceSnapshot(task: LearningTask): WorkspaceSnapshot {
  const defaultTool =
    task.taskKind === "ligation"
      ? (task.defaultEnzymeId as ToolId)
      : null;
  return {
    taskId: task.id,
    molecules:
      task.taskKind === "ligation"
        ? task.initialMolecules.map((molecule) => ({
            ...molecule,
            features: [...molecule.features],
            foldedRegions: molecule.foldedRegions
              ? [...molecule.foldedRegions]
              : undefined,
          }))
        : [],
    cutsByMolecule: {},
    fragments: [],
    selectedToolId: defaultTool,
    selectedBond: null,
    selectedFragmentId: null,
    openedRecipient: null,
    result: null,
    completed: false,
    feedback: [
      createFeedback(
        task.taskKind === "ligation"
          ? "选择工具，再点击或拖到 DNA 的碱基间切点。"
          : "PCR 交互将在阶段 4 接入。",
        "info",
      ),
    ],
  };
}

export function createWorkbenchState(task: LearningTask): WorkbenchState {
  return {
    present: createWorkspaceSnapshot(task),
    past: [],
    future: [],
    showAnswer: false,
  };
}

export function workbenchReducer(
  state: WorkbenchState,
  action: WorkbenchAction,
): WorkbenchState {
  switch (action.type) {
    case "COMMIT":
      return {
        ...state,
        present: action.snapshot,
        past: [...state.past.slice(-49), state.present],
        future: [],
      };
    case "PATCH":
      return {
        ...state,
        present: action.snapshot,
      };
    case "LOAD_TASK":
    case "RESET_TASK":
      return createWorkbenchState(action.task);
    case "UNDO": {
      const previous = state.past.at(-1);
      if (!previous) {
        return state;
      }
      return {
        ...state,
        present: previous,
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future],
      };
    }
    case "REDO": {
      const [next, ...remaining] = state.future;
      if (!next) {
        return state;
      }
      return {
        ...state,
        present: next,
        past: [...state.past, state.present],
        future: remaining,
      };
    }
    case "TOGGLE_ANSWER":
      return {
        ...state,
        showAnswer: !state.showAnswer,
      };
    default:
      return state;
  }
}
