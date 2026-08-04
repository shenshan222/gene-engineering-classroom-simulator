import { describe, expect, it } from "vitest";

import {
  readRandomPreferences,
  writeRandomPreferencesToSearch,
} from "@/src/state/randomSession";

describe("random session URL and local preferences", () => {
  it("restores a shared random task URL before stored preferences", () => {
    const preferences = readRandomPreferences(
      "?mode=random&type=pcr-selection&difficulty=standard&seed=bio-share-03",
      JSON.stringify({
        mode: "worksheet",
        activity: "1",
        difficulty: "basic",
        seed: "BIO-OLD",
      }),
    );

    expect(preferences).toEqual({
      mode: "random",
      activity: "3",
      difficulty: "standard",
      seed: "BIO-SHARE-03",
    });
  });

  it("serializes every value required to replay a random task", () => {
    const search = writeRandomPreferencesToSearch("?teacher=1", {
      mode: "random",
      activity: "4",
      difficulty: "basic",
      seed: "BIO-COMPATIBLE-08",
    });
    const params = new URLSearchParams(search);

    expect(params.get("teacher")).toBe("1");
    expect(params.get("mode")).toBe("random");
    expect(params.get("type")).toBe("compatible-ends");
    expect(params.get("difficulty")).toBe("basic");
    expect(params.get("seed")).toBe("BIO-COMPATIBLE-08");
  });

  it("ignores malformed saved data", () => {
    expect(readRandomPreferences("", "{broken-json")).toEqual({
      mode: "worksheet",
      activity: "1",
      difficulty: "basic",
      seed: "BIO-CLASS-01",
    });
  });
});
