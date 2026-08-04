import type {
  LabMode,
  RandomActivityNumber,
  RandomDifficulty,
} from "@/src/components/random/RandomControls";
import { normalizeSeed } from "@/src/domain/random/prng";
import type { RandomTaskType } from "@/src/domain/types";

export const RANDOM_PREFERENCES_KEY = "gene-lab-random-preferences-v1";

export interface RandomPreferences {
  mode: LabMode;
  activity: RandomActivityNumber;
  difficulty: RandomDifficulty;
  seed: string;
}

export const defaultRandomPreferences: RandomPreferences = {
  mode: "worksheet",
  activity: "1",
  difficulty: "basic",
  seed: "BIO-CLASS-01",
};

const taskTypeByActivity: Readonly<
  Record<RandomActivityNumber, RandomTaskType>
> = {
  "1": "linear-ligation",
  "2": "circular-ligation",
  "3": "pcr-selection",
  "4": "compatible-ends",
};

const activityByTaskType: Readonly<
  Record<RandomTaskType, RandomActivityNumber>
> = {
  "linear-ligation": "1",
  "circular-ligation": "2",
  "pcr-selection": "3",
  "compatible-ends": "4",
};

function isMode(value: unknown): value is LabMode {
  return value === "worksheet" || value === "random";
}

function isActivity(value: unknown): value is RandomActivityNumber {
  return value === "1" || value === "2" || value === "3" || value === "4";
}

function isDifficulty(value: unknown): value is RandomDifficulty {
  return value === "basic" || value === "standard";
}

function storedPreferences(input: string | null): Partial<RandomPreferences> {
  if (!input) return {};
  try {
    const parsed = JSON.parse(input) as Partial<RandomPreferences>;
    return {
      ...(isMode(parsed.mode) ? { mode: parsed.mode } : {}),
      ...(isActivity(parsed.activity) ? { activity: parsed.activity } : {}),
      ...(isDifficulty(parsed.difficulty)
        ? { difficulty: parsed.difficulty }
        : {}),
      ...(typeof parsed.seed === "string"
        ? { seed: normalizeSeed(parsed.seed) }
        : {}),
    };
  } catch {
    return {};
  }
}

export function readRandomPreferences(
  search: string,
  storedValue: string | null,
): RandomPreferences {
  const stored = storedPreferences(storedValue);
  const params = new URLSearchParams(search);
  const urlMode = params.get("mode");
  const urlType = params.get("type") as RandomTaskType | null;
  const urlDifficulty = params.get("difficulty");
  const urlSeed = params.get("seed");
  return {
    mode: isMode(urlMode) ? urlMode : stored.mode ?? defaultRandomPreferences.mode,
    activity:
      (urlType && activityByTaskType[urlType]) ??
      stored.activity ??
      defaultRandomPreferences.activity,
    difficulty: isDifficulty(urlDifficulty)
      ? urlDifficulty
      : stored.difficulty ?? defaultRandomPreferences.difficulty,
    seed: urlSeed
      ? normalizeSeed(urlSeed)
      : stored.seed ?? defaultRandomPreferences.seed,
  };
}

export function writeRandomPreferencesToSearch(
  search: string,
  preferences: RandomPreferences,
): string {
  const params = new URLSearchParams(search);
  params.set("mode", preferences.mode);
  if (preferences.mode === "random") {
    params.set("type", taskTypeByActivity[preferences.activity]);
    params.set("difficulty", preferences.difficulty);
    params.set("seed", normalizeSeed(preferences.seed));
  } else {
    params.delete("type");
    params.delete("difficulty");
    params.delete("seed");
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}
