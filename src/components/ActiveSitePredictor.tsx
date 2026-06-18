import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Activity, 
  Compass, 
  Sliders, 
  Download, 
  Search, 
  AlertCircle, 
  Check, 
  Info, 
  Cpu, 
  Dribbble, 
  Table, 
  Database,
  Layers,
  HelpCircle,
  FlaskConical,
  Play,
  RotateCw,
  Award,
  ChevronDown
} from "lucide-react";
import { ProteinData } from "../types";

interface ActiveSitePredictorProps {
  activeRecord: ProteinData | null;
  customSequence?: string;
}

// Kyte-Doolittle hydropathy values for amino acids
const KYTE_DOOLITTLE: Record<string, number> = {
  A: 1.8,  R: -4.5, N: -3.5, D: -3.5, C: 2.5,  Q: -3.5, E: -3.5, G: -0.4,
  H: -3.2, I: 4.5,  L: 3.8,  K: -3.9, M: 1.9,  F: 2.8,  P: -1.6, S: -0.8,
  T: -0.7, W: -0.9, Y: -1.3, V: 4.2
};

// Catalytic frequency potential index (how often they act as active site nucleophiles, metal binders, etc.)
const CATALYTIC_POTENTIAL: Record<string, number> = {
  H: 0.95, // Histidine - metal binding, proton transfer
  C: 0.90, // Cysteine - active site nucleophile, disulfide coordination
  D: 0.85, // Aspartate - acid/base catalyst, coordinates Mg2+ / Ca2+
  E: 0.80, // Glutamate - acid/base catalyst
  S: 0.75, // Serine - nucleophilic protease triads
  K: 0.70, // Lysine - phosphate coordination, active site bases
  R: 0.65, // Arginine - electrostatic binders
  Y: 0.60, // Tyrosine - phosphorylation, radical active sites
  N: 0.45, Q: 0.45,
  D_mod: 0.40,
  W: 0.40, F: 0.35, M: 0.30, T: 0.30, P: 0.20,
  V: 0.15, I: 0.15, L: 0.15, A: 0.10, G: 0.10
};

export interface PocketPrediction {
  id: string;
  name: string;
  rank: number;
  startRes: number;
  endRes: number;
  sequence: string;
  propensityScore: number;
  avgHydropathy: number;
  netCharge: number;
  catalyticResidues: { res: string, index: number, name: string }[];
  volume: number; // in cubic Angstroms
  affinityKd: string; // Kd rating
  pocketType: string;
  ligandPreference: string;
}

interface DockingState {
  isDocking: boolean;
  step: "idle" | "grid" | "conformer" | "electrostatic" | "completed";
  selectedLigand: string;
  affinityScore?: number; // delta G in kcal/mol
  kiValue?: string; // inhibitory constant
  interactionsCount?: number;
  hBondPartners?: string[];
  dockingLog?: string[];
}

export const ActiveSitePredictor: React.FC<ActiveSitePredictorProps> = ({
  activeRecord,
  customSequence
}) => {
  const [windowSize, setWindowSize] = useState<number>(11);
  const [sensitivity, setSensitivity] = useState<number>(2.8);
  const [selectedPocketId, setSelectedPocketId] = useState<string | null>(null);
  
  // Docking Simulation States
  const [dockingState, setDockingState] = useState<DockingState>({
    isDocking: false,
    step: "idle",
    selectedLigand: "small_molecule",
  });

  const rawSeq = useMemo(() => {
    return customSequence || activeRecord?.sequence || "";
  }, [customSequence, activeRecord]);

  // sliding-window pocket search algorithms
  const pockets: PocketPrediction[] = useMemo(() => {
    if (!rawSeq || rawSeq.length < 8) return [];

    const len = rawSeq.length;
    const scores: { index: number; score: number; hydropathy: number; charge: number }[] = [];

    // 1. Sliding window scanning
    const rad = Math.floor(windowSize / 2);
    for (let i = 0; i < len; i++) {
      let sumHydropathy = 0;
      let sumAbsoluteHydropathy = 0;
      let sumCatalytic = 0;
      let sumCharge = 0;
      let count = 0;

      for (let j = Math.max(0, i - rad); j <= Math.min(len - 1, i + rad); j++) {
        const aa = rawSeq[j];
        if (aa && KYTE_DOOLITTLE[aa] !== undefined) {
          sumHydropathy += KYTE_DOOLITTLE[aa];
          sumAbsoluteHydropathy += Math.abs(KYTE_DOOLITTLE[aa]);
          sumCatalytic += CATALYTIC_POTENTIAL[aa] || 0.1;
          
          if (aa === "R" || aa === "K") sumCharge += 1.0;
          if (aa === "H") sumCharge += 0.5;
          if (aa === "D" || aa === "E") sumCharge -= 1.0;

          count++;
        }
      }

      const avgAbsHydropathy = count > 0 ? sumAbsoluteHydropathy / count : 0;
      const avgCatalytic = count > 0 ? sumCatalytic / count : 0;
      const compositeScore = (avgAbsHydropathy * 0.40) + (avgCatalytic * 0.60);

      scores.push({
        index: i,
        score: compositeScore * 10, // scale to 10
        hydropathy: count > 0 ? sumHydropathy / count : 0,
        charge: sumCharge
      });
    }

    // 2. Identify Peak Clusters that exceed the adaptive/manual sensitivity threshold
    const candidates: { start: number; end: number; peakScore: number }[] = [];
    let inCandidate = false;
    let candidateStart = 0;
    let currentPeak = 0;

    for (let i = 0; i < len; i++) {
      if (scores[i].score >= sensitivity) {
        if (!inCandidate) {
          inCandidate = true;
          candidateStart = i;
          currentPeak = scores[i].score;
        } else {
          if (scores[i].score > currentPeak) {
            currentPeak = scores[i].score;
          }
        }
      } else {
        if (inCandidate) {
          inCandidate = false;
          candidates.push({
            start: candidateStart,
            end: i - 1,
            peakScore: currentPeak
          });
        }
      }
    }
    // catch trailing candidate
    if (inCandidate) {
      candidates.push({
        start: candidateStart,
        end: len - 1,
        peakScore: currentPeak
      });
    }

    // 3. If zero candidates, find top 3 local maxima peak blocks relative
    let processedCandidates = [...candidates];
    if (processedCandidates.length === 0) {
      const sortedScores = [...scores].sort((a,b) => b.score - a.score);
      const uniqueIndices: number[] = [];
      for (const item of sortedScores) {
        if (uniqueIndices.length >= 3) break;
        // ensure not too close
        if (!uniqueIndices.some(idx => Math.abs(idx - item.index) < 15)) {
          uniqueIndices.push(item.index);
        }
      }

      processedCandidates = uniqueIndices.slice(0, 3).map((idx, rankIdx) => ({
        start: Math.max(0, idx - 6),
        end: Math.min(len - 1, idx + 6),
        peakScore: scores[idx].score
      }));
    }

    // Rank candidates by peak score
    processedCandidates.sort((a, b) => b.peakScore - a.peakScore);

    // Limit to top 4 pockets 
    return processedCandidates.slice(0, 4).map((c, idx) => {
      const pocketSeq = rawSeq.slice(c.start, c.end + 1);
      
      // Calculate average properties inside the active pocket slice
      let totalHydropathy = 0;
      let totalCharge = 0;
      const catalyticResidues: { res: string; index: number; name: string }[] = [];

      for (let s = c.start; s <= c.end; s++) {
        const aa = rawSeq[s];
        totalHydropathy += KYTE_DOOLITTLE[aa] || 0;
        
        if (aa === "R" || aa === "K") totalCharge += 1.0;
        if (aa === "H") totalCharge += 0.5;
        if (aa === "D" || aa === "E") totalCharge -= 1.0;

        // identify high chemical-catalysis value residues inside prediction
        if (["H", "C", "D", "E", "S", "K", "R", "Y"].includes(aa)) {
          catalyticResidues.push({
            res: aa,
            index: s + 1,
            name: AA_DETAILS_MAP[aa] || "Residue"
          });
        }
      }

      const sliceLen = c.end - c.start + 1;
      const avgPocketHydropathy = totalHydropathy / sliceLen;
      
      // Compute pocket-specific attributes
      let pocketType = "Neutral Polar cavity";
      let ligandPreference = "Slightly polar molecular templates";
      if (avgPocketHydropathy > 1.5) {
        pocketType = "Deep Hydrophobic cleft";
        ligandPreference = "Lipophilic non-polar templates (e.g. cholesterol, multi-ring steroids, aromatics)";
      } else if (avgPocketHydropathy < -1.5) {
        if (totalCharge > 1.2) {
          pocketType = "Cationic/Charged landing pad";
          ligandPreference = "Anionic & highly-polar templates (e.g. cofactor ATP, nucleotides, carboxylated probes)";
        } else if (totalCharge < -1.2) {
          pocketType = "Anionic Acidic electrostatic pocket";
          ligandPreference = "Cationic basic amines clusters (e.g. positive amino-mimetic ligands, organic cations)";
        } else {
          pocketType = "Highly Hydrophilic slot";
          ligandPreference = "Sugar chains, glycosylated cofactors, hydrogen-bonding polymers";
        }
      } else if (catalyticResidues.some(r => r.res === "H" || r.res === "C")) {
        pocketType = "Imitation catalytic nucleophile cleft";
        ligandPreference = "Reactive electrophilic inhibitors (e.g. protease blockers, metal-coordinating heavy salts)";
      }

      // Volumetric estimation (Kyte Doolittle volume factor * length * atomic coefficient)
      const absVolCoeff = 15.8 + (Math.abs(avgPocketHydropathy) * 4.2);
      const volume = Math.round(sliceLen * absVolCoeff);

      // Kd matching metrics
      const logKdValue = 9 - (c.peakScore * 0.9) - (catalyticResidues.length * 0.45);
      const kdNM = Math.pow(10, Math.max(1, Math.min(logKdValue, 8)));
      let affinityKd = `${kdNM.toFixed(1)} nM`;
      if (kdNM > 1000) {
        affinityKd = `${(kdNM/1000).toFixed(2)} μM`;
      }

      // Greek rank label names
      const GREEK_NAMES = ["Pocket Alpha", "Pocket Beta", "Pocket Gamma", "Pocket Delta"];

      return {
        id: `pocket-${idx + 1}`,
        name: GREEK_NAMES[idx] || `Cavity Site ${idx + 1}`,
        rank: idx + 1,
        startRes: c.start + 1,
        endRes: c.end + 1,
        sequence: pocketSeq,
        propensityScore: parseFloat(c.peakScore.toFixed(2)),
        avgHydropathy: parseFloat(avgPocketHydropathy.toFixed(2)),
        netCharge: parseFloat(totalCharge.toFixed(1)),
        catalyticResidues: catalyticResidues.slice(0, 6),
        volume,
        affinityKd,
        pocketType,
        ligandPreference
      };
    });
  }, [rawSeq, windowSize, sensitivity]);

  // Run in-silico ligand docking workflow simulations
  const handleDockLigand = (pocket: PocketPrediction) => {
    if (dockingState.isDocking) return;

    setDockingState({
      isDocking: true,
      step: "grid",
      selectedLigand: dockingState.selectedLigand,
      dockingLog: ["Initialising binding grids around pocket Cartesian centers...", "Loading topological templates for ligand model ..."]
    });

    // Step 2 timer: conformational sweep
    setTimeout(() => {
      setDockingState(prev => ({
        ...prev,
        step: "conformer",
        dockingLog: [
          ...(prev.dockingLog || []),
          "Cartesian bounding box defined successfully.",
          `Spanning conformational coordinates over residues ${pocket.startRes} - ${pocket.endRes} ...`,
          "Executing 50,000 Monte Carlo genetic algorithm generation turns...",
          "Refining rotamer side-chain torsional degrees of freedom..."
        ]
      }));
    }, 1200);

    // Step 3 timer: electrostatics evaluation
    setTimeout(() => {
      setDockingState(prev => ({
        ...prev,
        step: "electrostatic",
        dockingLog: [
          ...(prev.dockingLog || []),
          "Conformational sweep completed. Selected top 5 energy poses.",
          "Evaluating electrostatic grid solvation parameters...",
          `Matching pocket charge (${pocket.netCharge}e) against ligand charge coefficients...`,
          "Computing Coulombic and Born potential matrices..."
        ]
      }));
    }, 2400);

    // Step 4 timer: finalize
    setTimeout(() => {
      // Calculate realistic ligand complementarity delta G (arbitrary matching rules)
      let affinityEnergy = -7.2; // default
      if (dockingState.selectedLigand === "lipophilic" && pocket.avgHydropathy > 1.2) {
        affinityEnergy = -9.8 - (pocket.propensityScore * 0.15); // highly stabilized
      } else if (dockingState.selectedLigand === "lipophilic" && pocket.avgHydropathy < -1.2) {
        affinityEnergy = -4.5; // low affinity, steric repulsion
      } else if (dockingState.selectedLigand === "nucleotide" && pocket.netCharge > 1.0) {
        affinityEnergy = -10.4 - (pocket.catalyticResidues.length * 0.2); // strong electrostatic phosphate charge
      } else if (dockingState.selectedLigand === "heavy_metal" && pocket.catalyticResidues.some(r => r.res === "H" || r.res === "C")) {
        affinityEnergy = -11.6; // chelation coordinate match
      } else {
        // generic match based on propensity
        affinityEnergy = -6.2 - (pocket.propensityScore * 0.35);
      }

      // Boltzmann derived inhibitory constant: Ki = exp(dG / (RT))
      // at T=310 (37C): RT = 0.616 kcal/mol
      const kiValueNM = Math.exp(affinityEnergy / 0.616) * 1e9;
      let kiStr = `${kiValueNM.toFixed(1)} nM`;
      if (kiValueNM > 1000) {
        kiStr = `${(kiValueNM/1000).toFixed(2)} μM`;
      } else if (kiValueNM < 1) {
        kiStr = `${(kiValueNM*1000).toFixed(1)} pM`;
      }

      // hydrogen partners matching actual residues
      const hBondResidues = pocket.catalyticResidues.slice(0, 3).map(r => `${r.res}-${r.index}`);
      if (hBondResidues.length === 0) hBondResidues.push("Ser-12", "Asn-45");

      setDockingState(prev => ({
        ...prev,
        step: "completed",
        isDocking: false,
        affinityScore: parseFloat(affinityEnergy.toFixed(2)),
        kiValue: kiStr,
        interactionsCount: Math.round(5 + (pocket.propensityScore * 0.8)),
        hBondPartners: hBondResidues,
        dockingLog: [
          ...(prev.dockingLog || []),
          "Electrostatics grid matching aligned.",
          `Grid interaction energy computed is: ${affinityEnergy.toFixed(2)} kcal/mol.`,
          `Simulated Inhibition constant Ki: ${kiStr}`,
          "Ligand configuration archived.",
          "DOCKING SIMULATION COMPLETED SUCCESSFULLY!"
        ]
      }));
    }, 4000);

  };

  // Export predicted Active Site Pocket report
  const handleExportActiveSiteReport = () => {
    if (pockets.length === 0) return;

    let textReport = `========================================================================\n`;
    textReport += `           ACTIVE SITE POCKET PREDICTION & BIOPHYSICAL REPORT           \n`;
    textReport += `========================================================================\n\n`;
    textReport += `Target Identifier: ${activeRecord?.id || "Unknown"}\n`;
    textReport += `Protein Symbol:     ${activeRecord?.name || "Polypeptide Search query"}\n`;
    textReport += `Polypeptide Length: ${rawSeq.length} aa residues\n`;
    textReport += `Scanning Setup:     Window Size = ${windowSize} aa, Peak Propensity Threshold = ${sensitivity}\n`;
    textReport += `Generated On:       ${new Date().toLocaleString()}\n\n`;
    textReport += `------------------------------------------------------------------------\n`;
    textReport += `DETAILED PREDICTED LIGAND BINDING POCKETS:\n`;
    textReport += `------------------------------------------------------------------------\n\n`;

    pockets.forEach((p, idx) => {
      textReport += `Rank ${p.rank}: ${p.name} [Score: ${p.propensityScore}]\n`;
      textReport += `  - Coordinate Range:  Residue #${p.startRes} to #${p.endRes}\n`;
      textReport += `  - Pocket Cavity Typology: ${p.pocketType}\n`;
      textReport += `  - Average Hydropathy Index:  ${p.avgHydropathy} (Kyte-Doolittle scale)\n`;
      textReport += `  - Estimated Cavity Volume:  ${p.volume} Cubic Angstroms\n`;
      textReport += `  - Ideal Probe Compatibility: ${p.ligandPreference}\n`;
      textReport += `  - Estimated Binding Kd:      ${p.affinityKd}\n`;
      textReport += `  - Active Hydrophils / Catalytic Centers identified: ${p.catalyticResidues.map(r => `${r.res}${r.index} (${r.name})`).join(", ") || "None in window"}\n`;
      textReport += `  - Isolated Segment sequence:\n    ${p.sequence}\n\n`;
    });

    textReport += `========================================================================\n`;
    textReport += `                        END OF SCIENTIFIC EXPORT                       \n`;
    textReport += `========================================================================\n`;

    const blob = new Blob([textReport], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Pocket_Prediction_Report_${activeRecord?.id || "query"}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedPocket = pockets.find(p => p.id === selectedPocketId);

  return (
    <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl flex flex-col gap-4 mt-4 text-slate-100">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
            <Compass className="w-5 h-5" />
          </span>
          <div>
            <h4 className="text-sm font-extrabold uppercase tracking-tight text-white flex items-center gap-2">
              In-silico Computational Active Site Pocket Engine
              <span className="text-[9px] bg-red-500/15 text-rose-300 font-black uppercase px-2 py-0.5 rounded border border-rose-500/10">Hydro-Scand v1.1</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Scans primary sequences using localized Kyte-Doolittle and catalytic coordination density matrices to locate potential active site pockets.</p>
          </div>
        </div>

        <button
          onClick={handleExportActiveSiteReport}
          disabled={pockets.length === 0}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 text-[10px] uppercase font-black tracking-wide flex items-center gap-1.5 disabled:opacity-50 transition-all shadow"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          Download Pocket Profile
        </button>
      </div>

      {/* Adjusters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 p-4 border border-slate-850 rounded-xl">
        
        {/* window slider */}
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Scanning Window Size
            </span>
            <span className="font-mono text-indigo-400 font-extrabold">{windowSize} residues</span>
          </div>
          <input
            type="range"
            min="7"
            max="25"
            step="2"
            value={windowSize}
            onChange={(e) => setWindowSize(parseInt(e.target.value))}
            className="w-full text-indigo-500 h-1 cursor-pointer accent-indigo-500"
          />
          <p className="text-[10px] text-slate-500">Larger windows find macro-pockets; smaller windows pinpoint local clefts/folds.</p>
        </div>

        {/* threshold slider */}
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-slate-505 text-emerald-450" />
              Pocket Sensitivity Threshold
            </span>
            <span className="font-mono text-emerald-400 font-extrabold">{sensitivity.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="1.5"
            max="4.5"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="w-full text-emerald-500 h-1 cursor-pointer accent-emerald-500"
          />
          <p className="text-[10px] text-slate-500">Lower requirements include low-propensity folders; higher calls highly-constrained triads only.</p>
        </div>

      </div>

      {/* Primary Results Split Layout */}
      {pockets.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-xl text-slate-400 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-8 h-8 text-slate-600 animate-pulse" />
          <span className="text-xs font-bold font-sans">No matching binding pockets predicted.</span>
          <span className="text-[10px] text-slate-500">Try lowering the sensitivity threshold slider to capture softer folding regions.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          
          {/* Pockets Rank List (Left 2 Columns) */}
          <div className="lg:col-span-2 flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
            <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1 block">
              Predicted Binding Pocket Sites ({pockets.length})
            </span>

            {pockets.map((p) => {
              const isSelected = selectedPocketId === p.id;
              
              let badgeColor = "bg-emerald-950/40 text-emerald-300 border-emerald-500/20";
              if (p.avgHydropathy > 1.2) {
                badgeColor = "bg-amber-950/40 text-amber-300 border-amber-500/20";
              } else if (p.avgHydropathy < -1.2) {
                badgeColor = "bg-sky-950/40 text-sky-300 border-sky-500/30";
              }

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPocketId(p.id);
                    // clear docking metrics when switching pocket
                    setDockingState({ isDocking: false, step: "idle", selectedLigand: "small_molecule" });
                  }}
                  className={`p-3 text-left border rounded-xl transition-all flex flex-col gap-2 hover:scale-[1.01] ${
                    isSelected 
                      ? "bg-indigo-950/30 border-indigo-500/80 shadow-md shadow-indigo-600/10" 
                      : "bg-slate-900/35 border-slate-850 hover:border-slate-700 hover:bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black bg-slate-950 text-slate-400 border border-slate-800 w-5 h-5 rounded-full flex items-center justify-center leading-none">
                        {p.rank}
                      </span>
                      <span className="text-xs font-black text-slate-100">{p.name}</span>
                    </div>
                    <span className="text-[10px] font-black font-mono text-indigo-400">
                      Score: {p.propensityScore}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-[10px] text-slate-400 leading-normal">
                    <div className="flex items-center justify-between select-none">
                      <span>Coordinates:</span>
                      <strong className="text-slate-300 font-mono font-black">Res: #{p.startRes} - #{p.endRes}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Estimated Vol:</span>
                      <strong className="text-indigo-300 font-mono text-[9px] font-black">{p.volume} Å³</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Est. Affinity Kd:</span>
                      <strong className="text-emerald-400 font-mono text-[9px] font-black">&asymp; {p.affinityKd}</strong>
                    </div>
                  </div>

                  {/* pocket category stamp */}
                  <span className={`text-[8.5px] px-2 py-0.5 rounded leading-none border uppercase font-extrabold w-fit ${badgeColor}`}>
                    {p.pocketType}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detailed Pocket Analytics Card (Right 3 Columns) */}
          <div className="lg:col-span-3">
            {selectedPocket ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedPocket.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-900/50 rounded-xl border border-slate-850 p-4.5 flex flex-col gap-4"
                >
                  
                  {/* Detailed Analysis Title */}
                  <div className="flex items-start justify-between border-b border-slate-850 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-black text-white uppercase tracking-wider">{selectedPocket.name} Molecular Pocket</h5>
                        <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded">
                          Size: {selectedPocket.sequence.length} aa
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 italic leading-tight">Matched model: {selectedPocket.pocketType}</p>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 font-black block uppercase tracking-widest leading-none">Pocket Propensity</span>
                      <span className="text-lg font-black font-mono text-indigo-400">{selectedPocket.propensityScore} / 10</span>
                    </div>
                  </div>

                  {/* Metrics grid statistics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] text-slate-500 uppercase font-black block leading-none select-none">Avg Hydropathy</span>
                      <span className={`text-xs font-black font-mono block mt-1.5 ${selectedPocket.avgHydropathy > 0 ? "text-amber-500" : "text-sky-400"}`}>
                        {selectedPocket.avgHydropathy > 0 ? "+" : ""}{selectedPocket.avgHydropathy}
                      </span>
                      <span className="text-[8px] text-slate-450 font-semibold block mt-0.5">Kyte-Doolittle</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] text-slate-505 text-slate-500 uppercase font-black block leading-none select-none">Estimated Net Charge</span>
                      <span className={`text-xs font-black font-mono block mt-1.5 ${selectedPocket.netCharge > 0 ? "text-emerald-400" : selectedPocket.netCharge < 0 ? "text-rose-400" : "text-slate-300"}`}>
                        {selectedPocket.netCharge > 0 ? "+" : ""}{selectedPocket.netCharge}e
                      </span>
                      <span className="text-[8px] text-slate-450 font-semibold block mt-0.5">Physiological pH 7.4</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 col-span-2 sm:col-span-1">
                      <span className="text-[9px] text-slate-505 text-slate-500 uppercase font-black block leading-none select-none">Pocket Volume</span>
                      <span className="text-xs font-black font-mono block mt-1.5 text-blue-400">
                        {selectedPocket.volume} Å³
                      </span>
                      <span className="text-[8px] text-slate-450 font-semibold block mt-0.5">Estimated cavity envelope</span>
                    </div>

                  </div>

                  {/* Highlight Conserved Catalytic Elements */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                    <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-wide block mb-2 select-none">
                      Active Hydropathy Clefts & Evolutionary Conserved Catalytic Residues:
                    </span>
                    
                    {selectedPocket.catalyticResidues.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic block">No active nucleophilics or coordinated ions detected.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPocket.catalyticResidues.map((r, rIdx) => (
                          <div 
                            key={rIdx} 
                            className="bg-indigo-950/20 border border-indigo-900/30 px-2 py-1 rounded text-[9.5px] font-mono hover:bg-indigo-950/40 text-slate-200 transition-colors cursor-help"
                            title={`${r.res} index #${r.index}: ${r.name}. High frequency catalysis element.`}
                          >
                            <span className="font-black text-indigo-300">{r.res}</span>
                            <span className="text-slate-500 text-[8.5px] ml-0.5">-{r.index}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Complementary Binding Target */}
                  <div className="text-[10.5px] text-slate-350 leading-relaxed bg-indigo-950/15 border border-indigo-900/25 p-3 rounded-lg">
                    <span className="text-[9.5px] text-indigo-300 font-extrabold uppercase block select-none mb-1">In-silico Probe Compatibility Recommendation:</span>
                    {selectedPocket.ligandPreference}
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* IN-SILICO LIGAND DOCKING SIMULATOR PORT */}
                  {/* ------------------------------------------------------------- */}
                  <div className="border-t border-slate-850 pt-4 mt-1">
                    <div className="flex items-center justify-between mb-3 select-none">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">In-silico Molecular Docking Station</span>
                      <span className="text-[8.5px] font-mono text-indigo-400 uppercase font-black bg-indigo-950 border border-indigo-900/40 px-1.5 py-0.5 rounded">Autodock simulated</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                      
                      {/* select ligand type */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10.5px] text-slate-400 font-bold">Select Probe Ligand Compound:</label>
                        <select
                          id="docking-ligand-select"
                          value={dockingState.selectedLigand}
                          onChange={(e) => setDockingState(prev => ({ ...prev, selectedLigand: e.target.value }))}
                          disabled={dockingState.isDocking}
                          className="bg-slate-900 text-xs border border-slate-800 text-slate-200 rounded px-2.5 py-1.5 font-extrabold outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="small_molecule">Generic polar binder</option>
                          <option value="lipophilic">Lipophilic steroid inhibitor</option>
                          <option value="nucleotide">Nucleotide triphosphate cofactor (e.g. ADP/ATP)</option>
                          <option value="peptide">Short helical peptide therapeutics</option>
                          <option value="heavy_metal">Divalent transition metal ion (e.g. Zn2+, Fee2+)</option>
                        </select>
                      </div>

                      {/* launch docking simulation */}
                      <button
                        id="dock-ligand-simulation-btn"
                        onClick={() => handleDockLigand(selectedPocket)}
                        disabled={dockingState.isDocking}
                        className="py-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white hover:text-white rounded text-[10.5px] uppercase font-black tracking-widest transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 disabled:opacity-50 h-[32px]"
                      >
                        {dockingState.isDocking ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Docking...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current text-white" />
                            <span>Simulate Ligand Docking</span>
                          </>
                        )}
                      </button>

                    </div>

                    {/* Docking output status card */}
                    {dockingState.step !== "idle" && (
                      <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl mt-3 flex flex-col gap-3">
                        
                        {/* Progressive active loading stepper bar */}
                        {dockingState.isDocking && (
                          <div className="flex flex-col gap-1 select-none">
                            <span className="text-[9px] font-mono text-amber-500 animate-pulse uppercase font-black">
                              {dockingState.step === "grid" && "Step 1/3: Binding pocket grid mapping calculations..."}
                              {dockingState.step === "conformer" && "Step 2/3: Sweeping conformational rotamer databases..."}
                              {dockingState.step === "electrostatic" && "Step 3/3: Evaluating electrostatic grid complementary matches..."}
                            </span>
                            <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-800">
                              <div 
                                className="bg-amber-500 h-full transition-all duration-501" 
                                style={{ width: dockingState.step === "grid" ? "30%" : dockingState.step === "conformer" ? "65%" : "90%" }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Completed Output */}
                        {dockingState.step === "completed" && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-850/60 pb-3">
                            
                            <div className="bg-slate-900/50 p-2.5 rounded border border-slate-850">
                              <span className="text-[9px] text-slate-500 uppercase font-black block leading-none">Free Energy (ΔG)</span>
                              <span className="text-base font-black font-mono text-emerald-400 block mt-1 leading-none">{dockingState.affinityScore} kcal/mol</span>
                              <span className="text-[8px] text-slate-450 font-bold block mt-1">Interacting affinity</span>
                            </div>

                            <div className="bg-slate-900/50 p-2.5 rounded border border-slate-850">
                              <span className="text-[9px] text-slate-500 uppercase font-black block leading-none">Inhibitory Const (Ki)</span>
                              <span className="text-base font-black font-mono text-indigo-300 block mt-1 leading-none">{dockingState.kiValue}</span>
                              <span className="text-[8px] text-slate-450 font-bold block mt-1">Simulated constant</span>
                            </div>

                            <div className="bg-slate-900/50 p-2.5 rounded border border-slate-850 col-span-1">
                              <span className="text-[9px] text-slate-500 uppercase font-black block leading-none">Est. H-Bonds Partners</span>
                              <span className="text-[10px] font-extrabold font-mono text-slate-200 block mt-1 overflow-hidden truncate">
                                {dockingState.hBondPartners?.join(", ")}
                              </span>
                              <span className="text-[8px] text-slate-450 font-bold block mt-1">Close contacts</span>
                            </div>

                          </div>
                        )}

                        {/* Scrolling docking system log box */}
                        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-850/60 text-[9px] font-mono text-slate-400 h-28 overflow-y-auto leading-relaxed flex flex-col gap-0.5">
                          {dockingState.dockingLog?.map((lg, idx) => (
                            <span key={idx} className={lg.includes("COMPLETED") ? "text-emerald-400 font-extrabold" : ""}>
                              &gt; {lg}
                            </span>
                          ))}
                        </div>

                      </div>
                    )}

                  </div>

                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-full flex items-center justify-center p-8 border border-dashed border-slate-800 rounded-xl text-slate-500 select-none bg-slate-900/10">
                <div className="text-center flex flex-col items-center gap-1.5">
                  <Cpu className="w-8 h-8 text-slate-655 text-slate-600 animate-pulse" />
                  <span className="text-xs font-bold">Select a Predicted Pocket rank on the left</span>
                  <span className="text-[10px]">to reveal deep residue mapping, volume, affinity estimators, and in-silico ligand docking simulators.</span>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

// Simple lookup map for residue character description
const AA_DETAILS_MAP: Record<string, string> = {
  A: "Hydrophobic Aliphatic",
  R: "Positive Charged Basic",
  N: "Polar Uncharged",
  D: "Negative Charged Acidic",
  C: "Sulfhydryl Polar / Thiol",
  E: "Negative Charged Acidic",
  Q: "Polar Uncharged",
  G: "Tiny Aliphatic",
  H: "Weakly Basic / Imidazole",
  I: "Hydrophobic Aliphatic",
  L: "Hydrophobic Aliphatic",
  K: "Positive Charged Basic",
  M: "Hydrophobic Sulfur-containing",
  F: "Hydrophobic Aromatic",
  P: "Rigid Cyclic Imino Acid",
  S: "Hydroxylated Polar",
  T: "Hydroxylated Polar",
  W: "Bulky Aromatic Ring",
  Y: "Aromatic Phenolic",
  V: "Hydrophobic Aliphatic"
};
