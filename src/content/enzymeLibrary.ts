import type { RestrictionEnzyme } from "@/src/domain/types";

export const restrictionEnzymes = {
  ecoRI: {
    id: "ecoRI",
    name: "EcoRⅠ",
    recognition: "GAATTC",
    topCutOffset: 1,
    bottomCutOffset: 5,
    note: "识别 5′-GAATTC-3′，切割后产生 5′-AATT 黏性末端。",
    classroomEnabled: true,
    compatibleEndGroup: "AATT-5P",
  },
  munI: {
    id: "munI",
    name: "MunⅠ",
    recognition: "CAATTG",
    topCutOffset: 1,
    bottomCutOffset: 5,
    note: "识别 5′-CAATTG-3′，切割后也产生 5′-AATT 黏性末端。",
    classroomEnabled: true,
    compatibleEndGroup: "AATT-5P",
  },
} as const satisfies Record<string, RestrictionEnzyme>;

export type RestrictionEnzymeId = keyof typeof restrictionEnzymes;

export function getRestrictionEnzyme(
  enzymeId: RestrictionEnzymeId,
): RestrictionEnzyme {
  return restrictionEnzymes[enzymeId];
}

export function findRestrictionEnzyme(
  enzymeId: string,
): RestrictionEnzyme | undefined {
  return (restrictionEnzymes as Readonly<Record<string, RestrictionEnzyme>>)[
    enzymeId
  ];
}
