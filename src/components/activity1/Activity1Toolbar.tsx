import { findRestrictionEnzyme } from "@/src/content/enzymeLibrary";
import type { Activity1Tool } from "@/src/state/activity1Workbench";

interface Activity1ToolbarProps {
  activeTool: Activity1Tool;
  onSelect: (tool: Activity1Tool) => void;
  tools: readonly Activity1Tool[];
}

const fixedTools: ReadonlyArray<{
  id: Activity1Tool;
  symbol: string;
  label: string;
  detail: string;
}> = [
  {
    id: "move",
    symbol: "↔",
    label: "选择 / 移动",
    detail: "拖动 DNA 组件",
  },
  {
    id: "circularize",
    symbol: "○",
    label: "首尾连接",
    detail: "将受体 DNA 环化",
  },
  {
    id: "ligase",
    symbol: "＋",
    label: "DNA 连接酶",
    detail: "依次点击两个末端",
  },
];

function toolDefinition(toolId: Activity1Tool) {
  const fixed = fixedTools.find((tool) => tool.id === toolId);
  if (fixed) return fixed;
  const enzyme = findRestrictionEnzyme(toolId);
  if (!enzyme) {
    throw new Error(`Unknown activity tool: ${toolId}`);
  }
  return {
    id: toolId,
    symbol:
      enzyme.recognition.slice(0, enzyme.topCutOffset) +
      "│" +
      enzyme.recognition.slice(enzyme.topCutOffset),
    label: enzyme.name,
    detail: "点击碱基间切割",
  };
}

export function Activity1Toolbar({
  activeTool,
  onSelect,
  tools: availableTools,
}: Activity1ToolbarProps) {
  return (
    <div className="activity-toolbar" aria-label="实验工具">
      {availableTools.map(toolDefinition).map((tool) => (
        <button
          aria-pressed={activeTool === tool.id}
          className="activity-tool"
          key={tool.id}
          onClick={() => onSelect(tool.id)}
          type="button"
        >
          <span className="tool-glyph" aria-hidden="true">
            {tool.symbol}
          </span>
          <span>
            <strong>{tool.label}</strong>
            <small>{tool.detail}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
