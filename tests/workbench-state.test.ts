import { describe, expect, it } from "vitest";

import { getWorksheetTask } from "@/src/content/worksheetTasks";
import {
  appendFeedback,
  createWorkbenchState,
  workbenchReducer,
} from "@/src/state/workbench";

function getTask(taskId = "worksheet-1-linear-ecori") {
  const task = getWorksheetTask(taskId);
  if (!task) {
    throw new Error(`Missing worksheet task: ${taskId}`);
  }
  return task;
}

describe("workbench history", () => {
  it("creates a fresh workspace from the selected task", () => {
    const state = createWorkbenchState(getTask());

    expect(state.present.taskId).toBe("worksheet-1-linear-ecori");
    expect(state.present.molecules).toHaveLength(2);
    expect(state.present.selectedToolId).toBe("ecoRI");
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
  });

  it("undoes and redoes committed laboratory operations", () => {
    const initial = createWorkbenchState(getTask());
    const changed = appendFeedback(
      {
        ...initial.present,
        selectedToolId: "manualScissors",
        completed: true,
      },
      "模拟操作已完成。",
      "success",
    );

    const committed = workbenchReducer(initial, {
      type: "COMMIT",
      snapshot: changed,
    });
    const undone = workbenchReducer(committed, { type: "UNDO" });
    const redone = workbenchReducer(undone, { type: "REDO" });

    expect(committed.past).toHaveLength(1);
    expect(undone.present.completed).toBe(false);
    expect(undone.future).toHaveLength(1);
    expect(redone.present.completed).toBe(true);
    expect(redone.present.selectedToolId).toBe("manualScissors");
  });

  it("does not add transient selections to the undo history", () => {
    const initial = createWorkbenchState(getTask());
    const patched = workbenchReducer(initial, {
      type: "PATCH",
      snapshot: {
        ...initial.present,
        selectedBond: {
          moleculeId: initial.present.molecules[0].id,
          bondIndex: 4,
        },
      },
    });

    expect(patched.present.selectedBond?.bondIndex).toBe(4);
    expect(patched.past).toEqual([]);
  });

  it("resets all operations when loading another task", () => {
    const initial = createWorkbenchState(getTask());
    const committed = workbenchReducer(initial, {
      type: "COMMIT",
      snapshot: {
        ...initial.present,
        completed: true,
      },
    });
    const loaded = workbenchReducer(committed, {
      type: "LOAD_TASK",
      task: getTask("worksheet-4-ecori-muni"),
    });

    expect(loaded.present.taskId).toBe("worksheet-4-ecori-muni");
    expect(loaded.present.completed).toBe(false);
    expect(loaded.present.selectedToolId).toBe("munI");
    expect(loaded.past).toEqual([]);
    expect(loaded.future).toEqual([]);
  });
});
