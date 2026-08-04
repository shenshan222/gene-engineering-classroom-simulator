"use client";

import { useReducer, useRef, useState } from "react";

import { GeneWidget } from "@/src/components/activity1/GeneWidget";
import { PCRResultPanel } from "@/src/components/pcr/PCRResultPanel";
import { PrimerWidget } from "@/src/components/pcr/PrimerWidget";
import type { PCRLearningTask } from "@/src/domain/types";
import {
  createPCRState,
  pcrReducer,
} from "@/src/state/pcrWorkbench";

interface PCRActivityLabProps {
  task: PCRLearningTask;
}

export function PCRActivityLab({ task }: PCRActivityLabProps) {
  return <PCRActivityLabContent key={task.id} task={task} />;
}

function PCRActivityLabContent({ task }: PCRActivityLabProps) {
  const [state, dispatch] = useReducer(
    pcrReducer,
    task,
    createPCRState,
  );
  const [showHelp, setShowHelp] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const snapshot = state.present;
  const minimumWidth = Math.max(
    1460,
    ...snapshot.templates.map(
      (template) => template.x + template.topStrand.length * 27 + 220,
    ),
  );
  const minimumHeight = Math.max(
    560,
    ...snapshot.templates.map((template) => template.y + 170),
    ...snapshot.primers.map((primer) => primer.y + 110),
  );

  return (
    <section className="activity-lab">
      <header className="activity1-header">
        <div className="activity-title">
          <span className="activity-number">
            {task.metadata?.source === "generated" ? "随机题" : "活动 3"}
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

      <section className="pcr-toolbar">
        <div>
          <strong>选择模板和两条引物</strong>
          <span>
            已选择 {snapshot.selectedPrimerIds.length}/2 条引物
          </span>
        </div>
        <button
          className="run-pcr-button"
          disabled={snapshot.selectedPrimerIds.length !== 2}
          onClick={() => dispatch({ type: "RUN_PCR" })}
          type="button"
        >
          运行 PCR
        </button>
        <p
          aria-live="polite"
          className={`operation-feedback ${snapshot.feedback.kind}`}
        >
          {snapshot.feedback.message}
        </p>
      </section>

      {showHelp && (
        <aside className="quick-help">
          <strong>判断方法：</strong> {task.hints.join(" ")}
        </aside>
      )}

      {snapshot.completed && (
        <div className="completion-banner" role="status">
          <span aria-hidden="true">✓</span>
          <strong>{task.metadata?.source === "generated" ? "随机题完成" : "活动 3 核心任务完成"}</strong>
          <span>所选引物可以扩增目标 DNA 区段。</span>
          {task.metadata?.source === "generated" && (
            <details>
              <summary>查看本题解析</summary>
              <p>{task.teacherAnswer}</p>
            </details>
          )}
        </div>
      )}

      <PCRResultPanel
        amplicons={snapshot.amplicons}
        primerNameById={Object.fromEntries(
          task.primers.map((primer) => [primer.id, primer.name]),
        )}
      />

      <div className="canvas-viewport pcr-canvas-viewport">
        <section
          aria-label="PCR 模板与引物自由实验画布"
          className="activity-canvas pcr-canvas"
          ref={canvasRef}
          style={{ minHeight: minimumHeight, minWidth: minimumWidth }}
        >
          <div className="canvas-axis-label" aria-hidden="true">
            双链模板区 · 下方为可拖动单链引物
          </div>
          {snapshot.templates.map((template) => (
            <GeneWidget
              activeTool="move"
              canCircularizeObject={false}
              canvasRef={canvasRef}
              eventSequence={0}
              headerActionLabel={
                snapshot.selectedTemplateId === template.id
                  ? "当前模板"
                  : "选择模板"
              }
              headerActionSelected={
                snapshot.selectedTemplateId === template.id
              }
              invalidBond={null}
              key={template.id}
              object={template}
              onBringToFront={(objectId) =>
                dispatch({ type: "BRING_TEMPLATE_TO_FRONT", objectId })
              }
              onCircularize={() => undefined}
              onCut={() => undefined}
              onEndSelect={() => undefined}
              onHeaderAction={(templateId) =>
                dispatch({ type: "SELECT_TEMPLATE", templateId })
              }
              onMove={(objectId, x, y) =>
                dispatch({ type: "MOVE_TEMPLATE", objectId, x, y })
              }
              selectedEnd={null}
            />
          ))}
          {snapshot.primers.map((primer) => (
            <PrimerWidget
              canvasRef={canvasRef}
              key={primer.id}
              onBringToFront={(primerId) =>
                dispatch({ type: "BRING_PRIMER_TO_FRONT", primerId })
              }
              onMove={(primerId, x, y) =>
                dispatch({ type: "MOVE_PRIMER", primerId, x, y })
              }
              onSelect={(primerId) =>
                dispatch({ type: "TOGGLE_PRIMER", primerId })
              }
              primer={primer}
              selected={snapshot.selectedPrimerIds.includes(primer.id)}
            />
          ))}
        </section>
      </div>
    </section>
  );
}
