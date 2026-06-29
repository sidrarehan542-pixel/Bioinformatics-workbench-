/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  RotateCw,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  HelpCircle,
  Maximize2,
  Minimize2,
  Settings,
  Layers,
  Grid,
  Compass,
  Crosshair,
  Activity,
  Award,
  RefreshCw,
  Eye,
  Percent,
  Download,
  Flame,
  Binary,
  Move,
  Hand
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ProteinData } from "../types";

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

interface StructureViewerProps {
  atomsList: SeedAtom[];
  atomsLoading: boolean;
  activeRecord: ProteinData | null;
}

// 3D Rotation helper
const rotate3D = (
  x: number,
  y: number,
  z: number,
  angleX: number,
  angleY: number,
  angleZ: number
) => {
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

export default function StructureViewer({
  atomsList,
  atomsLoading,
  activeRecord,
}: StructureViewerProps) {
  // Rendering & Camera State
  const [rotationX, setRotationX] = useState<number>(0.5);
  const [rotationY, setRotationY] = useState<number>(0.5);
  const [rotationZ, setRotationZ] = useState<number>(0.0);
  const [zoomRatio, setZoomRatio] = useState<number>(6.5);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [dragMode, setDragMode] = useState<"rotate" | "pan">("rotate");
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState<number>(0.015);
  const [autoRotateAxis, setAutoRotateAxis] = useState<"Y" | "X" | "Z">("Y");

  // Interaction Styles
  const [renderStyle, setRenderStyle] = useState<"cartoon" | "beads" | "wireframe">("cartoon");
  const [stylingColor, setStylingColor] = useState<"chain" | "hydropathy" | "element" | "charge" | "secondary">("chain");
  const [prevColorMode, setPrevColorMode] = useState<"chain" | "hydropathy" | "element" | "charge">("chain");

  // Advanced Visual Toggles
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showBoundingBox, setShowBoundingBox] = useState<boolean>(false);
  const [enableDepthCueing, setEnableDepthCueing] = useState<boolean>(true);
  const [glowEffect, setGlowEffect] = useState<boolean>(true);

  // Measure / Distance Mode States
  const [measureMode, setMeasureMode] = useState<boolean>(false);
  const [selectedAtoms, setSelectedAtoms] = useState<SeedAtom[]>([]);

  // Selected Inspecting Atom
  const [inspectedAtom, setInspectedAtom] = useState<SeedAtom | null>(null);

  // Mouse drag control for orbit
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Ref to track requestAnimationFrame for smooth camera transitions
  const cameraAnimRef = useRef<number | null>(null);

  // Smooth Interpolated Camera Swapper
  const startCameraTransition = (
    targetRotX: number,
    targetRotY: number,
    targetRotZ: number,
    targetZoom: number,
    targetPanX: number,
    targetPanY: number,
    targetColor?: typeof stylingColor,
    targetStyle?: typeof renderStyle
  ) => {
    if (cameraAnimRef.current) {
      cancelAnimationFrame(cameraAnimRef.current);
    }
    setAutoRotate(false);

    const duration = 750; // ms transition length
    const startTime = performance.now();

    // Capture exact current coordinates at start instant
    const startRotX = rotationX;
    const startRotY = rotationY;
    const startRotZ = rotationZ;
    const startZoom = zoomRatio;
    const startPanX = panX;
    const startPanY = panY;

    // Apply aesthetics (color + view style mapping) instantly for amazing synchronization
    if (targetColor) setStylingColor(targetColor);
    if (targetStyle) setRenderStyle(targetStyle);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth Easing curve (Cubic Ease-In-Out)
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Calculate next step
      const nextRotX = startRotX + (targetRotX - startRotX) * ease;
      const nextRotY = startRotY + (targetRotY - startRotY) * ease;
      const nextRotZ = startRotZ + (targetRotZ - startRotZ) * ease;
      const nextZoom = startZoom + (targetZoom - startZoom) * ease;
      const nextPanX = startPanX + (targetPanX - startPanX) * ease;
      const nextPanY = startPanY + (targetPanY - startPanY) * ease;

      setRotationX(nextRotX);
      setRotationY(nextRotY);
      setRotationZ(nextRotZ);
      setZoomRatio(nextZoom);
      setPanX(nextPanX);
      setPanY(nextPanY);

      if (progress < 1) {
        cameraAnimRef.current = requestAnimationFrame(animate);
      } else {
        cameraAnimRef.current = null;
      }
    };

    cameraAnimRef.current = requestAnimationFrame(animate);
  };

  // Camera orientation & Scientific Focus presets with smooth transitions
  const applyPreset = (preset: "front" | "back" | "top" | "side" | "diagonal" | "activesite" | "hydrophobic" | "charge") => {
    let targetRotX = 0;
    let targetRotY = 0;
    let targetRotZ = 0;
    let targetZoom = 6.5;
    let targetPanX = 0;
    let targetPanY = 0;
    let targetColor: typeof stylingColor | undefined = undefined;
    let targetStyle: typeof renderStyle | undefined = undefined;

    switch (preset) {
      case "front":
        targetRotX = 0;
        targetRotY = 0;
        targetRotZ = 0;
        targetZoom = 6.5;
        break;
      case "back":
        targetRotX = 0;
        targetRotY = Math.PI;
        targetRotZ = 0;
        targetZoom = 6.5;
        break;
      case "top":
        targetRotX = Math.PI / 2;
        targetRotY = 0;
        targetRotZ = 0;
        targetZoom = 6.5;
        break;
      case "side":
        targetRotX = 0;
        targetRotY = Math.PI / 2;
        targetRotZ = 0;
        targetZoom = 6.5;
        break;
      case "diagonal":
        targetRotX = 0.5;
        targetRotY = 0.5;
        targetRotZ = 0.2;
        targetZoom = 6.5;
        break;
      case "activesite":
        targetRotX = 0.82;
        targetRotY = 0.45;
        targetRotZ = -0.15;
        targetZoom = 9.8;
        targetPanX = -12;
        targetPanY = -25;
        targetColor = "secondary";
        targetStyle = "cartoon";
        break;
      case "hydrophobic":
        targetRotX = -0.35;
        targetRotY = 1.15;
        targetRotZ = 0.25;
        targetZoom = 6.8;
        targetPanX = 0;
        targetPanY = 0;
        targetColor = "hydropathy";
        targetStyle = "cartoon";
        break;
      case "charge":
        targetRotX = 0.42;
        targetRotY = -0.65;
        targetRotZ = 0.35;
        targetZoom = 7.2;
        targetPanX = 15;
        targetPanY = 10;
        targetColor = "charge";
        targetStyle = "cartoon";
        break;
    }

    startCameraTransition(targetRotX, targetRotY, targetRotZ, targetZoom, targetPanX, targetPanY, targetColor, targetStyle);
  };

  // Continuous auto-rotation loop
  useEffect(() => {
    let animationFrame: number;
    if (autoRotate) {
      const animate = () => {
        if (autoRotateAxis === "Y") {
          setRotationY((prev) => prev + autoRotateSpeed);
        } else if (autoRotateAxis === "X") {
          setRotationX((prev) => prev + autoRotateSpeed);
        } else {
          setRotationZ((prev) => prev + autoRotateSpeed);
        }
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [autoRotate, autoRotateSpeed, autoRotateAxis]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (cameraAnimRef.current) {
      cancelAnimationFrame(cameraAnimRef.current);
      cameraAnimRef.current = null;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const isPan = dragMode === "pan" || e.shiftKey || e.ctrlKey || e.altKey;
    if (isPan) {
      const panFactor = Math.max(0.15, 4.0 / zoomRatio);
      setPanX((prev) => prev + dx * panFactor * 3);
      setPanY((prev) => prev + dy * panFactor * 3);
    } else {
      setRotationY((prev) => prev + dx * 0.015);
      setRotationX((prev) => prev + dy * 0.015);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers for tablets, phones and touchpads
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (cameraAnimRef.current) {
      cancelAnimationFrame(cameraAnimRef.current);
      cameraAnimRef.current = null;
    }
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setTouchStartDist(null);
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDist(dist);
      setTouchStart(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStart) {
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;
      
      const isPan = dragMode === "pan";
      if (isPan) {
        const panFactor = Math.max(0.15, 4.0 / zoomRatio);
        setPanX((prev) => prev + dx * panFactor * 3);
        setPanY((prev) => prev + dy * panFactor * 3);
      } else {
        setRotationY((prev) => prev + dx * 0.015);
        setRotationX((prev) => prev + dy * 0.015);
      }
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && touchStartDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = dist - touchStartDist;
      setZoomRatio((prev) => Math.max(1.5, Math.min(prev + diff * 0.03, 18.0)));
      setTouchStartDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    setTouchStartDist(null);
  };

  // Scroll wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    if (cameraAnimRef.current) {
      cancelAnimationFrame(cameraAnimRef.current);
      cameraAnimRef.current = null;
    }
    const zoomDelta = e.deltaY > 0 ? -0.3 : 0.3;
    setZoomRatio((prev) => Math.max(1.5, Math.min(prev + zoomDelta, 18.0)));
  };

  // 1. Calculate center points and coordinate rotated map
  const processedAtoms = useMemo(() => {
    if (atomsList.length === 0) return [];

    let sumX = 0, sumY = 0, sumZ = 0;
    for (const at of atomsList) {
      sumX += at.x;
      sumY += at.y;
      sumZ += at.z;
    }
    const avgX = sumX / atomsList.length;
    const avgY = sumY / atomsList.length;
    const avgZ = sumZ / atomsList.length;

    // Projected coordinates map
    return atomsList.map((atom) => {
      const cx = atom.x - avgX;
      const cy = atom.y - avgY;
      const cz = atom.z - avgZ;

      const rotated = rotate3D(cx, cy, cz, rotationX, rotationY, rotationZ);
      return {
        ...atom,
        projX: rotated.x,
        projY: rotated.y,
        projZ: rotated.z, // higher Z means closer to camera
      };
    });
  }, [atomsList, rotationX, rotationY, rotationZ]);

  // Determine physical coordinate min & max for setting bounding box and grid limits
  const bounds = useMemo(() => {
    if (processedAtoms.length === 0) {
      return { minX: -20, maxX: 20, minY: -20, maxY: 20, minZ: -20, maxZ: 20 };
    }
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const at of processedAtoms) {
      if (at.projX < minX) minX = at.projX;
      if (at.projX > maxX) maxX = at.projX;
      if (at.projY < minY) minY = at.projY;
      if (at.projY > maxY) maxY = at.projY;
      if (at.projZ < minZ) minZ = at.projZ;
      if (at.projZ > maxZ) maxZ = at.projZ;
    }

    // Include minimum spacing
    const padding = 6;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
      minZ: minZ - padding,
      maxZ: maxZ + padding,
    };
  }, [processedAtoms]);

  // Calculate stable, unrotated center and max radius of the atoms list
  const stableBounds = useMemo(() => {
    if (atomsList.length === 0) {
      return { radius: 20 };
    }
    let sumX = 0, sumY = 0, sumZ = 0;
    for (const at of atomsList) {
      sumX += at.x;
      sumY += at.y;
      sumZ += at.z;
    }
    const avgX = sumX / atomsList.length;
    const avgY = sumY / atomsList.length;
    const avgZ = sumZ / atomsList.length;

    let maxDistSq = 0;
    for (const at of atomsList) {
      const dx = at.x - avgX;
      const dy = at.y - avgY;
      const dz = at.z - avgZ;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq > maxDistSq) {
        maxDistSq = distSq;
      }
    }
    const radius = Math.sqrt(maxDistSq);
    return {
      radius: Math.max(radius, 5)
    };
  }, [atomsList]);

  // Calculate standard center relative bounding box (stable & independent of rotation)
  const renderBounds = useMemo(() => {
    const radius = stableBounds.radius;
    const pad = radius * 0.15 + 6;
    const maxSide = radius + pad;
    return {
      minX: -maxSide,
      maxX: maxSide,
      minY: -maxSide,
      maxY: maxSide,
    };
  }, [stableBounds]);

  // Analyze/detect secondary structure motifs (Alpha-helices vs Beta-sheets vs Loops) dynamically via 3D carbon distances and Chou-Fasman propensity fallback
  const secondaryStructureMap = useMemo(() => {
    const map = new Map<string, "helix" | "sheet" | "loop" | "turn">();
    const caAtoms = atomsList.filter((a) => a.name.toUpperCase() === "CA");
    
    // Group by ChainID
    const chains: Record<string, typeof caAtoms> = {};
    for (const atom of caAtoms) {
      if (!chains[atom.chainID]) {
        chains[atom.chainID] = [];
      }
      chains[atom.chainID].push(atom);
    }

    for (const chainId in chains) {
      const chainCa = chains[chainId].sort((a, b) => a.resSeq - b.resSeq);
      const n = chainCa.length;
      
      for (let i = 0; i < n; i++) {
        const currentAtom = chainCa[i];
        const resKey = `${chainId}_${currentAtom.resSeq}`;
        
        let d3 = -1;
        let foundNeighbour = false;
        
        // Measure the physical distance to residue i+3 to index secondary structure motif
        if (i + 3 < n) {
          const nextAtom = chainCa[i + 3];
          d3 = Math.sqrt(
            Math.pow(currentAtom.x - nextAtom.x, 2) +
            Math.pow(currentAtom.y - nextAtom.y, 2) +
            Math.pow(currentAtom.z - nextAtom.z, 2)
          );
          foundNeighbour = true;
        } else if (i - 3 >= 0) {
          const prevAtom = chainCa[i - 3];
          d3 = Math.sqrt(
            Math.pow(currentAtom.x - prevAtom.x, 2) +
            Math.pow(currentAtom.y - prevAtom.y, 2) +
            Math.pow(currentAtom.z - prevAtom.z, 2)
          );
          foundNeighbour = true;
        }
        
        if (!foundNeighbour) {
          // Chou-Fasman structural propensity fallback
          const aa = currentAtom.aa.toUpperCase();
          if (["A", "E", "L", "M", "K", "R", "Q", "H"].includes(aa)) {
            map.set(resKey, "helix");
          } else if (["V", "I", "Y", "F", "W", "T", "C"].includes(aa)) {
            map.set(resKey, "sheet");
          } else {
            map.set(resKey, "loop");
          }
        } else {
          // Helical curls usually keep d(CA_i, CA_i+3) dense (~5.0 - 6.6 A)
          // Extended beta chains usually span d(CA_i, CA_i+3) wide (>8.0 A)
          if (d3 < 6.8) {
            map.set(resKey, "helix");
          } else if (d3 > 8.0) {
            map.set(resKey, "sheet");
          } else {
            map.set(resKey, "loop");
          }
        }
      }
    }
    return map;
  }, [atomsList]);

  // Color mapping utility based on active scheme
  const getAtomColor = (atom: SeedAtom) => {
    if (stylingColor === "secondary") {
      const resKey = `${atom.chainID}_${atom.resSeq}`;
      const secType = secondaryStructureMap.get(resKey) || "loop";
      if (secType === "helix") return "#ec4899"; // Alpha-helix (Vibrant Pink)
      if (secType === "sheet") return "#eab308"; // Beta-sheet (Amber Yellow)
      return "#64748b"; // Loop / turn / coil (Slate Gray)
    }
    if (stylingColor === "chain") {
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e", "#0ea5e9"];
      const chainCharCode = atom.chainID.charCodeAt(0) || 65;
      return colors[(chainCharCode - 65) % colors.length];
    }
    if (stylingColor === "hydropathy") {
      // Kyte-Doolittle color mapping
      const kdValues: Record<string, number> = {
        I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5, M: 1.9, A: 1.8,
        W: -0.9, Y: -1.3, P: -1.6, T: -0.7, S: -0.8, H: -3.2,
        Q: -3.5, N: -3.5, E: -3.5, D: -3.5, K: -3.9, R: -4.5, G: -0.4
      };
      const val = kdValues[atom.aa.toUpperCase()] || 0;
      if (val > 1.5) return "#f97316"; // Highly hydrophobic (Orange)
      if (val > 0) return "#fbbf24"; // Hydrophobic (Yellow)
      if (val < -3.0) return "#06b6d4"; // Highly hydrophilic (Teal Code)
      return "#94a3b8"; // Intermediate/neutral (Slate)
    }
    if (stylingColor === "element") {
      const el = atom.element.toUpperCase();
      if (el === "C") return "#475569";
      if (el === "N") return "#3b82f6";
      if (el === "O") return "#ef4444";
      if (el === "S") return "#eab308";
      if (el === "H") return "#e2e8f0";
      return "#a855f7"; // Others (Purple)
    }
    if (stylingColor === "charge") {
      // Basic amino acid charge mapping
      const positiveRes = ["ARG", "LYS", "HIS"];
      const negativeRes = ["ASP", "GLU"];
      const res = atom.resName.toUpperCase();
      if (positiveRes.includes(res)) return "#38bdf8"; // Blue pos
      if (negativeRes.includes(res)) return "#f43f5e"; // Red neg
      return "#475569"; // Neutral slate
    }
    return "#3b82f6";
  };

  // Physical Euclidean distance logic
  const calculateDistance = (a: SeedAtom, b: SeedAtom) => {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
  };

  // Double Click / Single Click atom triggers distance measuring or inspected notes
  const handleAtomClick = (atom: SeedAtom) => {
    if (measureMode) {
      if (selectedAtoms.find((x) => x.serial === atom.serial)) {
        // Deselect
        setSelectedAtoms((prev) => prev.filter((x) => x.serial !== atom.serial));
      } else {
        if (selectedAtoms.length >= 2) {
          setSelectedAtoms([atom]);
        } else {
          setSelectedAtoms((prev) => [...prev, atom]);
        }
      }
    } else {
      setInspectedAtom(atom === inspectedAtom ? null : atom);
    }
  };

  // Perspective coefficients based on depth coordinate (projZ)
  const getDepthFactor = (projZ: number) => {
    if (!enableDepthCueing || processedAtoms.length <= 1) return { radiusScale: 1, opacity: 1, brightness: 100 };
    
    // Normalize projZ between 0 and 1
    const zSpan = bounds.maxZ - bounds.minZ;
    if (zSpan <= 0) return { radiusScale: 1, opacity: 1, brightness: 100 };
    
    const factor = (projZ - bounds.minZ) / zSpan; // 0 (farthest) to 1 (closest)
    
    // Scale parameters
    const radiusScale = 0.65 + factor * 0.7; // 0.65x to 1.35x size
    const opacity = 0.45 + factor * 0.55; // 0.45 to 1.0 opacity
    const brightness = Math.round(70 + factor * 45); // 70% to 115% brightness

    return { radiusScale, opacity, brightness };
  };

  // 2. Prepare 3D Depth Sorted bonds/connections
  const bondRenderList = useMemo(() => {
    if (processedAtoms.length === 0) return [];
    const bonds: Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      avgZ: number;
      color: string;
      strokeWidth: number;
      opacity: number;
      label?: string;
    }> = [];

    if (activeRecord?.databaseSource === "pubchem") {
      // Small compounds: draw bonds between ALL nearby atoms (Euclidean distance threshold)
      for (let i = 0; i < processedAtoms.length; i++) {
        const atm1 = processedAtoms[i];
        for (let j = i + 1; j < processedAtoms.length; j++) {
          const atm2 = processedAtoms[j];
          const dist = calculateDistance(atm1, atm2);
          
          if (dist < 1.9) {
            const avgZ = (atm1.projZ + atm2.projZ) / 2;
            const depth = getDepthFactor(avgZ);
            
            const baseWidth = renderStyle === "wireframe" ? 1.0 : 3.5;
            bonds.push({
              id: `pubchem-b-${atm1.serial}-${atm2.serial}`,
              x1: atm1.projX,
              y1: atm1.projY,
              x2: atm2.projX,
              y2: atm2.projY,
              avgZ,
              color: getAtomColor(atm1),
              strokeWidth: baseWidth * depth.radiusScale,
              opacity: 0.85 * depth.opacity,
            });
          }
        }
      }
    } else {
      // Protein macromolecule chain backbone bonds (consecutive peptide trace)
      for (let i = 1; i < processedAtoms.length; i++) {
        const prevAtm = processedAtoms[i - 1];
        const atm = processedAtoms[i];

        if (prevAtm.chainID === atm.chainID && Math.abs(atm.resSeq - prevAtm.resSeq) <= 1) {
          const avgZ = (prevAtm.projZ + atm.projZ) / 2;
          const depth = getDepthFactor(avgZ);
          
          const baseW = renderStyle === "wireframe" ? 1.2 : renderStyle === "beads" ? 1.0 : 4.5;
          bonds.push({
            id: `peptide-b-${i}`,
            x1: prevAtm.projX,
            y1: prevAtm.projY,
            x2: atm.projX,
            y2: atm.projY,
            avgZ,
            color: getAtomColor(atm),
            strokeWidth: baseW * depth.radiusScale,
            opacity: (renderStyle === "wireframe" ? 0.70 : 0.90) * depth.opacity,
          });
        }
      }
    }

    // Sort bonds by depth (avgZ) ascending so farthest are drawn first
    return bonds.sort((a, b) => a.avgZ - b.avgZ);
  }, [processedAtoms, renderStyle, stylingColor, activeRecord, enableDepthCueing]);

  // 3. Atom node rendering list, sorted by projZ (back to front)
  const sortedAtomNodeList = useMemo(() => {
    return [...processedAtoms].sort((a, b) => a.projZ - b.projZ);
  }, [processedAtoms]);

  // Handle Snapshot SVG capture / download
  const handleExporter = () => {
    const svgEl = document.getElementById("molecular-svg-stage");
    if (!svgEl) return;
    try {
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgEl);
      if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = `${activeRecord?.name || "molecule"}_structure.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (e) {
      console.error("Snapshot export failed:", e);
    }
  };

  // Legend values mapping
  const legendItems = useMemo(() => {
    if (stylingColor === "secondary") {
      return [
        { label: "Alpha-Helix (α)", color: "#ec4899" },
        { label: "Beta-Sheet (β)", color: "#eab308" },
        { label: "Turn / Coil / Loop", color: "#64748b" },
      ];
    }
    if (stylingColor === "element") {
      return [
        { label: "Carbon (C)", color: "#475569" },
        { label: "Nitrogen (N)", color: "#3b82f6" },
        { label: "Oxygen (O)", color: "#ef4444" },
        { label: "Sulfur (S)", color: "#eab308" },
        { label: "Other", color: "#a855f7" },
      ];
    }
    if (stylingColor === "hydropathy") {
      return [
        { label: "Hydrophobic", color: "#f97316" },
        { label: "Neutral / Sl", color: "#94a3b8" },
        { label: "Hydrophilic", color: "#06b6d4" },
      ];
    }
    if (stylingColor === "charge") {
      return [
        { label: "Positive (+)", color: "#38bdf8" },
        { label: "Neutral (0)", color: "#475569" },
        { label: "Negative (-)", color: "#f43f5e" },
      ];
    }
    // Chains
    const chainsFound = Array.from(new Set(atomsList.map((x) => x.chainID)));
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e", "#0ea5e9"];
    return chainsFound.slice(0, 8).map((ch, idx) => ({
      label: `Chain ${ch}`,
      color: colors[idx % colors.length],
    }));
  }, [stylingColor, atomsList]);

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[999] bg-slate-950 flex flex-col select-none" : "flex-1 flex flex-col min-h-0 relative select-none"}>
      {/* Visual Header Toolbar Controls */}
      <div className="bg-slate-900 border-b border-slate-800 p-2 flex flex-wrap items-center justify-between gap-2 text-slate-300 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800 items-center text-[10px] gap-1 font-bold">
            <span className="text-slate-500 px-1 uppercase text-[8px]">Axis Preset</span>
            <button
              onClick={() => applyPreset("front")}
              className="px-2 py-0.5 hover:bg-slate-800 rounded text-slate-200 transition-colors"
            >
              Front
            </button>
            <button
              onClick={() => applyPreset("top")}
              className="px-2 py-0.5 hover:bg-slate-800 rounded text-slate-200 transition-colors"
            >
              Top
            </button>
            <button
              onClick={() => applyPreset("side")}
              className="px-2 py-0.5 hover:bg-slate-800 rounded text-slate-200 transition-colors"
            >
              Side
            </button>
            <button
              onClick={() => applyPreset("diagonal")}
              className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded"
            >
              Orbit
            </button>
          </div>

          {/* Scientific Focus Presets with Smooth Camera Transitions */}
          <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800 items-center text-[10px] gap-1 font-bold">
            <span className="text-indigo-400 px-1 uppercase text-[8px] flex items-center gap-0.5">
              <Compass className="w-2.5 h-2.5 text-indigo-400 animate-spin-slow" />
              Focus View
            </span>
            <button
              onClick={() => applyPreset("activesite")}
              className={`px-2 py-0.5 rounded text-slate-200 hover:bg-slate-800 transition-all flex items-center gap-1 ${
                stylingColor === "secondary" ? "bg-indigo-950/80 text-indigo-300 border border-indigo-800/30 font-black" : ""
              }`}
              title="Smooth zoom-in focus view of predicted active site cleft & secondary pocket"
            >
              <Award className="w-3.5 h-3.5 text-indigo-400" />
              Active Site
            </button>
            <button
              onClick={() => applyPreset("hydrophobic")}
              className={`px-2 py-0.5 rounded text-slate-200 hover:bg-slate-800 transition-all flex items-center gap-1 ${
                stylingColor === "hydropathy" ? "bg-amber-950/80 text-amber-300 border border-amber-800/30 font-black" : ""
              }`}
              title="Smooth alignment focus highlighting inner hydrophobic core & residue hydropathy"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              Hydrophobic Core
            </button>
            <button
              onClick={() => applyPreset("charge")}
              className={`px-2 py-0.5 rounded text-slate-200 hover:bg-slate-800 transition-all flex items-center gap-1 ${
                stylingColor === "charge" ? "bg-cyan-950/80 text-cyan-300 border border-cyan-800/30 font-black" : ""
              }`}
              title="Smooth surface perspective detailing electrostatic charges & amino acid polarity"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Surface Charge
            </button>
          </div>

          {/* Quick presets HUD */}
          <div className="flex gap-1">
            <button
              onClick={() => setMeasureMode(!measureMode)}
              className={`px-2 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-all ${
                measureMode
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              {measureMode ? "Measuring Active" : "Measure Distance"}
            </button>

            <button
              onClick={() => {
                if (stylingColor === "secondary") {
                  setStylingColor(prevColorMode);
                } else {
                  setPrevColorMode(stylingColor === "secondary" ? "chain" : stylingColor);
                  setStylingColor("secondary");
                }
              }}
              className={`px-2 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-all ${
                stylingColor === "secondary"
                  ? "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/80 font-extrabold"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
              title="Toggle between secondary structure (alpha-helix, beta-sheet) color coding and other modes"
            >
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              {stylingColor === "secondary" ? "Motifs: Active" : "Secondary Motifs"}
            </button>

            <button
              onClick={handleExporter}
              className="px-2 py-1.5 bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 rounded text-[10px] font-bold flex items-center gap-1"
              title="Download high-resolution vector SVG coordinates"
            >
              <Download className="w-3.5 h-3.5" />
              SVG Snap
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Fullscreen toggle button */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1 px-2 rounded text-[10px] font-black border uppercase flex items-center gap-1 transition-all ${
                isFullscreen
                  ? "bg-rose-950 text-rose-300 border-rose-500 font-extrabold animate-pulse"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
              title={isFullscreen ? "Minimize 3D container back to normal size" : "Expand 3D container to fill the entire workbench area"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3 h-3 text-rose-400" />
                  <span>Minimize</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3 text-slate-300" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>
          </div>

          {/* Depth cueing toggler */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEnableDepthCueing(!enableDepthCueing)}
              className={`p-1 rounded text-[10px] font-black border uppercase flex items-center gap-1 ${
                enableDepthCueing ? "bg-cyan-950 text-cyan-400 border-cyan-800" : "bg-slate-950 text-slate-600 border-slate-900"
              }`}
            >
              <Layers className="w-3 h-3" />
              Depth Cueing
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-950/70 rounded border border-slate-800 px-2 py-1">
            <span className="text-[9px] text-slate-500 font-bold uppercase mr-1">Toggles:</span>
            <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={() => setShowAxes(!showAxes)}
                className="accent-indigo-500"
              />
              Axes
            </label>
            <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 ml-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBoundingBox}
                onChange={() => setShowBoundingBox(!showBoundingBox)}
                className="accent-indigo-500"
              />
              Box
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full h-full flex flex-col md:flex-row relative bg-slate-950 min-h-0">
        
        {/* Left Side: Dynamic Speed Dial & Auto Rotation Speed Selector HUD */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-auto">
          <div className="bg-slate-950/90 backdrop-blur border border-slate-800 p-2.5 rounded-lg shadow-2xl flex flex-col gap-2.5 w-32">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Lenses</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setZoomRatio((prev) => Math.min(prev + 1.0, 15))}
                className="p-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 text-slate-300 text-[11px] font-mono font-bold flex items-center justify-center gap-1"
                title="Zoom In"
              >
                <ZoomIn className="w-3 h-3" /> Zoom In
              </button>
              <button
                onClick={() => setZoomRatio((prev) => Math.max(prev - 1.0, 1.5))}
                className="p-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 text-slate-300 text-[11px] font-mono font-bold flex items-center justify-center gap-1"
                title="Zoom Out"
              >
                <ZoomOut className="w-3 h-3" /> Zoom Out
              </button>
            </div>

            <div className="h-px bg-slate-800/80 my-0.5"></div>

            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-1 rounded border text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                autoRotate
                  ? "bg-indigo-900 border-indigo-500 text-indigo-50 animate-pulse"
                  : "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
              }`}
              title="Toggle Auto-Rotation rendering trace"
            >
              {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {autoRotate ? "Auto: ON" : "Auto: OFF"}
            </button>

            {autoRotate && (
              <div className="flex flex-col gap-1 bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                <span className="text-[8px] text-slate-500 font-bold uppercase block">Speed Controller</span>
                <input
                  type="range"
                  min="0.002"
                  max="0.06"
                  step="0.002"
                  value={autoRotateSpeed}
                  onChange={(e) => setAutoRotateSpeed(parseFloat(e.target.value))}
                  className="w-full text-indigo-500 h-1 cursor-pointer accent-indigo-500"
                />
                
                <span className="text-[8px] text-slate-500 font-bold uppercase block mt-1">Axis</span>
                <select
                  value={autoRotateAxis}
                  onChange={(e) => setAutoRotateAxis(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-[9px] text-slate-300 rounded p-0.5 font-bold cursor-pointer"
                >
                  <option value="Y">Yaw (Y)</option>
                  <option value="X">Pitch (X)</option>
                  <option value="Z">Roll (Z)</option>
                </select>
              </div>
            )}

            <div className="h-px bg-slate-800/80 my-0.5"></div>
            
            <button
              onClick={() => {
                setRotationX(0.5);
                setRotationY(0.5);
                setRotationZ(0.0);
                setZoomRatio(6.5);
                setPanX(0);
                setPanY(0);
                setAutoRotate(false);
                setSelectedAtoms([]);
                setInspectedAtom(null);
              }}
              className="p-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-slate-400 text-[9px] font-bold text-center"
              title="Reset view angles and pan offsets"
            >
              Center View
            </button>
          </div>

          {/* Enhanced Pan & Orbit Compass Navigation Joypad */}
          <div className="bg-slate-950/90 backdrop-blur border border-slate-800 p-2.5 rounded-lg shadow-2xl flex flex-col gap-2 w-32">
            <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Drag Action</span>
            
            {/* Toggle Segmented Buttons */}
            <div className="grid grid-cols-2 bg-slate-900 p-0.5 rounded border border-slate-800 text-[9px] font-bold">
              <button
                onClick={() => setDragMode("rotate")}
                className={`py-1 rounded transition-all flex items-center justify-center gap-1 ${
                  dragMode === "rotate"
                    ? "bg-indigo-600 text-white font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Left-click and drag on canvas to rotate in 3D"
              >
                <RotateCw className="w-2.5 h-2.5" /> Orbit
              </button>
              <button
                onClick={() => setDragMode("pan")}
                className={`py-1 rounded transition-all flex items-center justify-center gap-1 ${
                  dragMode === "pan"
                    ? "bg-indigo-600 text-white font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Left-click and drag on canvas to slide/pan"
              >
                <Move className="w-2.5 h-2.5" /> Pan
              </button>
            </div>

            <div className="h-px bg-slate-800/80 my-0.5"></div>

            {/* D-Pad Compass Controller */}
            <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Compass Shift</span>
            <div className="grid grid-cols-3 gap-0.5 text-center">
              <div />
              <button
                onClick={() => setPanY((y) => y - 12 * Math.max(0.2, 5.0 / zoomRatio))}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-1 text-slate-400 hover:text-slate-100 rounded flex items-center justify-center text-[10px] font-bold"
                title="Shift Model Up"
              >
                ▲
              </button>
              <div />

              <button
                onClick={() => setPanX((x) => x - 12 * Math.max(0.2, 5.0 / zoomRatio))}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-1 text-slate-400 hover:text-slate-100 rounded flex items-center justify-center text-[10px] font-bold"
                title="Shift Model Left"
              >
                ◀
              </button>
              <button
                onClick={() => {
                  setPanX(0);
                  setPanY(0);
                }}
                className="bg-slate-900/40 border border-slate-800 hover:bg-slate-800 hover:text-indigo-400 text-slate-500 p-1 rounded text-[7px] font-semibold flex items-center justify-center uppercase tracking-tighter"
                title="Recenter Translation Offset"
              >
                Ctr
              </button>
              <button
                onClick={() => setPanX((x) => x + 12 * Math.max(0.2, 5.0 / zoomRatio))}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-1 text-slate-400 hover:text-slate-100 rounded flex items-center justify-center text-[10px] font-bold"
                title="Shift Model Right"
              >
                ▶
              </button>

              <div />
              <button
                onClick={() => setPanY((y) => y + 12 * Math.max(0.2, 5.0 / zoomRatio))}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-1 text-slate-400 hover:text-slate-100 rounded flex items-center justify-center text-[10px] font-bold"
                title="Shift Model Down"
              >
                ▼
              </button>
              <div />
            </div>

            <div className="h-px bg-slate-800/80 my-0.5"></div>

            {/* Rotation Adjusters */}
            <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Orbit Adjust</span>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setRotationY((r) => r - 0.15)}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-1 text-slate-400 hover:text-slate-100 rounded text-[9px] font-bold flex items-center justify-center gap-0.5"
                title="Spin Left"
              >
                Spin ◀
              </button>
              <button
                onClick={() => setRotationY((r) => r + 0.15)}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-1 text-slate-400 hover:text-slate-100 rounded text-[9px] font-bold flex items-center justify-center gap-0.5"
                title="Spin Right"
              >
                ▶ Spin
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Style Customizers overlay */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
          <div className="flex flex-col gap-1.5 bg-slate-950/95 backdrop-blur border border-slate-800 p-2.5 rounded-lg shadow-2d w-36">
            <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Topology style</span>
            <select
              value={renderStyle}
              onChange={(e) => setRenderStyle(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-[10px] rounded px-2 py-1 text-slate-200 font-bold outline-none cursor-pointer"
            >
              <option value="cartoon">Cartoon Ribbon</option>
              <option value="beads">Alpha beads</option>
              <option value="wireframe">Wireframe</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 bg-slate-950/95 backdrop-blur border border-slate-800 p-2.5 rounded-lg shadow-2d w-36">
            <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Mapping Scheme</span>
            <select
              value={stylingColor}
              onChange={(e) => setStylingColor(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-[10px] rounded px-2 py-1 text-slate-200 font-bold outline-none cursor-pointer"
            >
              <option value="chain">Chain sequence</option>
              <option value="hydropathy">Hydropathy Index</option>
              <option value="element">Chemical elements</option>
              <option value="charge">Residue Charge</option>
              <option value="secondary">Secondary Structure</option>
            </select>
          </div>
        </div>

        {/* Center Canvas Scene */}
        <div
          className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden border-b border-slate-800/80"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onWheel={handleWheel}
          onDoubleClick={() => {
            setPanX(0);
            setPanY(0);
            setRotationX(0.5);
            setRotationY(0.5);
            setRotationZ(0.0);
            setZoomRatio(6.5);
          }}
          style={isFullscreen ? { flex: 1, height: "100%" } : { height: "450px" }}
        >
          {/* Main SVG Render Area */}
          <svg
            id="molecular-svg-stage"
            className="w-full h-full absolute inset-0"
            viewBox={`${renderBounds.minX * zoomRatio} ${renderBounds.minY * zoomRatio} ${
              (renderBounds.maxX - renderBounds.minX) * zoomRatio
            } ${(renderBounds.maxY - renderBounds.minY) * zoomRatio}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* SVG Global Defs for 3D Shading Gradients & Glow effects */}
            <defs>
              {/* Gloss shine to overlay on atom spheres for realistic circular illumination */}
              <radialGradient id="sphere-gloss" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
              </radialGradient>
              <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g
              transform={`translate(${((renderBounds.maxX - renderBounds.minX) * zoomRatio) / 2 + panX}, ${
                ((renderBounds.maxY - renderBounds.minY) * zoomRatio) / 2 + panY
              })`}
            >
              
              {/* Auxiliary Helper: Floor coordinate Grid */}
              {showGrid && (
                <g opacity="0.15" stroke="#4f46e5" strokeWidth="0.5">
                  {[-40, -20, 0, 20, 40].map((coord, idx) => (
                    <React.Fragment key={`grid-${idx}`}>
                      <line x1={coord * zoomRatio} y1={-50 * zoomRatio} x2={coord * zoomRatio} y2={50 * zoomRatio} />
                      <line x1={-50 * zoomRatio} y1={coord * zoomRatio} x2={50 * zoomRatio} y2={coord * zoomRatio} />
                    </React.Fragment>
                  ))}
                </g>
              )}

              {/* Auxiliary Helper: 3D bounding box */}
              {showBoundingBox && processedAtoms.length > 0 && (
                <rect
                  x={bounds.minX * zoomRatio}
                  y={bounds.minY * zoomRatio}
                  width={(bounds.maxX - bounds.minX) * zoomRatio}
                  height={(bounds.maxY - bounds.minY) * zoomRatio}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.3"
                />
              )}

              {/* Rendering 3D Depth-Sorted chemical bonds / backbone peptides */}
              {bondRenderList.map((bond) => (
                <motion.line
                  key={bond.id}
                  x1={bond.x1 * zoomRatio}
                  y1={bond.y1 * zoomRatio}
                  x2={bond.x2 * zoomRatio}
                  y2={bond.y2 * zoomRatio}
                  animate={{
                    stroke: bond.color,
                    strokeWidth: bond.strokeWidth,
                    opacity: bond.opacity,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 15,
                  }}
                  strokeLinecap="round"
                />
              ))}

              {/* Rendering 3D Depth-Sorted Atom Spheres */}
              {sortedAtomNodeList.map((at, idx) => {
                const isWireframe = renderStyle === "wireframe";
                const baseRadius = at.name === "CA" ? 5.2 : 3.2; // larger alpha carbon
                const depth = getDepthFactor(at.projZ);
                
                // Vary target radius based on rendering style to create distinct profiles
                let targetRadius = baseRadius * depth.radiusScale * 0.9;
                if (renderStyle === "cartoon") {
                  targetRadius = baseRadius * 0.5 * depth.radiusScale;
                } else if (renderStyle === "beads") {
                  targetRadius = baseRadius * 1.25 * depth.radiusScale;
                } else if (isWireframe) {
                  targetRadius = 0;
                }

                const targetOpacity = isWireframe ? 0 : depth.opacity;
                const isSelected = selectedAtoms.some((x) => x.serial === at.serial);
                const isInspected = inspectedAtom?.serial === at.serial;

                return (
                  <g
                    key={`atom-node-${at.serial}`}
                    className={`group/node cursor-pointer ${isWireframe ? "pointer-events-none" : ""}`}
                    onClick={() => !isWireframe && handleAtomClick(at)}
                  >
                    {/* Interactive glowing selection ring */}
                    {(isSelected || isInspected) && (
                      <motion.circle
                        cx={at.projX * zoomRatio}
                        cy={at.projY * zoomRatio}
                        animate={{
                          r: targetRadius + 3.5,
                          opacity: targetOpacity,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 120,
                          damping: 15,
                        }}
                        fill="none"
                        stroke={isSelected ? "#10b981" : "#8b5cf6"}
                        strokeWidth="1.8"
                        filter="url(#neon-glow)"
                        className="animate-pulse"
                      />
                    )}

                    {/* Colored Base Atom Block */}
                    <motion.circle
                      cx={at.projX * zoomRatio}
                      cy={at.projY * zoomRatio}
                      animate={{
                        r: targetRadius,
                        opacity: targetOpacity,
                        fill: getAtomColor(at),
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 120,
                        damping: 15,
                      }}
                      stroke="#090d16"
                      strokeWidth={0.5}
                      style={{ filter: `brightness(${depth.brightness}%)` }}
                      className="transition-all duration-100 group-hover/node:brightness-125"
                    />

                    {/* Glossy Overlay Mask creating simulated 3D highlights */}
                    <motion.circle
                      cx={at.projX * zoomRatio}
                      cy={at.projY * zoomRatio}
                      animate={{
                        r: targetRadius,
                        opacity: 0.65 * targetOpacity,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 120,
                        damping: 15,
                      }}
                      fill="url(#sphere-gloss)"
                      pointerEvents="none"
                    />

                    {/* Hover / Tooltip tag info */}
                    <title>{`Atom #${at.serial}: ${at.name} | Res: ${at.resName} ${at.resSeq} | Chain: ${at.chainID} | element: ${at.element} | Pos: (${at.x.toFixed(1)}, ${at.y.toFixed(1)}, ${at.z.toFixed(1)})`}</title>
                  </g>
                );
              })}

              {/* Render dynamic interactive Measurement line if 2 atoms selected in Measure Mode */}
              {measureMode && selectedAtoms.length === 2 && (
                <g>
                  <line
                    x1={selectedAtoms[0].projX * zoomRatio}
                    y1={selectedAtoms[0].projY * zoomRatio}
                    x2={selectedAtoms[1].projX * zoomRatio}
                    y2={selectedAtoms[1].projY * zoomRatio}
                    stroke="#10b981"
                    strokeWidth="1.8"
                    strokeDasharray="4 2"
                    filter="url(#neon-glow)"
                    opacity="0.9"
                  />
                  {/* Midpoint visual coordinates text */}
                  <g
                    transform={`translate(${
                      ((selectedAtoms[0].projX + selectedAtoms[1].projX) / 2) * zoomRatio
                    }, ${((selectedAtoms[0].projY + selectedAtoms[1].projY) / 2) * zoomRatio})`}
                  >
                    <rect
                      x="-55"
                      y="-12"
                      width="110"
                      height="20"
                      rx="4"
                      fill="#022c22"
                      stroke="#10b981"
                      strokeWidth="1"
                      opacity="0.9"
                    />
                    <text
                      textAnchor="middle"
                      y="1"
                      fill="#34d399"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {`${calculateDistance(selectedAtoms[0], selectedAtoms[1]).toFixed(3)} Å`}
                    </text>
                  </g>
                </g>
              )}

              {/* Top-Left Axis Gizmo element */}
              {showAxes && (
                <g
                  transform={`translate(${renderBounds.minX * zoomRatio + 25}, ${
                    renderBounds.minY * zoomRatio + 25
                  })`}
                  opacity="0.6"
                >
                  {/* X Axis */}
                  <line x1="0" y1="0" x2="16" y2="0" stroke="#f43f5e" strokeWidth="1.5" />
                  <text x="21" y="3" fill="#f43f5e" fontSize="7" fontWeight="bold">
                    X
                  </text>

                  {/* Y Axis */}
                  <line x1="0" y1="0" x2="0" y2="16" stroke="#10b981" strokeWidth="1.5" />
                  <text x="-2" y="25" fill="#10b981" fontSize="7" fontWeight="bold">
                    Y
                  </text>

                  {/* Z Axis angle indicator */}
                  <line x1="0" y1="0" x2="8" y2="-8" stroke="#3b82f6" strokeWidth="1.5" />
                  <text x="12" y="-10" fill="#3b82f6" fontSize="7" fontWeight="bold">
                    Z
                  </text>
                  <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
                </g>
              )}
            </g>
          </svg>

          {/* Measuring overlay status indicator */}
          <AnimatePresence>
            {measureMode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-16 left-4 right-4 bg-slate-900/90 backdrop-blur border border-emerald-800 p-2.5 rounded-lg flex items-center justify-between pointer-events-auto"
              >
                <div className="flex items-center gap-2 text-emerald-400">
                  <Activity className="w-4 h-4 animate-pulse shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {selectedAtoms.length === 0
                      ? "Select two atoms to measure distance"
                      : selectedAtoms.length === 1
                      ? `Selected [Atom #${selectedAtoms[0].serial} ${selectedAtoms[0].name}]. Select 2nd atom...`
                      : `Measured distance: ${calculateDistance(selectedAtoms[0], selectedAtoms[1]).toFixed(
                          3
                        )} Angstroms (Å)`}
                  </span>
                </div>
                {selectedAtoms.length > 0 && (
                  <button
                    onClick={() => setSelectedAtoms([])}
                    className="text-[9px] bg-slate-800 hover:bg-slate-700 hover:text-emerald-300 font-bold px-2 py-0.5 rounded border border-slate-700 transition"
                  >
                    Clear Points
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inspected Single Atom detail panel drawer */}
          <AnimatePresence>
            {inspectedAtom && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.92, x: 20 }}
                className="absolute bottom-16 right-4 bg-slate-950/95 border border-indigo-900/60 p-3 rounded-lg w-56 shadow-2d pointer-events-auto flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between border-b border-indigo-950 pb-1">
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">
                    Node Inspector
                  </span>
                  <button
                    onClick={() => setInspectedAtom(null)}
                    className="text-slate-500 hover:text-slate-300 text-xs font-bold font-mono px-1"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-300 font-semibold">
                  <div className="bg-slate-900/80 p-1.5 rounded">
                    <span className="text-slate-500 block uppercase text-[7px]">Atom Index</span>
                    <span className="font-mono text-slate-100 font-bold">#{inspectedAtom.serial}</span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded">
                    <span className="text-slate-500 block uppercase text-[7px]">Symbol (Name)</span>
                    <span className="font-mono text-slate-100 font-bold">{inspectedAtom.name}</span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded">
                    <span className="text-slate-500 block uppercase text-[7px]">Amino Acid</span>
                    <span className="font-mono text-slate-100 font-bold">
                      {inspectedAtom.resName} ({inspectedAtom.aa})
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded">
                    <span className="text-slate-500 block uppercase text-[7px]">Seq Position</span>
                    <span className="font-mono text-slate-100 font-bold">Seq {inspectedAtom.resSeq}</span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded col-span-2">
                    <span className="text-slate-500 block uppercase text-[7px]">Biological coordinates</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {`X: ${inspectedAtom.x.toFixed(2)}, Y: ${inspectedAtom.y.toFixed(2)}, Z: ${inspectedAtom.z.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading atomic overlay indicator */}
          {atomsLoading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <div className="text-center">
                <span className="font-mono text-xs text-slate-200 font-bold block">PDB Trace Resolving...</span>
                <span className="text-[10px] text-slate-500">Retrieving physical molecular spatial maps</span>
              </div>
            </div>
          )}

          {/* Simple Canvas Interactive Guidelines */}
          <div className="absolute bottom-4 left-4 pointer-events-none bg-slate-900/85 backdrop-blur px-3 py-1.5 rounded text-[10px] font-medium text-slate-400 border border-slate-800">
            💡 Click & drag workspace to rotate in 3D orbit
          </div>
        </div>

        {/* Unified Bottom Legend strip representing active coloring scale */}
        <div className="bg-slate-900 border-t border-slate-800 shrink-0 p-3 flex flex-wrap items-center justify-between gap-4 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              {stylingColor === "chain"
                ? "Active Chains:"
                : stylingColor === "hydropathy"
                ? "Hydropathy Gradient:"
                : stylingColor === "element"
                ? "Chemical Elements:"
                : stylingColor === "secondary"
                ? "Secondary Structure motifs:"
                : "Residue charge status:"}
            </span>
            <div className="flex flex-wrap gap-2.5">
              {legendItems.map((item, idx) => (
                <div key={`legend-${idx}`} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-slate-950 shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[10px] font-bold text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/50 border border-indigo-900/40 px-2.5 py-0.5 rounded">
              Nodes: <strong>{processedAtoms.length} traces</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
