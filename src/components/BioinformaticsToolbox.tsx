import React, { useState, useMemo, useEffect } from "react";
import { 
  Wrench, 
  Dna, 
  Scissors, 
  ArrowRightLeft, 
  FileCode, 
  Database, 
  Check, 
  Copy, 
  Activity, 
  Layers, 
  Cpu, 
  Network, 
  Binary, 
  ChevronRight, 
  Sparkles, 
  Bookmark, 
  RefreshCw, 
  Info,
  Sliders,
  Play
} from "lucide-react";
import { ProteinData } from "../types";

// Types for Bioinformatics Toolbox
type ToolboxTab = "overview" | "transcribe" | "translate" | "revcomp" | "codon" | "restriction";

interface BioinformaticsToolboxProps {
  activeRecord: ProteinData | null;
  onNavigateTab: (tab: "structure" | "physicochemical" | "bioprofiles" | "alignment" | "knowledge" | "toolkit") => void;
  onLoadCustomSequence: (seq: string, name?: string) => void;
}

// Genetic Code Codon Translation Tables
const GENETIC_CODES = [
  {
    id: "standard",
    name: "1. The Standard Code",
    table: {
      UUU: "F", UUC: "F", UUA: "L", UUG: "L", CUU: "L", CUC: "L", CUA: "L", CUG: "L",
      AUU: "I", AUC: "I", AUA: "I", AUG: "M", GUU: "V", GUC: "V", GUA: "V", GUG: "V",
      UCU: "S", UCC: "S", UCA: "S", UCG: "S", CCU: "P", CCC: "P", CCA: "P", CCG: "P",
      ACU: "T", ACC: "T", ACA: "T", ACG: "T", GCU: "A", GCC: "A", GCA: "A", GCG: "A",
      UAU: "Y", UAC: "Y", UAA: "*", UAG: "*", CAU: "H", CAC: "H", CAA: "Q", CAG: "Q",
      AAU: "N", AAC: "N", AAA: "K", AAG: "K", GAU: "D", GAC: "D", GAA: "E", GAG: "E",
      UGU: "C", UGC: "C", UGA: "*", UGG: "W", CGU: "R", CGC: "R", CGA: "R", CGG: "R",
      AGU: "S", AGC: "S", AGA: "R", AGG: "R", GGU: "G", GGC: "G", GGA: "G", GGG: "G"
    }
  },
  {
    id: "bacterial",
    name: "11. Bacterial, Archaeal & Plant Plastid",
    table: {
      UUU: "F", UUC: "F", UUA: "L", UUG: "L", CUU: "L", CUC: "L", CUA: "L", CUG: "L",
      AUU: "I", AUC: "I", AUA: "I", AUG: "M", GUU: "V", GUC: "V", GUA: "V", GUG: "V",
      UCU: "S", UCC: "S", UCA: "S", UCG: "S", CCU: "P", CCC: "P", CCA: "P", CCG: "P",
      ACU: "T", ACC: "T", ACA: "T", ACG: "T", GCU: "A", GCC: "A", GCA: "A", GCG: "A",
      UAU: "Y", UAC: "Y", UAA: "*", UAG: "*", CAU: "H", CAC: "H", CAA: "Q", CAG: "Q",
      AAU: "N", AAC: "N", AAA: "K", AAG: "K", GAU: "D", GAC: "D", GAA: "E", GAG: "E",
      UGU: "C", UGC: "C", UGA: "*", UGG: "W", CGU: "R", CGC: "R", CGA: "R", CGG: "R",
      AGU: "S", AGC: "S", AGA: "R", AGG: "R", GGU: "G", GGC: "G", GGA: "G", GGG: "G"
    },
    starts: ["AUG", "GUG", "UUG"] // alternative starts
  },
  {
    id: "yeast_mito",
    name: "3. Yeast Mitochondrial Code",
    table: {
      UUU: "F", UUC: "F", UUA: "L", UUG: "L", CUU: "T", CUC: "T", CUA: "T", CUG: "T",
      AUU: "I", AUC: "I", AUA: "M", AUG: "M", GUU: "V", GUC: "V", GUA: "V", GUG: "V",
      UCU: "S", UCC: "S", UCA: "S", UCG: "S", CCU: "P", CCC: "P", CCA: "P", CCG: "P",
      ACU: "T", ACC: "T", ACA: "T", ACG: "T", GCU: "A", GCC: "A", GCA: "A", GCG: "A",
      UAU: "Y", UAC: "Y", UAA: "*", UAG: "*", CAU: "H", CAC: "H", CAA: "Q", CAG: "Q",
      AAU: "N", AAC: "N", AAA: "K", AAG: "K", GAU: "D", GAC: "D", GAA: "E", GAG: "E",
      UGU: "C", UGC: "C", UGA: "W", UGG: "W", CGU: "R", CGC: "R", CGA: "R", CGG: "R",
      AGU: "S", AGC: "S", AGA: "R", AGG: "R", GGU: "G", GGC: "G", GGA: "G", GGG: "G"
    }
  }
];

// Codon usage frequencies for optimization (Optimal codon selection for each AA per host organism)
const CODON_BIAS_TABLES: Record<string, Record<string, string>> = {
  human: {
    A: "GCC", C: "TGC", D: "GAC", E: "GAG", F: "TTC", G: "GGC", H: "CAC", I: "ATC", 
    K: "AAG", L: "CTG", M: "ATG", N: "AAC", P: "CCC", Q: "CAG", R: "CGG", S: "AGC", 
    T: "ACC", V: "GTG", W: "TGG", Y: "TAC", "*": "TGA"
  },
  ecoli: {
    A: "GCG", C: "TGC", D: "GAC", E: "GAA", F: "TTC", G: "GGC", H: "CAC", I: "ATC", 
    K: "AAA", L: "CTG", M: "ATG", N: "AAC", P: "CCG", Q: "CAG", R: "CGT", S: "AGC", 
    T: "ACC", V: "GTG", W: "TGG", Y: "TAC", "*": "TAA"
  },
  yeast: {
    A: "GCT", C: "TGT", D: "GAT", E: "GAA", F: "TTT", G: "GGT", H: "CAT", I: "ATT", 
    K: "AAG", L: "TTG", M: "ATG", N: "AAC", P: "CCA", Q: "CAA", R: "AGA", S: "TCT", 
    T: "ACT", V: "GTT", W: "TGG", Y: "TAC", "*": "TAA"
  },
  arabidopsis: {
    A: "GCT", C: "TGT", D: "GAT", E: "GAG", F: "TTC", G: "GGT", H: "CAT", I: "ATT", 
    K: "AAG", L: "CTT", M: "ATG", N: "AAC", P: "CCA", Q: "CAA", R: "AGA", S: "TCT", 
    T: "ACT", V: "GTT", W: "TGG", Y: "TAC", "*": "TGA"
  }
};

// Restriction Enzymes
const RESTRICTION_ENZYMES = [
  { name: "EcoRI", sequence: "GAATTC", cutOffset: 1, color: "#ef4444" },
  { name: "BamHI", sequence: "GGATCC", cutOffset: 1, color: "#3b82f6" },
  { name: "HindIII", sequence: "AAGCTT", cutOffset: 1, color: "#10b981" },
  { name: "NotI", sequence: "GCGGCCGC", cutOffset: 2, color: "#a855f7" },
  { name: "XhoI", sequence: "CTCGAG", cutOffset: 1, color: "#f97316" },
  { name: "SacI", sequence: "GAGCTC", cutOffset: 5, color: "#eab308" },
  { name: "SmaI", sequence: "CCCGGG", cutOffset: 3, color: "#ec4899" }
];

export const BioinformaticsToolbox: React.FC<BioinformaticsToolboxProps> = ({
  activeRecord,
  onNavigateTab,
  onLoadCustomSequence
}) => {
  const [activeTab, setActiveTab] = useState<ToolboxTab>("overview");
  
  // Clipboard copied status
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Trigger feedback when copying
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 1800);
  };

  // State values for different utilities
  const [transcribeInput, setTranscribeInput] = useState<string>("");
  const [transcribeMode, setTranscribeMode] = useState<"transcribe" | "reverse">("transcribe");

  const [translateInput, setTranslateInput] = useState<string>("");
  const [geneticCodeId, setGeneticCodeId] = useState<string>("standard");
  const [readingFrame, setReadingFrame] = useState<number>(1); // +1, +2, +3

  const [revCompInput, setRevCompInput] = useState<string>("");

  const [codonInput, setCodonInput] = useState<string>("");
  const [codonTargetHost, setCodonTargetHost] = useState<string>("ecoli");

  const [restrictionInput, setRestrictionInput] = useState<string>("");
  const [selectedEnzymeIndex, setSelectedEnzymeIndex] = useState<number | null>(null);

  // Auto-fill states with active sequence if it exists
  const loadActiveSequence = (target: "transcribe" | "translate" | "revcomp" | "codon" | "restriction") => {
    const seq = activeRecord?.sequence || "";
    if (target === "transcribe") setTranscribeInput(seq);
    else if (target === "translate") setTranslateInput(seq);
    else if (target === "revcomp") setRevCompInput(seq);
    else if (target === "codon") setCodonInput(seq);
    else if (target === "restriction") setRestrictionInput(seq);
  };

  // Helper to sanitize sequences (removes whitespace, numbers, non-alphabetic chars)
  const sanitizeSeq = (str: string) => str.toUpperCase().replace(/[^A-Z*]/g, "");

  // Transcription utility output
  const transcriptionResult = useMemo(() => {
    const raw = sanitizeSeq(transcribeInput);
    if (!raw) return "";
    if (transcribeMode === "transcribe") {
      // replace T with U
      return raw.replace(/T/g, "U");
    } else {
      // replace U with T
      return raw.replace(/U/g, "T");
    }
  }, [transcribeInput, transcribeMode]);

  // Translation utility output
  const translationResult = useMemo(() => {
    const raw = sanitizeSeq(translateInput);
    if (!raw) return { peptide: "", mw: 0, count: 0, statHydro: 0 };

    const selectedCode = GENETIC_CODES.find(c => c.id === geneticCodeId) || GENETIC_CODES[0];
    const offset = Math.abs(readingFrame) - 1;
    let seqToTranslate = raw.substring(offset);

    // If negative reading frame, find reverse complement
    if (readingFrame < 0) {
      const compMap: Record<string, string> = { A: "T", T: "A", U: "A", G: "C", C: "G", N: "N" };
      const revCompStr = raw.split("").reverse().map(char => compMap[char] || char).join("");
      seqToTranslate = revCompStr.substring(offset);
    }

    // Translate codons
    let peptide = "";
    for (let i = 0; i < seqToTranslate.length - 2; i += 3) {
      const codon = seqToTranslate.substring(i, i + 3);
      if (codon.length === 3) {
        const aa = selectedCode.table[codon as keyof typeof selectedCode.table] || "X";
        peptide += aa;
      }
    }

    // Compute stats
    const cleanPeptide = peptide.replace(/[*X]/g, "");
    let mw = 0;
    const weights: Record<string, number> = {
      A: 89.1, R: 174.2, N: 132.1, D: 133.1, C: 121.2, E: 147.1, Q: 146.2, G: 75.1,
      H: 155.2, I: 131.2, L: 131.2, K: 146.2, M: 149.2, F: 165.2, P: 115.1, S: 105.1,
      T: 119.1, W: 204.2, Y: 181.2, V: 117.1
    };

    let hydroCount = 0;
    const hydrophobicAAs = ["I", "L", "V", "F", "M", "W", "A", "Y"];

    for (const char of cleanPeptide) {
      mw += (weights[char] || 110) - 18.02; // subtract water for peptide bond
      if (hydrophobicAAs.includes(char)) {
        hydroCount++;
      }
    }
    if (cleanPeptide.length > 0) mw += 18.02; // add terminal water

    const statHydro = cleanPeptide.length ? parseFloat(((hydroCount / cleanPeptide.length) * 100).toFixed(1)) : 0;

    return {
      peptide,
      mw: parseFloat((mw / 1000).toFixed(2)), // kDa
      count: peptide.length,
      statHydro
    };
  }, [translateInput, geneticCodeId, readingFrame]);

  // Reverse Complement utility output
  const reverseComplementResult = useMemo(() => {
    const raw = sanitizeSeq(revCompInput);
    if (!raw) return { rev: "", comp: "", revComp: "", gc: 0, tm: 0 };

    const complementary: Record<string, string> = { A: "T", T: "A", U: "A", G: "C", C: "G" };
    
    const compArray = raw.split("").map(c => complementary[c] || c);
    const comp = compArray.join("");
    const rev = raw.split("").reverse().join("");
    const revComp = compArray.reverse().join("");

    // Calculate GC content
    let gcCount = 0;
    let totalNuc = 0;
    for (const char of raw) {
      if (["G", "C"].includes(char)) gcCount++;
      if (["A", "T", "G", "C", "U"].includes(char)) totalNuc++;
    }
    const gc = totalNuc ? parseFloat(((gcCount / totalNuc) * 100).toFixed(1)) : 0;

    // Primer Melting Temp (Tm) calculation
    let tm = 0;
    if (totalNuc > 0) {
      const a = (raw.match(/A/g) || []).length;
      const t = (raw.match(/T/g) || []).length + (raw.match(/U/g) || []).length;
      const g = (raw.match(/G/g) || []).length;
      const c = (raw.match(/C/g) || []).length;

      if (totalNuc < 14) {
        tm = 2 * (a + t) + 4 * (g + c);
      } else {
        // Wallace / basic salt formula
        tm = 64.9 + 41 * (g + c - 16.4) / totalNuc;
      }
    }

    return {
      rev,
      comp,
      revComp,
      gc,
      tm: parseFloat(tm.toFixed(1))
    };
  }, [revCompInput]);

  // Codon optimization utility output
  const codonOptimizationResult = useMemo(() => {
    const raw = sanitizeSeq(codonInput);
    if (!raw) return { dna: "", codonCount: 0, gcContent: 0 };

    const biasTable = CODON_BIAS_TABLES[codonTargetHost] || CODON_BIAS_TABLES.ecoli;
    let dna = "";
    
    for (const char of raw) {
      const codon = biasTable[char] || "NNN";
      dna += codon;
    }

    // calculate GC of the generated sequence
    let gcCount = 0;
    for (const char of dna) {
      if (char === "G" || char === "C") gcCount++;
    }
    const gcContent = dna.length ? parseFloat(((gcCount / dna.length) * 100).toFixed(1)) : 0;

    return {
      dna,
      codonCount: raw.length,
      gcContent
    };
  }, [codonInput, codonTargetHost]);

  // Restriction enzyme site analysis
  const restrictionResult = useMemo(() => {
    const raw = sanitizeSeq(restrictionInput);
    if (!raw) return [];

    const hits: Array<{ enzyme: string; sequence: string; start: number; end: number; color: string }> = [];
    
    RESTRICTION_ENZYMES.forEach(enzyme => {
      let pos = raw.indexOf(enzyme.sequence);
      while (pos !== -1) {
        hits.push({
          enzyme: enzyme.name,
          sequence: enzyme.sequence,
          start: pos + 1,
          end: pos + enzyme.sequence.length,
          color: enzyme.color
        });
        pos = raw.indexOf(enzyme.sequence, pos + 1);
      }
    });

    // sort hits by start coordinate
    return hits.sort((a, b) => a.start - b.start);
  }, [restrictionInput]);

  // Handle loading custom sequence into the primary active record
  const handleLoadCustomSeqToWorkspace = (seq: string, type: string) => {
    if (!seq) return;
    onLoadCustomSequence(seq, `Custom ${type} Result`);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full min-h-0 bg-slate-900 border-t border-slate-800">
      
      {/* Sub-tab Sidebar Navigation */}
      <div className="w-full lg:w-56 shrink-0 bg-slate-950 border-r border-slate-800 p-3 flex flex-col gap-1 overflow-y-auto font-sans">
        <div className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 mb-2">
          TOOLBOX SELECTOR
        </div>
        
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between text-left ${
            activeTab === "overview"
              ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <Wrench className="w-4 h-4 shrink-0" />
            Tools Directory Hub
          </span>
          <ChevronRight className="w-3 h-3 text-slate-500" />
        </button>

        <button
          onClick={() => setActiveTab("transcribe")}
          className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between text-left ${
            activeTab === "transcribe"
              ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 shrink-0" />
            DNA/RNA Transcriber
          </span>
          <ChevronRight className="w-3 h-3 text-slate-500" />
        </button>

        <button
          onClick={() => setActiveTab("translate")}
          className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between text-left ${
            activeTab === "translate"
              ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <Dna className="w-4 h-4 shrink-0" />
            Protein Translation
          </span>
          <ChevronRight className="w-3 h-3 text-slate-500" />
        </button>

        <button
          onClick={() => setActiveTab("revcomp")}
          className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between text-left ${
            activeTab === "revcomp"
              ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 shrink-0" />
            Reverse Complement
          </span>
          <ChevronRight className="w-3 h-3 text-slate-500" />
        </button>

        <button
          onClick={() => setActiveTab("codon")}
          className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between text-left ${
            activeTab === "codon"
              ? "bg-amber-600/10 text-amber-400 border border-amber-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <FileCode className="w-4 h-4 shrink-0" />
            Codon Optimization
          </span>
          <ChevronRight className="w-3 h-3 text-slate-500" />
        </button>

        <button
          onClick={() => setActiveTab("restriction")}
          className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between text-left ${
            activeTab === "restriction"
              ? "bg-rose-600/10 text-rose-400 border border-rose-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <Scissors className="w-4 h-4 shrink-0" />
            Restriction Mapper
          </span>
          <ChevronRight className="w-3 h-3 text-slate-500" />
        </button>

        {activeRecord && (
          <div className="mt-auto p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-400 leading-normal">
            <span className="font-extrabold uppercase text-indigo-400 block mb-1">Active Sequence Loaded</span>
            <div className="font-mono text-slate-200 truncate">{activeRecord.name}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">Len: {activeRecord.sequence.length} residues</div>
          </div>
        )}
      </div>

      {/* Main Toolkit Sub-panel stage */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 min-w-0">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-md font-extrabold text-indigo-400 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-400" />
                Universal Bioinformatics Toolbox & Launches Directory
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Select any custom sequence analysis utility below or launch core workbench modules with your loaded active bio-sequence.
              </p>
            </div>

            {/* Part 1: Interactive Utilities (Implemented right here!) */}
            <div>
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-3">
                INTEGRATED MOLECULAR UTILITIES
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                <div className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-blue-600/10 text-blue-400 border border-blue-500/10">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-slate-100">DNA/RNA Transcriber</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      Seamlessly transcribe nucleotide sequence blocks (replace T with U) or reverse-transcribe RNA sequences (replace U with T) with single-click conversions.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("transcribe")}
                    className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Open Utility <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-purple-600/10 text-purple-400 border border-purple-500/10">
                        <Dna className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-slate-100">Protein Translation</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      Translate DNA or RNA codons into biological peptide sequences. Supports multiple classic codon tables and alternative reading frames.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("translate")}
                    className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Open Utility <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-emerald-600/10 text-emerald-400 border border-emerald-500/10">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-slate-100">Reverse Complement</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      Calculate Reverse, Complement, or Reverse-Complement strands. Displays exact GC-content ratios and primer Melting Temperature estimations.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("revcomp")}
                    className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Open Utility <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-amber-600/10 text-amber-400 border border-amber-500/10">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-slate-100">Codon Optimizer</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      Optimize codons of structural protein sequences for maximum heterologous expression in model hosts (E. coli, Yeast, Human) using bias distributions.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("codon")}
                    className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Open Utility <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-rose-600/10 text-rose-400 border border-rose-500/10">
                        <Scissors className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-slate-100">Restriction Mapper</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      Map critical endonucleolytic cleavage coordinates for classical enzymes (EcoRI, BamHI, HindIII, NotI, etc.) with a live interactive SVG restriction site grid.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("restriction")}
                    className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Open Utility <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </div>

            {/* Part 2: Quick Launchpad to core workbench tabs */}
            <div>
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-3">
                WORKBENCH MODULES DIRECTORY
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                <div className="p-4 bg-slate-950/20 border border-slate-850 hover:border-slate-800 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-indigo-600/10 text-indigo-400 border border-indigo-500/10">
                        <Layers className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-indigo-300">3D Structure Canvas</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      View atomic spatial models mapped directly from structural PDB codes or AlphaFold coordinates in a highly interactive three-dimensional stage.
                    </p>
                  </div>
                  <button 
                    onClick={() => onNavigateTab("structure")}
                    className="w-full mt-2 py-1.5 bg-indigo-950/25 hover:bg-indigo-950/40 border border-indigo-900/40 text-indigo-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Launch Structure Viewer <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 bg-slate-950/20 border border-slate-850 hover:border-slate-800 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-blue-600/10 text-blue-400 border border-blue-500/10">
                        <Activity className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-blue-300">Physicochemical Profiling</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      Graph exact net charge curves against pH coordinates. Calculates exact sequence isoelectric point (pI), weights, pH profiles, and melting transitions.
                    </p>
                  </div>
                  <button 
                    onClick={() => onNavigateTab("physicochemical")}
                    className="w-full mt-2 py-1.5 bg-blue-950/25 hover:bg-blue-950/40 border border-blue-900/40 text-blue-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Launch Profiler <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 bg-slate-950/20 border border-slate-850 hover:border-slate-800 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-emerald-600/10 text-emerald-400 border border-emerald-500/10">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-emerald-300">Computational Profiles</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      Plot sliding window Kyte-Doolittle hydropathy indexes to locate hydrophobic transmembrane helices, and graph full amino acid percentage frequencies.
                    </p>
                  </div>
                  <button 
                    onClick={() => onNavigateTab("bioprofiles")}
                    className="w-full mt-2 py-1.5 bg-emerald-950/25 hover:bg-emerald-950/40 border border-emerald-900/40 text-emerald-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Launch Computational Profiles <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 bg-slate-950/20 border border-slate-850 hover:border-slate-800 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-teal-600/10 text-teal-400 border border-teal-500/10">
                        <Binary className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-teal-300">Homology Sequence Alignment</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      Compare query records with reference database strains using configurable Smith-Waterman or Needleman-Wunsch dynamic matrices.
                    </p>
                  </div>
                  <button 
                    onClick={() => onNavigateTab("alignment")}
                    className="w-full mt-2 py-1.5 bg-teal-950/25 hover:bg-teal-950/40 border border-teal-900/40 text-teal-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Launch Alignment Engine <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 bg-slate-950/20 border border-slate-850 hover:border-slate-800 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-purple-600/10 text-purple-400 border border-purple-500/10">
                        <Network className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-purple-300">Target Deep Profile</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      Query and view extensive integrated database annotations for loaded UniProt and NCBI targets, complete with cellular pathways, ontology, and medical relevance.
                    </p>
                  </div>
                  <button 
                    onClick={() => onNavigateTab("knowledge")}
                    className="w-full mt-2 py-1.5 bg-purple-950/25 hover:bg-purple-950/40 border border-purple-900/40 text-purple-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Launch Deep Profiler <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* DNA/RNA TRANSCRIBER */}
        {activeTab === "transcribe" && (
          <div className="flex flex-col gap-6">
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-md font-extrabold text-blue-400">Nucleotide Transcription & Reverse-Transcription</h3>
                <p className="text-xs text-slate-400 mt-1">Converts DNA coding sequence strands to complementary messenger RNA or vice-versa.</p>
              </div>
              <div className="flex gap-2 font-sans shrink-0">
                <button
                  onClick={() => setTranscribeMode("transcribe")}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded border transition-all cursor-pointer ${
                    transcribeMode === "transcribe"
                      ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                      : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
                  }`}
                >
                  Transcription (DNA → RNA)
                </button>
                <button
                  onClick={() => setTranscribeMode("reverse")}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded border transition-all cursor-pointer ${
                    transcribeMode === "reverse"
                      ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                      : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
                  }`}
                >
                  Reverse Transcription (RNA → DNA)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nucleotide Sequence Input</span>
                  {activeRecord && (
                    <button
                      onClick={() => loadActiveSequence("transcribe")}
                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-900/50 bg-indigo-950/10 rounded hover:bg-indigo-950/30 cursor-pointer"
                    >
                      Load Active Sequence
                    </button>
                  )}
                </div>
                <textarea
                  value={transcribeInput}
                  onChange={(e) => setTranscribeInput(e.target.value)}
                  placeholder={`Paste ${transcribeMode === "transcribe" ? "DNA sequence (A, T, G, C)" : "RNA sequence (A, U, G, C)"}...`}
                  className="w-full h-52 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-slate-700 resize-none"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Letters will be automatically capitalized and sanitized.</span>
                  <span>Length: {sanitizeSeq(transcribeInput).length} nt</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conversion Output Strand (5' → 3')</span>
                
                <div className="w-full h-52 p-3 bg-slate-950/60 border border-slate-850 rounded-xl font-mono text-xs text-blue-300 select-all overflow-y-auto break-all relative">
                  {transcriptionResult || (
                    <span className="text-slate-600 italic">Provide sequence input to view transcribed strand</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={!transcriptionResult}
                    onClick={() => copyToClipboard(transcriptionResult, "transcribe")}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {copiedText === "transcribe" ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        Copied Strand!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Result
                      </>
                    )}
                  </button>

                  <button
                    disabled={!transcriptionResult}
                    onClick={() => handleLoadCustomSeqToWorkspace(transcriptionResult, "Transcription")}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-blue-900/20"
                  >
                    <Play className="w-4 h-4" />
                    Load result into Workspace
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PROTEIN TRANSLATION LAB */}
        {activeTab === "translate" && (
          <div className="flex flex-col gap-6">
            <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h3 className="text-md font-extrabold text-purple-400">Amino Acid Genetic Translation</h3>
                <p className="text-xs text-slate-400 mt-1">Converts nucleotide sequences into polypeptide frames based on classical genetic translation matrices.</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Genetic Code Table</span>
                  <select
                    value={geneticCodeId}
                    onChange={(e) => setGeneticCodeId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-2 py-1.5 rounded focus:outline-none"
                  >
                    {GENETIC_CODES.map(code => (
                      <option key={code.id} value={code.id}>{code.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Reading Frame</span>
                  <select
                    value={readingFrame}
                    onChange={(e) => setReadingFrame(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-2 py-1.5 rounded focus:outline-none"
                  >
                    <option value={1}>Frame +1</option>
                    <option value={2}>Frame +2</option>
                    <option value={3}>Frame +3</option>
                    <option value={-1}>Frame -1 (Reverse Str)</option>
                    <option value={-2}>Frame -2 (Reverse Str)</option>
                    <option value={-3}>Frame -3 (Reverse Str)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DNA/RNA Input Sequence</span>
                  {activeRecord && (
                    <button
                      onClick={() => loadActiveSequence("translate")}
                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-900/50 bg-indigo-950/10 rounded hover:bg-indigo-950/30 cursor-pointer"
                    >
                      Load Active Sequence
                    </button>
                  )}
                </div>
                <textarea
                  value={translateInput}
                  onChange={(e) => setTranslateInput(e.target.value)}
                  placeholder="Paste nucleotide coding sequence (A, T, G, C, U) to translate..."
                  className="w-full h-52 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-slate-700 resize-none"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Numbers and spaces will be automatically filtered.</span>
                  <span>Length: {sanitizeSeq(translateInput).length} nt</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Translated Peptide Sequence</span>
                
                <div className="w-full h-52 p-3 bg-slate-950/60 border border-slate-850 rounded-xl font-mono text-xs text-purple-300 select-all overflow-y-auto break-all relative">
                  {translationResult.peptide ? (
                    <div>
                      {translationResult.peptide}
                    </div>
                  ) : (
                    <span className="text-slate-600 italic">Provide sequence input to view polypeptide translation</span>
                  )}
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-850 rounded-xl grid grid-cols-3 gap-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-black">Peptide Length</span>
                    <span className="text-xs font-bold font-mono text-slate-200">{translationResult.count} residues</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-black">Est. Mol Weight</span>
                    <span className="text-xs font-bold font-mono text-purple-400">{translationResult.mw} kDa</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-black">Hydrophobic %</span>
                    <span className="text-xs font-bold font-mono text-emerald-400">{translationResult.statHydro}%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={!translationResult.peptide}
                    onClick={() => copyToClipboard(translationResult.peptide, "translate")}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {copiedText === "translate" ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        Copied Peptide!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Sequence
                      </>
                    )}
                  </button>

                  <button
                    disabled={!translationResult.peptide}
                    onClick={() => handleLoadCustomSeqToWorkspace(translationResult.peptide, "Translation")}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-purple-900/20"
                  >
                    <Play className="w-4 h-4" />
                    Load result into Workspace
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* REVERSE COMPLEMENT AND GC/TM ANALYZER */}
        {activeTab === "revcomp" && (
          <div className="flex flex-col gap-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-md font-extrabold text-emerald-400">Reverse Complement, GC-Ratio & Primer Tm</h3>
              <p className="text-xs text-slate-400 mt-1">Estimates crucial biochemical variables for primers, cloning structures, and synthetic biology frames.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DNA/RNA Input Strand</span>
                    {activeRecord && (
                      <button
                        onClick={() => loadActiveSequence("revcomp")}
                        className="px-2.5 py-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-900/50 bg-indigo-950/10 rounded hover:bg-indigo-950/30 cursor-pointer"
                      >
                        Load Active Sequence
                      </button>
                    )}
                  </div>
                  <textarea
                    value={revCompInput}
                    onChange={(e) => setRevCompInput(e.target.value)}
                    placeholder="Paste nucleotide sequence..."
                    className="w-full h-32 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-slate-700 resize-none"
                  />
                </div>

                {/* Live Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black block">GC Content</span>
                      <span className="text-sm font-black font-mono text-emerald-400">{reverseComplementResult.gc}%</span>
                    </div>
                    <div className="text-[10px] text-slate-500 text-right">
                      {reverseComplementResult.gc > 60 ? "🔥 GC Rich" : reverseComplementResult.gc < 40 ? "❄️ AT Rich" : "⚖️ Neutral"}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black block">Wallace / Basic Tm</span>
                      <span className="text-sm font-black font-mono text-blue-400">{reverseComplementResult.tm}°C</span>
                    </div>
                    <div className="text-[9px] text-slate-500 text-right leading-tight max-w-[80px]">
                      Ideal for annealing parameters
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Computed Strands (5' → 3')</span>
                
                <div className="flex-1 bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col gap-4 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase font-black mb-1">
                      <span>Complement Strand</span>
                      <button 
                        disabled={!reverseComplementResult.comp}
                        onClick={() => copyToClipboard(reverseComplementResult.comp, "comp")} 
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer disabled:opacity-30"
                      >
                        {copiedText === "comp" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                    <div className="p-2 bg-slate-950 border border-slate-900 rounded text-slate-300 break-all select-all">
                      {reverseComplementResult.comp || <span className="text-slate-650 italic text-slate-700">Waiting for sequence</span>}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase font-black mb-1">
                      <span>Reverse Strand</span>
                      <button 
                        disabled={!reverseComplementResult.rev}
                        onClick={() => copyToClipboard(reverseComplementResult.rev, "rev")} 
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer disabled:opacity-30"
                      >
                        {copiedText === "rev" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                    <div className="p-2 bg-slate-950 border border-slate-900 rounded text-slate-300 break-all select-all">
                      {reverseComplementResult.rev || <span className="text-slate-650 italic text-slate-700">Waiting for sequence</span>}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase font-black mb-1 text-emerald-400">
                      <span>Reverse Complement Strand</span>
                      <button 
                        disabled={!reverseComplementResult.revComp}
                        onClick={() => copyToClipboard(reverseComplementResult.revComp, "revComp")} 
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer disabled:opacity-30"
                      >
                        {copiedText === "revComp" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                    <div className="p-2 bg-slate-950 border border-slate-900 rounded text-emerald-300 break-all select-all font-bold">
                      {reverseComplementResult.revComp || <span className="text-slate-650 italic text-slate-700">Waiting for sequence</span>}
                    </div>
                  </div>
                </div>

                <button
                  disabled={!reverseComplementResult.revComp}
                  onClick={() => handleLoadCustomSeqToWorkspace(reverseComplementResult.revComp, "Rev-Comp")}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-emerald-900/20"
                >
                  <Play className="w-4 h-4" />
                  Load Rev-Comp into Workspace
                </button>
              </div>

            </div>
          </div>
        )}

        {/* CODON OPTIMIZATION ESTIMATOR */}
        {activeTab === "codon" && (
          <div className="flex flex-col gap-6">
            <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h3 className="text-md font-extrabold text-amber-400">Heterologous Host Codon Optimization</h3>
                <p className="text-xs text-slate-400 mt-1">Translates a peptide sequence back into optimized DNA using host-specific highly expressed codon frequencies.</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Expression Target Host</span>
                <select
                  value={codonTargetHost}
                  onChange={(e) => setCodonTargetHost(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded focus:outline-none"
                >
                  <option value="ecoli">Escherichia coli (Bacterial expression)</option>
                  <option value="yeast">Saccharomyces cerevisiae (Yeast expression)</option>
                  <option value="human">Homo sapiens (Mammalian expression)</option>
                  <option value="arabidopsis">Arabidopsis thaliana (Plant expression)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source Protein Sequence</span>
                  {activeRecord && (
                    <button
                      onClick={() => loadActiveSequence("codon")}
                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-900/50 bg-indigo-950/10 rounded hover:bg-indigo-950/30 cursor-pointer"
                    >
                      Load Active Sequence
                    </button>
                  )}
                </div>
                <textarea
                  value={codonInput}
                  onChange={(e) => setCodonInput(e.target.value)}
                  placeholder="Paste single letter amino acid sequence (e.g. MVLSEGEW...)..."
                  className="w-full h-52 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-slate-700 resize-none"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Only standard amino acid codes are supported.</span>
                  <span>Length: {sanitizeSeq(codonInput).length} aa</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Optimized Coding Sequence (5' → 3')</span>
                
                <div className="w-full h-52 p-3 bg-slate-950/60 border border-slate-850 rounded-xl font-mono text-xs text-amber-300 select-all overflow-y-auto break-all relative">
                  {codonOptimizationResult.dna ? (
                    <div>
                      {codonOptimizationResult.dna}
                    </div>
                  ) : (
                    <span className="text-slate-600 italic">Provide protein sequence input to view optimized DNA codons</span>
                  )}
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-850 rounded-xl grid grid-cols-3 gap-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-black">Codons Mapped</span>
                    <span className="text-xs font-bold font-mono text-slate-200">{codonOptimizationResult.codonCount} aa</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-black">DNA Length</span>
                    <span className="text-xs font-bold font-mono text-amber-400">{codonOptimizationResult.codonCount * 3} nt</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-black">Est. CG Bias</span>
                    <span className="text-xs font-bold font-mono text-emerald-400">{codonOptimizationResult.gcContent}%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={!codonOptimizationResult.dna}
                    onClick={() => copyToClipboard(codonOptimizationResult.dna, "codon")}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {copiedText === "codon" ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        Copied Optimized DNA!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Coding DNA
                      </>
                    )}
                  </button>

                  <button
                    disabled={!codonOptimizationResult.dna}
                    onClick={() => handleLoadCustomSeqToWorkspace(codonOptimizationResult.dna, "Codon-Optimized")}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-amber-900/20"
                  >
                    <Play className="w-4 h-4" />
                    Load result into Workspace
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* RESTRICTION ENZYME SITE MAPPER */}
        {activeTab === "restriction" && (
          <div className="flex flex-col gap-6 font-sans">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-md font-extrabold text-rose-400">Restriction Enzyme Cleavage Mapping</h3>
              <p className="text-xs text-slate-400 mt-1">Identifies double-stranded endonuclease cut coordinates within DNA sequence templates.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DNA Sequence Input</span>
                    {activeRecord && (
                      <button
                        onClick={() => loadActiveSequence("restriction")}
                        className="px-2.5 py-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-900/50 bg-indigo-950/10 rounded hover:bg-indigo-950/30 cursor-pointer"
                      >
                        Load Active Sequence
                      </button>
                    )}
                  </div>
                  <textarea
                    value={restrictionInput}
                    onChange={(e) => {
                      setRestrictionInput(e.target.value);
                      setSelectedEnzymeIndex(null);
                    }}
                    placeholder="Paste DNA coding strand sequence (A, T, G, C) to scan..."
                    className="w-full h-32 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-slate-700 resize-none"
                  />
                </div>

                {/* SVG Visual map of sequence & cut sites */}
                <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl">
                  <div className="flex items-center justify-between mb-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <span>Double Strand Visual Cut Map</span>
                    <span>{restrictionInput ? `${sanitizeSeq(restrictionInput).length} Base Pairs` : "No sequence loaded"}</span>
                  </div>

                  <div className="h-28 w-full bg-slate-950 border border-slate-900 rounded-lg relative flex items-center justify-center p-3">
                    {restrictionResult.length === 0 ? (
                      <span className="text-xs text-slate-600 italic">Provide sequence to graph site representation</span>
                    ) : (
                      <div className="w-full h-full flex flex-col justify-between py-1 relative">
                        {/* Cut ticks top */}
                        <div className="w-full h-12 relative">
                          {restrictionResult.map((hit, i) => {
                            const pct = (hit.start / sanitizeSeq(restrictionInput).length) * 100;
                            const isSelected = selectedEnzymeIndex === i;
                            return (
                              <button
                                key={`tick-${i}`}
                                onClick={() => setSelectedEnzymeIndex(i)}
                                className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                                style={{ left: `${pct}%` }}
                              >
                                <span 
                                  className={`text-[8px] font-mono font-black px-1 rounded border whitespace-nowrap transition-all ${
                                    isSelected 
                                      ? "bg-rose-500 text-white border-rose-400 scale-110 z-10" 
                                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                                  }`}
                                  style={{ borderColor: hit.color }}
                                >
                                  {hit.enzyme}
                                </span>
                                <div className="w-[1.5px] h-4 mt-0.5" style={{ backgroundColor: hit.color }} />
                              </button>
                            );
                          })}
                        </div>

                        {/* Central DNA strand representation */}
                        <div className="h-1.5 w-full bg-slate-800 rounded-full relative">
                          {/* Selected marker accent */}
                          {selectedEnzymeIndex !== null && restrictionResult[selectedEnzymeIndex] && (
                            <div 
                              className="absolute top-0 bottom-0 bg-rose-500 h-full w-2 -ml-1 rounded-full animate-ping"
                              style={{ left: `${(restrictionResult[selectedEnzymeIndex].start / sanitizeSeq(restrictionInput).length) * 100}%` }}
                            />
                          )}
                        </div>

                        {/* Coordinate ticks bottom */}
                        <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                          <span>1 bp</span>
                          {selectedEnzymeIndex !== null && restrictionResult[selectedEnzymeIndex] && (
                            <span className="text-rose-400 font-bold">Selected Cut: {restrictionResult[selectedEnzymeIndex].enzyme} at {restrictionResult[selectedEnzymeIndex].start}bp</span>
                          )}
                          <span>{sanitizeSeq(restrictionInput).length} bp</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enzymes list sidebar */}
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Identified Cleavage Sites</span>
                
                <div className="flex-1 bg-slate-950/40 border border-slate-850 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto max-h-72">
                  {restrictionResult.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-600 italic p-6 text-center">
                      No matching restriction sites identified in current sequence.
                    </div>
                  ) : (
                    restrictionResult.map((hit, i) => {
                      const isSelected = selectedEnzymeIndex === i;
                      return (
                        <button
                          key={`hit-${i}`}
                          onClick={() => setSelectedEnzymeIndex(i)}
                          className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-rose-950/20 border-rose-500/50" 
                              : "bg-slate-950/80 border-slate-900 hover:border-slate-800"
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hit.color }} />
                              {hit.enzyme}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 mt-1">
                              Pattern: <strong className="text-slate-350">{hit.sequence}</strong>
                            </span>
                          </div>
                          <div className="text-right flex flex-col">
                            <span className="text-[10px] font-mono text-rose-400 font-bold">Cut: {hit.start} bp</span>
                            <span className="text-[8px] text-slate-500 mt-0.5">End: {hit.end} bp</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-lg text-[10px] text-slate-500 leading-normal">
                  <span className="font-extrabold uppercase text-slate-400 block mb-1">Standard Enzyme Catalog</span>
                  Included scan indexes: EcoRI (GAATTC), BamHI (GGATCC), HindIII (AAGCTT), NotI (GCGGCCGC), XhoI (CTCGAG), SacI (GAGCTC), SmaI (CCCGGG).
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
};
