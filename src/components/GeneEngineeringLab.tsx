"use client";

import { useEffect, useMemo, useState } from "react";

import { LigationActivityLab } from "@/src/components/activity1/LigationActivityLab";
import { PCRActivityLab } from "@/src/components/pcr/PCRActivityLab";
import {
  RandomControls,
  type LabMode,
  type RandomActivityNumber,
  type RandomDifficulty,
} from "@/src/components/random/RandomControls";
import { getWorksheetTask } from "@/src/content/worksheetTasks";
import { generateValidatedRandomTask } from "@/src/domain/random/generator";
import {
  createRandomSeed,
  normalizeSeed,
} from "@/src/domain/random/prng";
import type { RandomTaskType } from "@/src/domain/types";
import {
  RANDOM_PREFERENCES_KEY,
  readRandomPreferences,
  writeRandomPreferencesToSearch,
} from "@/src/state/randomSession";
import type { LigationTaskId } from "@/src/state/activity1Workbench";

type ActivityNumber = RandomActivityNumber;

const activities: ReadonlyArray<{
  number: ActivityNumber;
  label: string;
}> = [
  { number: "1", label: "线性 DNA 酶切" },
  { number: "2", label: "环状 DNA 重组" },
  { number: "3", label: "PCR 引物选择" },
  { number: "4", label: "兼容黏性末端" },
];

const ligationTaskByNumber: Readonly<Record<"1" | "2" | "4", LigationTaskId>> = {
  "1": "worksheet-1-linear-ecori",
  "2": "worksheet-2-circular-ecori",
  "4": "worksheet-4-ecori-muni",
};

const randomTaskTypeByActivity: Readonly<Record<ActivityNumber, RandomTaskType>> = {
  "1": "linear-ligation",
  "2": "circular-ligation",
  "3": "pcr-selection",
  "4": "compatible-ends",
};

export function GeneEngineeringLab() {
  const [activity, setActivity] = useState<ActivityNumber>("1");
  const [mode, setMode] = useState<LabMode>("worksheet");
  const [difficulty, setDifficulty] =
    useState<RandomDifficulty>("basic");
  const [seed, setSeed] = useState("BIO-CLASS-01");
  const [seedDraft, setSeedDraft] = useState(seed);
  const [sessionRestored, setSessionRestored] = useState(false);
  const generated = useMemo(
    () =>
      generateValidatedRandomTask({
        seed,
        difficulty,
        taskType: randomTaskTypeByActivity[activity],
      }),
    [activity, difficulty, seed],
  );

  useEffect(() => {
    let storedValue: string | null = null;
    try {
      storedValue = window.localStorage.getItem(RANDOM_PREFERENCES_KEY);
    } catch {
      // URL restoration still works when browser storage is unavailable.
    }
    const preferences = readRandomPreferences(
      window.location.search,
      storedValue,
    );
    const frame = window.requestAnimationFrame(() => {
      setMode(preferences.mode);
      setActivity(preferences.activity);
      setDifficulty(preferences.difficulty);
      setSeed(preferences.seed);
      setSeedDraft(preferences.seed);
      setSessionRestored(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!sessionRestored) return;
    const preferences = { mode, activity, difficulty, seed };
    try {
      window.localStorage.setItem(
        RANDOM_PREFERENCES_KEY,
        JSON.stringify(preferences),
      );
    } catch {
      // The query string remains the shareable source of truth.
    }
    const search = writeRandomPreferencesToSearch(
      window.location.search,
      preferences,
    );
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search}${window.location.hash}`,
    );
  }, [activity, difficulty, mode, seed, sessionRestored]);

  function selectMode(nextMode: LabMode) {
    setMode(nextMode);
  }

  function selectActivity(nextActivity: ActivityNumber) {
    setActivity(nextActivity);
  }

  function generateFromDraft() {
    const nextSeed = normalizeSeed(seedDraft);
    setSeedDraft(nextSeed);
    setSeed(nextSeed);
  }

  function generateNext() {
    const nextSeed = createRandomSeed();
    setSeed(nextSeed);
    setSeedDraft(nextSeed);
  }

  const fixedTask =
    activity === "3"
      ? getWorksheetTask("worksheet-3-pcr")
      : getWorksheetTask(ligationTaskByNumber[activity]);
  if (!fixedTask) {
    throw new Error(`Missing worksheet task for activity ${activity}.`);
  }
  const currentTask = mode === "random" ? generated.task : fixedTask;

  return (
    <main className="activity1-app">
      <nav className="lab-switcher" aria-label="学案活动切换">
        <span>基因工程课堂实验</span>
        <div>
          {activities.map((item) => (
            <button
              aria-current={activity === item.number ? "page" : undefined}
              key={item.number}
              onClick={() => selectActivity(item.number)}
              type="button"
            >
              <strong>活动 {item.number}</strong>
              <small>{item.label}</small>
            </button>
          ))}
        </div>
      </nav>

      <RandomControls
        activity={activity}
        difficulty={difficulty}
        mode={mode}
        onActivityChange={selectActivity}
        onDifficultyChange={setDifficulty}
        onGenerate={generateFromDraft}
        onModeChange={selectMode}
        onNext={generateNext}
        onSeedDraftChange={setSeedDraft}
        seed={seed}
        seedDraft={seedDraft}
        usedFallback={Boolean(generated.task.metadata?.usedFallback)}
      />

      {currentTask.taskKind === "pcr" ? (
        <PCRActivityLab key={currentTask.id} task={currentTask} />
      ) : (
        <LigationActivityLab
          key={currentTask.id}
          task={currentTask}
        />
      )}
    </main>
  );
}
