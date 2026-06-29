/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { AlignmentConfig, AlignmentResult } from "../types";
import {
  performSequenceAlignment,
  calculateMolecularWeight,
  calculateIsoelectricPoint,
  computeNetChargeAtPH
} from "../lib/alignment";

interface PhysPropsResult {
  mw: number;
  pi: number;
  length: number;
  aliphaticIndex: number;
  stabilizingResiduesPct: number;
  estimatedTm: number;
  thermalStatus: string;
  counts: { A: number; V: number; I: number; L: number; Y: number; W: number; R: number; E: number };
}

interface ComputePhysResult {
  physProps: PhysPropsResult;
  chargePoints: Array<{ pH: number; charge: number }>;
}

export function useBioWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingJobsRef = useRef<Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>>(new Map());
  const [workerSupported, setWorkerSupported] = useState<boolean>(false);

  // Initialize Web Worker with browser and environment feature checks
  useEffect(() => {
    if (typeof Worker === "undefined") {
      console.warn("Web Workers are not supported in this client environment. Falling back to main-thread execution.");
      return;
    }

    try {
      // Load Web Worker dynamically using Vite's URL-based worker constructor
      const worker = new Worker(
        new URL("../lib/bio.worker.ts", import.meta.url),
        { type: "module" }
      );

      // Handle worker response messages
      worker.onmessage = (event: MessageEvent) => {
        const { id, success, result, error } = event.data;
        const pending = pendingJobsRef.current.get(id);
        if (pending) {
          pendingJobsRef.current.delete(id);
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error || "Worker job failed"));
          }
        }
      };

      // Handle worker runtime errors
      worker.onerror = (errorEvent) => {
        console.error("BioHelix Web Worker experienced an internal error:", errorEvent);
      };

      workerRef.current = worker;
      setWorkerSupported(true);
      console.log("⚡ BioHelix background Web Worker initialized successfully.");
    } catch (err) {
      console.warn("Vite/Iframe sandbox environment blocked Web Worker construction. Activating synchronous fallback mode.", err);
      workerRef.current = null;
      setWorkerSupported(false);
    }

    // MEMORY LEAK PREVENTION: Terminate Web Worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        console.log("🛑 BioHelix Web Worker terminated to prevent memory leaks.");
      }
      pendingJobsRef.current.clear();
    };
  }, []);

  /**
   * Dispatches a job to the Web Worker or executes it synchronously as a fallback
   */
  const executeJob = useCallback(<T>(type: string, payload: any): Promise<T> => {
    // Generates a unique task ID
    const jobId = `${type}_${Math.random().toString(36).substring(2, 11)}`;

    if (workerSupported && workerRef.current) {
      return new Promise<T>((resolve, reject) => {
        pendingJobsRef.current.set(jobId, { resolve, reject });
        workerRef.current!.postMessage({ id: jobId, type, payload });
      });
    }

    // Synchronous execution fallback for sandbox iframe environments where Web Workers are disabled
    return new Promise<T>((resolve, reject) => {
      try {
        if (type === "ALIGN") {
          const { seqA, seqB, config, seqAId, seqBId } = payload;
          const result = performSequenceAlignment(seqA, seqB, config, seqAId, seqBId);
          resolve(result as unknown as T);
        } else if (type === "COMPUTE_PHYS") {
          const { seq } = payload;
          if (!seq) throw new Error("Empty sequence");

          const upperSeq = seq.toUpperCase();
          const counts = { A: 0, V: 0, I: 0, L: 0, Y: 0, W: 0, R: 0, E: 0 };
          let stabilizingResidues = 0;
          const stabilizingSet = new Set(["I", "V", "Y", "W", "R", "E", "L"]);

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

          const estimatedTm = 41.5 + (0.35 * aliphaticIndex);

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

          const chargePoints = [];
          for (let pH = 1; pH <= 14; pH++) {
            chargePoints.push({
              pH,
              charge: parseFloat(computeNetChargeAtPH(upperSeq, pH).toFixed(2))
            });
          }

          const result: ComputePhysResult = {
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

          resolve(result as unknown as T);
        } else {
          throw new Error(`Unknown job type: ${type}`);
        }
      } catch (err) {
        reject(err);
      }
    });
  }, [workerSupported]);

  /**
   * Run sequence alignment asynchronously via worker (or sync fallback)
   */
  const alignSeqAsync = useCallback((
    seqA: string,
    seqB: string,
    config: AlignmentConfig,
    seqAId?: string,
    seqBId?: string
  ): Promise<AlignmentResult> => {
    return executeJob<AlignmentResult>("ALIGN", { seqA, seqB, config, seqAId, seqBId });
  }, [executeJob]);

  /**
   * Compute physical and chemical properties asynchronously via worker (or sync fallback)
   */
  const computePhysAsync = useCallback((seq: string): Promise<ComputePhysResult> => {
    return executeJob<ComputePhysResult>("COMPUTE_PHYS", { seq });
  }, [executeJob]);

  return {
    alignSeqAsync,
    computePhysAsync,
    workerSupported
  };
}
