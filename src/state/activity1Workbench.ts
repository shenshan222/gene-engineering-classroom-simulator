import {
  findRestrictionEnzyme,
  getRestrictionEnzyme,
  type RestrictionEnzymeId,
} from "@/src/content/enzymeLibrary";
import { getWorksheetTask } from "@/src/content/worksheetTasks";
import { digestMolecule } from "@/src/domain/cutting";
import { canLigate } from "@/src/domain/ligation";
import {
  productSignature,
  productSignatureKey,
} from "@/src/domain/random/canonical";
import { solveLigationTask } from "@/src/domain/random/solver";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type {
  DNAEnd,
  FoldedRegion,
  LigationLearningTask,
  Molecule,
  SequenceFeature,
  Topology,
} from "@/src/domain/types";

export type Activity1Tool =
  | "move"
  | "circularize"
  | "ecoRI"
  | "munI"
  | "ligase";
export type EndSide = "left" | "right";

export interface EndReference {
  objectId: string;
  side: EndSide;
}

export interface CanvasDNAObject {
  id: string;
  kind: "molecule" | "fragment" | "product";
  name: string;
  topology: Topology;
  topStrand: string;
  leftEnd: DNAEnd;
  rightEnd: DNAEnd;
  features: readonly SequenceFeature[];
  foldedRegions: readonly FoldedRegion[];
  sourceMoleculeId: string;
  sourceTaskId: string;
  x: number;
  y: number;
  zIndex: number;
}

export interface Activity1Feedback {
  kind: "info" | "success" | "error";
  message: string;
}

export interface Activity1Snapshot {
  taskId: string;
  objects: readonly CanvasDNAObject[];
  activeTool: Activity1Tool;
  selectedEnd: EndReference | null;
  feedback: Activity1Feedback;
  invalidBond: { objectId: string; bondIndex: number } | null;
  eventSequence: number;
  completed: boolean;
  nextZIndex: number;
}

export interface Activity1State {
  task: LigationLearningTask;
  expectedProductKeys: readonly string[];
  present: Activity1Snapshot;
  past: readonly Activity1Snapshot[];
  future: readonly Activity1Snapshot[];
}

export type Activity1Action =
  | { type: "SELECT_TOOL"; tool: Activity1Tool }
  | { type: "BRING_TO_FRONT"; objectId: string }
  | { type: "MOVE_OBJECT"; objectId: string; x: number; y: number }
  | {
      type: "CUT_AT";
      objectId: string;
      bondIndex: number;
      enzymeId?: RestrictionEnzymeId;
    }
  | { type: "CIRCULARIZE"; objectId: string }
  | { type: "SELECT_END"; end: EndReference | null }
  | { type: "LIGATE_ENDS"; first: EndReference; second: EndReference }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET" };

export const ligationTaskIds = [
  "worksheet-1-linear-ecori",
  "worksheet-2-circular-ecori",
  "worksheet-4-ecori-muni",
] as const;

export type LigationTaskId = (typeof ligationTaskIds)[number];

export function loadLigationTask(taskId: string): LigationLearningTask {
  const task = getWorksheetTask(taskId);
  if (!task || task.taskKind !== "ligation") {
    throw new Error(`Ligation worksheet data is missing: ${taskId}`);
  }
  return task;
}

function naturalEnd(side: EndSide): DNAEnd {
  return {
    type: "blunt",
    sequence5to3: "",
    protrudingStrand: null,
    side,
    createdBy: null,
  };
}

function initialObject(
  molecule: Molecule,
  x: number,
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
    features: [...molecule.features],
    foldedRegions: [...(molecule.foldedRegions ?? [])],
    sourceMoleculeId: molecule.id,
    sourceTaskId: molecule.sourceTaskId,
    x,
    y,
    zIndex,
  };
}

function expectedProductKeys(task: LigationLearningTask): readonly string[] {
  const products =
    task.completionRule?.validProducts ??
    solveLigationTask(task).map((solution) => solution.signature);
  if (products.length === 0) {
    throw new Error(`Task ${task.id} does not contain a valid insert route.`);
  }
  return products.map(productSignatureKey);
}

function isExpectedProduct(
  state: Activity1State,
  topology: Topology,
  sequence: string,
): boolean {
  const signature = productSignature(
    {
      id: "candidate-product",
      name: "candidate product",
      topology,
      topStrand: sequence,
      features: [],
      sourceTaskId: state.task.id,
    },
    state.task.completionRule?.requiredFeatureIds ?? [],
  );
  return state.expectedProductKeys.includes(productSignatureKey(signature));
}

function toolInstruction(tool: Activity1Tool): Activity1Feedback {
  const enzyme = findRestrictionEnzyme(tool);
  if (enzyme) {
    const markedRecognition =
      enzyme.recognition.slice(0, enzyme.topCutOffset) +
      "│" +
      enzyme.recognition.slice(enzyme.topCutOffset);
    return {
      kind: "info",
      message: `${enzyme.name}已选中：点击碱基间隙，寻找 5′-${markedRecognition}-3′切点。`,
    };
  }
  switch (tool) {
    case "ligase":
      return {
        kind: "info",
        message: "DNA 连接酶已选中：依次点击两个带序列标记的兼容末端。",
      };
    case "circularize":
      return {
        kind: "info",
        message: "首尾连接已选中：点击受体 DNA 标题栏中的“连接成环”。",
      };
    default:
      return {
        kind: "info",
        message: "拖动任意 DNA 组件，将它们摆放到便于观察的位置。",
      };
  }
}

function resolveLigationTask(
  taskOrId: string | LigationLearningTask,
): LigationLearningTask {
  return typeof taskOrId === "string" ? loadLigationTask(taskOrId) : taskOrId;
}

export function toolsForLigationTask(
  taskOrId: string | LigationLearningTask,
): readonly Activity1Tool[] {
  const task = resolveLigationTask(taskOrId);
  return [
    "move",
    ...(task.availableTools.includes("circularize")
      ? (["circularize"] as const)
      : []),
    ...(task.availableTools.includes("ecoRI") ? (["ecoRI"] as const) : []),
    ...(task.availableTools.includes("munI") ? (["munI"] as const) : []),
    "ligase",
  ];
}

export function createLigationSnapshot(
  taskOrId: string | LigationLearningTask,
): Activity1Snapshot {
  const task = resolveLigationTask(taskOrId);
  const [recipient, donor] = task.initialMolecules;
  return {
    taskId: task.id,
    objects: [
      initialObject(recipient, 54, 78, 1),
      initialObject(donor, 150, 330, 2),
    ],
    activeTool: "move",
    selectedEnd: null,
    feedback: toolInstruction("move"),
    invalidBond: null,
    eventSequence: 0,
    completed: false,
    nextZIndex: 3,
  };
}

export function createLigationState(
  taskOrId: string | LigationLearningTask,
): Activity1State {
  const task = resolveLigationTask(taskOrId);
  return {
    task,
    expectedProductKeys: expectedProductKeys(task),
    present: createLigationSnapshot(task),
    past: [],
    future: [],
  };
}

export function createActivity1Snapshot(): Activity1Snapshot {
  return createLigationSnapshot("worksheet-1-linear-ecori");
}

export function createActivity1State(): Activity1State {
  return createLigationState("worksheet-1-linear-ecori");
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

interface SnapshotOperation {
  snapshot: Activity1Snapshot;
  changed: boolean;
}

function restrictionTool(
  snapshot: Activity1Snapshot,
  explicit?: RestrictionEnzymeId,
): RestrictionEnzymeId {
  if (explicit) {
    return explicit;
  }
  return snapshot.activeTool === "munI" ? "munI" : "ecoRI";
}

export function cutActivity1Object(
  snapshot: Activity1Snapshot,
  objectId: string,
  bondIndex: number,
  enzymeId?: RestrictionEnzymeId,
): SnapshotOperation {
  const object = snapshot.objects.find((candidate) => candidate.id === objectId);
  if (!object) {
    return {
      changed: false,
      snapshot: {
        ...snapshot,
        feedback: { kind: "error", message: "没有找到要切割的 DNA。" },
      },
    };
  }

  const selectedEnzymeId = restrictionTool(snapshot, enzymeId);
  const enzyme = getRestrictionEnzyme(selectedEnzymeId);
  const molecule = asMolecule(object);
  const site = scanRestrictionSites(molecule, enzyme).find(
    (candidate) => candidate.topBondIndex === bondIndex,
  );
  if (!site) {
    return {
      changed: false,
      snapshot: {
        ...snapshot,
        feedback: {
          kind: "error",
          message: `${enzyme.name}不能在这里切割。请寻找完整的 ${enzyme.recognition} 识别序列。`,
        },
        invalidBond: { objectId, bondIndex },
        eventSequence: snapshot.eventSequence + 1,
      },
    };
  }

  const fragments = digestMolecule(molecule, [site]).fragments;
  let nextX = object.x;
  const childObjects = fragments.map((fragment, index) => {
    const wasCircular = object.topology === "circular";
    const child: CanvasDNAObject = {
      id: `${object.id}:cut-${snapshot.eventSequence + 1}:${index}`,
      kind: "fragment",
      name: wasCircular
        ? `${object.name} · 已展开`
        : `${object.name} · 片段 ${index + 1}`,
      topology: "linear",
      topStrand: fragment.topStrand,
      leftEnd:
        !wasCircular && index === 0 ? object.leftEnd : fragment.leftEnd,
      rightEnd:
        !wasCircular && index === fragments.length - 1
          ? object.rightEnd
          : fragment.rightEnd,
      features: [...fragment.features],
      foldedRegions: [...(fragment.foldedRegions ?? [])],
      sourceMoleculeId: object.sourceMoleculeId,
      sourceTaskId: object.sourceTaskId,
      x: nextX,
      y: object.y,
      zIndex: snapshot.nextZIndex + index,
    };
    nextX += Math.max(190, fragment.topStrand.length * 26 + 64);
    return child;
  });

  return {
    changed: true,
    snapshot: {
      ...snapshot,
      objects: [
        ...snapshot.objects.filter((candidate) => candidate.id !== objectId),
        ...childObjects,
      ],
      selectedEnd: null,
      feedback: {
        kind: "success",
        message: wasCircularMessage(object, enzyme.name, fragments.length),
      },
      invalidBond: null,
      eventSequence: snapshot.eventSequence + 1,
      completed: false,
      nextZIndex: snapshot.nextZIndex + childObjects.length,
    },
  };
}

function wasCircularMessage(
  object: CanvasDNAObject,
  enzymeName: string,
  fragmentCount: number,
): string {
  return object.topology === "circular"
    ? `${object.name}被${enzymeName}单点切开，已展开为线性 DNA。`
    : `${object.name}已被${enzymeName}切开，生成 ${fragmentCount} 个可拖动片段。`;
}

function circularizeObject(
  task: LigationLearningTask,
  snapshot: Activity1Snapshot,
  objectId: string,
): SnapshotOperation {
  const recipientId =
    task.completionRule?.recipientMoleculeId ?? task.initialMolecules[0].id;
  const object = snapshot.objects.find((candidate) => candidate.id === objectId);
  if (!object) {
    return {
      changed: false,
      snapshot: {
        ...snapshot,
        feedback: { kind: "error", message: "没有找到要环化的 DNA。" },
      },
    };
  }
  if (object.sourceMoleculeId !== recipientId || object.kind !== "molecule") {
    return {
      changed: false,
      snapshot: {
        ...snapshot,
        feedback: { kind: "error", message: "本活动只需将受体 DNA 首尾连接。" },
      },
    };
  }
  if (object.topology === "circular") {
    return {
      changed: false,
      snapshot: {
        ...snapshot,
        feedback: { kind: "error", message: `${object.name}已经是环状 DNA。` },
      },
    };
  }
  return {
    changed: true,
    snapshot: {
      ...snapshot,
      objects: snapshot.objects.map((candidate) =>
        candidate.id === objectId
          ? { ...candidate, topology: "circular" as const }
          : candidate,
      ),
      feedback: {
        kind: "success",
        message: `${object.name}已完成首尾连接，成为环状 DNA。`,
      },
      eventSequence: snapshot.eventSequence + 1,
    },
  };
}

function endOf(object: CanvasDNAObject, side: EndSide): DNAEnd {
  return side === "left" ? object.leftEnd : object.rightEnd;
}

function shiftFeatures(
  features: readonly SequenceFeature[],
  offset: number,
): SequenceFeature[] {
  return features.map((feature) => ({
    ...feature,
    start: feature.start + offset,
    end: feature.end + offset,
  }));
}

function shiftFoldedRegions(
  regions: readonly FoldedRegion[],
  offset: number,
): FoldedRegion[] {
  return regions.map((region) => ({
    ...region,
    start: region.start + offset,
    end: region.end + offset,
  }));
}

function ligationErrorMessage(reason: string): string {
  switch (reason) {
    case "END_SIDES_DO_NOT_MEET":
      return "这两个末端方向相同，不能首尾相接。";
    case "OVERHANG_TYPE_MISMATCH":
      return "这两个末端类型不同，不能连接。";
    case "OVERHANG_SEQUENCE_MISMATCH":
      return "这两个黏性末端的序列不兼容。";
    case "PROTRUDING_STRANDS_DO_NOT_MEET":
      return "突出链方向不相对，请选择另一端。";
    default:
      return "这两个 DNA 末端不能连接。";
  }
}

function validateEnds(
  snapshot: Activity1Snapshot,
  firstObject: CanvasDNAObject,
  firstReference: EndReference,
  secondObject: CanvasDNAObject,
  secondReference: EndReference,
): SnapshotOperation | null {
  const firstEnd = endOf(firstObject, firstReference.side);
  const secondEnd = endOf(secondObject, secondReference.side);
  if (!firstEnd.createdBy || !secondEnd.createdBy) {
    return {
      changed: false,
      snapshot: {
        ...snapshot,
        selectedEnd: null,
        feedback: {
          kind: "error",
          message: "请选择限制酶切割产生的黏性末端。",
        },
      },
    };
  }
  const check = canLigate(firstEnd, secondEnd);
  if (!check.compatible) {
    return {
      changed: false,
      snapshot: {
        ...snapshot,
        selectedEnd: null,
        feedback: { kind: "error", message: ligationErrorMessage(check.reason) },
      },
    };
  }
  return null;
}

export function ligateActivity1Objects(
  state: Activity1State,
  firstReference: EndReference,
  secondReference: EndReference,
): SnapshotOperation {
  const snapshot = state.present;
  const firstObject = snapshot.objects.find(
    (object) => object.id === firstReference.objectId,
  );
  const secondObject = snapshot.objects.find(
    (object) => object.id === secondReference.objectId,
  );
  if (!firstObject || !secondObject) {
    return {
      changed: false,
      snapshot: {
        ...snapshot,
        selectedEnd: null,
        feedback: { kind: "error", message: "没有找到所选的 DNA 片段。" },
      },
    };
  }

  if (firstObject.id === secondObject.id) {
    if (firstReference.side === secondReference.side) {
      return {
        changed: false,
        snapshot: {
          ...snapshot,
          selectedEnd: null,
          feedback: { kind: "error", message: "请选择该片段相对的两个末端。" },
        },
      };
    }
    const invalid = validateEnds(
      snapshot,
      firstObject,
      firstReference,
      secondObject,
      secondReference,
    );
    if (invalid) {
      return invalid;
    }
    const completed = isExpectedProduct(
      state,
      "circular",
      firstObject.topStrand,
    );
    const closedObject: CanvasDNAObject = {
      ...firstObject,
      kind: completed ? "product" : "fragment",
      name: completed ? "重组质粒（活动产物）" : "已闭合环状 DNA",
      topology: "circular",
      leftEnd: naturalEnd("left"),
      rightEnd: naturalEnd("right"),
      zIndex: snapshot.nextZIndex,
    };
    return {
      changed: true,
      snapshot: {
        ...snapshot,
        objects: snapshot.objects.map((object) =>
          object.id === firstObject.id ? closedObject : object,
        ),
        selectedEnd: null,
        feedback: completed
          ? {
              kind: "success",
              message: "连接完成：目的片段已正确插入环状受体 DNA。",
            }
          : {
              kind: "success",
              message: "两个末端已闭合，但当前环状 DNA 不是目标产物。",
            },
        invalidBond: null,
        eventSequence: snapshot.eventSequence + 1,
        completed,
        nextZIndex: snapshot.nextZIndex + 1,
      },
    };
  }

  const invalid = validateEnds(
    snapshot,
    firstObject,
    firstReference,
    secondObject,
    secondReference,
  );
  if (invalid) {
    return invalid;
  }

  const leftObject =
    firstReference.side === "right" ? firstObject : secondObject;
  const rightObject =
    firstReference.side === "right" ? secondObject : firstObject;
  const joinedSequence = leftObject.topStrand + rightObject.topStrand;
  const completed = isExpectedProduct(state, "linear", joinedSequence);
  const joinedObject: CanvasDNAObject = {
    id: `joined:${snapshot.eventSequence + 1}:${leftObject.id}:${rightObject.id}`,
    kind: completed ? "product" : "fragment",
    name: completed ? "重组 DNA（活动产物）" : "已连接 DNA 片段",
    topology: "linear",
    topStrand: joinedSequence,
    leftEnd: leftObject.leftEnd,
    rightEnd: rightObject.rightEnd,
    features: [
      ...leftObject.features,
      ...shiftFeatures(rightObject.features, leftObject.topStrand.length),
    ],
    foldedRegions: [
      ...leftObject.foldedRegions,
      ...shiftFoldedRegions(
        rightObject.foldedRegions,
        leftObject.topStrand.length,
      ),
    ],
    sourceMoleculeId: `${leftObject.sourceMoleculeId}+${rightObject.sourceMoleculeId}`,
    sourceTaskId: snapshot.taskId,
    x: Math.min(leftObject.x, rightObject.x),
    y: Math.round((leftObject.y + rightObject.y) / 2),
    zIndex: snapshot.nextZIndex,
  };

  return {
    changed: true,
    snapshot: {
      ...snapshot,
      objects: [
        ...snapshot.objects.filter(
          (object) => object.id !== firstObject.id && object.id !== secondObject.id,
        ),
        joinedObject,
      ],
      selectedEnd: null,
      feedback: completed
        ? {
            kind: "success",
            message: "连接完成：目的片段已正确插入受体 DNA。",
          }
        : {
            kind: "success",
            message: `两个 ${endOf(leftObject, "right").sequence5to3} 黏性末端已连接，请继续完成另一个接头。`,
          },
      invalidBond: null,
      eventSequence: snapshot.eventSequence + 1,
      completed,
      nextZIndex: snapshot.nextZIndex + 1,
    },
  };
}

function commit(
  state: Activity1State,
  next: Activity1Snapshot,
): Activity1State {
  return {
    task: state.task,
    expectedProductKeys: state.expectedProductKeys,
    present: next,
    past: [...state.past.slice(-49), state.present],
    future: [],
  };
}

export function activity1Reducer(
  state: Activity1State,
  action: Activity1Action,
): Activity1State {
  const snapshot = state.present;
  switch (action.type) {
    case "SELECT_TOOL":
      return {
        ...state,
        present: {
          ...snapshot,
          activeTool: action.tool,
          selectedEnd: null,
          invalidBond: null,
          feedback: toolInstruction(action.tool),
        },
      };
    case "BRING_TO_FRONT":
      return {
        ...state,
        present: {
          ...snapshot,
          objects: snapshot.objects.map((object) =>
            object.id === action.objectId
              ? { ...object, zIndex: snapshot.nextZIndex }
              : object,
          ),
          nextZIndex: snapshot.nextZIndex + 1,
        },
      };
    case "MOVE_OBJECT": {
      const object = snapshot.objects.find(
        (candidate) => candidate.id === action.objectId,
      );
      if (!object || (object.x === action.x && object.y === action.y)) {
        return state;
      }
      return commit(state, {
        ...snapshot,
        objects: snapshot.objects.map((candidate) =>
          candidate.id === action.objectId
            ? { ...candidate, x: action.x, y: action.y }
            : candidate,
        ),
        feedback: { kind: "info", message: `${object.name}已移动。` },
      });
    }
    case "CUT_AT": {
      const result = cutActivity1Object(
        snapshot,
        action.objectId,
        action.bondIndex,
        action.enzymeId,
      );
      return result.changed
        ? commit(state, result.snapshot)
        : { ...state, present: result.snapshot };
    }
    case "CIRCULARIZE": {
      const result = circularizeObject(state.task, snapshot, action.objectId);
      return result.changed
        ? commit(state, result.snapshot)
        : { ...state, present: result.snapshot };
    }
    case "SELECT_END":
      return {
        ...state,
        present: {
          ...snapshot,
          selectedEnd: action.end,
          feedback: action.end
            ? {
                kind: "info",
                message: "已选择第一个黏性末端，请再选择另一个兼容末端。",
              }
            : toolInstruction(snapshot.activeTool),
        },
      };
    case "LIGATE_ENDS": {
      const result = ligateActivity1Objects(
        state,
        action.first,
        action.second,
      );
      return result.changed
        ? commit(state, result.snapshot)
        : { ...state, present: result.snapshot };
    }
    case "UNDO": {
      const previous = state.past.at(-1);
      if (!previous) {
        return state;
      }
      return {
        task: state.task,
        expectedProductKeys: state.expectedProductKeys,
        present: previous,
        past: state.past.slice(0, -1),
        future: [snapshot, ...state.future],
      };
    }
    case "REDO": {
      const [next, ...remaining] = state.future;
      if (!next) {
        return state;
      }
      return {
        task: state.task,
        expectedProductKeys: state.expectedProductKeys,
        present: next,
        past: [...state.past, snapshot],
        future: remaining,
      };
    }
    case "RESET":
      return createLigationState(state.task);
    default:
      return state;
  }
}
