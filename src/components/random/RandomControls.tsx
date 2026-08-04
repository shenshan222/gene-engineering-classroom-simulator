"use client";

import { useState } from "react";

import type { Difficulty } from "@/src/domain/types";

export type LabMode = "worksheet" | "random";
export type RandomDifficulty = Extract<Difficulty, "basic" | "standard">;
export type RandomActivityNumber = "1" | "2" | "3" | "4";

interface RandomControlsProps {
  mode: LabMode;
  activity: RandomActivityNumber;
  difficulty: RandomDifficulty;
  seed: string;
  seedDraft: string;
  usedFallback: boolean;
  onModeChange: (mode: LabMode) => void;
  onActivityChange: (activity: RandomActivityNumber) => void;
  onDifficultyChange: (difficulty: RandomDifficulty) => void;
  onSeedDraftChange: (seed: string) => void;
  onGenerate: () => void;
  onNext: () => void;
}

export function RandomControls({
  mode,
  activity,
  difficulty,
  seed,
  seedDraft,
  usedFallback,
  onModeChange,
  onActivityChange,
  onDifficultyChange,
  onSeedDraftChange,
  onGenerate,
  onNext,
}: RandomControlsProps) {
  const [copied, setCopied] = useState(false);

  async function copySeed() {
    await navigator.clipboard.writeText(seed);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className="random-controls" aria-label="题目模式与随机出题">
      <div className="mode-buttons" aria-label="题目模式">
        <button
          aria-pressed={mode === "worksheet"}
          onClick={() => onModeChange("worksheet")}
          type="button"
        >
          固定学案
        </button>
        <button
          aria-pressed={mode === "random"}
          onClick={() => onModeChange("random")}
          type="button"
        >
          随机训练
        </button>
      </div>

      {mode === "random" && (
        <>
          <label>
            <span>题型</span>
            <select
              aria-label="随机题型"
              onChange={(event) =>
                onActivityChange(event.target.value as RandomActivityNumber)
              }
              value={activity}
            >
              <option value="1">活动 1 · 线性 DNA</option>
              <option value="2">活动 2 · 环状 DNA</option>
              <option value="3">活动 3 · PCR 引物</option>
              <option value="4">活动 4 · 兼容末端</option>
            </select>
          </label>
          <label>
            <span>难度</span>
            <select
              aria-label="随机题难度"
              onChange={(event) =>
                onDifficultyChange(event.target.value as RandomDifficulty)
              }
              value={difficulty}
            >
              <option value="basic">基础</option>
              <option value="standard">标准（增加干扰）</option>
            </select>
          </label>
          <label className="seed-field">
            <span>种子</span>
            <input
              aria-label="随机题种子"
              maxLength={32}
              onChange={(event) => onSeedDraftChange(event.target.value)}
              spellCheck={false}
              value={seedDraft}
            />
          </label>
          <button onClick={onGenerate} type="button">
            用此种子生成
          </button>
          <button onClick={copySeed} type="button">
            {copied ? "已复制" : "复制种子"}
          </button>
          <button className="next-random-button" onClick={onNext} type="button">
            下一题
          </button>
          {usedFallback && (
            <span className="fallback-note">已使用经过测试的备用题</span>
          )}
        </>
      )}
    </section>
  );
}
