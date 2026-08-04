const COMPLEMENT: Readonly<Record<string, string>> = {
  A: "T",
  T: "A",
  C: "G",
  G: "C",
};

export function normalizeDNASequence(input: string): string {
  const normalized = input.toUpperCase().replace(/\s+/g, "");

  if (normalized.length === 0) {
    throw new RangeError("DNA sequence must not be empty.");
  }

  if (!/^[ATCG]+$/.test(normalized)) {
    throw new RangeError("DNA sequence may contain only A, T, C and G.");
  }

  return normalized;
}

export function complement(input: string): string {
  return normalizeDNASequence(input)
    .split("")
    .map((base) => COMPLEMENT[base])
    .join("");
}

export function reverse(input: string): string {
  return normalizeDNASequence(input).split("").reverse().join("");
}

export function reverseComplement(input: string): string {
  return complement(input).split("").reverse().join("");
}

export function gcContent(input: string): number {
  const sequence = normalizeDNASequence(input);
  const gcCount = sequence
    .split("")
    .filter((base) => base === "G" || base === "C").length;
  return gcCount / sequence.length;
}

export function findAllOccurrences(
  input: string,
  patternInput: string,
  circular = false,
): number[] {
  const sequence = normalizeDNASequence(input);
  const pattern = normalizeDNASequence(patternInput);

  if (pattern.length > sequence.length) {
    return [];
  }

  const searchable = circular
    ? sequence + sequence.slice(0, Math.max(0, pattern.length - 1))
    : sequence;
  const lastStart = circular
    ? sequence.length - 1
    : sequence.length - pattern.length;
  const matches: number[] = [];

  for (let start = 0; start <= lastStart; start += 1) {
    if (searchable.slice(start, start + pattern.length) === pattern) {
      matches.push(start);
    }
  }

  return matches;
}
