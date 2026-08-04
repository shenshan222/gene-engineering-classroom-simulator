import type { Molecule } from "@/src/domain/types";

interface PlasmidOverviewProps {
  molecule: Molecule;
}

export function PlasmidOverview({ molecule }: PlasmidOverviewProps) {
  const featureLabels = molecule.features.map((feature) => feature.label);
  return (
    <div className="plasmid-overview" aria-label={`${molecule.name} 环状概览`}>
      <div className="plasmid-ring">
        <span>环状 DNA</span>
      </div>
      <div>
        <strong>质粒概览</strong>
        <p>
          {featureLabels.length > 0
            ? `功能区：${featureLabels.join("、")}`
            : "当前未标记功能区"}
        </p>
      </div>
    </div>
  );
}
