"use client";

import { usePointerDrag, type DragPayload, type DropTarget } from "@/src/hooks/usePointerDrag";
import type { LigationLearningTask } from "@/src/domain/types";
import type { ToolId } from "@/src/state/workbench";

interface ToolDefinition {
  id: ToolId;
  name: string;
  symbol: string;
  detail: string;
  tone: string;
}

const TOOL_DEFINITIONS: Readonly<Record<ToolId, ToolDefinition>> = {
  ecoRI: {
    id: "ecoRI",
    name: "EcoRⅠ",
    symbol: "G│AATTC",
    detail: "5′-AATT 黏性末端",
    tone: "amber",
  },
  munI: {
    id: "munI",
    name: "MunⅠ",
    symbol: "C│AATTG",
    detail: "5′-AATT 黏性末端",
    tone: "blue",
  },
  manualScissors: {
    id: "manualScissors",
    name: "手动剪刀",
    symbol: "✂",
    detail: "任意位置形成平末端",
    tone: "rose",
  },
  circularize: {
    id: "circularize",
    name: "首尾连接",
    symbol: "○",
    detail: "将线性 DNA 环化",
    tone: "violet",
  },
  dnaLigase: {
    id: "dnaLigase",
    name: "DNA 连接酶",
    symbol: "⌁",
    detail: "连接两个兼容接头",
    tone: "green",
  },
};

interface DraggableToolProps {
  tool: ToolDefinition;
  selected: boolean;
  onSelect: (toolId: ToolId) => void;
  onDrop: (payload: DragPayload, target: DropTarget) => void;
}

function DraggableTool({
  tool,
  selected,
  onSelect,
  onDrop,
}: DraggableToolProps) {
  const drag = usePointerDrag({
    payload: { type: "tool", id: tool.id },
    onDrop,
  });

  return (
    <button
      aria-pressed={selected}
      className={`tool-card tone-${tool.tone} ${selected ? "selected" : ""} ${
        drag.dragging ? "dragging" : ""
      }`}
      onClick={(event) => {
        if (drag.consumeClick()) {
          event.preventDefault();
          return;
        }
        onSelect(tool.id);
      }}
      style={drag.style}
      type="button"
      {...drag.pointerHandlers}
    >
      <span className="tool-symbol" aria-hidden="true">
        {tool.symbol}
      </span>
      <span>
        <strong>{tool.name}</strong>
        <small>{tool.detail}</small>
      </span>
      <span className="drag-grip" aria-hidden="true">
        ⠿
      </span>
    </button>
  );
}

interface ToolboxProps {
  task: LigationLearningTask;
  selectedToolId: ToolId | null;
  onSelect: (toolId: ToolId) => void;
  onDrop: (payload: DragPayload, target: DropTarget) => void;
}

export function Toolbox({
  task,
  selectedToolId,
  onSelect,
  onDrop,
}: ToolboxProps) {
  const toolIds: ToolId[] = [];
  if (task.availableTools.includes("circularize")) {
    toolIds.push("circularize");
  }
  if (task.availableTools.includes("ecoRI")) {
    toolIds.push("ecoRI");
  }
  if (task.availableTools.includes("munI")) {
    toolIds.push("munI");
  }
  toolIds.push("manualScissors", "dnaLigase");

  return (
    <section className="side-section" aria-labelledby="toolbox-title">
      <div className="section-heading">
        <span className="step-number">02</span>
        <h2 id="toolbox-title">选择并拖动工具</h2>
      </div>
      <p className="section-hint">
        可拖到切点，也可先点选工具，再点击 DNA 上的切点。
      </p>
      <div className="tool-list">
        {toolIds.map((toolId) => (
          <DraggableTool
            key={toolId}
            onDrop={onDrop}
            onSelect={onSelect}
            selected={selectedToolId === toolId}
            tool={TOOL_DEFINITIONS[toolId]}
          />
        ))}
      </div>
    </section>
  );
}
