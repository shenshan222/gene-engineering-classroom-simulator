import type { LearningTask } from "@/src/domain/types";

interface TaskNavigatorProps {
  tasks: readonly LearningTask[];
  activeTaskId: string;
  onSelect: (taskId: string) => void;
}

export function TaskNavigator({
  tasks,
  activeTaskId,
  onSelect,
}: TaskNavigatorProps) {
  return (
    <section className="side-section" aria-labelledby="task-nav-title">
      <div className="section-heading">
        <span className="step-number">01</span>
        <h2 id="task-nav-title">选择学案活动</h2>
      </div>
      <div className="task-list">
        {tasks.map((task) => (
          <button
            className={`task-button ${task.id === activeTaskId ? "active" : ""}`}
            key={task.id}
            onClick={() => onSelect(task.id)}
            type="button"
          >
            <span className="task-number">活动 {task.worksheetNumber}</span>
            <strong>{task.title}</strong>
            <small>
              {task.taskKind === "pcr" ? "PCR · 阶段 4 接入" : "酶切与连接"}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}
