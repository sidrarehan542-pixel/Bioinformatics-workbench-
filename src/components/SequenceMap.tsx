import React, { useMemo, useState } from "react";
import { AlignmentResult, MotifMatch } from "../types";
import { findMotifs } from "../lib/alignment";
import { Info, Disc, Check, Sparkles, Sliders, ChevronDown, Activity } from "lucide-react";

interface SequenceMapProps {
  alignmentResult: AlignmentResult;
}

// Map motif names to standard high-contrast biological themes
const getMotifColorInfo = (motifName: string) => {
  const nameLower = motifName.toLowerCase();
  if (nameLower.includes("glycosylation")) {
    return {
      bg: "bg-emerald-500/15",
      hoverBg: "hover:bg-emerald-500/30",
      border: "border-emerald-500/60",
      text: "text-emerald-300",
      solidBg: "bg-emerald-600",
      color: "#10b981",
      badgeBg: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
    };
  }
  if (nameLower.includes("protein kinase")) {
    return {
      bg: "bg-blue-500/15",
      hoverBg: "hover:bg-blue-500/30",
      border: "border-blue-500/60",
      text: "text-blue-300",
      solidBg: "bg-blue-600",
      color: "#3b82f6",
      badgeBg: "bg-blue-950/80 text-blue-300 border-blue-800/80",
    };
  }
  if (nameLower.includes("casein kinase")) {
    return {
      bg: "bg-violet-500/15",
      hoverBg: "hover:bg-violet-500/30",
      border: "border-violet-500/60",
      text: "text-violet-300",
      solidBg: "bg-violet-600",
      color: "#8b5cf6",
      badgeBg: "bg-violet-950/80 text-violet-300 border-violet-800/80",
    };
  }
  if (nameLower.includes("amidation")) {
    return {
      bg: "bg-fuchsia-500/15",
      hoverBg: "hover:bg-fuchsia-500/30",
      border: "border-fuchsia-500/60",
      text: "text-fuchsia-300",
      solidBg: "bg-fuchsia-600",
      color: "#d946ef",
      badgeBg: "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-800/80",
    };
  }
  if (nameLower.includes("proline")) {
    return {
      bg: "bg-amber-500/15",
      hoverBg: "hover:bg-amber-500/30",
      border: "border-amber-500/60",
      text: "text-amber-300",
      solidBg: "bg-amber-655",
      color: "#f59e0b",
      badgeBg: "bg-amber-950/80 text-amber-300 border-amber-800/80",
    };
  }
  if (nameLower.includes("transmembrane") || nameLower.includes("hydrophobic")) {
    return {
      bg: "bg-orange-500/15",
      hoverBg: "hover:bg-orange-500/30",
      border: "border-orange-500/60",
      text: "text-orange-300",
      solidBg: "bg-orange-600",
      color: "#f97316",
      badgeBg: "bg-orange-950/80 text-orange-300 border-orange-850/80",
    };
  }
  return {
    bg: "bg-cyan-500/15",
    hoverBg: "hover:bg-cyan-500/30",
    border: "border-cyan-500/60",
    text: "text-cyan-300",
    solidBg: "bg-cyan-600",
    color: "#06b6d4",
    badgeBg: "bg-cyan-950/80 text-cyan-300 border-cyan-800/80",
  };
};

export const SequenceMap: React.FC<SequenceMapProps> = ({ alignmentResult }) => {
  // Extract unaligned sequences to run the Prosite pattern scanning independently
  const rawSeqA = useMemo(() => alignmentResult.alignedSeqA.replace(/-/g, ""), [alignmentResult.alignedSeqA]);
  const rawSeqB = useMemo(() => alignmentResult.alignedSeqB.replace(/-/g, ""), [alignmentResult.alignedSeqB]);

  // Scan motifs
  const motifsA = useMemo(() => findMotifs(rawSeqA), [rawSeqA]);
  const motifsB = useMemo(() => findMotifs(rawSeqB), [rawSeqB]);

  // Record 0-based aligned character indices corresponding to original indexes
  const indicesA = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < alignmentResult.alignedSeqA.length; i++) {
      if (alignmentResult.alignedSeqA[i] !== "-") {
        indices.push(i);
      }
    }
    return indices;
  }, [alignmentResult.alignedSeqA]);

  const indicesB = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < alignmentResult.alignedSeqB.length; i++) {
      if (alignmentResult.alignedSeqB[i] !== "-") {
        indices.push(i);
      }
    }
    return indices;
  }, [alignmentResult.alignedSeqB]);

  // Map unaligned motifs to standard global alignment indices
  const alignedMotifsA = useMemo(() => {
    return motifsA.map((mot) => {
      const startIdx = indicesA[mot.start - 1];
      const endIdx = indicesA[mot.end - 1];
      return {
        ...mot,
        alignedStart: startIdx,
        alignedEnd: endIdx,
      };
    }).filter((m) => m.alignedStart !== undefined && m.alignedEnd !== undefined);
  }, [motifsA, indicesA]);

  const alignedMotifsB = useMemo(() => {
    return motifsB.map((mot) => {
      const startIdx = indicesB[mot.start - 1];
      const endIdx = indicesB[mot.end - 1];
      return {
        ...mot,
        alignedStart: startIdx,
        alignedEnd: endIdx,
      };
    }).filter((m) => m.alignedStart !== undefined && m.alignedEnd !== undefined);
  }, [motifsB, indicesB]);

  // All detected active categories list for toggle filters
  const allDetectedNames = useMemo(() => {
    const s = new Set<string>();
    alignedMotifsA.forEach((m) => s.add(m.name));
    alignedMotifsB.forEach((m) => s.add(m.name));
    return Array.from(s);
  }, [alignedMotifsA, alignedMotifsB]);

  // Filter toggles state (empty means all are enabled by default)
  const [disabledMotifs, setDisabledMotifs] = useState<Record<string, boolean>>({});
  // Selected detail motif to show side-by-side comparison in the Inspector
  const [selectedInspect, setSelectedInspect] = useState<{
    motif: MotifMatch & { alignedStart: number; alignedEnd: number };
    sequence: "A" | "B";
  } | null>(null);

  // Helper checking if a motif should be rendered
  const isMotifEnabled = (name: string) => !disabledMotifs[name];

  const handleToggleMotif = (name: string) => {
    setDisabledMotifs((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  // Find selected active motif at candidate indices for characters grid matching
  const getActiveMotifAtAlignedIndex = (seq: "A" | "B", index: number) => {
    const motifs = seq === "A" ? alignedMotifsA : alignedMotifsB;
    return motifs.find(
      (m) => isMotifEnabled(m.name) && index >= m.alignedStart && index <= m.alignedEnd
    );
  };

  // Get corresponding motif on the other sequence that overlaps the current selected one to inspect conservation
  const getOverlappingPartnerMotif = useMemo(() => {
    if (!selectedInspect) return null;
    const { motif, sequence } = selectedInspect;
    const partnerSeq = sequence === "A" ? "B" : "A";
    const partnerMotifs = partnerSeq === "A" ? alignedMotifsA : alignedMotifsB;

    // Look for same motif type overlapping the alignment coordinates index
    return partnerMotifs.find(
      (m) =>
        m.name === motif.name &&
        Math.max(m.alignedStart, motif.alignedStart) <= Math.min(m.alignedEnd, motif.alignedEnd)
    );
  }, [selectedInspect, alignedMotifsA, alignedMotifsB]);

  // Generate chunks/pages of length 50 for scientific visual sequence layout
  const wrapSize = 50;
  const totalLength = alignmentResult.alignmentLength;
  const chunkOffsets = useMemo(() => {
    const offsets: number[] = [];
    for (let i = 0; i < totalLength; i += wrapSize) {
      offsets.push(i);
    }
    return offsets;
  }, [totalLength]);

  const totalMotifsCount = alignedMotifsA.length + alignedMotifsB.length;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 mt-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Activity className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest block">Comparative Visualization</span>
              <h4 className="text-sm font-bold text-slate-100 mt-0.5">Graphical Alignment Sequence Map</h4>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Correlates local functional Prosite signatures onto international coordinates of the global comparison. Tap nodes to audit residue-level changes.
          </p>
        </div>

        {/* Mini stats counters */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 border border-slate-850 rounded px-2.5 py-1 text-center min-w-[80px]">
            <span className="text-[8px] text-slate-500 uppercase block font-black">Detected Motifs</span>
            <span className="text-xs font-mono font-black text-indigo-400">{totalMotifsCount}</span>
          </div>
          <div className="bg-slate-950 border border-slate-850 rounded px-2.5 py-1 text-center min-w-[80px]">
            <span className="text-[8px] text-slate-500 uppercase block font-black">Distinct Types</span>
            <span className="text-xs font-mono font-black text-amber-500">{allDetectedNames.length}</span>
          </div>
        </div>
      </div>

      {allDetectedNames.length === 0 ? (
        <div className="p-4 bg-slate-950 border border-slate-850 rounded-lg text-center text-xs text-slate-500 italic">
          No functional Prosite active sites resolved in either of the candidate sequences to represent.
        </div>
      ) : (
        <>
          {/* Legend and Filter checkboxes */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-indigo-400" /> Active Motif Filters
            </span>
            <div className="flex flex-wrap gap-2">
              {allDetectedNames.map((name) => {
                const isEnabled = isMotifEnabled(name);
                const colors = getMotifColorInfo(name);
                return (
                  <button
                    key={name}
                    onClick={() => handleToggleMotif(name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border transition-all select-none ${
                      isEnabled
                        ? `${colors.badgeBg} ring-1 ring-slate-800`
                        : "bg-slate-950 border-slate-900 text-slate-600 line-through"
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isEnabled ? colors.color : "#475569" }}
                    />
                    <span>{name}</span>
                    {isEnabled && <Check className="w-2.5 h-2.5 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Graphical Overview Map */}
          <div className="flex flex-col gap-4 bg-slate-950/70 p-4 border border-slate-850 rounded-lg">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
              Whole Genome Alignment Map Overview ({totalLength} residues)
            </span>

            <div className="flex flex-col gap-4">
              {/* Candidate A Track */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="font-extrabold text-blue-400 flex items-center gap-1">
                    <Disc className="w-2.5 h-2.5 text-blue-500" />
                    Cand_A: {alignmentResult.seqAId}
                  </span>
                  <span className="text-slate-500 font-bold">{rawSeqA.length} aa</span>
                </div>
                {/* Visual Track container */}
                <div className="relative h-6 bg-slate-900 border border-slate-800/80 rounded-md">
                  {/* Subtle ticks */}
                  <div className="absolute inset-0 flex justify-between px-2 text-[8px] font-mono text-slate-700 pointer-events-none select-none items-center">
                    <span>1</span>
                    <span>{Math.floor(totalLength / 2)}</span>
                    <span>{totalLength}</span>
                  </div>

                  {/* Active Motifs Blocks in A */}
                  {alignedMotifsA.map((mot, idx) => {
                    if (!isMotifEnabled(mot.name)) return null;
                    const colors = getMotifColorInfo(mot.name);
                    const left = (mot.alignedStart / totalLength) * 100;
                    const width = ((mot.alignedEnd - mot.alignedStart + 1) / totalLength) * 100;

                    const isSelected = selectedInspect?.motif.alignedStart === mot.alignedStart && selectedInspect?.sequence === "A";

                    return (
                      <button
                        key={`mot-a-${idx}`}
                        className={`absolute h-4 top-1 rounded border text-[8px] font-mono flex items-center justify-center font-extrabold px-1 transition-all hover:scale-[1.02] active:scale-95 text-ellipsis overflow-hidden whitespace-nowrap min-w-[8px] ${colors.bg} ${colors.border} ${colors.text} ${
                          isSelected ? "ring-2 ring-indigo-500/80 ring-offset-2 ring-offset-slate-950 shadow-lg scale-102" : ""
                        }`}
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(1.5, width)}%`,
                        }}
                        onClick={() => setSelectedInspect({ motif: mot, sequence: "A" })}
                        title={`${mot.name} (A): Pos ${mot.start}-${mot.end}`}
                      >
                        {width > 6 ? mot.name.split(" ")[0] : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Candidate B Track */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="font-extrabold text-purple-405 text-fuchsia-400 flex items-center gap-1">
                    <Disc className="w-2.5 h-2.5 text-fuchsia-500" />
                    Cand_B: {alignmentResult.seqBId}
                  </span>
                  <span className="text-slate-500 font-bold">{rawSeqB.length} aa</span>
                </div>
                {/* Visual Track container */}
                <div className="relative h-6 bg-slate-900 border border-slate-800/80 rounded-md">
                  {/* Subtle ticks */}
                  <div className="absolute inset-0 flex justify-between px-2 text-[8px] font-mono text-slate-700 pointer-events-none select-none items-center">
                    <span>1</span>
                    <span>{Math.floor(totalLength / 2)}</span>
                    <span>{totalLength}</span>
                  </div>

                  {/* Active Motifs Blocks in B */}
                  {alignedMotifsB.map((mot, idx) => {
                    if (!isMotifEnabled(mot.name)) return null;
                    const colors = getMotifColorInfo(mot.name);
                    const left = (mot.alignedStart / totalLength) * 100;
                    const width = ((mot.alignedEnd - mot.alignedStart + 1) / totalLength) * 100;

                    const isSelected = selectedInspect?.motif.alignedStart === mot.alignedStart && selectedInspect?.sequence === "B";

                    return (
                      <button
                        key={`mot-b-${idx}`}
                        className={`absolute h-4 top-1 rounded border text-[8px] font-mono flex items-center justify-center font-extrabold px-1 transition-all hover:scale-[1.02] active:scale-95 text-ellipsis overflow-hidden whitespace-nowrap min-w-[8px] ${colors.bg} ${colors.border} ${colors.text} ${
                          isSelected ? "ring-2 ring-indigo-500/80 ring-offset-2 ring-offset-slate-950 shadow-lg scale-102" : ""
                        }`}
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(1.5, width)}%`,
                        }}
                        onClick={() => setSelectedInspect({ motif: mot, sequence: "B" })}
                        title={`${mot.name} (B): Pos ${mot.start}-${mot.end}`}
                      >
                        {width > 6 ? mot.name.split(" ")[0] : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Inspection Dashboard */}
          {selectedInspect && (
            <div className="bg-indigo-950/20 border border-indigo-900/40 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-stretch shadow-md">
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">Active Motif Inspector</span>
                </div>
                <h4 className="text-xs font-black text-slate-100 flex items-center gap-2">
                  {selectedInspect.motif.name}{" "}
                  <span className="text-[10px] font-mono font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Source: Candidate {selectedInspect.sequence}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal mt-1">
                  {selectedInspect.motif.description}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 mt-2 bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                  <div>
                    <span className="text-slate-500 block">Original position:</span>
                    <strong className="text-slate-200">
                      Residues {selectedInspect.motif.start} - {selectedInspect.motif.end}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Aligned alignment range:</span>
                    <strong className="text-slate-200">
                      Col {selectedInspect.motif.alignedStart + 1} - {selectedInspect.motif.alignedEnd + 1}
                    </strong>
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <span className="text-slate-500 block">Recognition pattern:</span>
                    <strong className="text-slate-300 font-bold bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-[8px]">
                      {selectedInspect.motif.pattern}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Side-by-side Motif Seq comparative Alignment */}
              <div className="w-full md:w-80 bg-slate-950 p-3 rounded-xl border border-indigo-950/40 flex flex-col gap-2.5 justify-center">
                <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-wider block">Sequence Conservation Audit</span>
                
                {(() => {
                  const sStart = selectedInspect.motif.alignedStart;
                  const sEnd = selectedInspect.motif.alignedEnd;
                  
                  // Cut sub-slices from aligned sequences to represent
                  const segmentA = alignmentResult.alignedSeqA.slice(sStart, sEnd + 1);
                  const segmentB = alignmentResult.alignedSeqB.slice(sStart, sEnd + 1);
                  const segmentConsensus = alignmentResult.consensus.slice(sStart, sEnd + 1);

                  // Count similarities
                  let matchCount = 0;
                  for (let i = 0; i < segmentA.length; i++) {
                    if (segmentA[i] === segmentB[i] && segmentA[i] !== "-") matchCount++;
                  }
                  
                  return (
                    <div className="flex flex-col gap-2">
                      <div className="font-mono text-xs p-2 bg-slate-900 border border-slate-850/80 rounded flex flex-col leading-relaxed justify-center">
                        <div className="flex justify-between">
                          <span className="text-blue-400 font-extrabold">Cand A:</span>
                          <span className="text-slate-300 font-black tracking-widest">{segmentA}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-850/40 my-0.5 pt-0.5">
                          <span className="text-slate-500">Match:</span>
                          <span className="text-slate-550 font-semibold tracking-widest">{segmentConsensus}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-850/40 pt-0.5">
                          <span className="text-fuchsia-400 font-extrabold">Cand B:</span>
                          <span className="text-slate-300 font-black tracking-widest">{segmentB}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-mono">
                          Conservation: {(matchCount / segmentA.length * 100).toFixed(0)}%
                        </span>
                        
                        {/* Dynamic interpretation */}
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                          matchCount === segmentA.length
                            ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                            : matchCount > 0
                              ? "bg-amber-950/40 border-amber-500/30 text-amber-400"
                              : "bg-red-950/40 border-red-500/30 text-red-400"
                        }`}>
                          {matchCount === segmentA.length ? "Fully Conserved" : matchCount > 0 ? "Partially Mutated" : "Atypical / Disorganized"}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={() => setSelectedInspect(null)}
                  className="w-full py-1 text-[9px] bg-slate-900 border border-slate-800 hover:text-red-300 text-slate-500 font-bold transition-all rounded hover:bg-slate-850"
                >
                  Close Audit Panel
                </button>
              </div>
            </div>
          )}

          {/* Block-by-block residue-level Alignment Sequence Grid */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Residue-Level Comparative Alignment Core
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Blocks of {wrapSize} residues</span>
            </div>

            <div className="bg-slate-950/90 border border-slate-850 rounded-xl p-4 flex flex-col gap-6 font-mono text-[11px] overflow-x-auto max-w-full">
              {chunkOffsets.map((offset) => {
                const limit = Math.min(offset + wrapSize, totalLength);
                
                // Indices headers sequence
                const ticks: React.ReactNode[] = [];
                for (let i = offset; i < limit; i++) {
                  if ((i + 1) % 10 === 0 || i === offset || i === limit - 1) {
                    ticks.push(
                      <span
                        key={`tick-${i}`}
                        className="absolute text-[8px] text-slate-650 font-black"
                        style={{
                          left: `${((i - offset) / wrapSize) * 100}%`,
                          transform: "translateX(-25%)",
                        }}
                      >
                        {i + 1}
                      </span>
                    );
                  }
                }

                return (
                  <div key={`block-offset-${offset}`} className="flex flex-col gap-1 border-b border-slate-900 pb-3 last:border-0 last:pb-0">
                    {/* Tick labels header */}
                    <div className="relative h-4 mb-1 select-none pointer-events-none w-full">
                      <div className="w-[85px] inline-block"></div>
                      <div className="relative inline-block w-[calc(100%-85px)] h-full">
                        {ticks}
                      </div>
                    </div>

                    {/* Candidate A Row */}
                    <div className="flex items-center w-full">
                      <span className="w-[85px] text-blue-450 font-extrabold text-[10px] truncate text-blue-400 shrink-0 select-none">
                        Cand_A:
                      </span>
                      <div className="flex-1 flex justify-between w-full">
                        {Array.from(alignmentResult.alignedSeqA.slice(offset, limit)).map((char, charIdx) => {
                          const absIdx = offset + charIdx;
                          const activeMotif = getActiveMotifAtAlignedIndex("A", absIdx);
                          const isConserved = alignmentResult.consensus[absIdx] === char;
                          
                          let cellStyle = "text-slate-350 bg-transparent";
                          if (char === "-") {
                            cellStyle = "text-slate-650 bg-slate-900/30";
                          } else if (activeMotif) {
                            const colors = getMotifColorInfo(activeMotif.name);
                            cellStyle = `${colors.bg} ${colors.border} ${colors.text} border-b-2 font-black`;
                          } else if (isConserved) {
                            cellStyle = "text-slate-200";
                          }

                          const inspectThis = () => {
                            if (activeMotif) setSelectedInspect({ motif: activeMotif, sequence: "A" });
                          };

                          return (
                            <span
                              key={`ca-${absIdx}`}
                              onClick={inspectThis}
                              className={`flex-1 text-center font-mono py-0.5 tracking-tight font-black select-all transition-all duration-100 ${cellStyle} ${
                                activeMotif ? "cursor-help hover:brightness-130 scale-102 border-t border-x border-slate-800/20" : ""
                              }`}
                              title={activeMotif ? `${activeMotif.name} (A): Pos ${activeMotif.start}-${activeMotif.end}. Tap to inspect.` : undefined}
                            >
                              {char}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Consensus Indicator Row */}
                    <div className="flex items-center w-full select-none pointer-events-none text-slate-600">
                      <span className="w-[85px] text-[10px] truncate shrink-0">
                        Consensus:
                      </span>
                      <div className="flex-1 flex justify-between w-full">
                        {Array.from(alignmentResult.consensus.slice(offset, limit)).map((char, charIdx) => {
                          const absIdx = offset + charIdx;
                          const hasMatch = char === "|";
                          const hasPartial = char === "+";
                          
                          return (
                            <span
                              key={`co-${absIdx}`}
                              className={`flex-1 text-center font-black py-0.5 tracking-tight ${
                                hasMatch ? "text-emerald-500/80" : hasPartial ? "text-slate-500" : "text-transparent"
                              }`}
                            >
                              {char}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Candidate B Row */}
                    <div className="flex items-center w-full">
                      <span className="w-[85px] text-fuchsia-450 font-extrabold text-[10px] truncate text-fuchsia-400 shrink-0 select-none">
                        Cand_B:
                      </span>
                      <div className="flex-1 flex justify-between w-full">
                        {Array.from(alignmentResult.alignedSeqB.slice(offset, limit)).map((char, charIdx) => {
                          const absIdx = offset + charIdx;
                          const activeMotif = getActiveMotifAtAlignedIndex("B", absIdx);
                          const isConserved = alignmentResult.consensus[absIdx] === char;
                          
                          let cellStyle = "text-slate-350 bg-transparent";
                          if (char === "-") {
                            cellStyle = "text-slate-655 bg-slate-900/30";
                          } else if (activeMotif) {
                            const colors = getMotifColorInfo(activeMotif.name);
                            cellStyle = `${colors.bg} ${colors.border} ${colors.text} border-b-2 font-black`;
                          } else if (isConserved) {
                            cellStyle = "text-slate-200";
                          }

                          const inspectThis = () => {
                            if (activeMotif) setSelectedInspect({ motif: activeMotif, sequence: "B" });
                          };

                          return (
                            <span
                              key={`cb-${absIdx}`}
                              onClick={inspectThis}
                              className={`flex-1 text-center font-mono py-0.5 tracking-tight font-black select-all transition-all duration-100 ${cellStyle} ${
                                activeMotif ? "cursor-help hover:brightness-130 scale-102 border-t border-x border-slate-800/20" : ""
                              }`}
                              title={activeMotif ? `${activeMotif.name} (B): Pos ${activeMotif.start}-${activeMotif.end}. Tap to inspect.` : undefined}
                            >
                              {char}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
