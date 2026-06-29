/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DBType = "omni" | "uniprot" | "pdb" | "ncbi" | "alphafold" | "pubchem" | "kegg";

export type UserMode = "learning" | "professional";

export interface DatabaseLinks {
  uniprot?: string;
  genecards?: string;
  stringDb?: string;
  ncbi?: string;
  expasy?: string;
}

export interface ProteinData {
  id: string;
  name: string;
  organism: string;
  geneName?: string;
  sequence: string;
  sequenceLength: number;
  description: string;
  functionText: string;
  pdbCode?: string;
  molecularWeight?: number; // Da
  isoelectricPoint?: number; // pI
  databaseSource: DBType;
  rawJson?: string;
  externalUrl?: string;
  databaseLinks?: DatabaseLinks;
  refSeq?: string;
  ncbiId?: string;
  
  // Custom PubChem / KEGG fields
  chemicalFormula?: string;
  smiles?: string;
  iupacName?: string;
  pathwayMapId?: string;
  pathwayClass?: string;
  pathwayDiseases?: string[];
}

export interface AlignmentConfig {
  matchScore: number;
  mismatchPenalty: number;
  gapPenalty: number;
  alignmentType: "global" | "local"; // Needleman-Wunsch vs. Smith-Waterman
}

export interface AlignmentResult {
  seqAId: string;
  seqBId: string;
  alignedSeqA: string;
  alignedSeqB: string;
  consensus: string;
  score: number;
  identityCount: number;
  gapCount: number;
  identityPercentage: number;
  gapPercentage: number;
  alignmentLength: number;
  alignmentType: "global" | "local";
}

export interface MotifMatch {
  name: string;
  pattern: string;
  start: number;
  end: number;
  sequence: string;
  description: string;
}

export interface SavedPipeline {
  id: string;
  name: string;
  date: string;
  queries: string[];
  dbType: DBType;
  alignmentConfig: AlignmentConfig;
}

export type UserTier = "free" | "pro" | "enterprise";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  tier: UserTier;
  stripeCustomerId?: string;
  subscriptionId?: string;
}

export interface UsageTracker {
  userId: string;
  apiCalls: number;
  lastReset: string;
}

export interface GeminiResponse {
  summary: string;
  structureNote: string;
  therapeuticNote: string;
  educationalTakeaways: string[];
  proContext?: string;
  interactingReceptors?: string[];
  relatedPathways?: string[];
}

export interface SeedAtom {
  serial: number;
  name: string;
  resName: string;
  aa: string;
  chainID: string;
  resSeq: number;
  x: number;
  y: number;
  z: number;
  element: string;
}
