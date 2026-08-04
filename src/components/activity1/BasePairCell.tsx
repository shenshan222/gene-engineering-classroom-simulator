import { complement } from "@/src/domain/sequence";

interface BasePairCellProps {
  base: string;
  bondIndex: number;
  hasBondAfter: boolean;
  bondEnabled: boolean;
  invalid: boolean;
  invalidSequence: number;
  objectName: string;
  featureType?: "gene" | "marker" | "promoter" | "restrictionSite";
  folded?: boolean;
  onCut: (bondIndex: number) => void;
}

export function BasePairCell({
  base,
  bondIndex,
  hasBondAfter,
  bondEnabled,
  invalid,
  invalidSequence,
  objectName,
  featureType,
  folded = false,
  onCut,
}: BasePairCellProps) {
  return (
    <span
      className={`base-unit ${featureType ? `feature-${featureType}` : ""} ${
        folded ? "folded-base" : ""
      }`}
    >
      <span className="base-letter top-base">{base}</span>
      <span className="base-bridge" aria-hidden="true" />
      <span className="base-letter bottom-base">{complement(base)}</span>
      {hasBondAfter && (
        <button
          aria-label={`在${objectName}第 ${bondIndex} 个碱基后尝试切割`}
          className={`bond-button ${invalid ? "invalid" : ""}`}
          data-no-drag
          disabled={!bondEnabled}
          key={invalid ? invalidSequence : 0}
          onClick={() => onCut(bondIndex)}
          type="button"
        >
          <span aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
