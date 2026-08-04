import type { Amplicon } from "@/src/domain/types";

interface PCRResultPanelProps {
  amplicons: readonly Amplicon[];
  primerNameById?: Readonly<Record<string, string>>;
}

export function PCRResultPanel({
  amplicons,
  primerNameById = {},
}: PCRResultPanelProps) {
  if (amplicons.length === 0) {
    return null;
  }
  const maximumLength = Math.max(...amplicons.map((amplicon) => amplicon.length));

  return (
    <section className="pcr-results" aria-label="PCR 扩增结果">
      <strong>PCR 产物</strong>
      <div className="amplicon-list">
        {amplicons.map((amplicon) => (
          <div
            className="amplicon-row"
            key={`${amplicon.start}:${amplicon.end}:${amplicon.forwardPrimerId}`}
          >
            <span>{amplicon.length} bp</span>
            <span className="amplicon-track">
              <span
                style={{
                  width: `${Math.max(16, (amplicon.length / maximumLength) * 100)}%`,
                }}
              />
            </span>
            <small>
              {primerNameById[amplicon.forwardPrimerId] ??
                amplicon.forwardPrimerId.replace("primer-", "引物 ")} + {" "}
              {primerNameById[amplicon.reversePrimerId] ??
                amplicon.reversePrimerId.replace("primer-", "引物 ")}
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}
