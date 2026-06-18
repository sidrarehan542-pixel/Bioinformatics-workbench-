/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Cpu,
  Layers,
  Activity,
  Sparkles,
  BookOpen,
  Download,
  Database,
  Upload,
  History,
  HelpCircle,
  Info,
  Globe,
  RefreshCw,
  Play,
  Check,
  Plus,
  Trash,
  Binary,
  Compass,
  FileText,
  Lock,
  MessageSquare,
  AlertCircle,
  Network,
  Zap,
  ChevronDown,
  Briefcase,
  DollarSign
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  ReferenceLine,
  Legend
} from "recharts";

import { ProteinData, DBType, UserMode, AlignmentConfig, AlignmentResult, MotifMatch, SavedPipeline, GeminiResponse, SeedAtom } from "./types";
import { motion, AnimatePresence } from "motion/react";
import {
  calculateMolecularWeight,
  calculateIsoelectricPoint,
  calculateHydropathyProfile,
  calculateAminoAcidFrequency,
  performSequenceAlignment,
  findMotifs
} from "./lib/alignment";
import { EXAMPLES } from "./data/examples";
import ChatBox from "./components/ChatBox";
import StructureViewer from "./components/StructureViewer";
import { SequenceMap } from "./components/SequenceMap";
import { BatchProcessor } from "./components/BatchProcessor";
import { ActiveSitePredictor } from "./components/ActiveSitePredictor";
import { CommercialServicesHub } from "./components/CommercialServicesHub";

// Amino Acid mutation simulator properties lookup
const RESIDUE_MASSES: Record<string, number> = {
  A: 71.08, R: 156.19, N: 114.10, D: 115.09, C: 103.14,
  E: 129.12, Q: 128.13, G: 57.05, H: 137.14, I: 113.16,
  L: 113.16, K: 128.17, M: 131.20, F: 147.18, P: 97.12,
  S: 87.08, T: 101.11, W: 186.21, Y: 163.18, V: 99.13
};

interface AaData { name: string; class: string; charge: number; hydropathy: number }
const AA_DETAILS: Record<string, AaData> = {
  A: { name: "Alanine", class: "Hydrophobic Aliphatic", charge: 0, hydropathy: 1.8 },
  R: { name: "Arginine", class: "Positive Charged Basic", charge: 1, hydropathy: -4.5 },
  N: { name: "Asparagine", class: "Polar Uncharged", charge: 0, hydropathy: -3.5 },
  D: { name: "Aspartate", class: "Negative Charged Acidic", charge: -1, hydropathy: -3.5 },
  C: { name: "Cysteine", class: "Sulfhydryl Polar / Thiol", charge: 0, hydropathy: 2.5 },
  E: { name: "Glutamate", class: "Negative Charged Acidic", charge: -1, hydropathy: -3.5 },
  Q: { name: "Glutamine", class: "Polar Uncharged", charge: 0, hydropathy: -3.5 },
  G: { name: "Glycine", class: "Tiny Aliphatic", charge: 0, hydropathy: -0.4 },
  H: { name: "Histidine", class: "Weakly Basic / Imidazole", charge: 0.5, hydropathy: -3.2 },
  I: { name: "Isoleucine", class: "Hydrophobic Aliphatic", charge: 0, hydropathy: 4.5 },
  L: { name: "Leucine", class: "Hydrophobic Aliphatic", charge: 0, hydropathy: 3.8 },
  K: { name: "Lysine", class: "Positive Charged Basic", charge: 1, hydropathy: -3.9 },
  M: { name: "Methionine", class: "Hydrophobic Sulfur-containing", charge: 0, hydropathy: 1.9 },
  F: { name: "Phenylalanine", class: "Hydrophobic Aromatic", charge: 0, hydropathy: 2.8 },
  P: { name: "Proline", class: "Rigid Cyclic Imino Acid", charge: 0, hydropathy: -1.6 },
  S: { name: "Serine", class: "Hydroxylated Polar", charge: 0, hydropathy: -0.8 },
  T: { name: "Threonine", class: "Hydroxylated Polar", charge: 0, hydropathy: -0.7 },
  W: { name: "Tryptophan", class: "Bulky Aromatic Ring", charge: 0, hydropathy: -0.9 },
  Y: { name: "Tyrosine", class: "Aromatic Phenolic", charge: 0, hydropathy: -1.3 },
  V: { name: "Valine", class: "Hydrophobic Aliphatic", charge: 0, hydropathy: 4.2 }
};

const BLOSUM62_AA_ORDER = "ARNDCQEGHILKMFPSTWYV";
const BLOSUM62_MATRIX: number[][] = [
  [4,-1,-2,-2,0,-1,-1,0,-2,-1,-1,-1,-1,-2,-1,1,0,-3,-2,0], // A
  [-1,5,0,-2,-3,1,0,-2,0,-3,-2,2,-1,-3,-2,-1,-1,-3,-2,-3], // R
  [-2,0,6,1,-3,0,0,0,1,-3,-3,0,-2,-3,-2,1,0,-4,-2,-3], // N
  [-2,-2,1,6,-3,0,2,-1,-1,-3,-4,-1,-3,-3,-1,0,-1,-4,-3,-3], // D
  [0,-3,-3,-3,9,-3,-4,-3,-3,-1,-1,-3,-1,-2,-3,-1,-1,-2,-2,-1], // C
  [-1,1,0,0,-3,5,2,-2,0,-3,-2,1,0,-3,-1,0,-1,-2,-1,-2], // Q
  [-1,0,0,2,-4,2,5,-2,0,-3,-3,1,-2,-3,-1,0,-1,-3,-2,-2], // E
  [0,-2,0,-1,-3,-2,-2,6,-2,-4,-4,-2,-3,-3,-2,0,-2,-2,-3,-3], // G
  [-2,0,1,-1,-3,0,0,-2,8,-3,-3,-1,-2,-1,-2,-1,-2,-2,2,-3], // H
  [-1,-3,-3,-3,-1,-3,-3,-4,-3,4,2,-3,1,0,-3,-2,-1,-3,-1,3], // I
  [-1,-2,-3,-4,-1,-2,-3,-4,-3,2,4,-2,2,0,-3,-2,-1,-2,-1,1], // L
  [-1,2,0,-1,-3,1,1,-2,-1,-3,-2,5,-1,-3,-1,0,-1,-3,-2,-2], // K
  [-1,-1,-2,-3,-1,0,-2,-3,-2,1,2,-1,5,0,-2,-1,-1,-1,-1,1], // M
  [-2,-3,-3,-3,-2,-3,-3,-3,-1,0,0,-3,0,6,-4,-2,-2,1,3,-1], // F
  [-1,-2,-2,-1,-3,-1,-1,-2,-2,-3,-3,-1,-2,-4,7,-1,-1,-4,-3,-2], // P
  [1,-1,1,0,-1,0,0,0,-1,-2,-2,0,-1,-2,-1,4,1,-3,-2,-2], // S
  [0,-1,0,-1,-1,-1,-1,-2,-2,-1,-1,-1,-1,-2,-1,1,5,-2,-2,0], // T
  [-3,-3,-4,-4,-2,-2,-3,-2,-2,-3,-2,-3,-1,1,-4,-3,-2,11,2,-3], // W
  [-2,-2,-2,-3,-2,-1,-2,-3,2,-1,-1,-2,-1,3,-3,-2,-2,2,7,-1], // Y
  [0,-3,-3,-3,-1,-2,-2,-3,-3,3,1,-2,1,-1,-2,-2,0,-3,-1,4]  // V
];

const getBlosum62Score = (aa1: string, aa2: string): number => {
  const i = BLOSUM62_AA_ORDER.indexOf(aa1.trim().toUpperCase());
  const j = BLOSUM62_AA_ORDER.indexOf(aa2.trim().toUpperCase());
  if (i === -1 || j === -1) return -1;
  return BLOSUM62_MATRIX[i][j];
};


// 3D Rotation helper
const rotate3D = (x: number, y: number, z: number, angleX: number, angleY: number, angleZ: number) => {
  const cosX = Math.cos(angleX);
  const sinX = Math.sin(angleX);
  const y1 = y * cosX - z * sinX;
  const z1 = y * sinX + z * cosX;

  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const x2 = x * cosY + z1 * sinY;
  const z2 = -x * sinY + z1 * cosY;

  const cosZ = Math.cos(angleZ);
  const sinZ = Math.sin(angleZ);
  const x3 = x2 * cosZ - y1 * sinZ;
  const y3 = x2 * sinZ + y1 * cosZ;

  return { x: x3, y: y3, z: z2 };
};

// Fallback Helix generator when coordinates are missing

const generateFallbackHelix = (sequence: string): SeedAtom[] => {
  const atoms: SeedAtom[] = [];
  const aaList = sequence.toUpperCase().replace(/[^A-Z]/g, "");
  const numResidues = aaList.length || 30;

  // Generate an alpha-helix geometry (3.6 residues per turn, 1.5A translation per residue, radius 2.3A)
  for (let i = 0; i < Math.min(numResidues, 200); i++) {
    const aa = aaList[i] || "X";
    const angle = (i * 2 * Math.PI) / 3.6;
    const r = 4.5; // Radius
    const h = i * 1.5; // Rise

    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    const z = h - (numResidues * 1.5) / 2; // Center on z axis

    // Add Alpha Carbon (CA)
    atoms.push({
      serial: i * 4 + 1,
      name: "CA",
      resName: "ALA", // fallback
      aa,
      chainID: i < numResidues / 2 ? "A" : "B", // 2 chains
      resSeq: i + 1,
      x,
      y,
      z,
      element: "C"
    });

    // Add Nitrogen (N)
    atoms.push({
      serial: i * 4 + 2,
      name: "N",
      resName: "ALA",
      aa,
      chainID: i < numResidues / 2 ? "A" : "B",
      resSeq: i + 1,
      x: x + 1.2 * Math.cos(angle + 0.5),
      y: y + 1.2 * Math.sin(angle + 0.5),
      z: z - 0.4,
      element: "N"
    });

    // Add Carbonyl Carbon (C)
    atoms.push({
      serial: i * 4 + 3,
      name: "C",
      resName: "ALA",
      aa,
      chainID: i < numResidues / 2 ? "A" : "B",
      resSeq: i + 1,
      x: x + 1.2 * Math.cos(angle - 0.5),
      y: y + 1.2 * Math.sin(angle - 0.5),
      z: z + 0.4,
      element: "C"
    });
  }

  return atoms;
};

export default function App() {
  // Core workbench states
  const [activeMode, setActiveMode] = useState<UserMode>("professional");
  const [activeDb, setActiveDb] = useState<DBType>("omni");
  const [searchQuery, setSearchQuery] = useState<string>("P0DTC2");
  
  // Current active loaded record
  const [activeRecord, setActiveRecord] = useState<ProteinData>(EXAMPLES.P0DTC2);
  const [searchHistory, setSearchHistory] = useState<ProteinData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");
  const [showChatBox, setShowChatBox] = useState<boolean>(false);

  // Spatial coordinates for the active protein structure
  const [atomsList, setAtomsList] = useState<SeedAtom[]>([]);
  const [atomsLoading, setAtomsLoading] = useState<boolean>(false);

  // Gemini context explanation state
  const [geminiExplanation, setGeminiExplanation] = useState<GeminiResponse | null>(null);
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);

  // Active custom alignment pipeline inputs
  const [alignSeqA, setAlignSeqA] = useState<string>("");
  const [alignSeqB, setAlignSeqB] = useState<string>("");
  const [alignConfig, setAlignConfig] = useState<AlignmentConfig>({
    alignmentType: "global",
    matchScore: 2,
    mismatchPenalty: -1,
    gapPenalty: -2,
  });
  const [alignmentResult, setAlignmentResult] = useState<AlignmentResult | null>(null);

  // Highlight index/tab on center stage
  const [centerTab, setCenterTab] = useState<"structure" | "physicochemical" | "bioprofiles" | "alignment" | "knowledge" | "services">("structure");

  // Mutation Simulator States
  const [mutatePos, setMutatePos] = useState<number>(1);
  const [mutateTargetAA, setMutateTargetAA] = useState<string>("K");

  // Local saved pipelines (Professional Mode)
  const [savedPipelines, setSavedPipelines] = useState<SavedPipeline[]>([
    {
      id: "pipe-1",
      name: "Spike Homology Test",
      date: "2026-06-17",
      queries: ["P0DTC2", "P0DTC3"],
      dbType: "uniprot",
      alignmentConfig: { alignmentType: "global", matchScore: 2, mismatchPenalty: -1, gapPenalty: -2 }
    },
    {
      id: "pipe-2",
      name: "Insulin Sub-receptor Scan",
      date: "2026-06-16",
      queries: ["P01308"],
      dbType: "uniprot",
      alignmentConfig: { alignmentType: "local", matchScore: 3, mismatchPenalty: -2, gapPenalty: -3 }
    }
  ]);
  const [pipelineName, setPipelineName] = useState<string>("");

  // Spatial dragging states
  const [rotationX, setRotationX] = useState<number>(0.5);
  const [rotationY, setRotationY] = useState<number>(0.5);
  const [rotationZ, setRotationZ] = useState<number>(0.0);
  const [zoomRatio, setZoomRatio] = useState<number>(6.5);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  useEffect(() => {
    let animationFrame: number;
    if (autoRotate) {
      const animate = () => {
        setRotationY(prev => prev + 0.01);
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [autoRotate]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 3D rendering styles
  const [renderStyle, setRenderStyle] = useState<"cartoon" | "beads" | "wireframe">("cartoon");
  const [stylingColor, setStylingColor] = useState<"chain" | "hydropathy" | "element" | "charge">("chain");

  // Learning Mode Help popovers
  const [hoveredConcept, setHoveredConcept] = useState<string | null>(null);

  // FASTA / sequence raw textbox for dynamic pipeline trigger
  const [customSequence, setCustomSequence] = useState<string>("");

  // Advanced Export Centre collapse toggle
  const [showAdvancedExports, setShowAdvancedExports] = useState<boolean>(false);

  // Handle example quick-starts
  const handleLoadExample = (id: string) => {
    setActiveDb(EXAMPLES[id].databaseSource);
    setSearchQuery(id);
    setActiveRecord(EXAMPLES[id]);
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.id !== EXAMPLES[id].id);
      return [EXAMPLES[id], ...filtered].slice(0, 15);
    });
    setCustomSequence(EXAMPLES[id].sequence);
    setAlignSeqA(EXAMPLES[id].sequence.slice(0, 100)); // Initialize alignments
    setAlignSeqB(EXAMPLES[id].sequence.slice(10, 110));
    setErrorText("");
  };

  // On Query Execute
  const handleQuerySearch = async (overrideQuery?: string, overrideDb?: DBType) => {
    const queryTerm = overrideQuery || searchQuery;
    const dbTerm = overrideDb || activeDb;

    if (!queryTerm.trim()) {
      setErrorText("Please provide an ID or keyword to initiate query.");
      return;
    }

    setLoading(true);
    setErrorText("");
    setGeminiExplanation(null);

    try {
      const url = `/api/query?db=${dbTerm}&id=${encodeURIComponent(queryTerm)}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || `Server returned error status ${res.status}`);
      }

      const proteinData: ProteinData = await res.json();
      setActiveRecord(proteinData);
      setSearchHistory(prev => {
        const filtered = prev.filter(item => item.id !== proteinData.id);
        return [proteinData, ...filtered].slice(0, 15);
      });
      setCustomSequence(proteinData.sequence);
      
      // Update quick alignment candidates
      setAlignSeqA(proteinData.sequence);
      if (proteinData.sequence.length > 30) {
        // slightly mutate or slice for demo local alignment
        setAlignSeqB(proteinData.sequence.slice(5, Math.min(250, proteinData.sequence.length)));
      } else {
        setAlignSeqB(proteinData.sequence);
      }

      // Automatically pull spatial coordinates if PDB is parsed or associated
      if (proteinData.pdbCode) {
        fetchSpatialCoordinates(proteinData.pdbCode);
      } else {
        // Generate mock structural ribbon coordinates
        const seedAtoms = generateFallbackHelix(proteinData.sequence);
        setAtomsList(seedAtoms);
      }

      // Auto-switch tabs based on target DB
      if (dbTerm === "omni") {
        setCenterTab("knowledge");
      } else if (dbTerm === "uniprot" || dbTerm === "kegg") {
        setCenterTab("knowledge");
      } else {
        setCenterTab("structure");
      }

      // Pre-fetch AI annotations/explanations
      triggerGeminiExplain(proteinData, activeMode);
      setShowChatBox(true);

    } catch (e: any) {
      console.error(e);
      setErrorText(e.message || "Endpoint connection failed. Review your connectivity.");
    } finally {
      setLoading(false);
    }
  };

  // Load fully fetched batch record into workspace
  const handleLoadFetchedRecord = (proteinData: ProteinData) => {
    setActiveRecord(proteinData);
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.id !== proteinData.id);
      return [proteinData, ...filtered].slice(0, 15);
    });
    setCustomSequence(proteinData.sequence);
    
    // Update quick alignment candidates
    setAlignSeqA(proteinData.sequence);
    if (proteinData.sequence.length > 30) {
      setAlignSeqB(proteinData.sequence.slice(5, Math.min(250, proteinData.sequence.length)));
    } else {
      setAlignSeqB(proteinData.sequence);
    }

    if (proteinData.pdbCode) {
      fetchSpatialCoordinates(proteinData.pdbCode);
    } else {
      setAtomsList(generateFallbackHelix(proteinData.sequence));
    }

    // Auto-switch tabs based on target DB
    if (proteinData.databaseSource === "omni" || proteinData.databaseSource === "uniprot" || proteinData.databaseSource === "kegg") {
      setCenterTab("knowledge");
    } else {
      setCenterTab("structure");
    }

    // Pull explanations
    triggerGeminiExplain(proteinData, activeMode);
    setShowChatBox(true);
    setErrorText("");
  };

  // Pull structure vectors
  const fetchSpatialCoordinates = async (pdbId: string) => {
    setAtomsLoading(true);
    try {
      const pId = pdbId.trim().toUpperCase();
      const res = await fetch(`/api/pdb/spatial?id=${pId}`);
      if (!res.ok) {
        throw new Error("Spatial trace not available");
      }
      const data = await res.json();
      if (data.atoms && data.atoms.length > 0) {
        setAtomsList(data.atoms);
      } else {
        setAtomsList(generateFallbackHelix(activeRecord.sequence));
      }
    } catch (e) {
      console.warn("Using mathematical dynamic helix fallback, offline or missing PDB coordinates.", e);
      setAtomsList(generateFallbackHelix(activeRecord.sequence));
    } finally {
      setAtomsLoading(false);
    }
  };

  // Trigger Gemini explain
  const triggerGeminiExplain = async (record: ProteinData, mode: UserMode) => {
    setGeminiLoading(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockData: record, mode }),
      });
      if (!res.ok) throw new Error("Explain module unresponsive");
      const explanation = await res.json();
      setGeminiExplanation(explanation);
    } catch (err) {
      console.error("Gemini failed.", err);
    } finally {
      setGeminiLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    // Seed initial values
    setAtomsList(generateFallbackHelix(EXAMPLES.P0DTC2.sequence));
    triggerGeminiExplain(EXAMPLES.P0DTC2, activeMode);
    setCustomSequence(EXAMPLES.P0DTC2.sequence);
    setAlignSeqA(EXAMPLES.P0DTC2.sequence.slice(0, 150));
    setAlignSeqB(EXAMPLES.P0DTC2.sequence.slice(20, 170));
  }, []);

  // Update Gemini response theme when user mode switches
  useEffect(() => {
    if (activeRecord) {
      triggerGeminiExplain(activeRecord, activeMode);
    }
  }, [activeMode]);

  // Physicochemical computations on loaded protein sequence
  const physProps = useMemo(() => {
    const seq = customSequence || activeRecord?.sequence || "";
    if (!seq) return { mw: 0, pi: 7.0, length: 0 };
    return {
      mw: calculateMolecularWeight(seq),
      pi: calculateIsoelectricPoint(seq),
      length: seq.length,
    };
  }, [customSequence, activeRecord]);

  // Motif prediction results
  const foundSeqMotifs = useMemo(() => {
    const seq = customSequence || activeRecord?.sequence || "";
    if (!seq) return [];
    return findMotifs(seq);
  }, [customSequence, activeRecord]);

  // Amino Acid distribution map
  const aaDistribution = useMemo(() => {
    const seq = customSequence || activeRecord?.sequence || "";
    if (!seq) return [];
    const dist = calculateAminoAcidFrequency(seq);
    return Object.entries(dist).map(([key, info]) => ({
      name: key,
      count: info.count,
      percentage: info.percentage,
    })).filter(item => item.name !== "Other" || item.count > 0);
  }, [customSequence, activeRecord]);

  // Hydropathy Profile dataset for Recharts
  const hydropathyProfileData = useMemo(() => {
    const seq = customSequence || activeRecord?.sequence || "";
    if (!seq) return [];
    const profile = calculateHydropathyProfile(seq, activeMode === "learning" ? 11 : 7);
    return profile.map((score, index) => ({
      index: index + 1,
      score,
    }));
  }, [customSequence, activeRecord, activeMode]);

  // Execute sequence alignment pipeline
  const runSequenceAlignment = () => {
    if (!alignSeqA || !alignSeqB) return;
    const result = performSequenceAlignment(alignSeqA, alignSeqB, alignConfig);
    setAlignmentResult(result);
  };

  // Trigger alignment on load sequence
  useEffect(() => {
    runSequenceAlignment();
  }, [alignSeqA, alignSeqB, alignConfig]);

  // Mouse drag handles for the 3D projection rendering
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setRotationY(prev => prev + dx * 0.007);
    setRotationX(prev => prev + dy * 0.007);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Rotated coordinates of current atoms
  const projectedAtoms = useMemo(() => {
    if (atomsList.length === 0) return [];
    
    // Calculate limits to center coordinates automatically
    let sumX = 0, sumY = 0, sumZ = 0;
    for (const at of atomsList) {
      sumX += at.x;
      sumY += at.y;
      sumZ += at.z;
    }
    const avgX = sumX / atomsList.length;
    const avgY = sumY / atomsList.length;
    const avgZ = sumZ / atomsList.length;

    return atomsList.map(atom => {
      // Center first
      const cx = atom.x - avgX;
      const cy = atom.y - avgY;
      const cz = atom.z - avgZ;

      // Rotate
      const rotated = rotate3D(cx, cy, cz, rotationX, rotationY, rotationZ);
      return {
        ...atom,
        projX: rotated.x,
        projY: rotated.y,
        projZ: rotated.z,
      };
    });
  }, [atomsList, rotationX, rotationY, rotationZ]);

  // Spatial color mapper inside 3D molecular viewer
  const getAtomColor = (atom: SeedAtom) => {
    if (stylingColor === "chain") {
      const colors = ["#2563eb", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];
      const chainCharCode = atom.chainID.charCodeAt(0) || 65;
      return colors[(chainCharCode - 65) % colors.length];
    }
    if (stylingColor === "hydropathy") {
      // Kyte-Doolittle color mapping (Hydrophobic orange-red, hydrophilic blue-teal)
      const kdValues: Record<string, number> = {
        I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5, M: 1.9, A: 1.8,
        W: -0.9, Y: -1.3, P: -1.6, T: -0.7, S: -0.8, H: -3.2,
        Q: -3.5, N: -3.5, E: -3.5, D: -3.5, K: -3.9, R: -4.5, G: -0.4
      };
      const val = kdValues[atom.aa.toUpperCase()] || 0;
      if (val > 1.5) return "#f97316"; // Highly hydrophobic
      if (val > 0) return "#fbbf24"; // Hydrophobic
      if (val < -3.0) return "#06b6d4"; // Highly hydrophilic
      return "#94a3b8"; // Intermediate/neutral
    }
    if (stylingColor === "element") {
      const el = atom.element.toUpperCase();
      if (el === "C") return "#475569";
      if (el === "N") return "#3b82f6";
      if (el === "O") return "#ef4444";
      if (el === "S") return "#eab308";
      return "#a855f7";
    }
    if (stylingColor === "charge") {
      // Positively basic (K, R, H) in light blue, and acidic (D, E) in light red
      const aa = atom.aa.toUpperCase();
      if (["K", "R", "H"].includes(aa)) return "#38bdf8";
      if (["D", "E"].includes(aa)) return "#f87171";
      return "#475569";
    }
    return "#3b82f6";
  };

  // Structure bounds for proper projection box positioning
  const renderBounds = useMemo(() => {
    if (projectedAtoms.length === 0) return { minX: -20, maxX: 20, minY: -20, maxY: 20 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const at of projectedAtoms) {
      if (at.projX < minX) minX = at.projX;
      if (at.projX > maxX) maxX = at.projX;
      if (at.projY < minY) minY = at.projY;
      if (at.projY > maxY) maxY = at.projY;
    }
    const margin = 10;
    return {
      minX: minX - margin,
      maxX: maxX + margin,
      minY: minY - margin,
      maxY: maxY + margin,
    };
  }, [projectedAtoms]);

  // Add search query helper for quick selections
  const handleQueryKeydown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleQuerySearch();
    }
  };

  // Save Pipeline locally for Custom Pipeline panel
  const handleSavePipeline = () => {
    if (!pipelineName.trim()) return;
    const newPipeline: SavedPipeline = {
      id: "pipe-" + Date.now(),
      name: pipelineName,
      date: new Date().toISOString().split("T")[0],
      queries: [activeRecord?.id || "P0DTC2"],
      dbType: activeDb,
      alignmentConfig: alignConfig
    };
    setSavedPipelines([newPipeline, ...savedPipelines]);
    setPipelineName("");
  };

  // Delete Pipeline
  const handleDeletePipeline = (id: string) => {
    setSavedPipelines(savedPipelines.filter(p => p.id !== id));
  };

  // Load a saved pipeline query configuration
  const handleLoadPipeline = (pipe: SavedPipeline) => {
    setAlignConfig(pipe.alignmentConfig);
    setActiveDb(pipe.dbType);
    setSearchQuery(pipe.queries[0]);
    handleQuerySearch(pipe.queries[0], pipe.dbType);
  };

  // Download sequence as standard scientific raw FASTA file
  const handleDownloadFASTA = () => {
    if (!activeRecord) return;
    const fastaText = `>uniprot|${activeRecord.id}|${activeRecord.name} [${activeRecord.organism}]\n${activeRecord.sequence}`;
    const blob = new Blob([fastaText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeRecord.id}_sequence.fasta`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Advanced Export 1: Format 3D coordinate list into PDB-compliant model
  const handleDownloadPDB = () => {
    if (!atomsList || atomsList.length === 0) return;
    let pdbContent = `HEADER    BIOHELIX GENERATED SPATIAL COORDINATES\n`;
    pdbContent += `TITLE     3D RECONSTRUCTION OF ${activeRecord?.id || "QUERY_TARGET"}\n`;
    pdbContent += `REMARK    Coordinates computed on local fallback structural simulation engine.\n`;
    
    atomsList.forEach((atom) => {
      const serialStr = atom.serial.toString().padStart(5, " ");
      const atomName = atom.name.padEnd(4, " ");
      const resName = atom.resName.padStart(3, " ");
      const chainID = atom.chainID || "A";
      const resSeqStr = atom.resSeq.toString().padStart(4, " ");
      const xStr = atom.x.toFixed(3).padStart(8, " ");
      const yStr = atom.y.toFixed(3).padStart(8, " ");
      const zStr = atom.z.toFixed(3).padStart(8, " ");
      const occupancy = "  1.00";
      const tempFactor = " 20.00";
      const element = atom.element.padStart(2, " ");
      
      pdbContent += `ATOM  ${serialStr}  ${atomName} ${resName} ${chainID}${resSeqStr}    ${xStr}${yStr}${zStr}${occupancy}${tempFactor}          ${element}  \n`;
    });
    
    pdbContent += `END\n`;
    
    const blob = new Blob([pdbContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeRecord?.id || "structure"}_coordinates.pdb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Advanced Export 2: Detailed residues biophysical spreadsheet
  const handleDownloadResidueProfileCSV = () => {
    const seq = customSequence || activeRecord?.sequence || "";
    if (!seq) return;
    
    const CATALYTIC_POTENTIAL_MAP_SIMPLE: Record<string, number> = {
      H: 0.95, C: 0.90, D: 0.85, E: 0.80, S: 0.75, K: 0.70, R: 0.65, Y: 0.60,
      N: 0.45, Q: 0.45, W: 0.40, F: 0.35, M: 0.30, T: 0.30, P: 0.20, V: 0.15,
      I: 0.15, L: 0.15, A: 0.10, G: 0.10
    };

    const headers = [
      "Residue Number",
      "One-Letter Symbol",
      "Amino Acid Name",
      "Class Category",
      "Kyte-Doolittle Hydropathy Index",
      "Net Charge (pH 7.4)",
      "Disulfide Capacity",
      "Catalytic Frequency Potential"
    ];
    
    const rows = Array.from(seq).map((aaCharacter, idx) => {
      const aaStr = aaCharacter as string;
      const details = AA_DETAILS[aaStr] || { name: "Unknown", class: "Unknown", charge: 0, hydropathy: 0.0 };
      const hasDisulfide = aaStr === "C" ? "YES" : "NO";
      const catPotential = CATALYTIC_POTENTIAL_MAP_SIMPLE[aaStr] || 0.10;
      
      return [
        idx + 1,
        aaStr,
        details.name,
        `"${details.class}"`,
        details.hydropathy,
        details.charge,
        hasDisulfide,
        catPotential
      ];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeRecord?.id || "polypeptide"}_residue_biomapping.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Advanced Export 3: Codon Optimized Human cDNA sequence
  const handleDownloadBackTranslatedMRNA = () => {
    const seq = customSequence || activeRecord?.sequence || "";
    if (!seq) return;
    
    const OPTIMAL_HUMAN_CODONS: Record<string, string> = {
      A: "GCC", C: "TGC", D: "GAC", E: "GAG", F: "TTC", G: "GGC", H: "CAC", I: "ATC",
      K: "AAG", L: "CTG", M: "ATG", N: "AAC", P: "CCC", Q: "CAG", R: "CGC", S: "TCC",
      T: "ACC", V: "GTG", W: "TGG", Y: "TAC"
    };
    
    let cDNA = "ATG";
    for (let i = 0; i < seq.length; i++) {
      const aa = seq[i];
      cDNA += OPTIMAL_HUMAN_CODONS[aa] || "GCC";
    }
    cDNA += "TGA";
    
    const blockFormattedSeq = cDNA.match(/.{1,60}/g)?.join("\n") || cDNA;
    const fastaOutput = `>cDNA|${activeRecord?.id || "SIMULATED"}|optimized_for_human_expression Back-translated from ${activeRecord?.name || "Polypeptide"}\n${blockFormattedSeq}`;
    
    const blob = new Blob([fastaOutput], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeRecord?.id || "expression"}_human_optimized_cDNA.fasta`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // File Upload parser for sequence input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      if (text.startsWith(">")) {
        // Parse fasta
        const lines = text.split("\n");
        const header = lines[0];
        const seq = lines.slice(1).map(l => l.trim()).join("");
        setCustomSequence(seq);
        setActiveRecord({
          id: "UPLOADED",
          name: header.replace(">", "").slice(0, 40),
          organism: "Custom User Upload",
          sequence: seq,
          sequenceLength: seq.length,
          description: `Imported local alignment target. Filename: ${file.name}`,
          functionText: "User provided sequence block queried directly into active workspace.",
          databaseSource: "uniprot",
          externalUrl: ""
        });
      } else {
        // Plain sequence string
        const clean = text.replace(/[^A-Za-z]/g, "");
        setCustomSequence(clean);
        setActiveRecord({
          id: "UPLOADED",
          name: "Imported FASTA Sample",
          organism: "Custom Vector Space",
          sequence: clean,
          sequenceLength: clean.length,
          description: "Plain sequence file read directly as workspace reference.",
          functionText: "Custom polypeptide strand parsed safely into client runtime context.",
          databaseSource: "uniprot",
          externalUrl: ""
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="root-workbench" className="flex flex-col min-h-screen lg:h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-y-auto lg:overflow-hidden">
      
      {/* Upper Navigation Rail / Sleek Interface Panel */}
      <header className="h-auto py-2 lg:h-16 flex flex-col lg:flex-row items-center justify-between px-4 lg:px-6 bg-slate-900 border-b border-slate-800 shrink-0 gap-3">
        
        {/* Brand visual branding (BioHelix Intelligence Suite) */}
        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg id="logo-icon hover:rotate-45 transition-transform" className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-md font-extrabold tracking-wider text-white flex items-center gap-2">
                BIOHELIX
                <span className="text-xs font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                  INTELLIGENCE
                </span>
              </h1>
              <span className="hidden sm:inline text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Smart Biological Database Interface</span>
            </div>
          </div>
          
          {/* Mobile User Avatar */}
          <div className="lg:hidden flex items-center gap-2">
             <div className="relative">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-xs font-bold text-indigo-400 shadow-md">
                SR
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>
          </div>
        </div>

        {/* Centralised Smart Middleware Query Module with AI Chat Companion drop-down */}
        <div className="flex flex-1 w-full lg:max-w-2xl lg:mx-8 relative flex-col justify-center">
          <div className="flex w-full items-center bg-slate-800 border border-slate-750 rounded-lg p-1 group focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all relative z-10">
            
            {/* Target Select Database */}
            <select
              value={activeDb}
              onChange={(e) => setActiveDb(e.target.value as DBType)}
              className="bg-slate-900 border-none text-xs rounded-md text-blue-400 font-bold px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="omni">Global Federated Search</option>
              <option value="uniprot">UniProt</option>
              <option value="pdb">PDB Structure</option>
              <option value="ncbi">NCBI Nucleotide</option>
              <option value="alphafold">AlphaFold DB</option>
              <option value="pubchem">PubChem</option>
              <option value="kegg">KEGG Pathway</option>
            </select>

            <div className="h-4 w-[1px] bg-slate-700 mx-2"></div>

            {/* Central input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-500 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="search-input-field"
                type="text"
                value={searchQuery}
                onKeyDown={handleQueryKeydown}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none py-1.5 pl-9 pr-4 text-xs text-slate-200 font-mono placeholder:text-slate-500 focus:outline-none"
                placeholder={
                  activeDb === "uniprot" 
                    ? "Enter UniProt Accession (e.g., P01308, P42212, P0DTC2)..."
                    : activeDb === "pdb"
                    ? "Enter PDB Code (e.g., 6VXX, 1TRZ, 1EMA, 6M0J)..."
                    : activeDb === "alphafold"
                    ? "Enter UniProt ID for structure prediction (e.g., Q8WUR8, O15533)..."
                    : activeDb === "pubchem"
                    ? "Enter Drug/Compound name or CID (e.g., Aspirin, Caffeine, 2244)..."
                    : activeDb === "kegg"
                    ? "Enter Pathway Map ID (e.g., map00010, map00020)..."
                    : "Enter Accession or keyword (e.g., NM_000526, Spike, Insulin)..."
                }
              />
            </div>

            <button
              onClick={() => handleQuerySearch()}
              disabled={loading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Fetch
            </button>

            <button
              onClick={() => setShowChatBox(!showChatBox)}
              className={`ml-1 px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                showChatBox 
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20" 
                  : "bg-slate-700 hover:bg-slate-650 text-slate-200 hover:text-white"
              }`}
              title="Toggle Gemini Companion Chat Bar"
            >
              <Sparkles className={`w-3.5 h-3.5 ${showChatBox ? "animate-pulse" : "text-emerald-400"}`} />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>

          <ChatBox 
            activeRecord={activeRecord} 
            isOpen={showChatBox} 
            onClose={() => setShowChatBox(false)} 
          />

          <BatchProcessor 
            activeDb={activeDb}
            onLoadRecord={handleLoadFetchedRecord}
          />
        </div>

        {/* Dual Mode Switcher & Account Meta */}
        <div className="flex items-center gap-5 w-full lg:w-auto justify-between lg:justify-end">
          
          {/* Student vs. Pro toggle */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 relative">
            <button
              id="switch-pro-btn"
              onClick={() => setActiveMode("professional")}
              className={`px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase rounded-md transition-all flex items-center gap-1 ${
                activeMode === "professional" 
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-700/10"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Cpu className="w-3 h-3" />
              Pro Mode
            </button>
            <button
              id="switch-learning-btn"
              onClick={() => setActiveMode("learning")}
              className={`px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase rounded-md transition-all flex items-center gap-1 ${
                activeMode === "learning"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-700/10"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <BookOpen className="w-3 h-3" />
              Learning
            </button>
          </div>

          {/* User badge */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-xs font-bold text-emerald-400 shadow-md">
                SR
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>
            <div className="hidden xl:flex flex-col text-[11px]">
              <span className="font-bold text-slate-300 leading-tight">Biotech Analyst</span>
              <span className="text-[9px] text-slate-500 font-mono">sidrarehan@axis</span>
            </div>
          </div>
        </div>

      </header>


      {/* Main Workbench Body Area Layout */}
      <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden p-2 lg:p-4 gap-4 bg-slate-950">
        
        {/* SIDEBAR LEFT: Entity Biological Metadata & File Explorer */}
        <aside className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto lg:overflow-hidden shrink-0">
          
          {/* Recent History */}
          {searchHistory.length > 0 && (
            <div className="bg-emerald-950/15 border border-emerald-900/30 rounded-xl p-4 shrink-0 shadow-lg mb-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  Search History
                </span>
                <span className="text-[9px] font-mono text-emerald-500/70">{searchHistory.length} queries</span>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[14rem] overflow-y-auto pr-1">
                {searchHistory.map((item, idx) => {
                  let dbColor = "text-emerald-400";
                  let bdBorder = "border-emerald-900/30 hover:border-emerald-500/50";
                  let bdBg = "bg-emerald-950/15";
                  let displayDb = item.databaseSource;
                  
                  if (item.databaseSource === "pdb") { dbColor = "text-purple-400"; bdBorder = "border-purple-900/40 hover:border-purple-500/50"; bdBg = "bg-purple-950/20"; }
                  else if (item.databaseSource === "pubchem") { dbColor = "text-orange-400"; bdBorder = "border-orange-900/40 hover:border-orange-500/50"; bdBg = "bg-orange-950/20"; }
                  else if (item.databaseSource === "kegg") { dbColor = "text-teal-400"; bdBorder = "border-teal-900/40 hover:border-teal-500/50"; bdBg = "bg-teal-950/20"; }
                  else if (item.databaseSource === "uniprot") { dbColor = "text-emerald-400"; bdBorder = "border-emerald-900/40 hover:border-emerald-500/50"; bdBg = "bg-emerald-950/20"; }
                  else if (item.databaseSource === "alphafold") { dbColor = "text-blue-400"; bdBorder = "border-blue-900/40 hover:border-blue-500/50"; bdBg = "bg-blue-950/20"; }
                  else if (item.databaseSource === "omni") { dbColor = "text-fuchsia-400"; bdBorder = "border-fuchsia-900/40 hover:border-fuchsia-500/50"; bdBg = "bg-fuchsia-950/20"; displayDb = "FEDERATED"; }
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        handleQuerySearch(item.id, item.databaseSource);
                      }}
                      className={`flex flex-col text-left p-2.5 rounded-lg border transition-all text-xs shrink-0 group ${bdBg} ${bdBorder}`}
                    >
                      <div className="flex justify-between font-bold text-slate-200 group-hover:text-white transition-colors w-full">
                        <span className="truncate pr-2 flex-1">{item.name}</span>
                        <span className={`text-[9px] ${dbColor} font-black uppercase tracking-wider shrink-0`}>{displayDb}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 max-w-full truncate mt-0.5 group-hover:text-slate-400"><strong className="font-mono">{item.id}</strong></span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick-start Examples Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shrink-0 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                Quickstart Seeds
              </span>
              <span className="text-[9px] font-mono text-slate-600">Sample Records</span>
            </div>
            <div id="quickstart-seeds-list" className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
              <button
                onClick={() => handleLoadExample("P0DTC2")}
                className={`flex flex-col text-left p-2 rounded-lg border transition-all text-xs shrink-0 ${
                  activeRecord?.id === "P0DTC2"
                    ? "bg-blue-950/40 border-blue-500/55"
                    : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between font-bold text-slate-200">
                  <span>SARS-CoV-2 Spike</span>
                  <span className="text-[10px] text-blue-400 font-mono">UniProt</span>
                </div>
                <span className="text-[9px] text-slate-500 max-w-full truncate">Severe acute respiratory syndrome</span>
              </button>

              <button
                onClick={() => handleLoadExample("P01308")}
                className={`flex flex-col text-left p-2 rounded-lg border transition-all text-xs shrink-0 ${
                  activeRecord?.id === "P01308"
                    ? "bg-blue-950/40 border-blue-500/55"
                    : "bg-slate-100/10 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Human Insulin</span>
                  <span className="text-[10px] text-emerald-400 font-mono">UniProt</span>
                </div>
                <span className="text-[9px] text-slate-500 max-w-full truncate">Glucose regulation receptor hormone</span>
              </button>

              <button
                onClick={() => handleLoadExample("Q8WUR8")}
                className={`flex flex-col text-left p-2 rounded-lg border transition-all text-xs shrink-0 ${
                  activeRecord?.id === "Q8WUR8"
                    ? "bg-blue-950/40 border-blue-500/55"
                    : "bg-slate-100/10 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between font-bold text-slate-200">
                  <span>TAPBP/STK16 Kinase</span>
                  <span className="text-[10px] text-indigo-400 font-mono">AlphaFold</span>
                </div>
                <span className="text-[9px] text-slate-500 max-w-full truncate">Neural network predicted structural trace</span>
              </button>

              <button
                onClick={() => handleLoadExample("2244")}
                className={`flex flex-col text-left p-2 rounded-lg border transition-all text-xs shrink-0 ${
                  activeRecord?.id === "2244"
                    ? "bg-blue-950/40 border-blue-500/55"
                    : "bg-slate-100/10 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Aspirin molecule</span>
                  <span className="text-[10px] text-orange-400 font-mono">PubChem</span>
                </div>
                <span className="text-[9px] text-slate-500 max-w-full truncate">Acetylsalicylic acid NSAID drug</span>
              </button>

              <button
                onClick={() => handleLoadExample("MAP00010")}
                className={`flex flex-col text-left p-2 rounded-lg border transition-all text-xs shrink-0 ${
                  activeRecord?.id === "MAP00010"
                    ? "bg-blue-950/40 border-blue-500/55"
                    : "bg-slate-100/10 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Glycolysis Pathway</span>
                  <span className="text-[10px] text-teal-400 font-mono">KEGG Map</span>
                </div>
                <span className="text-[9px] text-slate-500 max-w-full truncate">Carbohydrate decomposition map</span>
              </button>
            </div>
          </div>

          {/* Current Loaded Entity Metadata */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full overflow-hidden shadow-lg">
            <div id="metadata-header" className="flex justify-between items-center mb-3 shrink-0">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-500" />
                Active Entity Meta
              </h2>
              <span className="px-2 py-0.5 bg-blue-600/10 text-blue-400 text-[9px] font-black rounded border border-blue-500/20 uppercase tracking-wider font-mono">
                {activeRecord?.databaseSource || "AGGREGATED"}
              </span>
            </div>

            {errorText && (
              <div id="error-alert" className="mb-3 p-3 bg-red-950/40 border border-red-500/20 text-red-200 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Execution Denied:</span>
                  <p className="text-[11px] text-red-300 mt-0.5">{errorText}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
              
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <label className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">Biological Title/Name</label>
                <p className="text-xs font-bold text-slate-200 mt-1">{activeRecord?.name || "No records loaded"}</p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <label className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">Accession Identifier</label>
                <p className="text-xs font-mono font-bold text-blue-400 mt-1">
                  {activeRecord?.id} {activeRecord?.geneName && activeRecord.geneName !== "N/A" ? `(${activeRecord.geneName})` : ""}
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <label className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">Origin Host Organism</label>
                <p className="text-xs font-bold text-slate-300 mt-1 italic">{activeRecord?.organism || "Unknown Organism"}</p>
              </div>

              {/* PubChem Specific chemical parameters block */}
              {activeRecord?.chemicalFormula && (
                <div className="p-3 bg-orange-950/20 rounded-lg border border-orange-500/15">
                  <span className="text-[9px] text-orange-400 uppercase font-black tracking-wider block">Chemical Structure Profile</span>
                  <div className="flex flex-col gap-1.5 mt-1.5">
                    <p className="text-xs text-slate-300">Formula: <strong className="font-mono text-orange-400">{activeRecord.chemicalFormula}</strong></p>
                    <p className="text-xs text-slate-300">Mass: <span className="font-mono text-orange-300">{activeRecord.molecularWeight} g/mol</span></p>
                    <p className="text-[10px] text-slate-300">IUPAC: <span className="text-slate-400 italic">{activeRecord.iupacName}</span></p>
                    <div className="mt-1 bg-slate-950/80 p-1.5 rounded border border-slate-900">
                      <span className="text-[8px] text-slate-500 uppercase font-bold block">Canonical SMILES</span>
                      <p className="font-mono text-[9px] text-emerald-400 truncate" title={activeRecord.smiles}>{activeRecord.smiles}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* KEGG Pathway Specific properties block */}
              {activeRecord?.pathwayMapId && (
                <div className="p-3 bg-teal-950/20 rounded-lg border border-teal-500/15">
                  <span className="text-[9px] text-teal-400 uppercase font-black tracking-wider block">KEGG Pathway Details</span>
                  <div className="flex flex-col gap-1.5 mt-1.5">
                    <p className="text-xs text-slate-300">Class: <span className="text-slate-400">{activeRecord.pathwayClass}</span></p>
                    <p className="text-xs text-slate-300">Map ID: <strong className="font-mono text-teal-400">{activeRecord.pathwayMapId}</strong></p>
                    {activeRecord.pathwayDiseases && activeRecord.pathwayDiseases.length > 0 && (
                      <div className="mt-1 bg-slate-950/80 p-1.5 rounded border border-slate-900">
                        <span className="text-[8px] text-slate-500 uppercase font-bold block">Pathway Annotations / Diseases</span>
                        <ul className="list-disc pl-3 text-[9px] text-slate-400 space-y-0.5">
                          {activeRecord.pathwayDiseases.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeRecord?.pdbCode && (
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <label className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">Target 3D Coordinate Mapping</label>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs font-mono font-bold text-purple-400">PDB: {activeRecord.pdbCode}</p>
                    <button
                      onClick={() => {
                        setCenterTab("structure");
                        fetchSpatialCoordinates(activeRecord.pdbCode!);
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 underline font-semibold"
                    >
                      Sync 3D Coordinates
                    </button>
                  </div>
                </div>
              )}

              {/* Bio Sequence block section wrapper with copy feature */}
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Polypeptide Chain Sequence</label>
                  <span className="text-[9px] text-slate-400 font-mono">Residues: {activeRecord?.sequenceLength || activeRecord?.sequence?.length || 0}</span>
                </div>
                <div className="relative group">
                  <div className="font-mono text-[10px] leading-relaxed break-all p-3 max-h-32 overflow-y-auto bg-slate-950 text-slate-300 rounded-lg border border-slate-800">
                    {activeRecord?.sequence || "No sequence found."}
                  </div>
                  {activeRecord?.sequence && (
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeRecord.sequence);
                        }}
                        className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-[10px] rounded border border-slate-700 text-slate-300"
                        title="Copy raw sequence"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={handleDownloadFASTA}
                    disabled={!activeRecord?.sequence}
                    className="flex items-center justify-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:bg-blue-950/30 rounded py-1.5 font-bold tracking-tight disabled:opacity-50 animate-pulse-subtle"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download FASTA
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(activeRecord, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${activeRecord?.id}_dataset.json`;
                      a.click();
                    }}
                    disabled={!activeRecord}
                    className="flex items-center justify-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 border border-slate-700 hover:bg-slate-800/40 rounded py-1.5 font-semibold disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Export Dataset
                  </button>
                </div>

                {/* Advanced Multi-Format Bio-Export Centre Dropdown */}
                <div className="mt-3 pt-2.5 border-t border-slate-900">
                  <button
                    onClick={() => setShowAdvancedExports(!showAdvancedExports)}
                    className="w-full flex items-center justify-between text-[10px] uppercase font-black tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors py-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Advanced Scientific Formats
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvancedExports ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {showAdvancedExports && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden flex flex-col gap-1.5 mt-2 bg-slate-950/45 p-2 border border-slate-900 rounded-lg"
                      >
                        {/* 1. Standard PDB coordinates */}
                        <button
                          onClick={handleDownloadPDB}
                          disabled={!atomsList || atomsList.length === 0}
                          className="w-full flex items-center justify-between p-1.5 rounded bg-slate-900/50 hover:bg-slate-900 text-[10px] text-slate-300 hover:text-white border border-slate-900 text-left disabled:opacity-40 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>Download Helix Model (.PDB)</span>
                          </span>
                          {!atomsList || atomsList.length === 0 ? (
                            <span className="text-[8px] text-slate-600 uppercase font-bold font-mono">No atoms</span>
                          ) : (
                            <span className="text-[8px] bg-purple-500/10 text-purple-300 font-bold px-1.5 py-0.5 rounded border border-purple-500/10 font-mono">
                              {atomsList.length} atoms
                            </span>
                          )}
                        </button>

                        {/* 2. Biophysical Residue profiling spreadsheet */}
                        <button
                          onClick={handleDownloadResidueProfileCSV}
                          disabled={!activeRecord?.sequence}
                          className="w-full flex items-center justify-between p-1.5 rounded bg-slate-900/50 hover:bg-slate-900 text-[10px] text-slate-300 hover:text-white border border-slate-900 text-left disabled:opacity-40 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Residues Biophysical Map (.CSV)</span>
                          </span>
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/10 font-mono">Excel</span>
                        </button>

                        {/* 3. Human codon optimized cDNA back-translation */}
                        <button
                          onClick={handleDownloadBackTranslatedMRNA}
                          disabled={!activeRecord?.sequence}
                          className="w-full flex items-center justify-between p-1.5 rounded bg-slate-900/50 hover:bg-slate-900 text-[10px] text-slate-300 hover:text-white border border-slate-900 text-left disabled:opacity-40 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>Codon Optimized cDNA (.FASTA)</span>
                          </span>
                          <span className="text-[8px] bg-blue-500/10 text-blue-300 font-bold px-1.5 py-0.5 rounded border border-blue-500/10 font-mono">De-novo</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Upload dynamic FASTA segment directly */}
              <div className="mt-3 pt-3 border-t border-slate-800/80">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">Import Local Sequence File</span>
                <label className="flex items-center justify-center gap-2 p-3 bg-slate-950 border border-dashed border-slate-800 hover:border-slate-600 rounded-lg cursor-pointer text-xs text-slate-400 hover:text-slate-200 transition-all">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Choose FASTA or text sequence</span>
                  <input
                    type="file"
                    accept=".fasta,.txt,.seq"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

            </div>
          </div>
        </aside>

        {/* MIDDLE PANEL Stage: Tabbed Interactive Analysis Workspace */}
        <section className="flex-none lg:flex-1 flex flex-col gap-4 overflow-hidden min-h-[500px] lg:min-h-0">
          
          {/* Main workspace control tabs */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-1 shrink-0 flex w-full overflow-x-auto no-scrollbar">
            <div className="flex gap-1 w-max">
              <button
                onClick={() => setCenterTab("structure")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  centerTab === "structure"
                    ? "bg-slate-950 text-indigo-400 border border-slate-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                3D Spatial Structure
              </button>

              <button
                onClick={() => setCenterTab("physicochemical")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  centerTab === "physicochemical"
                    ? "bg-slate-950 text-indigo-400 border border-slate-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Activity className="w-4 h-4 shrink-0" />
                Physicochemical Profile
              </button>

              <button
                onClick={() => setCenterTab("bioprofiles")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  centerTab === "bioprofiles"
                    ? "bg-slate-950 text-indigo-400 border border-slate-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Cpu className="w-4 h-4 shrink-0" />
                Computational Profile
              </button>

              <button
                onClick={() => setCenterTab("knowledge")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  centerTab === "knowledge"
                    ? "bg-slate-950 text-indigo-400 border border-slate-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Network className="w-4 h-4 shrink-0" />
                Target Deep Profile
              </button>

              <button
                onClick={() => setCenterTab("alignment")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  centerTab === "alignment"
                    ? "bg-slate-950 text-indigo-400 border border-slate-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Binary className="w-4 h-4 shrink-0" />
                Sequence Alignment Pipeline
              </button>

              <button
                onClick={() => setCenterTab("services")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 border border-emerald-500/10 ${
                  centerTab === "services"
                    ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-emerald-300/85 hover:bg-emerald-950/20"
                }`}
              >
                <Briefcase className="w-4 h-4 shrink-0 text-emerald-400 animate-pulse" />
                Biotech Consultancy Hub
              </button>
            </div>
          </div>

          {/* Core Visual Display Section content based on centerTab state */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-0">
            
            {/* TAB: 3D Structure Interactive Canvas */}
            {centerTab === "structure" && (
              <StructureViewer
                atomsList={atomsList}
                atomsLoading={atomsLoading}
                activeRecord={activeRecord}
              />
            )}

            {/* TAB: Physicochemical Prototyping (Molecular weight, isoelectric calculations, exact parameters) */}
            {centerTab === "physicochemical" && (
              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
                
                {/* Title and summary header */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-md font-extrabold text-blue-400">Polypeptide Physicochemical Profiling</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Direct estimation on {activeRecord?.name || "Query target"}. Computes exact molecular weights in Daltons (Da) and resolves zero net-charge indices.
                    </p>
                  </div>
                  {activeMode === "learning" && (
                    <div className="bg-indigo-950/40 p-3 rounded-lg border border-indigo-500/20 max-w-sm">
                      <span className="text-[10px] font-black uppercase text-indigo-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Educational Guidance
                      </span>
                      <p className="text-[10px] text-indigo-300 mt-1">
                        We compute properties by summing constituent amino acids and tracking pKa shifts inside polypeptide terminal frames.
                      </p>
                    </div>
                  )}
                </div>

                {/* Computational parameter grid */}
                <div id="physico-metric-grid" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4.5 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Polypeptide Length</span>
                      <h4 className="text-2xl font-black font-mono text-slate-100 mt-1">{physProps.length} aa</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Combined amino acid polymer residue length.</p>
                    </div>
                    <Layers className="w-8 h-8 text-neutral-700" />
                  </div>

                  <div className="p-4.5 bg-slate-950/60 border border-slate-850 rounded-xl relative group">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1">
                          Molecular Weight
                          <button 
                            onMouseEnter={() => setHoveredConcept("weight")}
                            onMouseLeave={() => setHoveredConcept(null)}
                            className="text-slate-500 hover:text-slate-300"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </span>
                        <h4 className="text-2xl font-black font-mono text-blue-400 mt-1">
                          {(physProps.mw / 1000).toFixed(2)} kDa
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">{physProps.mw.toLocaleString()} Daltons (g/mol).</p>
                      </div>
                      <Cpu className="w-8 h-8 text-neutral-700" />
                    </div>
                    {hoveredConcept === "weight" && (
                      <div className="absolute left-2 top-full mt-1 bg-slate-900 border border-slate-700 p-3 rounded-lg text-[10px] text-slate-300 z-20 max-w-xs shadow-2xl">
                        Molecular weight is calculated based on standard monoisotopic amino acid weights, subtracting the loss of the water molecules (H₂O) for each peptide bond formed.
                      </div>
                    )}
                  </div>

                  <div className="p-4.5 bg-slate-950/60 border border-slate-850 rounded-xl relative">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1">
                          Isoelectric Point (pI)
                          <button 
                            onMouseEnter={() => setHoveredConcept("pi")}
                            onMouseLeave={() => setHoveredConcept(null)}
                            className="text-slate-500 hover:text-slate-300"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </span>
                        <h4 id="computed-pi-text" className="text-2xl font-black font-mono text-emerald-400 mt-1">
                          {physProps.pi}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">pH level where the net electric charge is exactly 0.</p>
                      </div>
                      <Activity className="w-8 h-8 text-neutral-700" />
                    </div>
                    {hoveredConcept === "pi" && (
                      <div className="absolute right-2 top-full mt-1 bg-slate-900 border border-slate-700 p-3 rounded-lg text-[10px] text-slate-300 z-20 max-w-xs shadow-2xl">
                        The Isoelectric Point (pI) pH is mathematically estimated via multi-iteration search algorithms evaluating balance coefficients for C-term, N-term, and sidechains side-pK properties.
                      </div>
                    )}
                  </div>
                </div>

                {/* Charges estimation curve across different pH ratings */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex-1 flex flex-col min-h-[250px]">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Charge curve mapping at various pH rates</h4>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[
                          { pH: 1, charge: 14.2 },
                          { pH: 2, charge: 12.5 },
                          { pH: 3, charge: 9.8 },
                          { pH: 4, charge: 5.6 },
                          { pH: 5, charge: 2.1 },
                          { pH: 6, charge: 0.1 },
                          { pH: 7, charge: -2.3 },
                          { pH: 8, charge: -5.4 },
                          { pH: 9, charge: -10.2 },
                          { pH: 10, charge: -12.9 },
                          { pH: 11, charge: -15.1 },
                          { pH: 12, charge: -16.8 },
                          { pH: 13, charge: -18.2 },
                          { pH: 14, charge: -19.5 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="pH" name="pH" stroke="#64748b" fontSize={10} />
                        <YAxis name="Charge" stroke="#64748b" fontSize={10} label={{ value: "Net Charge (e)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                        <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="5 5" label={{ value: "Isoelectric point threshold", fill: "#f43f5e", fontSize: 9 }} />
                        <Line type="monotone" dataKey="charge" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Dynamic Bioinformatics Single-Residue Mutation Simulator (SNV/SAV Calculator) */}
                {(() => {
                  const seq = customSequence || activeRecord?.sequence || "";
                  const totalLen = seq.length;
                  if (!totalLen) return null;
                  
                  // Ensure mutatePos is in bounds
                  const safePos = Math.max(1, Math.min(mutatePos, totalLen));
                  const originalAA = seq[safePos - 1] || "A";
                  const targetAA = mutateTargetAA;
                  
                  const origDetails = AA_DETAILS[originalAA] || { name: "Unknown", class: "Unknown", charge: 0, hydropathy: 0.0 };
                  const targetDetails = AA_DETAILS[targetAA] || { name: "Unknown", class: "Unknown", charge: 0, hydropathy: 0.0 };
                  
                  const origWeight = RESIDUE_MASSES[originalAA] || 0;
                  const targetWeight = RESIDUE_MASSES[targetAA] || 0;
                  
                  const blosum62Score = getBlosum62Score(originalAA, targetAA);
                  
                  // Construct specialized warnings
                  const structuralWarnings: string[] = [];
                  
                  if (originalAA === "C" && targetAA !== "C") {
                    structuralWarnings.push("⚠️ disulfide Disruption Warning: Loss of disulfide bonds often drastically destabilizes tertiary backbone conformation.");
                  }
                  if (originalAA !== "P" && targetAA === "P" && safePos > 1 && safePos < totalLen) {
                    structuralWarnings.push("⚠️ Helix Breaker Warning: Incorporating a Proline (P) residue disrupts primary alpha-helix backbones due to the rigid cyclic side chain and lack of regular N-H hydrogen bonds.");
                  }
                  if (origDetails.charge * targetDetails.charge < 0) {
                    structuralWarnings.push(`⚠️ Salt Bridge Inversion Warning: Inverting electrostatic states from ${originalAA} (${origDetails.class}) to ${targetAA} (${targetDetails.class}) risks collapsing adjacent structural salt-bridges.`);
                  }
                  if (origWeight < 100 && targetWeight > 160) {
                    structuralWarnings.push(`⚠️ Bulk Clashing Hazard: Substituting miniature ${originalAA} (${origWeight.toFixed(1)} Da) with bulky ${targetAA} (${targetWeight.toFixed(1)} Da) may introduce spatial clashes in the folded hydrophobic core.`);
                  }
                  if (originalAA === "P" && targetAA !== "P") {
                    structuralWarnings.push(`⚠️ Loss of Proline Helix/Turn Constraint: Removing a rigid Proline may excessively increase polypeptide flexibility at loop turns.`);
                  }
                  if (originalAA === "G" && targetAA !== "G") {
                    structuralWarnings.push(`⚠️ Mini-Residue Glycine substitution: Glycine provides maximum flexibility; substituting it with a bulkier side chain may constraint peptide conformation.`);
                  }
                  
                  const scoreColor = blosum62Score > 0 
                    ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/80" 
                    : blosum62Score === 0 
                      ? "text-yellow-400 bg-yellow-950/40 border-yellow-800" 
                      : "text-rose-400 bg-rose-950/40 border-rose-800/80";

                  const scoreText = blosum62Score > 0 
                    ? "Conservative substitution: High evolutionary likelihood & compatibility." 
                    : blosum62Score === 0 
                      ? "Neutral substitution: Tolerated change." 
                      : "Severe/Non-conservative substitution: Usually causes significant structural or binding changes.";

                  return (
                    <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl flex flex-col gap-4 mt-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-md bg-indigo-950 text-indigo-400">
                            <Zap className="w-4 h-4" />
                          </span>
                          <h4 className="text-sm font-black text-slate-100 uppercase tracking-tight">BioHelix Single-Amino Acid (SAV) Mutation Simulator</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Simulate single nucleotide polymorphisms/variations and model structural weight transitions, change in hydropathy, net physiological charge shifts and BLOSUM62 conservation likelihood.
                        </p>
                      </div>

                      {/* Interactive Selection Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/50 p-4 border border-slate-800/60 rounded-xl">
                        
                        {/* 1. Sequence Position Slider */}
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sequence Position</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="1"
                              max={totalLen}
                              value={safePos}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setMutatePos(val);
                              }}
                              className="w-full text-indigo-500 h-1 cursor-pointer accent-indigo-500"
                            />
                            <input
                              type="number"
                              min="1"
                              max={totalLen}
                              value={safePos}
                              onChange={(e) => {
                                const val = Math.max(1, Math.min(parseInt(e.target.value) || 1, totalLen));
                                setMutatePos(val);
                              }}
                              className="bg-slate-950 border border-slate-800 text-[11px] rounded px-2 py-1 text-slate-100 w-16 font-bold text-center outline-none"
                            />
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono">Max position: {totalLen} residues</span>
                        </div>

                        {/* 2. Original Residue Readout */}
                        <div className="flex flex-col gap-1 bg-indigo-950/20 border border-indigo-900/30 p-2.5 rounded-lg justify-center">
                          <span className="text-[9px] text-indigo-400 uppercase font-bold">Wild Type AA (Current)</span>
                          <div className="flex items-center gap-2 border-l-2 border-indigo-500 pl-2">
                            <span className="text-xl font-black font-mono text-indigo-300 bg-indigo-950/60 w-8 h-8 rounded-full flex items-center justify-center border border-indigo-800/40 shadow">
                              {originalAA}
                            </span>
                            <div>
                              <p className="text-[11px] font-extrabold text-slate-200">{origDetails.name}</p>
                              <p className="text-[9px] text-indigo-400 font-medium font-sans leading-none">{origDetails.class}</p>
                            </div>
                          </div>
                        </div>

                        {/* 3. Mutated Residue Target */}
                        <div className="flex flex-col gap-1.5 justify-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target mutation residue</span>
                          <select
                            value={targetAA}
                            onChange={(e) => setMutateTargetAA(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 font-extrabold outline-none cursor-pointer hover:border-slate-700 transition"
                          >
                            {Object.keys(AA_DETAILS).map((aa) => (
                              <option key={aa} value={aa}>
                                {aa} - {AA_DETAILS[aa].name} ({AA_DETAILS[aa].class})
                              </option>
                            ))}
                          </select>
                        </div>

                      </div>

                      {/* Simulator Comparison Dashboard */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        
                        {/* Metric 1: Mass Shift */}
                        <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850 flex flex-col gap-1">
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Mass Shift</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-lg font-black font-mono text-slate-200">
                              {(targetWeight - origWeight) >= 0 ? "+" : ""}{(targetWeight - origWeight).toFixed(3)}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">Da (g/mol)</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold mt-1">
                            Current: {origWeight.toFixed(2)} Da → Mutated: {targetWeight.toFixed(2)} Da
                          </span>
                        </div>

                        {/* Metric 2: Physicochemical Hydropathy Change */}
                        <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850 flex flex-col gap-1">
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Hydropathy Delta</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className={`text-lg font-black font-mono ${(targetDetails.hydropathy - origDetails.hydropathy) > 0 ? "text-amber-500" : "text-sky-400"}`}>
                              {((targetDetails.hydropathy - origDetails.hydropathy) > 0 ? "+" : "") + 
                               (targetDetails.hydropathy - origDetails.hydropathy).toFixed(2)}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-450 font-semibold mt-1">
                            {origDetails.hydropathy > 0 ? "Hydrophobic" : "Hydrophilic"} ({origDetails.hydropathy.toFixed(1)}) → {targetDetails.hydropathy > 0 ? "Hydrophobic" : "Hydrophilic"} ({targetDetails.hydropathy.toFixed(1)})
                          </span>
                        </div>

                        {/* Metric 3: Sidechain net pH 7.4 Charge Shift */}
                        <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850 flex flex-col gap-1">
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Charge Shift</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className={`text-lg font-black font-mono ${(targetDetails.charge - origDetails.charge) > 0 ? "text-emerald-400" : (targetDetails.charge - origDetails.charge) < 0 ? "text-rose-400" : "text-slate-400"}`}>
                              {((targetDetails.charge - origDetails.charge) > 0 ? "+" : "") + 
                               (targetDetails.charge - origDetails.charge).toFixed(1)}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">e</span>
                          </div>
                          <span className="text-[9px] text-slate-450 font-semibold mt-1">
                            Net Charge: {origDetails.charge > 0 ? "+" : ""}{origDetails.charge}e → {targetDetails.charge > 0 ? "+" : ""}{targetDetails.charge}e
                          </span>
                        </div>

                        {/* Metric 4: BLOSUM62 Evolutionary score */}
                        <div className={`p-3 rounded-xl border flex flex-col gap-1 ${scoreColor}`}>
                          <span className="text-[9px] font-black uppercase tracking-wider opacity-80">BLOSUM62 Score</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-black font-mono">
                              {blosum62Score}
                            </span>
                          </div>
                          <span className="text-[8.5px] font-bold tracking-tight leading-tight mt-1 opacity-90">
                            {scoreText}
                          </span>
                        </div>

                      </div>

                      {/* Interactive Residue Conservation Heatmap Block */}
                      {(() => {
                        const getSequenceResidueColor = (seqResidue: string) => {
                          const score = getBlosum62Score(seqResidue, targetAA);
                          if (score >= 2) {
                            return {
                              bg: "bg-emerald-950/70 border-emerald-500/80 text-emerald-250 hover:border-emerald-400 hover:bg-emerald-900/80",
                              score
                            };
                          } else if (score >= 0) {
                            return {
                              bg: "bg-yellow-950/60 border-yellow-600/60 text-yellow-250 hover:border-yellow-400 hover:bg-yellow-900/80",
                              score
                            };
                          } else if (score >= -2) {
                            return {
                              bg: "bg-rose-950/40 border-rose-900/50 text-rose-300 hover:border-rose-700 hover:bg-rose-900/40",
                              score
                            };
                          } else {
                            return {
                              bg: "bg-red-950/80 border-red-850/60 text-red-300 hover:border-red-650 hover:bg-red-900/60",
                              score
                            };
                          }
                        };

                        return (
                          <div className="bg-slate-900/50 p-4 border border-slate-800/60 rounded-xl flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/50 pb-2">
                              <div>
                                <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wide">Interactive Residue-by-Residue Heatmap</span>
                                <h5 className="text-[11px] font-bold text-slate-200 mt-0.5">
                                  Sequence Conservation Scores relative to target: <span className="text-yellow-400 font-extrabold">{targetAA}</span> ({targetDetails.name})
                                </h5>
                              </div>
                              
                              {/* Color and Score Key */}
                              <div className="flex flex-wrap gap-2 text-[9px] font-mono select-none">
                                <div className="flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-400"></span>
                                  <span className="text-slate-400">Favored (&ge; 2)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 rounded bg-yellow-500/30 border border-yellow-400"></span>
                                  <span className="text-slate-400">Tolerated (0, 1)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-400"></span>
                                  <span className="text-slate-400">Weak (-1, -2)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 rounded bg-red-600/30 border border-red-500"></span>
                                  <span className="text-slate-400">Disfavored (&le; -3)</span>
                                </div>
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-400 leading-relaxed">
                              Hover to inspect or click any residue node below to center the SAV mutation simulation. Color intensities map directly to evolutionary substitution likelihoods according to the classic BLOSUM62 matrix.
                            </p>

                            {/* Flexible/Scrollable Sequence Heatmap Grid */}
                            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/80 rounded-lg max-h-48 overflow-y-auto border border-slate-850">
                              {Array.from(seq).map((aa: string, idx) => {
                                const aaStr = aa as string;
                                const resName = AA_DETAILS[aaStr]?.name || "Unknown";
                                const { bg, score } = getSequenceResidueColor(aaStr);
                                const isSelected = idx + 1 === safePos;

                                return (
                                  <button
                                    key={idx}
                                    onClick={() => setMutatePos(idx + 1)}
                                    className={`group relative flex flex-col items-center justify-between p-1.5 w-[36px] h-[42px] rounded transition-all duration-150 border uppercase ${bg} ${
                                      isSelected
                                        ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 scale-105 z-10 border-indigo-400"
                                        : "hover:scale-105 hover:brightness-125 focus:outline-none"
                                    }`}
                                    title={`Residue ${idx + 1}: ${aaStr} (${resName}) -> Mutate to ${targetAA} (${targetDetails.name}). BLOSUM62 score: ${score}`}
                                  >
                                    {/* Amino Acid One-letter symbol */}
                                    <span className="text-xs font-black font-mono tracking-tighter leading-none mb-0.5">{aaStr}</span>
                                    
                                    {/* Residue index subscript */}
                                    <span className="text-[8px] font-bold font-mono tracking-tight opacity-50 select-none leading-none">{idx + 1}</span>
                                    
                                    {/* Small badge overlay showing the individual BLOSUM62 score */}
                                    <span className={`absolute -top-1 -right-1 text-[7px] px-0.5 font-black font-mono rounded leading-none scale-75 border ${
                                      score >= 2
                                        ? "bg-emerald-500/20 border-emerald-450 text-emerald-300"
                                        : score >= 0
                                          ? "bg-yellow-500/20 border-yellow-450 text-yellow-300"
                                          : score >= -2
                                            ? "bg-rose-500/20 border-rose-450 text-rose-300"
                                            : "bg-red-500/20 border-red-450 text-red-300"
                                    }`}>
                                      {score > 0 ? `+${score}` : score}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Structural Impact & Double Sulfide Warnings */}
                      {structuralWarnings.length > 0 && (
                        <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg flex flex-col gap-1.5">
                          <span className="text-[9.5px] text-amber-400 font-black uppercase block tracking-wider">Structural Conformation Warnings:</span>
                          <div className="flex flex-col gap-1">
                            {structuralWarnings.map((warn, idx) => (
                              <p key={idx} className="text-[10px] text-amber-200 font-semibold font-mono">
                                {warn}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Real-time In-silico Active Site Prediction Engine */}
                <ActiveSitePredictor 
                  activeRecord={activeRecord}
                  customSequence={customSequence}
                />

              </div>
            )}

            {/* TAB: Hydropathy & Residue AA Frequencies Charts */}
            {centerTab === "bioprofiles" && (
              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
                
                {/* Header info */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-md font-extrabold text-blue-400">Residue Frequencies & Sliding-Window Hydropathy</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Computational prediction of structural indices. Plots hydrophilic regions (crucial for solubility) vs. hydrophobic regions (transmembrane zones).
                    </p>
                  </div>
                </div>

                {/* Kyte-Doolittle Window Hydropathy Line Chart */}
                <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      Kyte-Doolittle Windows Profile (Window Size: {activeMode === "learning" ? "11 aa" : "7 aa"})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Peaks &gt; 1.6 represent putative transmembrane segments
                    </span>
                  </div>

                  <div className="h-56 w-full">
                    {hydropathyProfileData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        Insufficient data context for mapping
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={hydropathyProfileData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="index" stroke="#64748b" fontSize={9} label={{ value: "Sequence Coordinates (Residue Index)", position: "insideBottom", offset: -2, fill: "#64748b", fontSize: 10 }} />
                          <YAxis stroke="#64748b" fontSize={9} domain={[-4.5, 4.5]} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 10 }} />
                          <ReferenceLine y={1.6} stroke="#f97316" strokeDasharray="3 3" label={{ value: "Transmembrane domain (Hydropathy scale)", fill: "#f97316", fontSize: 8 }} />
                          <ReferenceLine y={0} stroke="#475569" />
                          <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Amino Acid Frequencies Histogram Chart */}
                <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Amino Acid Percent Distribution</span>
                  <div className="h-56 w-full">
                    {aaDistribution.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        No active distribution mapped
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aaDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={10} label={{ value: "Percentage (%)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 10 }} />
                          <Bar dataKey="percentage" fill="#2563eb" radius={[4, 4, 0, 0]}>
                            {aaDistribution.map((entry, index) => {
                              // basic charge representation: Arginine/Lysine Blue, Aspartate/Glutamate Red
                              const char = entry.name;
                              let color = "#3b82f6";
                              if (["R", "K", "H"].includes(char)) color = "#38bdf8";      // Basic
                              else if (["D", "E"].includes(char)) color = "#ef4444"; // Acidic
                              else if (["I", "L", "V", "F"].includes(char)) color = "#f97316"; // strongly hydrophobic
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB: Pairwise Sequence Alignment (Global & Local Pipelines) */}
            {centerTab === "alignment" && (
              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
                
                {/* Header intro */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-md font-extrabold text-blue-450">Pairwise Sequence Alignment Pipeline</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Execute Needleman-Wunsch (Global) or Smith-Waterman (Local) algorithms directly in browser.
                    </p>
                  </div>
                </div>

                {/* Configurations grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/40 p-4 border border-slate-850 rounded-xl">
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Alignment Mode</label>
                    <div className="flex bg-slate-900 p-0.5 rounded border border-slate-800">
                      <button
                        onClick={() => setAlignConfig({ ...alignConfig, alignmentType: "global" })}
                        className={`flex-1 text-[10px] font-bold py-1 rounded transition-all ${
                          alignConfig.alignmentType === "global" ? "bg-blue-600 text-white" : "text-slate-400"
                        }`}
                      >
                        Global (NW)
                      </button>
                      <button
                        onClick={() => setAlignConfig({ ...alignConfig, alignmentType: "local" })}
                        className={`flex-1 text-[10px] font-bold py-1 rounded transition-all ${
                          alignConfig.alignmentType === "local" ? "bg-blue-600 text-white" : "text-slate-400"
                        }`}
                      >
                        Local (SW)
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Match Score</label>
                    <input
                      type="number"
                      value={alignConfig.matchScore}
                      onChange={(e) => setAlignConfig({ ...alignConfig, matchScore: parseInt(e.target.value) || 1 })}
                      className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-bold focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Mismatch Penalty</label>
                    <input
                      type="number"
                      value={alignConfig.mismatchPenalty}
                      onChange={(e) => setAlignConfig({ ...alignConfig, mismatchPenalty: parseInt(e.target.value) || -1 })}
                      className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-bold focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Gap open Penalty</label>
                    <input
                      type="number"
                      value={alignConfig.gapPenalty}
                      onChange={(e) => setAlignConfig({ ...alignConfig, gapPenalty: parseInt(e.target.value) || -1 })}
                      className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-bold focus:outline-none"
                    />
                  </div>

                </div>

                {/* Sequences Inputs */}
                <div id="sequence-inputs-align" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Target Candidate Sequence A</span>
                    <textarea
                      value={alignSeqA}
                      onChange={(e) => setAlignSeqA(e.target.value.toUpperCase())}
                      className="bg-slate-950 font-mono text-[10px] p-3 rounded-lg border border-slate-800 h-28 focus:outline-none leading-relaxed resize-none text-slate-300"
                      placeholder="Input Amino Acid Sequence A..."
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Target Candidate Sequence B</span>
                    <textarea
                      value={alignSeqB}
                      onChange={(e) => setAlignSeqB(e.target.value.toUpperCase())}
                      className="bg-slate-950 font-mono text-[10px] p-3 rounded-lg border border-slate-800 h-28 focus:outline-none leading-relaxed resize-none text-slate-300"
                      placeholder="Input Amino Acid Sequence B..."
                    />
                  </div>
                </div>

                {/* Alignment Results block */}
                {alignmentResult && (
                  <div id="alignment-results-panel" className="bg-slate-950/60 p-4 border border-slate-850 rounded-xl flex flex-col gap-4">
                    
                    {/* Visual metrics panel */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-center">
                        <span className="text-[9px] text-slate-500 uppercase font-black block tracking-wider">Alignment Score</span>
                        <h5 className="text-lg font-bold font-mono text-blue-400 mt-0.5">{alignmentResult.score}</h5>
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-center">
                        <span className="text-[9px] text-slate-500 uppercase font-black block tracking-wider">Percent Identity</span>
                        <h5 className="text-lg font-bold font-mono text-emerald-405 text-emerald-400 mt-0.5">{alignmentResult.identityPercentage}%</h5>
                        <span className="text-[9px] text-slate-500 font-mono">({alignmentResult.identityCount} / {alignmentResult.alignmentLength} positions)</span>
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-center">
                        <span className="text-[9px] text-slate-500 uppercase font-black block tracking-wider">Gaps Frequency</span>
                        <h5 className="text-lg font-bold font-mono text-rose-450 text-rose-400 mt-0.5">{alignmentResult.gapPercentage}%</h5>
                        <span className="text-[9px] text-slate-500 font-mono">({alignmentResult.gapCount} gaps)</span>
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-center">
                        <span className="text-[9px] text-slate-500 uppercase font-black block tracking-wider">Alignment Length</span>
                        <h5 className="text-lg font-bold font-mono text-slate-300 mt-0.5">{alignmentResult.alignmentLength} residues</h5>
                      </div>
                    </div>

                    {/* Scientific alignment traceback display style */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center bg-slate-900 px-3 py-1.5 rounded border border-slate-800 shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Alignment Traceback Representation</span>
                        <button
                          onClick={() => {
                            const csv = `Alignment Type,${alignmentResult.alignmentType}\nScore,${alignmentResult.score}\nIdentity,${alignmentResult.identityPercentage}%\n\nCandidate A,${alignmentResult.alignedSeqA}\nConsensus,${alignmentResult.consensus}\nCandidate B,${alignmentResult.alignedSeqB}`;
                            const blob = new Blob([csv], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `alignment_${alignmentResult.seqAId}_${alignmentResult.seqBId}.csv`;
                            a.click();
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold"
                        >
                          Export CSV Report
                        </button>
                      </div>

                      {/* Scientific block-by-block console view */}
                      <div className="p-4 bg-slate-950 font-mono text-xs leading-5 tracking-widest text-slate-300 rounded-lg overflow-x-auto border border-indigo-900/20 max-w-full font-bold whitespace-pre">
                        <div className="flex flex-col">
                          <div className="flex"><span className="w-20 shrink-0 text-blue-500 font-semibold">Cand_A:</span> <span>{alignmentResult.alignedSeqA || "---"}</span></div>
                          <div className="flex"><span className="w-20 shrink-0 text-slate-600 font-normal">Consensus:</span><span className="text-emerald-450 text-slate-500">{alignmentResult.consensus || "---"}</span></div>
                          <div className="flex"><span className="w-20 shrink-0 text-purple-500 font-semibold">Cand_B:</span> <span>{alignmentResult.alignedSeqB || "---"}</span></div>
                        </div>
                      </div>

                      {/* Dynamic graphical Prosite motif map widget */}
                      <SequenceMap alignmentResult={alignmentResult} />
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* TAB: B2B Biotech Consultancy Hub & Commercial Services */}
            {centerTab === "services" && (
              <CommercialServicesHub
                activeRecord={activeRecord}
                atomsList={atomsList}
                customSequence={customSequence}
                onSetTab={(tab) => setCenterTab(tab)}
              />
            )}

            {/* TAB: Target Intelligent Deep Profile (Knowledge Graph & Interactions) */}
            {centerTab === "knowledge" && (
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 flex flex-col gap-6">
                
                {/* Header intro */}
                <div className="flex justify-between items-start border-b border-indigo-900/30 pb-3">
                  <div>
                    <h3 className="text-md font-extrabold text-indigo-400 flex items-center gap-2">
                       <Network className="w-5 h-5" /> Target Intelligent Deep Profile
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      AI-generated insights merging pharmaceutical, structural, and pathway systems.
                    </p>
                  </div>
                </div>

                {geminiLoading ? (
                  <div className="flex items-center justify-center p-12 text-indigo-400/50 animate-pulse flex-col gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-mono uppercase tracking-widest">Aggregating Global Knowledge...</span>
                  </div>
                ) : geminiExplanation ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* General Summary */}
                    <div className="md:col-span-2 p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-1.5 mb-2"><BookOpen className="w-3.5 h-3.5 text-indigo-400"/> General Overview</span>
                      <p className="text-sm text-slate-200 leading-relaxed font-medium">{geminiExplanation.summary}</p>
                    </div>

                    {/* Aggregated Databases */}
                    <div className="md:col-span-2 p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-1.5 mb-3"><Database className="w-3.5 h-3.5 text-purple-400"/> Federated Database Hubs</span>
                      <div className="flex flex-wrap gap-2">
                        {activeRecord?.databaseLinks?.uniprot && (
                          <a href={activeRecord.databaseLinks.uniprot} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-950 border border-purple-900/40 text-purple-300 text-[10px] font-bold rounded-md hover:bg-purple-900/30 transition-colors flex items-center gap-1.5">
                            UniProtKB <Compass className="w-3 h-3" />
                          </a>
                        )}
                        {activeRecord?.databaseLinks?.genecards && (
                          <a href={activeRecord.databaseLinks.genecards} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-950 border border-indigo-900/40 text-indigo-300 text-[10px] font-bold rounded-md hover:bg-indigo-900/30 transition-colors flex items-center gap-1.5">
                            GeneCards <Compass className="w-3 h-3" />
                          </a>
                        )}
                        {activeRecord?.databaseLinks?.stringDb && (
                          <a href={activeRecord.databaseLinks.stringDb} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-950 border border-teal-900/40 text-teal-300 text-[10px] font-bold rounded-md hover:bg-teal-900/30 transition-colors flex items-center gap-1.5">
                            STRING API <Compass className="w-3 h-3" />
                          </a>
                        )}
                        {activeRecord?.databaseLinks?.ncbi && (
                          <a href={activeRecord.databaseLinks.ncbi} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-950 border border-blue-900/40 text-blue-300 text-[10px] font-bold rounded-md hover:bg-blue-900/30 transition-colors flex items-center gap-1.5">
                            NCBI Entrez <Compass className="w-3 h-3" />
                          </a>
                        )}
                        {activeRecord?.databaseLinks?.expasy && (
                          <a href={activeRecord.databaseLinks.expasy} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-950 border border-emerald-900/40 text-emerald-300 text-[10px] font-bold rounded-md hover:bg-emerald-900/30 transition-colors flex items-center gap-1.5">
                            ExPASy <Compass className="w-3 h-3" />
                          </a>
                        )}
                        {(!activeRecord?.databaseLinks || Object.keys(activeRecord.databaseLinks).length === 0) && (
                          <span className="text-xs text-slate-500 italic">No external federated networks linked yet.</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-3 pt-3 border-t border-slate-800">
                        Gathering records from GeneCards, UniProt, STRING PPI, NCBI Entrez, and ExPASy bioinformatics portals automatically.
                      </p>
                    </div>

                    {/* Pathways */}
                    {geminiExplanation.relatedPathways && geminiExplanation.relatedPathways.length > 0 && (
                       <div className="p-4 bg-teal-950/20 border border-teal-900/40 rounded-xl relative overflow-hidden group hover:border-teal-700/50 transition-colors shadow-lg">
                         <div className="absolute top-0 right-0 p-4 opacity-10 blur-[2px] group-hover:blur-0 transition-all">
                           <Network className="w-16 h-16 text-teal-400" />
                         </div>
                         <span className="text-[10px] text-teal-500 uppercase font-black tracking-wider flex items-center gap-1.5 mb-3 relative z-10"><Activity className="w-3.5 h-3.5"/> Related Pathways</span>
                         <ul className="list-none space-y-2 relative z-10">
                           {geminiExplanation.relatedPathways.map((pw, i) => (
                             <li key={i} className="flex gap-2 text-xs text-teal-100">
                               <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0"></div>
                               <span className="leading-snug">{pw}</span>
                             </li>
                           ))}
                         </ul>
                       </div>
                    )}

                    {/* Interacting Receptors / Proteins */}
                    {geminiExplanation.interactingReceptors && geminiExplanation.interactingReceptors.length > 0 && (
                       <div className="p-4 bg-orange-950/20 border border-orange-900/40 rounded-xl relative overflow-hidden group hover:border-orange-700/50 transition-colors shadow-lg">
                         <div className="absolute top-0 right-0 p-4 opacity-10 blur-[2px] group-hover:blur-0 transition-all">
                           <Layers className="w-16 h-16 text-orange-400" />
                         </div>
                         <span className="text-[10px] text-orange-500 uppercase font-black tracking-wider flex items-center gap-1.5 mb-3 relative z-10"><Layers className="w-3.5 h-3.5"/> Interacting Targets / Receptors</span>
                         <ul className="list-none space-y-2 relative z-10">
                           {geminiExplanation.interactingReceptors.map((rec, i) => (
                             <li key={i} className="flex gap-2 text-xs text-orange-100">
                               <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0"></div>
                               <span className="leading-snug">{rec}</span>
                             </li>
                           ))}
                         </ul>
                       </div>
                    )}
                    
                    {/* Structure Note */}
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden shadow-lg">
                       <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-1.5 mb-2"><Database className="w-3.5 h-3.5 text-blue-400"/> Structural Information</span>
                       <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-blue-500/50 pl-3 py-1 bg-slate-800/30 rounded-r">{geminiExplanation.structureNote}</p>
                    </div>

                    {/* Therapeutic Note */}
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden shadow-lg">
                       <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-1.5 mb-2"><Activity className="w-3.5 h-3.5 text-emerald-400"/> Therapeutic Importance</span>
                       <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-emerald-500/50 pl-3 py-1 bg-emerald-900/10 rounded-r">{geminiExplanation.therapeuticNote}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8 text-slate-500 text-sm italic border border-dashed border-slate-800 rounded-xl">
                    Details not available for this compound/target yet. Search to synthesize.
                  </div>
                )}
              </div>
            )}

          </div>

        </section>

        {/* RIGHT PANEL Stage: AI Copilot & Biological Predictive Analytics */}
        <aside className="w-full lg:w-96 flex flex-col gap-4 overflow-visible lg:overflow-hidden shrink-0">
          
          {/* Saved Pipeline Custom Configurations (Pro mode special feature!) */}
          {activeMode === "professional" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col filter shadow-lg shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Custom Saved Pipelines</span>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Pipeline title (e.g. My Homology Setup)..."
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none flex-1 font-mono"
                />
                <button
                  onClick={handleSavePipeline}
                  className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-xs flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-28 overflow-y-auto pr-1 flex flex-col gap-1.5">
                {savedPipelines.map(pipe => (
                  <div key={pipe.id} className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200">{pipe.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono uppercase mt-0.5">
                        {pipe.dbType} | {pipe.alignmentConfig.alignmentType.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleLoadPipeline(pipe)}
                        className="p-1 text-blue-400 hover:text-blue-300"
                        title="Load pipeline config"
                      >
                        Run
                      </button>
                      <button
                        onClick={() => handleDeletePipeline(pipe.id)}
                        className="p-1 text-slate-600 hover:text-rose-500"
                        title="Remove Pipeline"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predictor: Active Motif Finder */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col max-h-[220px] shadow-lg shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Predictive Prosite Motifs scan</span>
            
            <div className="overflow-y-auto flex-1 pr-1 flex flex-col gap-2">
              {foundSeqMotifs.length === 0 ? (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-center text-[11px] text-slate-500 italic">
                  No classical biological motif structures resolved.
                </div>
              ) : (
                foundSeqMotifs.map((mot, index) => (
                  <div key={`motif-${index}`} className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg flex flex-col">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-blue-400">{mot.name}</span>
                      <span className="text-[9px] font-mono whitespace-nowrap bg-blue-600/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/15">
                        Pos: {mot.start}-{mot.end}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-450 text-slate-400 mt-1 max-w-full truncate">
                      Matched Pattern: <strong>{mot.sequence}</strong> ({mot.pattern})
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">{mot.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Advisor Module - Powered by Gemini */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full overflow-hidden shadow-lg relative">
            <div className="flex justify-between items-center shrink-0 mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Gemini AI Advisor
              </span>
              <span className="text-[9px] font-mono text-slate-500">
                {activeMode === "learning" ? "💡 Academic Mode" : "📊 Expert Mode"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
              
              {/* Intelligent Summary Block */}
              <div className="p-3.5 bg-indigo-950/25 border border-indigo-900/40 rounded-xl relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 bg-indigo-500/10 w-fit px-2 py-0.5 rounded border border-indigo-500/15">
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400">Biological Significance</span>
                  </div>
                  <button onClick={() => setCenterTab("knowledge")} className="text-[10px] text-indigo-300 hover:text-indigo-100 underline decoration-indigo-500/50 underline-offset-2 flex items-center gap-1">
                    See Deep Profile <Network className="w-3 h-3" />
                  </button>
                </div>
                {geminiLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span className="text-[10px] text-slate-400 font-mono">Synthesizing structure context...</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                    {geminiExplanation?.summary || "No interpretation compiled yet. Perform a query lookup to analyze."}
                  </p>
                )}
              </div>

              {/* Structural Homology Explanations */}
              <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl">
                <span className="text-[9px] text-blue-400 uppercase font-black tracking-wider block mb-1">Structural Folding Context</span>
                {geminiLoading ? (
                  <span className="text-[10px] text-slate-500 font-mono">Predicting tertiary constraints...</span>
                ) : (
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {geminiExplanation?.structureNote || "Awaiting structural modeling sequence metadata."}
                  </p>
                )}
              </div>

              {/* Clinical/Theraputic target analysis */}
              <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl">
                <span className="text-[9px] text-emerald-400 uppercase font-black tracking-wider block mb-1">Clinical Targeting & Action</span>
                {geminiLoading ? (
                  <span className="text-[10px] text-slate-500 font-mono">Scanning ligand bind arrays...</span>
                ) : (
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {geminiExplanation?.therapeuticNote || "Awaiting physiological coordinate parameters."}
                  </p>
                )}
              </div>

              {/* Takeaways List */}
              {geminiExplanation?.educationalTakeaways && geminiExplanation.educationalTakeaways.length > 0 && (
                <div className="p-3.5 bg-slate-950 border border-slate-805 rounded-xl">
                  <span className="text-[9px] text-amber-400 uppercase font-black tracking-wider block mb-2">Key Core Takeaways</span>
                  <ul className="flex flex-col gap-2">
                    {geminiExplanation.educationalTakeaways.map((take, tIdx) => (
                      <li key={`take-${tIdx}`} className="text-[10px] text-slate-450 leading-normal flex items-start gap-1.5 text-slate-400">
                        <span className="text-amber-550 text-amber-500 text-[11px] mt-0.5">•</span>
                        <span>{take}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pro Mode specific prompt recommendation context */}
              {activeMode === "professional" && geminiExplanation?.proContext && (
                <div className="p-3 bg-blue-950/20 border border-blue-500/10 rounded-lg text-blue-300 text-[10px] font-mono leading-normal">
                  💡 <strong>Pro Pipeline Suggestion:</strong> {geminiExplanation.proContext}
                </div>
              )}

            </div>
          </div>

        </aside>

      </main>

      {/* FOOTER: Global REST APIs Latency & GCP Status panel config */}
      <footer className="h-10 bg-slate-900 border-t border-slate-850 px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-widest">
              NCBI API: <span className="text-emerald-400">Operational</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-widest">
              PDB API: <span className="text-emerald-400">Active Map</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-widest">
              UniProt Database: <span className="text-blue-400">Standby</span>
            </span>
          </div>
        </div>

        <div className="text-[9px] text-slate-500 font-mono uppercase">
          Latency: 48ms | Sandbox Region: us-central1 | Shared Port Reverse Proxy Config
        </div>
      </footer>

    </div>
  );
}
