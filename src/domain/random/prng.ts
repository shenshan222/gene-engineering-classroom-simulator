export interface SeededRandom {
  next(): number;
  integer(min: number, max: number): number;
  boolean(probability?: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  fork(namespace: string): SeededRandom;
}

function xmur3(input: string): () => number {
  let hash = 1779033703 ^ input.length;
  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeSeed(seed: string): string {
  const normalized = seed.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return normalized || "BIO-CLASS-01";
}

export function createSeededRandom(seedInput: string): SeededRandom {
  const seed = normalizeSeed(seedInput);
  const random = mulberry32(xmur3(seed)());

  return {
    next: random,
    integer(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
        throw new RangeError("Random integer bounds must be valid integers.");
      }
      return Math.floor(random() * (max - min + 1)) + min;
    },
    boolean(probability = 0.5) {
      if (probability < 0 || probability > 1) {
        throw new RangeError("Probability must be between zero and one.");
      }
      return random() < probability;
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new RangeError("Cannot pick from an empty collection.");
      }
      return items[Math.floor(random() * items.length)];
    },
    shuffle<T>(items: readonly T[]): T[] {
      const result = [...items];
      for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [
          result[swapIndex],
          result[index],
        ];
      }
      return result;
    },
    fork(namespace: string) {
      return createSeededRandom(`${seed}::${namespace}`);
    },
  };
}

export function createRandomSeed(): string {
  const values = new Uint32Array(2);
  globalThis.crypto.getRandomValues(values);
  return `BIO-${values[0].toString(36).toUpperCase()}${values[1]
    .toString(36)
    .toUpperCase()}`.slice(0, 16);
}
