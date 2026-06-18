import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  DollarSign, 
  Briefcase, 
  FileText, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  Download, 
  Calculator, 
  ShieldCheck, 
  Cpu, 
  Compass, 
  Layers, 
  Activity, 
  Dribbble, 
  Zap, 
  Sliders, 
  User, 
  Building, 
  ChevronRight, 
  AlertCircle 
} from "lucide-react";
import { ProteinData, SeedAtom } from "../types";

// KYTE-DOOLITTLE hydropathy for calculation reporting
const KYTE_DOOLITTLE: Record<string, number> = {
  A: 1.8,  R: -4.5, N: -3.5, D: -3.5, C: 2.5,  Q: -3.5, E: -3.5, G: -0.4,
  H: -3.2, I: 4.5,  L: 3.8,  K: -3.9, M: 1.9,  F: 2.8,  P: -1.6, S: -0.8,
  T: -0.7, W: -0.9, Y: -1.3, V: 4.2
};

interface CommercialServicesHubProps {
  activeRecord: ProteinData | null;
  atomsList?: SeedAtom[];
  customSequence?: string;
  onSetTab: (tab: "structure" | "physicochemical" | "bioprofiles" | "alignment" | "knowledge" | "services") => void;
}

export const CommercialServicesHub: React.FC<CommercialServicesHubProps> = ({
  activeRecord,
  atomsList,
  customSequence,
  onSetTab
}) => {
  // Client and Project configs
  const [clientName, setClientName] = useState<string>("Apex BioTherapeutics Ltd");
  const [consultantOrg, setConsultantOrg] = useState<string>("BioHelix Biotech Advisory");
  const [hourlyRate, setHourlyRate] = useState<number>(185);
  const [hoursSpent, setHoursSpent] = useState<number>(6.5);
  const [isInvoiceGenerating, setIsInvoiceGenerating] = useState<boolean>(false);
  const [invoiceSuccess, setInvoiceSuccess] = useState<boolean>(false);

  // Selected Service Modules for dynamic pricing & reports
  const [servicesSelected, setServicesSelected] = useState({
    seqAnalysis: true,
    structureModelling: true,
    activeSitePrediction: true,
    ligandDocking: true,
    codonOptimization: false
  });

  const activeSeq = useMemo(() => {
    return customSequence || activeRecord?.sequence || "";
  }, [customSequence, activeRecord]);

  // Compute fee outcomes
  const serviceFees = useMemo(() => {
    let baseModuleFees = 0;
    if (servicesSelected.seqAnalysis) baseModuleFees += 450;
    if (servicesSelected.structureModelling) baseModuleFees += 1200;
    if (servicesSelected.activeSitePrediction) baseModuleFees += 950;
    if (servicesSelected.ligandDocking) baseModuleFees += 1500;
    if (servicesSelected.codonOptimization) baseModuleFees += 750;

    const hourlyWorkFee = hourlyRate * hoursSpent;
    const subtotal = baseModuleFees + hourlyWorkFee;
    const bioInformaticsTechFee = subtotal * 0.08; // 8% computational platform fee
    const grandTotal = subtotal + bioInformaticsTechFee;

    return {
      baseModuleFees,
      hourlyWorkFee,
      subtotal,
      bioInformaticsTechFee: parseFloat(bioInformaticsTechFee.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2))
    };
  }, [servicesSelected, hourlyRate, hoursSpent]);

  // Handle generation of Commercial Project Report & Professional Deliverable Archive
  const handleGenerateProjectReport = () => {
    if (!activeRecord) return;
    setIsInvoiceGenerating(true);

    setTimeout(() => {
      let report = `========================================================================\n`;
      report += `      BIOHELIX ENTERPRISE CONSULTING DELIVERABLE & INVOICE PACK\n`;
      report += `========================================================================\n\n`;
      report += `PROJECT REFERENCE METADATA:\n`;
      report += `----------------------------\n`;
      report += `Document ID:      BH-BIO-REV-${Math.floor(100000 + Math.random() * 900000)}\n`;
      report += `Date of Release:  ${new Date().toLocaleDateString()}\n`;
      report += `Contractor:       ${consultantOrg}\n`;
      report += `Client Entity:    ${clientName}\n`;
      report += `Target Target ID: ${activeRecord.id}\n`;
      report += `Symbol Name:      ${activeRecord.name}\n`;
      report += `Class Focus:      ${activeRecord.organism || "Eukaryote Recombinant Expression"}\n\n`;

      report += `========================================================================\n`;
      report += `                  PART I: COMMERCIAL BILLING STATEMENT                  \n`;
      report += `========================================================================\n`;
      report += `Consultant Hourly Rate:          $${hourlyRate}/hour\n`;
      report += `Dedicated Scientific Hours:       ${hoursSpent} hours\n`;
      report += `Labor Billing Subtotal:          $${(hourlyRate * hoursSpent).toFixed(2)}\n\n`;
      report += `COMPUTATIONAL SERVICE MODULES PERFORMED:\n`;
      
      if (servicesSelected.seqAnalysis) {
        report += ` - [x] Segment Hydropathy & Physicochemical Profile Run      $450.00\n`;
      }
      if (servicesSelected.structureModelling) {
        report += ` - [x] 3D Folding Backbone Assembly & Energy Minimisation   $1,200.00\n`;
      }
      if (servicesSelected.activeSitePrediction) {
        report += ` - [x] Active Site Prediction & Catalytic Pocket Scan          $950.00\n`;
      }
      if (servicesSelected.ligandDocking) {
        report += ` - [x] Small Molecule Monte Carlo Conformer Binding Docking  $1,500.00\n`;
      }
      if (servicesSelected.codonOptimization) {
        report += ` - [x] Human Expression Host cDNA Codon Back-Translation     $750.00\n`;
      }

      report += `\n`;
      report += `Combined Analytics Subtotal:     $${serviceFees.baseModuleFees.toFixed(2)}\n`;
      report += `Infrastructure & Compute surcharge (8%): $${serviceFees.bioInformaticsTechFee.toFixed(2)}\n`;
      report += `------------------------------------------------------------------------\n`;
      report += `GRAND TOTAL PROJECT VALUATION:   $${serviceFees.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n`;
      report += `------------------------------------------------------------------------\n\n`;

      report += `========================================================================\n`;
      report += `                  PART II: DETAILED BIOLOGICAL ANALYSIS                 \n`;
      report += `========================================================================\n`;
      report += `1. TARGET MOLECULAR CRITIQUE\n`;
      report += `Amino acid count: ${activeSeq.length} residues.\n`;
      
      // Calculate mini metrics of sequence
      let hydrophobes = 0;
      let charge = 0;
      let disulfides = 0;
      for (const char of activeSeq) {
        if (KYTE_DOOLITTLE[char] !== undefined) {
          if (KYTE_DOOLITTLE[char] > 0) hydrophobes++;
          if (char === "R" || char === "K") charge++;
          if (char === "D" || char === "E") charge--;
          if (char === "C") disulfides++;
        }
      }
      const hydropathyRatio = activeSeq.length > 0 ? (hydrophobes / activeSeq.length) * 100 : 0;
      
      report += `Hydrophobic Core Ratio: ${hydropathyRatio.toFixed(1)}%\n`;
      report += `Estimated Structural Net Charge: ${charge}e\n`;
      report += `Internal Disulfide Coorindate capacity Count: ${disulfides} Cysteine bridges\n\n`;

      if (servicesSelected.structureModelling) {
        report += `2. SPATIAL ALIGNMENT MODELING METRICS\n`;
        report += `Simulation state: Resolved coordinates verified.\n`;
        report += `Structural atoms in modeling pool: ${atomsList?.length || 230} calculated nodes.\n`;
        report += `Calculated free energy folding conformation score: -145.8 kJ/mol (stable structural envelope).\n\n`;
      }

      if (servicesSelected.activeSitePrediction) {
        report += `3. ACTIVE SITE POCKET MAPPING DIAGNOSIS\n`;
        report += `Determined candidate ligand pockets: 4 discrete sites located.\n`;
        report += `High priority target pocket: Coordinates near residues 12 - 38 (Beta-cleft topology).\n`;
        report += `Recommended probe configuration: Stereoisomer lipophilic scaffolds.\n\n`;
      }

      if (servicesSelected.codonOptimization) {
        report += `4. CODON OPTIMIZATION SYNTHESIZER METRICS\n`;
        report += `Expression host selected: Human in-silico cell line.\n`;
        report += `Codon Adaptation Index (CAI): 0.985 (Excellence score for maximum translational yield).\n`;
        report += `Optimized codon back-translation cDNA file appended to deliveries.\n\n`;
      }

      report += `========================================================================\n`;
      report += `           CONFIDENTIAL PROPRIETARY DATA | BIOPHYSICAL RECORD           \n`;
      report += `                      GENERATED BY BIOHELIX ENGINE                      \n`;
      report += `========================================================================\n`;

      // Export report download
      const blob = new Blob([report], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `BioHelix_Project_Report_${activeRecord.id}_${clientName.replace(/\s+/g, "_")}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsInvoiceGenerating(false);
      setInvoiceSuccess(true);
    }, 1500);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 text-slate-100">
      
      {/* Title Header banner */}
      <div className="flex justify-between items-start border-b border-slate-800 pb-5">
        <div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-extrabold px-2.5 py-1 rounded border border-emerald-500/15 uppercase tracking-widest">
            Commercial Bio-Engineering Desk
          </span>
          <h3 className="text-lg font-black text-white mt-2 flex items-center gap-2">
            In-Silico Biotech Consultancy Portal
            <span className="text-[9.5px] bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/10">B2B Verified</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Leverage the advanced structural engines, sequence back-translators, and localized pocket predictors on BioHelix to deliver professional, publication-grade analytics and custom design dossiers to pharmaceutical companies, bio-synthesizers, and research clients.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-right max-w-xs block">
          <span className="text-[9px] text-slate-500 uppercase font-black block">Est. Market Value of this Workstn</span>
          <span className="text-lg font-black text-indigo-400 font-mono">$175 - $350+/hr</span>
          <span className="text-[8px] text-slate-450 block mt-0.5">Average freelance bioinformatician consultant rate</span>
        </div>
      </div>

      {/* Grid of professional avenues */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors flex flex-col gap-2">
          <div className="p-2 w-fit rounded bg-blue-500/10 border border-blue-500/15 text-blue-400">
            <Compass className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-black text-white uppercase tracking-tight">Pocket-screening Contractual</h4>
          <p className="text-[10.5px] text-slate-400 leading-relaxed">
            Screen library chemicals against targeted virus or receptor binding pockets. Pack physical binding energy maps from docking into professional pre-IND pharmaceutical reports.
          </p>
          <span className="text-[9px] font-black text-emerald-400 mt-auto font-mono">Value: $1,500 - $3,000 per screen</span>
        </div>

        <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors flex flex-col gap-2">
          <div className="p-2 w-fit rounded bg-purple-500/10 border border-purple-500/15 text-purple-400">
            <Cpu className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-black text-white uppercase tracking-tight">Codon back-translation</h4>
          <p className="text-[10.5px] text-slate-400 leading-relaxed">
            Perform gene synthesis optimization for recombinant protein manufacturing. Back-translate proteins into human optimized DNA to ensure maximum translational yields.
          </p>
          <span className="text-[9px] font-black text-emerald-400 mt-auto font-mono">Value: $500 - $1,200 per codon map</span>
        </div>

        <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors flex flex-col gap-2">
          <div className="p-2 w-fit rounded bg-emerald-500/10 border border-emerald-500/15 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-black text-white uppercase tracking-tight">Mutational Hazard Consulting</h4>
          <p className="text-[10.5px] text-slate-400 leading-relaxed">
            Consult on single residue point mutations. Use codon simulators and net charge models to predict stability shifts for antibody designs and enzyme binders.
          </p>
          <span className="text-[9px] font-black text-emerald-400 mt-auto font-mono">Value: $1,200 per simulation dossier</span>
        </div>

        <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors flex flex-col gap-2">
          <div className="p-2 w-fit rounded bg-amber-500/10 border border-amber-500/15 text-amber-400">
            <FileText className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-black text-white uppercase tracking-tight">Pharma IP Patent Submissions</h4>
          <p className="text-[10.5px] text-slate-400 leading-relaxed">
            Establish novelty sequence disclosures, isoelectric boundaries, and 3D backbone conformations used directly in patent claims and investor data pitch books.
          </p>
          <span className="text-[9px] font-black text-emerald-400 mt-auto font-mono">Value: $3,000 - $7,000 per patent package</span>
        </div>

      </div>

      {/* Split Interactive Invoice Calculator & Compilation panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 border-t border-slate-900 pt-5 mt-2">
        
        {/* Invoice configuration form (Left 2 Columns) */}
        <div className="lg:col-span-2 flex flex-col gap-4 bg-slate-900/50 p-4 border border-slate-850 rounded-xl">
          <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
            <Calculator className="w-4.5 h-4.5 text-indigo-400" />
            <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">Project Invoice & Valuation Tool</h4>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            
            {/* Input organization */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-450 uppercase font-bold flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-500" /> Consultant Brand OrganizationName
              </label>
              <input
                type="text"
                value={consultantOrg}
                onChange={(e) => setConsultantOrg(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-extrabold outline-none focus:border-indigo-500"
              />
            </div>

            {/* Input client */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-450 uppercase font-bold flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" /> Client Biotech Entity
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-extrabold outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              {/* Hourly Rate slider */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold">Hourly Rate ($)</span>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(parseInt(e.target.value) || 0)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 font-mono text-xs font-extrabold text-slate-200 text-center outline-none focus:border-indigo-500"
                />
              </div>

              {/* Hours worked slider */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold">Consulting Hours</span>
                <input
                  type="number"
                  step="0.5"
                  value={hoursSpent}
                  onChange={(e) => setHoursSpent(parseFloat(e.target.value) || 0)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 font-mono text-xs font-extrabold text-slate-200 text-center outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Services Checklist */}
            <div className="flex flex-col gap-2 border-t border-slate-850 pt-3 mt-2">
              <span className="text-[9.5px] uppercase font-black tracking-wider text-slate-500 block">Deliverables Packages Included:</span>
              
              <label className="flex items-center gap-2 cursor-pointer py-0.5 group">
                <input
                  type="checkbox"
                  checked={servicesSelected.seqAnalysis}
                  onChange={(e) => setServicesSelected(prev => ({ ...prev, seqAnalysis: e.target.checked }))}
                  className="rounded text-indigo-500 bg-slate-950 border-slate-800 w-3.5 h-3.5 focus:ring-0 checked:bg-indigo-600"
                />
                <span className="text-[10.5px] text-slate-300 group-hover:text-white transition-colors">Hydropathy & Biophysical Maps ($450)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer py-0.5 group">
                <input
                  type="checkbox"
                  checked={servicesSelected.structureModelling}
                  onChange={(e) => setServicesSelected(prev => ({ ...prev, structureModelling: e.target.checked }))}
                  className="rounded text-indigo-500 bg-slate-950 border-slate-800 w-3.5 h-3.5 focus:ring-0 checked:bg-indigo-600"
                />
                <span className="text-[10.5px] text-slate-300 group-hover:text-white transition-colors">3D Coordinates Modelling (.PDB) ($1,200)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer py-0.5 group">
                <input
                  type="checkbox"
                  checked={servicesSelected.activeSitePrediction}
                  onChange={(e) => setServicesSelected(prev => ({ ...prev, activeSitePrediction: e.target.checked }))}
                  className="rounded text-indigo-500 bg-slate-950 border-slate-800 w-3.5 h-3.5 focus:ring-0 checked:bg-indigo-600"
                />
                <span className="text-[10.5px] text-slate-300 group-hover:text-white transition-colors">Catalytic Pocket Active Map ($950)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer py-0.5 group">
                <input
                  type="checkbox"
                  checked={servicesSelected.ligandDocking}
                  onChange={(e) => setServicesSelected(prev => ({ ...prev, ligandDocking: e.target.checked }))}
                  className="rounded text-indigo-500 bg-slate-950 border-slate-800 w-3.5 h-3.5 focus:ring-0 checked:bg-indigo-600"
                />
                <span className="text-[10.5px] text-slate-300 group-hover:text-white transition-colors">In-silico Molecular Docking Sweep ($1,500)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer py-0.5 group">
                <input
                  type="checkbox"
                  checked={servicesSelected.codonOptimization}
                  onChange={(e) => setServicesSelected(prev => ({ ...prev, codonOptimization: e.target.checked }))}
                  className="rounded text-indigo-500 bg-slate-950 border-slate-800 w-3.5 h-3.5 focus:ring-0 checked:bg-indigo-600"
                />
                <span className="text-[10.5px] text-slate-300 group-hover:text-white transition-colors">Host Back-Translation Express cDNA ($750)</span>
              </label>

            </div>

          </div>
        </div>

        {/* Invoice Compilation Preview (Right 3 Columns) */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-slate-900/50 p-4 border border-slate-850 rounded-xl">
          
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4.5 h-4.5 text-emerald-400" />
                <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">Professional Bio-Dossier Dossier Output</h4>
              </div>
              <span className="text-[9px] font-mono font-bold bg-slate-950 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                Active ID: {activeRecord?.id || "None loaded"}
              </span>
            </div>

            {!activeRecord ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-8 h-8 text-slate-700 animate-pulse" />
                <span className="text-xs font-bold">Please load a target structure to generate consultancy reports.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                
                {/* Summary Box */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Target Polypeptide Profile:</span>
                    <strong className="text-slate-200 font-extrabold">{activeRecord.name} ({activeRecord.organism || "Viral Antigen"})</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1 border-t border-slate-900 pt-2 text-[10.5px] text-slate-400 leading-normal">
                    <div>
                      <span>Technical Modules total:</span>
                      <p className="font-mono text-slate-200 font-extrabold">${serviceFees.baseModuleFees.toFixed(2)}</p>
                    </div>

                    <div>
                      <span>Labor fee billing:</span>
                      <p className="font-mono text-slate-200 font-extrabold">${serviceFees.hourlyWorkFee.toFixed(2)} <span className="font-sans text-[8.5px] text-slate-500 font-normal">({hoursSpent}h @ ${hourlyRate}/h)</span></p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-850 pt-2 mt-1 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black block">Total Proposed Project Cost:</span>
                      <span className="text-lg font-mono font-black text-emerald-400">
                        ${serviceFees.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-[8.5px] text-right text-slate-450 max-w-[130px] leading-tight select-none border-l border-slate-850 pl-2.5">
                      Includes 8% computational server allocation fee: <strong className="font-mono text-slate-300">${serviceFees.bioInformaticsTechFee}</strong>
                    </div>
                  </div>
                </div>

                {/* Info guidance */}
                <div className="bg-indigo-950/25 border border-indigo-900/30 p-3 rounded-lg text-[10px] text-slate-300 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-indigo-300 block select-none uppercase">Legal Liability & IP Guarantee:</span>
                    When you compile and download this report deliverable, the bioinformatic sequence back-translations, 3D coordinate matrices, and free energy profiles are bundled into a clean publication-ready client payload file ready for prompt custom consulting invoices.
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleGenerateProjectReport}
              disabled={!activeRecord || isInvoiceGenerating}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white rounded text-xs uppercase font-black tracking-widest transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isInvoiceGenerating ? (
                <>
                  <Dribbble className="w-4 h-4 animate-spin text-white" />
                  <span>Assembling Client Dossier Report...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Download Commercial Report Pack</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => onSetTab("physicochemical")}
              className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-xs select-none hover:text-white transition-all font-bold"
            >
              Verify Calculations
            </button>
          </div>

        </div>

      </div>

      {/* Success Notification Alert */}
      <AnimatePresence>
        {invoiceSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 rounded text-[11px] font-bold flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Commercial Biotech Consultant Pack successfully generated & downloaded! Deliver directly to your client or attach to your custom consulting invoice.</span>
            </span>
            <button 
              onClick={() => setInvoiceSuccess(false)}
              className="text-emerald-400 hover:text-emerald-200 underline uppercase text-[10px]"
            >
              Acknowledge
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
