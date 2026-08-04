import { useMemo } from "react";

import { PlasmidOverview } from "@/src/components/PlasmidOverview";
import { restrictionEnzymes } from "@/src/content/enzymeLibrary";
import { complement } from "@/src/domain/sequence";
import { scanRestrictionSites } from "@/src/domain/restriction";
import type {
  MolecularCut,
  Molecule,
  RestrictionEnzyme,
} from "@/src/domain/types";
import type { BondSelection, ToolId } from "@/src/state/workbench";

interface DisplayToken {
  start: number;
  end: number;
  top: string;
  bottom: string;
  folded: boolean;
}

function createDisplayTokens(molecule: Molecule): DisplayToken[] {
  const foldedRegions = [...(molecule.foldedRegions ?? [])].sort(
    (a, b) => a.start - b.start,
  );
  const tokens: DisplayToken[] = [];
  let index = 0;

  while (index < molecule.topStrand.length) {
    const folded = foldedRegions.find((region) => region.start === index);
    if (folded) {
      tokens.push({
        start: folded.start,
        end: folded.end,
        top: folded.label,
        bottom: folded.label,
        folded: true,
      });
      index = folded.end;
      continue;
    }
    const base = molecule.topStrand[index];
    tokens.push({
      start: index,
      end: index + 1,
      top: base,
      bottom: complement(base),
      folded: false,
    });
    index += 1;
  }
  return tokens;
}

function activeEnzyme(toolId: ToolId | null): RestrictionEnzyme | null {
  if (toolId === "ecoRI" || toolId === "munI") {
    return restrictionEnzymes[toolId];
  }
  return null;
}

function highlightedBaseIndices(
  molecule: Molecule,
  enzyme: RestrictionEnzyme | null,
): Set<number> {
  const indices = new Set<number>();
  if (!enzyme) {
    return indices;
  }
  for (const site of scanRestrictionSites(molecule, enzyme)) {
    for (let offset = 0; offset < enzyme.recognition.length; offset += 1) {
      indices.add((site.siteStart + offset) % molecule.topStrand.length);
    }
  }
  return indices;
}

function featureClass(molecule: Molecule, baseIndex: number): string {
  const feature = molecule.features.find(
    (candidate) =>
      baseIndex >= candidate.start && baseIndex < candidate.end,
  );
  return feature ? `feature-${feature.type}` : "";
}

interface MoleculeStripProps {
  molecule: Molecule;
  cuts: readonly MolecularCut[];
  selectedToolId: ToolId | null;
  selectedBond: BondSelection | null;
  canCircularize: boolean;
  onBondSelect: (moleculeId: string, bondIndex: number) => void;
  onCircularize: (moleculeId: string) => void;
}

export function MoleculeStrip({
  molecule,
  cuts,
  selectedToolId,
  selectedBond,
  canCircularize,
  onBondSelect,
  onCircularize,
}: MoleculeStripProps) {
  const tokens = useMemo(() => createDisplayTokens(molecule), [molecule]);
  const enzyme = activeEnzyme(selectedToolId);
  const highlights = useMemo(
    () => highlightedBaseIndices(molecule, enzyme),
    [molecule, enzyme],
  );
  const normalizedCutIndices = new Set(
    cuts.map((cut) =>
      molecule.topology === "circular" && cut.topBondIndex === 0
        ? molecule.topStrand.length
        : cut.topBondIndex,
    ),
  );

  return (
    <article
      className="molecule-card"
      data-drop-kind="molecule"
      data-molecule-id={molecule.id}
    >
      <header className="molecule-header">
        <div>
          <div className="molecule-title-line">
            <h3>{molecule.name}</h3>
            <span className={`topology-badge ${molecule.topology}`}>
              {molecule.topology === "circular" ? "环状" : "线性"}
            </span>
          </div>
          <p>
            {molecule.topStrand.length} bp
            {cuts.length > 0 ? ` · 已切 ${cuts.length} 处` : ""}
          </p>
        </div>
        {canCircularize && molecule.topology === "linear" && (
          <button
            className="compact-action"
            onClick={() => onCircularize(molecule.id)}
            type="button"
          >
            首尾连接成环
          </button>
        )}
      </header>

      {molecule.topology === "circular" && (
        <PlasmidOverview molecule={molecule} />
      )}

      <div className="sequence-scroller">
        <div className="sequence-track">
          <div className="orientation-column" aria-hidden="true">
            <span>5′</span>
            <span>3′</span>
          </div>
          {tokens.map((token) => {
            const hasCut = normalizedCutIndices.has(token.end);
            const isSelected =
              selectedBond?.moleculeId === molecule.id &&
              selectedBond.bondIndex === token.end;
            const canShowBond =
              token.end < molecule.topStrand.length ||
              molecule.topology === "circular";
            const highlighted =
              !token.folded &&
              Array.from(
                { length: token.end - token.start },
                (_, offset) => token.start + offset,
              ).some((index) => highlights.has(index));

            return (
              <div className="sequence-unit" key={`${token.start}-${token.end}`}>
                <div
                  className={`base-pair ${token.folded ? "folded" : ""} ${
                    highlighted ? "recognition-highlight" : ""
                  } ${featureClass(molecule, token.start)}`}
                >
                  <span>{token.top}</span>
                  <span>{token.bottom}</span>
                </div>
                {canShowBond && (
                  <button
                    aria-label={`在 ${molecule.name} 第 ${token.end} 个碱基后选择切点`}
                    className={`cut-handle ${hasCut ? "cut" : ""} ${
                      isSelected ? "selected" : ""
                    }`}
                    data-bond-index={token.end}
                    data-drop-kind="bond"
                    data-molecule-id={molecule.id}
                    disabled={hasCut}
                    onClick={() => onBondSelect(molecule.id, token.end)}
                    title={hasCut ? "此处已切开" : `切点 ${token.end}`}
                    type="button"
                  >
                    <span aria-hidden="true">{hasCut ? "✂" : ""}</span>
                  </button>
                )}
              </div>
            );
          })}
          <div className="orientation-column ending" aria-hidden="true">
            <span>3′</span>
            <span>5′</span>
          </div>
        </div>
      </div>

      {molecule.features.length > 0 && (
        <div className="feature-legend">
          {molecule.features.map((feature) => (
            <span key={feature.id} className={`legend-${feature.type}`}>
              {feature.label}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
