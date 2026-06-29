/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlignmentConfig, AlignmentResult, MotifMatch } from "../types";

// Residue monoisotopic masses (Da) minus H2O (18.01524 Da)
const RESIDUE_WEIGHTS: Record<string, number> = {
  A: 71.0779,  R: 156.1875, N: 114.1038, D: 115.0874, C: 103.1388,
  E: 129.1155, Q: 128.1307, G: 57.0513,  H: 137.1411, I: 113.1594,
  L: 113.1594, K: 128.1741, M: 131.1960, F: 147.1766, P: 97.1167,
  S: 87.0782,  T: 101.1051, W: 186.2099, Y: 163.1760, V: 99.1326,
};

// Kyte & Doolittle hydropathy index
const HYDROPATHY_VALUES: Record<string, number> = {
  A: 1.8,  R: -4.5, N: -3.5, D: -3.5, C: 2.5,
  Q: -3.5, E: -3.5, G: -0.4, H: -3.2, I: 4.5,
  L: 3.8,  K: -3.9, M: 1.9,  F: 2.8,  P: -1.6,
  S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2,
};

// Standard pKa values for amino acids (N-terminal, C-terminal, and side chains)
// Acidic (gain negative charge at high pH, i.e., deprotonated is negative neutral is positive/neutral)
// Aspartate, Glutamate, Cysteine, Tyrosine, C-terminus
// Basic (gain positive charge at low pH, i.e., protonated is positive, deprotonated is neutral)
// Lysine, Arginine, Histidine, N-terminus
const PKA_VALUES = {
  N_TERM: 8.0,
  C_TERM: 3.1,
  D: 4.4, // Aspartic acid
  E: 4.4, // Glutamic acid
  C: 8.5, // Cysteine
  Y: 10.0, // Tyrosine
  H: 6.0, // Histidine
  K: 10.0, // Lysine
  R: 12.0, // Arginine
};

/**
 * Calculates the molecular weight of a protein sequence in Daltons (Da).
 */
export function calculateMolecularWeight(sequence: string): number {
  const seq = sequence.toUpperCase().replace(/[^A-Z]/g, "");
  let weight = 18.0152; // Active water molecule for termini
  for (const aa of seq) {
    if (RESIDUE_WEIGHTS[aa]) {
      weight += RESIDUE_WEIGHTS[aa];
    }
  }
  return parseFloat(weight.toFixed(2));
}

/**
 * Computes the net charge of a protein sequence at a given pH.
 */
export function computeNetChargeAtPH(sequence: string, pH: number): number {
  const seq = sequence.toUpperCase();
  
  // Count specific residues
  const counts: Record<string, number> = { D: 0, E: 0, C: 0, Y: 0, H: 0, K: 0, R: 0 };
  for (const aa of seq) {
    if (counts[aa] !== undefined) {
      counts[aa]++;
    }
  }

  let charge = 0.0;

  // 1. N-terminus (Positive in low pH)
  charge += 1.0 / (1.0 + Math.pow(10, pH - PKA_VALUES.N_TERM));

  // 2. C-terminus (Negative in high pH)
  charge -= 1.0 / (1.0 + Math.pow(10, PKA_VALUES.C_TERM - pH));

  // 3. Basic Side Chains (Positive in low pH)
  charge += counts.H * (1.0 / (1.0 + Math.pow(10, pH - PKA_VALUES.H)));
  charge += counts.K * (1.0 / (1.0 + Math.pow(10, pH - PKA_VALUES.K)));
  charge += counts.R * (1.0 / (1.0 + Math.pow(10, pH - PKA_VALUES.R)));

  // 4. Acidic Side Chains (Negative in high pH)
  charge -= counts.D * (1.0 / (1.0 + Math.pow(10, PKA_VALUES.D - pH)));
  charge -= counts.E * (1.0 / (1.0 + Math.pow(10, PKA_VALUES.E - pH)));
  charge -= counts.C * (1.0 / (1.0 + Math.pow(10, PKA_VALUES.C - pH)));
  charge -= counts.Y * (1.0 / (1.0 + Math.pow(10, PKA_VALUES.Y - pH)));

  return charge;
}

/**
 * Estimates the isoelectric point (pI) of a protein sequence.
 * This is the pH value at which the net charge is 0.
 */
export function calculateIsoelectricPoint(sequence: string): number {
  const cleanSeq = sequence.toUpperCase().replace(/[^A-Z]/g, "");
  if (cleanSeq.length === 0) return 7.0;

  let minPH = 0.0;
  let maxPH = 14.0;
  let pi = 7.0;
  const tolerance = 0.0001;
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    pi = (minPH + maxPH) / 2.0;
    const charge = computeNetChargeAtPH(cleanSeq, pi);

    if (Math.abs(charge) < tolerance) {
      break;
    }

    if (charge > 0) {
      // Net positive charge indicates the pH is below pI, search in higher pH range
      minPH = pi;
    } else {
      // Net negative charge indicates the pH is above pI, search in lower pH range
      maxPH = pi;
    }
  }

  return parseFloat(pi.toFixed(2));
}

/**
 * Calculates Kyte-Doolittle hydropathy scores over a sliding window
 */
export function calculateHydropathyProfile(sequence: string, windowSize: number = 7): number[] {
  const cleanSeq = sequence.toUpperCase().replace(/[^A-Z]/g, "");
  const scores: number[] = [];
  
  if (cleanSeq.length < windowSize) {
    return cleanSeq.split("").map(aa => HYDROPATHY_VALUES[aa] || 0);
  }

  for (let i = 0; i <= cleanSeq.length - windowSize; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      const aa = cleanSeq[i + j];
      sum += HYDROPATHY_VALUES[aa] || 0;
    }
    scores.push(parseFloat((sum / windowSize).toFixed(3)));
  }

  return scores;
}

/**
 * Counts the occurrences of each amino acid
 */
export function calculateAminoAcidFrequency(sequence: string): Record<string, { count: number; percentage: number }> {
  const cleanSeq = sequence.toUpperCase().replace(/[^A-Z]/g, "");
  const total = cleanSeq.length || 1;
  const counts: Record<string, number> = {};
  
  // Initialize counts for standard amino acids
  const standardAAs = "ACDEFGHIKLMNPQRSTVWY";
  for (const aa of standardAAs) {
    counts[aa] = 0;
  }
  counts["Other"] = 0;

  for (const aa of cleanSeq) {
    if (counts[aa] !== undefined) {
      counts[aa]++;
    } else {
      counts["Other"]++;
    }
  }

  const result: Record<string, { count: number; percentage: number }> = {};
  for (const aa of Object.keys(counts)) {
    result[aa] = {
      count: counts[aa],
      percentage: parseFloat(((counts[aa] / total) * 100).toFixed(2)),
    };
  }

  return result;
}

/**
 * Performs local or global sequence alignments using Needleman-Wunsch or Smith-Waterman.
 */
export function performSequenceAlignment(
  seqA: string,
  seqB: string,
  config: AlignmentConfig,
  seqAId: string = "Seq A",
  seqBId: string = "Seq B"
): AlignmentResult {
  const sA = seqA.toUpperCase().replace(/[^A-Z-]/g, "");
  const sB = seqB.toUpperCase().replace(/[^A-Z-]/g, "");
  
  const m = sA.length;
  const n = sB.length;
  
  const match = config.matchScore;
  const mismatch = config.mismatchPenalty; // assuming negative or positive score penalty
  const gap = config.gapPenalty; // assuming negative match penalty (e.g. -5)
  const isGlobal = config.alignmentType === "global";

  // Score matrix S
  const S: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Traceback tracking matrix (0 = Stop/Term, 1 = Diagonal (match/mismatch), 2 = Up (gap in B), 3 = Left (gap in A))
  const T: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Initialize scoring grid
  if (isGlobal) {
    for (let i = 0; i <= m; i++) {
      S[i][0] = i * gap;
      T[i][0] = 2; // Up
    }
    for (let j = 0; j <= n; j++) {
      S[0][j] = j * gap;
      T[0][j] = 3; // Left
    }
  } else {
    for (let i = 0; i <= m; i++) S[i][0] = 0;
    for (let j = 0; j <= n; j++) S[0][j] = 0;
  }

  let maxScore = -Infinity;
  let maxI = 0;
  let maxJ = 0;

  if (!isGlobal) {
    maxScore = 0; // Smith-Waterman lower bound is 0
  }

  // Populate dynamic programming matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const matchScore = sA[i - 1] === sB[j - 1] ? match : mismatch;
      
      const scoreDiag = S[i - 1][j - 1] + matchScore;
      const scoreUp = S[i - 1][j] + gap;
      const scoreLeft = S[i][j - 1] + gap;

      if (isGlobal) {
        const optimal = Math.max(scoreDiag, scoreUp, scoreLeft);
        S[i][j] = optimal;
        
        if (optimal === scoreDiag) {
          T[i][j] = 1; // Diagonal
        } else if (optimal === scoreUp) {
          T[i][j] = 2; // Up (Gap in seq B)
        } else {
          T[i][j] = 3; // Left (Gap in seq A)
        }
      } else {
        const optimal = Math.max(0, scoreDiag, scoreUp, scoreLeft);
        S[i][j] = optimal;
        
        if (optimal === 0) {
          T[i][j] = 0; // Stop local alignment traceback
        } else if (optimal === scoreDiag) {
          T[i][j] = 1;
        } else if (optimal === scoreUp) {
          T[i][j] = 2;
        } else {
          T[i][j] = 3;
        }

        if (optimal > maxScore) {
          maxScore = optimal;
          maxI = i;
          maxJ = j;
        }
      }
    }
  }

  // Traceback
  let alignedA = "";
  let alignedB = "";
  let i = isGlobal ? m : maxI;
  let j = isGlobal ? n : maxJ;
  let alignmentScore = isGlobal ? S[m][n] : maxScore;

  while (i > 0 || j > 0) {
    if (!isGlobal && S[i][j] === 0) {
      break;
    }

    if (isGlobal && i === 0) {
      alignedA = "-" + alignedA;
      alignedB = sB[j - 1] + alignedB;
      j--;
      continue;
    }
    if (isGlobal && j === 0) {
      alignedA = sA[i - 1] + alignedA;
      alignedB = "-" + alignedB;
      i--;
      continue;
    }

    const direction = T[i][j];

    if (direction === 1) { // Diagonal
      alignedA = sA[i - 1] + alignedA;
      alignedB = sB[j - 1] + alignedB;
      i--;
      j--;
    } else if (direction === 2) { // Up (Gap in B, consuming A)
      alignedA = sA[i - 1] + alignedA;
      alignedB = "-" + alignedB;
      i--;
    } else if (direction === 3) { // Left (Gap in A, consuming B)
      alignedA = "-" + alignedA;
      alignedB = sB[j - 1] + alignedB;
      j--;
    } else {
      break; // Smith-Waterman stopping condition (score 0 / direction 0)
    }
  }

  // Calculate consensus, identity and gap frequencies
  let consensus = "";
  let identityCount = 0;
  let gapCount = 0;
  const alignmentLength = alignedA.length;

  for (let k = 0; k < alignmentLength; k++) {
    const charA = alignedA[k];
    const charB = alignedB[k];

    if (charA === "-" || charB === "-") {
      consensus += " ";
      gapCount++;
    } else if (charA === charB) {
      consensus += "|";
      identityCount++;
    } else {
      // Check for conservative substitutions (simplified BLOSUM62 positive pairs)
      consensus += ".";
    }
  }

  const identityPercentage = alignmentLength > 0 ? parseFloat(((identityCount / alignmentLength) * 100).toFixed(1)) : 0;
  const gapPercentage = alignmentLength > 0 ? parseFloat(((gapCount / alignmentLength) * 100).toFixed(1)) : 0;

  return {
    seqAId,
    seqBId,
    alignedSeqA: alignedA,
    alignedSeqB: alignedB,
    consensus,
    score: alignmentScore,
    identityCount,
    gapCount,
    identityPercentage,
    gapPercentage,
    alignmentLength,
    alignmentType: config.alignmentType,
  };
}

/**
 * Searches for biological motifs inside a sequence.
 * Relies on regex patterns.
 */
export function findMotifs(sequence: string): MotifMatch[] {
  const seq = sequence.toUpperCase();
  const motifs = [
    {
      name: "N-Glycosylation Site",
      pattern: "N[^P][ST][^P]",
      description: "Asn-Xaa-Ser/Thr consensus sequence where Xaa is not Pro. Vital for carbohydrate attachments.",
    },
    {
      name: "Protein Kinase C Phosphorylation Site",
      pattern: "[ST].[RK]",
      description: "Ser/Thr-Xaa-Arg/Lys motif targeting phosphorylation.",
    },
    {
      name: "Casein Kinase II Phosphorylation consensus",
      pattern: "[ST]..[DE]",
      description: "Ser/Thr-Xaa-Xaa-Asp/Glu motif targeting phosphorylation.",
    },
    {
      name: "Amidation Site",
      pattern: "G[RK][RK]",
      description: "Gly-Arg/Lys-Arg/Lys enzymatic amidation process.",
    },
    {
      name: "Proline-Rich Region",
      pattern: "P{3,}",
      description: "Three or more contiguous Prolines. Often involved in protein-protein interactions.",
    },
    {
      name: "Transmembrane Hydrophobic helix helix core (approx)",
      pattern: "[AILFVMWY]{9,}",
      description: "Continuous block of 9+ heavily hydrophobic residues, characteristic of transmembrane cores.",
    }
  ];

  const matches: MotifMatch[] = [];

  for (const m of motifs) {
    const rx = new RegExp(m.pattern, "g");
    let match;
    while ((match = rx.exec(seq)) !== null) {
      // Avoid infinite loops with 0-length matches
      if (match.index === rx.lastIndex) {
        rx.lastIndex++;
      }
      matches.push({
        name: m.name,
        pattern: m.pattern,
        start: match.index + 1, // 1-indexed for biologists
        end: match.index + match[0].length,
        sequence: match[0],
        description: m.description,
      });
    }
  }

  return matches;
}
