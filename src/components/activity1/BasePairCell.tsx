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
  overhangPreview: boolean;
  topCutPreview: boolean;
  bottomCutPreview: boolean;
  validCutSite: boolean;
  onCut: (bondIndex: number) => void;
  onPreview: (bondIndex: number | null) => void;
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
  overhangPreview,
  topCutPreview,
  bottomCutPreview,
  validCutSite,
  onCut,
  onPreview,
}: BasePairCellProps) {
  return (
    <span
      className={`base-unit ${featureType ? `feature-${featureType}` : ""} ${
        folded ? "folded-base" : ""
      } ${overhangPreview ? "overhang-preview" : ""}`}
    >
      <span className="base-letter top-base">{base}</span>
      <span className="base-bridge" aria-hidden="true" />
      <span className="base-letter bottom-base">{complement(base)}</span>
      {topCutPreview && (
        <span aria-hidden="true" className="strand-cut-marker top" />
      )}
      {bottomCutPreview && (
        <span aria-hidden="true" className="strand-cut-marker bottom" />
      )}
      {hasBondAfter && (
        <button
          aria-label={`在${objectName}第 ${bondIndex} 个碱基后尝试切割`}
          className={`bond-button ${invalid ? "invalid" : ""} ${validCutSite ? "valid-site" : ""}`}
          data-no-drag
          disabled={!bondEnabled}
          key={invalid ? invalidSequence : 0}
          onBlur={() => onPreview(null)}
          onClick={() => onCut(bondIndex)}
          onFocus={() => onPreview(bondIndex)}
          onPointerEnter={() => onPreview(bondIndex)}
          onPointerLeave={() => onPreview(null)}
          type="button"
        >
          <span aria-hidden="true" className="bond-guide" />
        </button>
      )}
    </span>
  );
}
