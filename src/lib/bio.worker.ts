/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  performSequenceAlignment,
  calculateMolecularWeight,
  calculateIsoelectricPoint,
  computeNetChargeAtPH
} from "./alignment";

// Listen for messages from the main thread
self.onmessage = (event: MessageEvent) => {
  const { id, type, payload } = event.data;

  try {
    if (type === "ALIGN") {
      const { seqA, seqB, config, seqAId, seqBId } = payload;
      const result = performSequenceAlignment(seqA, seqB, config, seqAId, seqBId);
      self.postMessage({ id, success: true, result });
    } else if (type === "COMPUTE_PHYS") {
      const { seq } = payload;
      if (!seq) {
        throw new Error("Empty sequence provided");
      }

      // Exact counts for stability calculation
      const counts = { A: 0, V: 0, I: 0, L: 0, Y: 0, W: 0, R: 0, E: 0 };
      let stabilizingResidues = 0;
      const stabilizingSet = new Set(["I", "V", "Y", "W", "R", "E", "L"]);

      const upperSeq = seq.toUpperCase();
      for (const char of upperSeq) {
        if (char === "A") counts.A++;
        else if (char === "V") counts.V++;
        else if (char === "I") counts.I++;
        else if (char === "L") counts.L++;
        else if (char === "Y") counts.Y++;
        else if (char === "W") counts.W++;
        else if (char === "R") counts.R++;
        else if (char === "E") counts.E++;
        
        if (stabilizingSet.has(char)) {
          stabilizingResidues++;
        }
      }

      const L = upperSeq.length;
      const pAla = (counts.A / L) * 100;
      const pVal = (counts.V / L) * 100;
      const pIle = (counts.I / L) * 100;
      const pLeu = (counts.L / L) * 100;

      const aliphaticIndex = pAla + (2.9 * pVal) + (3.9 * (pIle + pLeu));
      const stabilizingResiduesPct = (stabilizingResidues / L) * 100;

      // Estimate melting temperature Tm (calibrated based on aliphatic packing model)
      const estimatedTm = 41.5 + (0.35 * aliphaticIndex);

      // Thermal stability classification label
      let thermalStatus = "Standard (Mesophilic)";
      if (aliphaticIndex > 115) {
        if (estimatedTm > 85) {
          thermalStatus = "Hyper-Thermostable (Extreme Extremophile)";
        } else {
          thermalStatus = "Highly Thermostable (Thermophile)";
        }
      } else if (aliphaticIndex > 85) {
        thermalStatus = "Stable (Moderate Thermophilic tolerance)";
      } else if (aliphaticIndex < 65) {
        thermalStatus = "Heat-Sensitive (Psychrophilic / Cold-adapted)";
      }

      const mw = calculateMolecularWeight(upperSeq);
      const pi = calculateIsoelectricPoint(upperSeq);

      // Titration curve points
      const chargePoints = [];
      for (let pH = 1; pH <= 14; pH++) {
        chargePoints.push({
          pH,
          charge: parseFloat(computeNetChargeAtPH(upperSeq, pH).toFixed(2))
        });
      }

      const result = {
        physProps: {
          mw,
          pi,
          length: L,
          aliphaticIndex: parseFloat(aliphaticIndex.toFixed(2)),
          stabilizingResiduesPct: parseFloat(stabilizingResiduesPct.toFixed(1)),
          estimatedTm: parseFloat(estimatedTm.toFixed(1)),
          thermalStatus,
          counts
        },
        chargePoints
      };

      self.postMessage({ id, success: true, result });
    } else {
      throw new Error(`Unknown job type: ${type}`);
    }
  } catch (err: any) {
    self.postMessage({
      id,
      success: false,
      error: err.message || String(err)
    });
  }
};
