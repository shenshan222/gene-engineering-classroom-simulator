"use client";

import { useReducer, useState } from "react";

import { Activity1Toolbar } from "@/src/components/activity1/Activity1Toolbar";
import { CanvasWorkbench } from "@/src/components/activity1/CanvasWorkbench";
import type { LigationLearningTask } from "@/src/domain/types";
import {
  activity1Reducer,
  createLigationState,
  toolsForLigationTask,
  type EndReference,
  type Activity1Tool,
} from "@/src/state/activity1Workbench";

interface LigationActivityLabProps {
  task: LigationLearningTask;
}

export function LigationActivityLab({ task }: LigationActivityLabProps) {
  return <LigationActivityLabContent key={task.id} task={task} />;
}

function LigationActivityLabContent({ task }: LigationActivityLabProps) {
  const [state, dispatch] = useReducer(
    activity1Reducer,
    task,
    createLigationState,
  );
  const [showHelp, setShowHelp] = useState(false);
  const snapshot = state.present;
  const tools = toolsForLigationTask(task);

  function selectEnd(end: EndReference) {
    if (snapshot.activeTool !== "ligase") {
      return;
    }
    if (!snapshot.selectedEnd) {
      dispatch({ type: "SELECT_END", end });
      return;
    }
    if (
      snapshot.selectedEnd.objectId === end.objectId &&
      snapshot.selectedEnd.side === end.side
    ) {
      dispatch({ type: "SELECT_END", end: null });
      return;
    }
    dispatch({
      type: "LIGATE_ENDS",
      first: snapshot.selectedEnd,
      second: end,
    });
  }

  const selectedEnzyme =
    snapshot.activeTool === "ecoRI" || snapshot.activeTool === "munI"
      ? snapshot.activeTool
      : undefined;

  return (
    <section className="activity-lab">
      <header className="activity1-header">
        <div className="activity-title">
          <span className="activity-number">
            {task.metadata?.source === "generated"
              ? "随机题"
              : `活动 ${task.worksheetNumber}`}
          </span>
          <div>
            <h1>{task.title}</h1>
            <p>{task.objective}</p>
          </div>
        </div>
        <div className="history-actions">
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
          <button onClick={() => dispatch({ type: "RESET" })} type="button">
            重置
          </button>
          <button
            aria-expanded={showHelp}
            onClick={() => setShowHelp((visible) => !visible)}
            type="button"
          >
            {showHelp ? "收起帮助" : "简短帮助"}
          </button>
        </div>
      </header>

      <section className="tool-and-status">
        <Activity1Toolbar
          activeTool={snapshot.activeTool}
          onSelect={(tool: Activity1Tool) =>
            dispatch({ type: "SELECT_TOOL", tool })
          }
          tools={tools}
        />
        <p
          aria-live="polite"
          className={`operation-feedback ${snapshot.feedback.kind}`}
        >
          {snapshot.feedback.message}
        </p>
      </section>

      {showHelp && (
        <aside className="quick-help">
          <strong>活动步骤：</strong> {task.instructions.join(" → ")}
        </aside>
      )}

      {snapshot.completed && (
        <div className="completion-banner" role="status">
          <span aria-hidden="true">✓</span>
          <strong>活动完成</strong>
          <span>目的片段已正确插入受体 DNA。</span>
          {task.metadata?.source === "generated" && (
            <details>
              <summary>查看本题解析</summary>
              <p>{task.teacherAnswer}</p>
            </details>
          )}
        </div>
      )}

      {task.completionRule?.requiredFeatureIds.some((id) =>
        id.includes("marker"),
      ) && (
        <div className="feature-key" aria-label="序列功能区图例">
          <span className="marker-key">标记基因</span>
          <span className="gene-key">目的基因</span>
          <span>选择质粒切点时应避免破坏标记基因。</span>
        </div>
      )}

      <CanvasWorkbench
        circularizableObjectId={task.initialMolecules[0].id}
        onBringToFront={(objectId) =>
          dispatch({ type: "BRING_TO_FRONT", objectId })
        }
        onCircularize={(objectId) =>
          dispatch({ type: "CIRCULARIZE", objectId })
        }
        onCut={(objectId, bondIndex) => {
          if (selectedEnzyme) {
            dispatch({
              type: "CUT_AT",
              objectId,
              bondIndex,
              enzymeId: selectedEnzyme,
            });
          }
        }}
        onEndSelect={selectEnd}
        onMove={(objectId, x, y) =>
          dispatch({ type: "MOVE_OBJECT", objectId, x, y })
        }
        snapshot={snapshot}
      />
    </section>
  );
}
