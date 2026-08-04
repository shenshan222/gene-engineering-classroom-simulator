"use client";

import { useReducer } from "react";

import { FeedbackPanel } from "@/src/components/FeedbackPanel";
import { FragmentTray } from "@/src/components/FragmentTray";
import { MoleculeStrip } from "@/src/components/MoleculeStrip";
import { TaskNavigator } from "@/src/components/TaskNavigator";
import { Toolbox } from "@/src/components/Toolbox";
import {
  getRestrictionEnzyme,
  restrictionEnzymes,
  type RestrictionEnzymeId,
} from "@/src/content/enzymeLibrary";
import {
  getWorksheetTask,
  worksheetTasks,
} from "@/src/content/worksheetTasks";
import { circularizeMolecule } from "@/src/domain/circular";
import { digestMolecule, manualCut } from "@/src/domain/cutting";
import {
  flipFragment,
  openRecipientAtCut,
  tryInsert,
} from "@/src/domain/ligation";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type {
  LearningTask,
  LigationLearningTask,
  MolecularCut,
  Molecule,
} from "@/src/domain/types";
import type {
  DragPayload,
  DropTarget,
} from "@/src/hooks/usePointerDrag";
import {
  appendFeedback,
  createWorkbenchState,
  workbenchReducer,
  type FeedbackKind,
  type ToolId,
  type WorkspaceSnapshot,
} from "@/src/state/workbench";

const initialTask = worksheetTasks[0] satisfies LearningTask;

const TOOL_LABELS: Readonly<Record<ToolId, string>> = {
  ecoRI: "EcoRⅠ",
  munI: "MunⅠ",
  manualScissors: "手动剪刀",
  circularize: "首尾连接",
  dnaLigase: "DNA 连接酶",
};

function isRestrictionTool(toolId: ToolId): toolId is RestrictionEnzymeId {
  return toolId === "ecoRI" || toolId === "munI";
}

function expectedTopology(taskId: string): Molecule["topology"] {
  return taskId === "worksheet-2-circular-ecori" ||
    taskId === "worksheet-4-ecori-muni"
    ? "circular"
    : "linear";
}

function normalizeBondForMolecule(
  molecule: Molecule,
  bondIndex: number,
): number {
  return molecule.topology === "circular" &&
    bondIndex === molecule.topStrand.length
    ? 0
    : bondIndex;
}

export function WorkbenchApp() {
  const [state, dispatch] = useReducer(
    workbenchReducer,
    initialTask,
    createWorkbenchState,
  );
  const snapshot = state.present;
  const task = getWorksheetTask(snapshot.taskId) ?? initialTask;

  function patch(snapshotUpdate: WorkspaceSnapshot) {
    dispatch({ type: "PATCH", snapshot: snapshotUpdate });
  }

  function commit(snapshotUpdate: WorkspaceSnapshot) {
    dispatch({ type: "COMMIT", snapshot: snapshotUpdate });
  }

  function withMessage(
    base: WorkspaceSnapshot,
    message: string,
    kind: FeedbackKind,
  ) {
    return appendFeedback(base, message, kind);
  }

  function report(message: string, kind: FeedbackKind = "info") {
    patch(withMessage(snapshot, message, kind));
  }

  function selectTool(toolId: ToolId) {
    patch({
      ...snapshot,
      selectedToolId: toolId,
    });
  }

  function selectBond(moleculeId: string, bondIndex: number) {
    patch(
      withMessage(
        {
          ...snapshot,
          selectedBond: { moleculeId, bondIndex },
        },
        `已选择第 ${bondIndex} 个碱基后的切点。`,
        "info",
      ),
    );
  }

  function applyCut(
    toolId: ToolId,
    moleculeId: string,
    requestedBondIndex: number,
  ) {
    if (task.taskKind !== "ligation") {
      report("PCR 任务暂不使用酶切工作台。", "warning");
      return;
    }
    if (toolId !== "manualScissors" && !isRestrictionTool(toolId)) {
      report("请使用限制酶或手动剪刀处理切点。", "warning");
      return;
    }

    const molecule = snapshot.molecules.find(
      (candidate) => candidate.id === moleculeId,
    );
    if (!molecule) {
      report("没有找到要切割的 DNA。", "error");
      return;
    }
    const bondIndex = normalizeBondForMolecule(
      molecule,
      requestedBondIndex,
    );
    let cut: MolecularCut | undefined;

    if (toolId === "manualScissors") {
      const result = manualCut(molecule, requestedBondIndex);
      if (!result.ok) {
        report("该位置不能形成有效切口。", "error");
        return;
      }
      cut = result.cut;
    } else {
      const enzyme = getRestrictionEnzyme(toolId);
      cut = scanRestrictionSites(molecule, enzyme).find(
        (site) => site.topBondIndex === bondIndex,
      );
      if (!cut) {
        report(
          `${enzyme.name}不能在这里切割：切点必须与完整的 ${enzyme.recognition} 识别序列匹配。`,
          "error",
        );
        return;
      }
    }

    const existingCuts = snapshot.cutsByMolecule[moleculeId] ?? [];
    if (
      existingCuts.some(
        (existingCut) => existingCut.topBondIndex === cut.topBondIndex,
      )
    ) {
      report("这个位置已经切开。", "warning");
      return;
    }

    const nextCuts = [...existingCuts, cut].sort(
      (a, b) => a.topBondIndex - b.topBondIndex,
    );
    const digest = digestMolecule(molecule, nextCuts);
    const recipientId = task.initialMolecules[0].id;
    const nextFragments = [
      ...snapshot.fragments.filter(
        (fragment) => fragment.sourceMoleculeId !== moleculeId,
      ),
      ...digest.fragments,
    ];
    const nextOpenedRecipient =
      moleculeId === recipientId && nextCuts.length === 1
        ? openRecipientAtCut(molecule, cut)
        : moleculeId === recipientId
          ? null
          : snapshot.openedRecipient;
    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      cutsByMolecule: {
        ...snapshot.cutsByMolecule,
        [moleculeId]: nextCuts,
      },
      fragments: nextFragments,
      selectedBond: null,
      selectedFragmentId: snapshot.fragments.some(
        (fragment) =>
          fragment.id === snapshot.selectedFragmentId &&
          fragment.sourceMoleculeId === moleculeId,
      )
        ? null
        : snapshot.selectedFragmentId,
      openedRecipient: nextOpenedRecipient,
      result: null,
      completed: false,
    };
    const toolName =
      toolId === "manualScissors"
        ? "手动剪刀"
        : restrictionEnzymes[toolId].name;
    commit(
      withMessage(
        nextSnapshot,
        `${molecule.name} 已在第 ${requestedBondIndex} 个碱基后被${toolName}切开。`,
        "success",
      ),
    );
  }

  function applySelectedTool() {
    if (!snapshot.selectedToolId) {
      report("请先选择一个工具。", "warning");
      return;
    }
    if (!snapshot.selectedBond) {
      report("请先选择 DNA 上的碱基间切点。", "warning");
      return;
    }
    applyCut(
      snapshot.selectedToolId,
      snapshot.selectedBond.moleculeId,
      snapshot.selectedBond.bondIndex,
    );
  }

  function circularize(moleculeId: string) {
    if (task.taskKind !== "ligation") {
      return;
    }
    const recipientId = task.initialMolecules[0].id;
    if (moleculeId !== recipientId) {
      report("本活动只需要将受体 DNA 首尾连接。", "warning");
      return;
    }
    const molecule = snapshot.molecules.find(
      (candidate) => candidate.id === moleculeId,
    );
    if (!molecule) {
      report("没有找到要环化的 DNA。", "error");
      return;
    }
    if (molecule.topology === "circular") {
      report(`${molecule.name}已经是环状 DNA。`, "warning");
      return;
    }
    if ((snapshot.cutsByMolecule[moleculeId] ?? []).length > 0) {
      report("请先撤销切割，再进行首尾连接。", "warning");
      return;
    }

    const nextMolecules = snapshot.molecules.map((candidate) =>
      candidate.id === moleculeId
        ? circularizeMolecule(candidate)
        : candidate,
    );
    commit(
      withMessage(
        {
          ...snapshot,
          molecules: nextMolecules,
          selectedBond: null,
          result: null,
          completed: false,
        },
        `${molecule.name}已首尾连接为环状 DNA。`,
        "success",
      ),
    );
  }

  function selectFragment(fragmentId: string) {
    const fragment = snapshot.fragments.find(
      (candidate) => candidate.id === fragmentId,
    );
    if (!fragment) {
      return;
    }
    patch(
      withMessage(
        {
          ...snapshot,
          selectedFragmentId: fragmentId,
        },
        `已选择${fragment.name}。`,
        "info",
      ),
    );
  }

  function flipSelectedFragment(fragmentId: string) {
    const fragment = snapshot.fragments.find(
      (candidate) => candidate.id === fragmentId,
    );
    if (!fragment) {
      report("没有找到要翻转的片段。", "error");
      return;
    }
    const flipped = {
      ...flipFragment(fragment),
      id: fragment.id,
      name: fragment.name,
    };
    commit(
      withMessage(
        {
          ...snapshot,
          fragments: snapshot.fragments.map((candidate) =>
            candidate.id === fragmentId ? flipped : candidate,
          ),
          selectedFragmentId: fragmentId,
          result: null,
          completed: false,
        },
        `${fragment.name}已翻转为${
          flipped.orientation === "forward" ? "正向" : "反向"
        }。`,
        "success",
      ),
    );
  }

  function ligate(fragmentIdOverride?: string) {
    if (task.taskKind !== "ligation") {
      return;
    }
    if (!snapshot.openedRecipient) {
      report("受体 DNA 需要恰好一个切口。", "warning");
      return;
    }
    const fragmentId =
      fragmentIdOverride ?? snapshot.selectedFragmentId ?? undefined;
    const fragment = snapshot.fragments.find(
      (candidate) => candidate.id === fragmentId,
    );
    if (!fragment) {
      report("请选择一个供体片段。", "warning");
      return;
    }

    const candidate = tryInsert(snapshot.openedRecipient, fragment).find(
      (item) => item.orientation === fragment.orientation,
    );
    if (!candidate) {
      report(
        "连接失败：当前片段方向下，两个接头不能同时兼容。可以尝试翻转片段或选择其他片段。",
        "error",
      );
      return;
    }

    const topologyCorrect =
      candidate.product.topology === expectedTopology(task.id);
    const message = topologyCorrect
      ? `${fragment.name}已通过两个兼容接头连接，形成${candidate.product.topology === "circular" ? "重组环状 DNA" : "重组 DNA"}。`
      : "片段已经连接，但产物拓扑与学案目标不一致；请检查是否先完成了首尾连接。";
    commit(
      withMessage(
        {
          ...snapshot,
          selectedFragmentId: fragment.id,
          result: candidate.product,
          completed: topologyCorrect,
        },
        message,
        topologyCorrect ? "success" : "warning",
      ),
    );
  }

  function handleDrop(payload: DragPayload, target: DropTarget) {
    if (payload.type === "tool") {
      const toolId = payload.id as ToolId;
      if (
        target.kind === "bond" &&
        target.moleculeId &&
        target.bondIndex !== undefined
      ) {
        applyCut(toolId, target.moleculeId, target.bondIndex);
        return;
      }
      if (target.kind === "molecule" && target.moleculeId) {
        if (toolId === "circularize") {
          circularize(target.moleculeId);
        } else {
          report("这个工具需要放到碱基间切点。", "warning");
        }
        return;
      }
      if (target.kind === "recipient-gap" && toolId === "dnaLigase") {
        ligate();
        return;
      }
      report("请把工具拖到可响应的切点或连接区。", "warning");
      return;
    }

    if (payload.type === "fragment" && target.kind === "recipient-gap") {
      ligate(payload.id);
      return;
    }
    report("片段需要拖到受体插入口。", "warning");
  }

  function selectTask(taskId: string) {
    const selectedTask = getWorksheetTask(taskId);
    if (selectedTask) {
      dispatch({ type: "LOAD_TASK", task: selectedTask });
    }
  }

  const ligationTask =
    task.taskKind === "ligation" ? (task as LigationLearningTask) : null;
  const recipientId = ligationTask?.initialMolecules[0].id;
  const donorFragments = snapshot.fragments.filter(
    (fragment) => fragment.sourceMoleculeId !== recipientId,
  );
  const selectedToolLabel = snapshot.selectedToolId
    ? TOOL_LABELS[snapshot.selectedToolId]
    : "未选择";

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            AT
          </span>
          <div>
            <p className="eyebrow">GENE LAB · 阶段 3</p>
            <h1>基因工程课堂实验台</h1>
          </div>
        </div>
        <div className="header-actions">
          <button
            disabled={state.past.length === 0}
            onClick={() => dispatch({ type: "UNDO" })}
            type="button"
          >
            ↶ 撤销
          </button>
          <button
            disabled={state.future.length === 0}
            onClick={() => dispatch({ type: "REDO" })}
            type="button"
          >
            ↷ 重做
          </button>
          <button
            onClick={() => dispatch({ type: "RESET_TASK", task })}
            type="button"
          >
            重置
          </button>
          <button
            className={state.showAnswer ? "active" : ""}
            onClick={() => dispatch({ type: "TOGGLE_ANSWER" })}
            type="button"
          >
            {state.showAnswer ? "隐藏答案" : "教师答案"}
          </button>
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="left-sidebar">
          <TaskNavigator
            activeTaskId={task.id}
            onSelect={selectTask}
            tasks={worksheetTasks}
          />
          {ligationTask && (
            <Toolbox
              onDrop={handleDrop}
              onSelect={selectTool}
              selectedToolId={snapshot.selectedToolId}
              task={ligationTask}
            />
          )}
        </aside>

        <section className="workbench">
          <header className="task-brief">
            <div>
              <p className="eyebrow">学案活动 {task.worksheetNumber}</p>
              <h2>{task.title}</h2>
              <p>{task.objective}</p>
            </div>
            <ol>
              {task.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
          </header>

          {ligationTask ? (
            <>
              <div className="selection-toolbar">
                <div>
                  <span>当前工具</span>
                  <strong>{selectedToolLabel}</strong>
                </div>
                <div>
                  <span>当前切点</span>
                  <strong>
                    {snapshot.selectedBond
                      ? `第 ${snapshot.selectedBond.bondIndex} 个碱基后`
                      : "未选择"}
                  </strong>
                </div>
                <button
                  className="primary"
                  disabled={
                    !snapshot.selectedToolId || !snapshot.selectedBond
                  }
                  onClick={applySelectedTool}
                  type="button"
                >
                  应用到切点
                </button>
              </div>

              <section className="molecule-workspace" aria-labelledby="dna-title">
                <div className="section-heading">
                  <span className="step-number">03</span>
                  <h2 id="dna-title">DNA 工作区</h2>
                </div>
                {snapshot.molecules.map((molecule) => (
                  <MoleculeStrip
                    canCircularize={
                      ligationTask.availableTools.includes("circularize") &&
                      molecule.id === recipientId
                    }
                    cuts={snapshot.cutsByMolecule[molecule.id] ?? []}
                    key={molecule.id}
                    molecule={molecule}
                    onBondSelect={selectBond}
                    onCircularize={circularize}
                    selectedBond={snapshot.selectedBond}
                    selectedToolId={snapshot.selectedToolId}
                  />
                ))}
              </section>

              {snapshot.result && (
                <section
                  className={`result-card ${
                    snapshot.completed ? "completed" : ""
                  }`}
                >
                  <div>
                    <p className="eyebrow">
                      {snapshot.completed ? "任务完成" : "连接结果"}
                    </p>
                    <h2>{snapshot.result.name}</h2>
                    <p>
                      {snapshot.result.topology === "circular"
                        ? "环状 DNA"
                        : "线性 DNA"}{" "}
                      · {snapshot.result.topStrand.length} bp
                    </p>
                  </div>
                  <code>5′-{snapshot.result.topStrand}-3′</code>
                </section>
              )}
            </>
          ) : (
            <div className="phase-placeholder">
              <span aria-hidden="true">PCR</span>
              <h2>PCR 交互将在阶段 4 接入</h2>
              <p>
                固定引物和模板数据已经存在；下一阶段将计算结合位置、扩增区段与凝胶条带。
              </p>
            </div>
          )}

          {state.showAnswer && (
            <section className="answer-panel">
              <p className="eyebrow">教师参考</p>
              <p>{task.teacherAnswer}</p>
            </section>
          )}
        </section>

        <aside className="right-panel">
          {ligationTask && (
            <FragmentTray
              fragments={donorFragments}
              onDrop={handleDrop}
              onFlip={flipSelectedFragment}
              onLigate={() => ligate()}
              onSelect={selectFragment}
              openedRecipient={snapshot.openedRecipient}
              selectedFragmentId={snapshot.selectedFragmentId}
            />
          )}
          <FeedbackPanel feedback={snapshot.feedback} />
        </aside>
      </div>
    </main>
  );
}
