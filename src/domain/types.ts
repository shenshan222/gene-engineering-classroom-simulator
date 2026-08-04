export type Base = "A" | "T" | "C" | "G";
export type Topology = "linear" | "circular";
export type Orientation = "forward" | "reverse";
export type OverhangType = "fivePrime" | "threePrime" | "blunt";
export type WorksheetNumber = "1" | "2" | "3" | "4";
export type TaskSource = "worksheet" | "generated";
export type RandomTaskType =
  | "linear-ligation"
  | "circular-ligation"
  | "pcr-selection"
  | "compatible-ends";
export type Difficulty = "basic" | "standard" | "challenge";

export interface TaskMetadata {
  source: TaskSource;
  taskType: RandomTaskType;
  difficulty: Difficulty;
  seed?: string;
  generationAttempt?: number;
  usedFallback?: boolean;
}

export interface SequenceFeature {
  id: string;
  type: "gene" | "marker" | "promoter" | "restrictionSite";
  label: string;
  /** Zero-based, inclusive coordinate on topStrand. */
  start: number;
  /** Zero-based, exclusive coordinate on topStrand. */
  end: number;
  color: string;
}

export interface FoldedRegion {
  /** Zero-based, inclusive coordinate on topStrand. */
  start: number;
  /** Zero-based, exclusive coordinate on topStrand. */
  end: number;
  label: string;
  sourceDescription: string;
}

export interface Molecule {
  id: string;
  name: string;
  topology: Topology;
  /** The complete simulation strand in the 5′→3′ direction. */
  topStrand: string;
  features: readonly SequenceFeature[];
  foldedRegions?: readonly FoldedRegion[];
  sourceTaskId: string;
}

export interface RestrictionEnzyme {
  id: string;
  name: string;
  recognition: string;
  topCutOffset: number;
  bottomCutOffset: number;
  note: string;
  classroomEnabled?: boolean;
  compatibleEndGroup?: string | null;
}

export interface DNAEnd {
  type: OverhangType;
  sequence5to3: string;
  protrudingStrand: "top" | "bottom" | null;
  side: "left" | "right";
  createdBy: string | null;
}

export interface DNAFragment {
  id: string;
  name: string;
  topStrand: string;
  leftEnd: DNAEnd;
  rightEnd: DNAEnd;
  orientation: Orientation;
  features: readonly SequenceFeature[];
  foldedRegions?: readonly FoldedRegion[];
  sourceMoleculeId: string;
}

export interface MolecularCut {
  id: string;
  moleculeId: string;
  topBondIndex: number;
  bottomBondIndex: number;
  overhangType: OverhangType;
  overhangSequence5to3: string;
  createdBy: string;
}

export interface RestrictionSite extends MolecularCut {
  enzymeId: string;
  recognition: string;
  siteStart: number;
}

export type CutFailureReason =
  | "RECOGNITION_SITE_MISMATCH"
  | "INVALID_BOND_INDEX";

export interface SuccessfulCutResult {
  ok: true;
  cut: MolecularCut;
  fragments: readonly DNAFragment[];
}

export interface FailedCutResult {
  ok: false;
  reason: CutFailureReason;
}

export type CutResult = SuccessfulCutResult | FailedCutResult;

export interface DigestResult {
  moleculeId: string;
  sourceTopology: Topology;
  cuts: readonly MolecularCut[];
  fragments: readonly DNAFragment[];
}

export interface MoleculeSegment {
  topStrand: string;
  features: readonly SequenceFeature[];
  foldedRegions: readonly FoldedRegion[];
}

export interface OpenedRecipient {
  id: string;
  name: string;
  sourceMoleculeId: string;
  sourceTaskId: string;
  finalTopology: Topology;
  prefix: MoleculeSegment;
  suffix: MoleculeSegment;
  prefixEnd: DNAEnd;
  suffixEnd: DNAEnd;
}

export type LigationFailureReason =
  | "END_SIDES_DO_NOT_MEET"
  | "OVERHANG_TYPE_MISMATCH"
  | "OVERHANG_SEQUENCE_MISMATCH"
  | "PROTRUDING_STRANDS_DO_NOT_MEET";

export type LigationCheck =
  | { compatible: true }
  | { compatible: false; reason: LigationFailureReason };

export interface InsertCandidate {
  orientation: Orientation;
  insert: DNAFragment;
  leftJunction: LigationCheck;
  rightJunction: LigationCheck;
  product: Molecule;
}

export interface Primer {
  id: string;
  name: string;
  sequence5to3: string;
  source: "worksheet" | "generated" | "edited";
}

export interface PrimerBindingSite {
  primerId: string;
  strand: "top" | "bottom";
  start: number;
  end: number;
  extensionDirection: "left" | "right";
}

export interface Amplicon {
  start: number;
  end: number;
  length: number;
  forwardPrimerId: string;
  reversePrimerId: string;
  sequence: string;
}

interface LearningTaskBase {
  id: string;
  worksheetNumber: WorksheetNumber;
  displayLabel?: string;
  title: string;
  objective: string;
  instructions: readonly string[];
  availableTools: readonly string[];
  hints: readonly string[];
  teacherAnswer: string;
  metadata?: TaskMetadata;
}

export interface ProductSignature {
  topology: Topology;
  canonicalSequence: string;
  requiredFeatureIds: readonly string[];
}

export interface LigationCompletionRule {
  recipientMoleculeId: string;
  donorMoleculeId: string;
  recipientEnzymeId: string;
  donorEnzymeId: string;
  finalTopology: Topology;
  requiredFeatureIds: readonly string[];
  validProducts?: readonly ProductSignature[];
}

export interface LigationLearningTask extends LearningTaskBase {
  taskKind: "ligation";
  initialMolecules: readonly Molecule[];
  defaultEnzymeId: string;
  completionRule?: LigationCompletionRule;
}

export interface PCRLearningTask extends LearningTaskBase {
  taskKind: "pcr";
  templateMolecules: readonly Molecule[];
  primers: readonly Primer[];
  correctTemplateId: string;
  correctPrimerPair: readonly [forwardPrimerId: string, reversePrimerId: string];
}

export type LearningTask = LigationLearningTask | PCRLearningTask;
