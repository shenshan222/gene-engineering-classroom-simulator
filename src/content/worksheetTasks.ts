import type {
  LearningTask,
  Molecule,
  PCRLearningTask,
  Primer,
} from "@/src/domain/types";

const activity1Target: Molecule = {
  id: "worksheet-1-sequence-1",
  name: "DNA 序列 1",
  topology: "linear",
  topStrand: "ATAGCATGCTATCCATGAATTCGGCATAC",
  features: [],
  sourceTaskId: "worksheet-1-linear-ecori",
};

const activity1Donor: Molecule = {
  id: "worksheet-1-sequence-2",
  name: "DNA 序列 2",
  topology: "linear",
  topStrand: "TCCTAGAATTCTCGGTATGAATTCCTAC",
  features: [],
  sourceTaskId: "worksheet-1-linear-ecori",
};

const activity2Target: Molecule = {
  id: "worksheet-2-sequence-3",
  name: "DNA 序列 3",
  topology: "linear",
  topStrand: "CATACATAGCATGCTATCCATAGCATGCTATCGAATTCGGCATAC",
  features: [],
  sourceTaskId: "worksheet-2-circular-ecori",
};

const activity2Donor: Molecule = {
  id: "worksheet-2-sequence-4",
  name: "DNA 序列 4",
  topology: "linear",
  topStrand: "GTACTCCTAGAATTCTCGGTATTCCTACGGGAATTCCTAC",
  features: [],
  sourceTaskId: "worksheet-2-circular-ecori",
};

const activity4Sequence7: Molecule = {
  id: "worksheet-4-sequence-7",
  name: "DNA 序列 7",
  topology: "linear",
  topStrand: "GACCTGTGGAAGCATCGTACGATCGATCGCATACGGGATTG",
  features: [],
  foldedRegions: [
    {
      start: 13,
      end: 29,
      label: "……",
      sourceDescription: "学案中省略的模板中间区段，使用无特殊位点的模拟序列补全。",
    },
  ],
  sourceTaskId: "worksheet-3-pcr",
};

const activity4Sequence8: Molecule = {
  id: "worksheet-4-sequence-8",
  name: "DNA 序列 8",
  topology: "linear",
  topStrand: "GACCTGAATCGTACGAGCTGGCGTACGATTCAGGTC",
  features: [],
  foldedRegions: [
    {
      start: 7,
      end: 15,
      label: "……",
      sourceDescription: "学案省略区段的课堂模拟序列。",
    },
    {
      start: 21,
      end: 29,
      label: "……",
      sourceDescription: "学案省略区段的课堂模拟序列。",
    },
  ],
  sourceTaskId: "worksheet-3-pcr",
};

const activity4Sequence9: Molecule = {
  id: "worksheet-4-sequence-9",
  name: "DNA 序列 9",
  topology: "linear",
  topStrand: "GCATTGCCATACATCGTACGATCGATCGGCATTGCCATAC",
  features: [],
  foldedRegions: [
    {
      start: 12,
      end: 28,
      label: "……",
      sourceDescription: "学案省略区段的课堂模拟序列。",
    },
  ],
  sourceTaskId: "worksheet-3-pcr",
};

const activity4Primers: readonly Primer[] = [
  {
    id: "primer-1",
    name: "引物 1",
    sequence5to3: "GACCTGTGGAAGC",
    source: "worksheet",
  },
  {
    id: "primer-2",
    name: "引物 2",
    sequence5to3: "CATACGGGATTG",
    source: "worksheet",
  },
  {
    id: "primer-3",
    name: "引物 3",
    sequence5to3: "GTATGCCCTAAC",
    source: "worksheet",
  },
  {
    id: "primer-4",
    name: "引物 4",
    sequence5to3: "CAATCCCGTATG",
    source: "worksheet",
  },
  {
    id: "primer-5",
    name: "引物 5",
    sequence5to3: "GCATTGCCATAC",
    source: "worksheet",
  },
  {
    id: "primer-6",
    name: "引物 6",
    sequence5to3: "GTATGGCAATGC",
    source: "worksheet",
  },
];

const activity5Plasmid: Molecule = {
  id: "worksheet-5-plasmid",
  name: "质粒",
  topology: "linear",
  topStrand: "GACCTGTGGAATTCGTGTACGATCGTACGATCGCATACGGGATTGCAATTGTCCCAG",
  features: [
    {
      id: "worksheet-5-marker",
      type: "marker",
      label: "标记基因",
      start: 0,
      end: 18,
      color: "marker",
    },
  ],
  foldedRegions: [
    {
      start: 18,
      end: 34,
      label: "……",
      sourceDescription: "学案中标记基因与后续序列之间的省略区段。",
    },
  ],
  sourceTaskId: "worksheet-4-ecori-muni",
};

const activity5Gene: Molecule = {
  id: "worksheet-5-target-gene",
  name: "目的基因",
  topology: "linear",
  topStrand: "GAATTCATGGCTGACTACGACTAAGAATTC",
  features: [
    {
      id: "worksheet-5-gene-feature",
      type: "gene",
      label: "目的基因",
      start: 6,
      end: 24,
      color: "gene",
    },
  ],
  sourceTaskId: "worksheet-4-ecori-muni",
};

const pcrTask: PCRLearningTask = {
  id: "worksheet-3-pcr",
  worksheetNumber: "3",
  taskKind: "pcr",
  title: "PCR 扩增的引物选择",
  objective: "判断引物的结合位置和延伸方向，并分析重复序列对 PCR 产物的影响。",
  instructions: [
    "为 DNA 序列 7 选择一对方向相向的引物。",
    "比较 DNA 序列 8、9 中候选引物的相同、互补或不同关系。",
    "根据全部可能结合位置分析 PCR 产物。",
  ],
  availableTools: ["primer", "pcr"],
  templateMolecules: [
    activity4Sequence7,
    activity4Sequence8,
    activity4Sequence9,
  ],
  primers: activity4Primers,
  correctTemplateId: activity4Sequence7.id,
  correctPrimerPair: ["primer-1", "primer-4"],
  hints: [
    "正向引物通常与目标区段左端上链序列相同，并与下链结合。",
    "反向引物应是目标区段右端上链序列的反向互补序列。",
  ],
  teacherAnswer:
    "DNA 序列 7 应选择引物 1 和引物 4；两条引物的 3′端相向，能够扩增目标区段。",
};

export const worksheetTasks = [
  {
    id: "worksheet-1-linear-ecori",
    worksheetNumber: "1",
    taskKind: "ligation",
    title: "EcoRⅠ切割线性 DNA 并连接目的片段",
    objective: "识别 EcoRⅠ位点，切下供体片段并插入受体 DNA。",
    instructions: [
      "在 DNA 序列 1、2 中寻找 EcoRⅠ识别位点。",
      "切开所有目标位点。",
      "将 DNA 序列 2 两个位点之间的片段插入 DNA 序列 1。",
    ],
    availableTools: ["ecoRI", "dnaLigase"],
    initialMolecules: [activity1Target, activity1Donor],
    defaultEnzymeId: "ecoRI",
    completionRule: {
      recipientMoleculeId: activity1Target.id,
      donorMoleculeId: activity1Donor.id,
      recipientEnzymeId: "ecoRI",
      donorEnzymeId: "ecoRI",
      finalTopology: "linear",
      requiredFeatureIds: [],
    },
    hints: ["EcoRⅠ识别 5′-GAATTC-3′，并产生 AATT 黏性末端。"],
    teacherAnswer:
      "DNA 序列 1 含 1 个 EcoRⅠ位点，DNA 序列 2 含 2 个；序列 2 两个位点之间的片段可插入序列 1。",
  },
  {
    id: "worksheet-2-circular-ecori",
    worksheetNumber: "2",
    taskKind: "ligation",
    title: "环状 DNA 的 EcoRⅠ酶切与重组",
    objective: "理解环状 DNA 被单点切开后线性化，并完成目的片段插入。",
    instructions: [
      "先将 DNA 序列 3 首尾连接为环状 DNA。",
      "用 EcoRⅠ切开 DNA 序列 3、4。",
      "将 DNA 序列 4 的目标片段插入 DNA 序列 3。",
    ],
    availableTools: ["circularize", "ecoRI", "dnaLigase"],
    initialMolecules: [activity2Target, activity2Donor],
    defaultEnzymeId: "ecoRI",
    completionRule: {
      recipientMoleculeId: activity2Target.id,
      donorMoleculeId: activity2Donor.id,
      recipientEnzymeId: "ecoRI",
      donorEnzymeId: "ecoRI",
      finalTopology: "circular",
      requiredFeatureIds: [],
    },
    hints: ["环状 DNA 只有一个 EcoRⅠ位点时，切割后会成为一条线性 DNA。"],
    teacherAnswer:
      "序列 3 首尾连接后为环状受体；EcoRⅠ将其打开，序列 4 两个位点之间的片段可插入该切口。",
  },
  pcrTask,
  {
    id: "worksheet-4-ecori-muni",
    worksheetNumber: "4",
    taskKind: "ligation",
    title: "EcoRⅠ与 MunⅠ的兼容黏性末端",
    objective: "比较不同限制酶产生的末端，并在保留标记基因的条件下完成重组。",
    instructions: [
      "先将质粒首尾连接为环状。",
      "比较标记基因内的 EcoRⅠ位点和标记基因外的 MunⅠ位点。",
      "选择合适的酶切方案并插入目的基因。",
    ],
    availableTools: ["circularize", "ecoRI", "munI", "dnaLigase"],
    initialMolecules: [activity5Plasmid, activity5Gene],
    defaultEnzymeId: "munI",
    completionRule: {
      recipientMoleculeId: activity5Plasmid.id,
      donorMoleculeId: activity5Gene.id,
      recipientEnzymeId: "munI",
      donorEnzymeId: "ecoRI",
      finalTopology: "circular",
      requiredFeatureIds: [
        "worksheet-5-marker",
        "worksheet-5-gene-feature",
      ],
    },
    hints: [
      "EcoRⅠ和 MunⅠ识别序列不同，但都产生 AATT 黏性末端。",
      "选择质粒切点时应注意是否破坏标记基因。",
    ],
    teacherAnswer:
      "可用 MunⅠ在标记基因外切开质粒，并用 EcoRⅠ切下目的基因；两者产生兼容的 AATT 黏性末端。",
  },
] as const satisfies readonly LearningTask[];

export function getWorksheetTask(taskId: string): LearningTask | undefined {
  return worksheetTasks.find((task) => task.id === taskId);
}
