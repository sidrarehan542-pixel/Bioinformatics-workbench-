import React, { useState, useRef, useMemo } from "react";
import { DBType, ProteinData } from "../types";
import { 
  Upload, 
  Play, 
  Check, 
  AlertCircle, 
  X, 
  Download, 
  Database, 
  Loader2, 
  FileSpreadsheet, 
  Info, 
  CheckCircle2, 
  PlusCircle,
  HelpCircle,
  Trash2,
  ChevronRight
} from "lucide-react";

interface BatchProcessorProps {
  activeDb: DBType;
  onLoadRecord: (record: ProteinData) => void;
  onAddMessage?: (message: string) => void;
}

interface BatchItem {
  id: string;
  db: DBType;
  status: "pending" | "loading" | "success" | "failed";
  error?: string;
  data?: ProteinData;
}

export const BatchProcessor: React.FC<BatchProcessorProps> = ({
  activeDb: currentWorkspaceDb,
  onLoadRecord,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [targetDb, setTargetDb] = useState<DBType>(currentWorkspaceDb);
  const [manualInput, setManualInput] = useState<string>("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse raw text (either comma, newline, tab or semicolon separated) into clean unique IDs
  const parseIDs = (text: string): string[] => {
    // split by common delimiters
    const tokens = text.split(/[\n,;\t]+/);
    const seen = new Set<string>();
    const result: string[] = [];

    const skipHeaders = [
      "id", "protein", "gene", "accession", "uniprot", "pdb", "sequence", "name", 
      "protein_id", "gene_id", "proteinid", "geneid", ""
    ];

    for (let token of tokens) {
      const cleanToken = token.trim();
      if (cleanToken && !seen.has(cleanToken) && !skipHeaders.includes(cleanToken.toLowerCase())) {
        seen.add(cleanToken);
        result.push(cleanToken);
      }
    }
    return result;
  };

  // Drag and drop file handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const parsedIds = parseIDs(text);
        if (parsedIds.length === 0) {
          setErrorText("Could not resolve any valid Protein or Gene IDs inside the uploaded file.");
          return;
        }
        setErrorText("");
        
        // Add parsed IDs as pending batch items
        const newBatchItems = parsedIds.map(id => ({
          id,
          db: targetDb,
          status: "pending" as const,
        }));
        setItems(prev => [...prev, ...newBatchItems]);
      }
    };
    reader.onerror = () => {
      setErrorText("Error occurred reading the file.");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Manual text-area addition helper
  const handleAddManualIDs = () => {
    const parsedIds = parseIDs(manualInput);
    if (parsedIds.length === 0) {
      setErrorText("Please write or paste one or more valid IDs into the box first.");
      return;
    }
    setErrorText("");
    const newBatchItems = parsedIds.map(id => ({
      id,
      db: targetDb,
      status: "pending" as const,
    }));
    setItems(prev => [...prev, ...newBatchItems]);
    setManualInput("");
  };

  // Perform parallel fetching on all current "pending" or "failed" items
  const handleParallelFetch = async () => {
    const itemsToFetch = items.filter(item => item.status === "pending" || item.status === "failed");
    if (itemsToFetch.length === 0) {
      setErrorText("No pending or failed queries available to process in the queue.");
      return;
    }

    setIsProcessing(true);
    setErrorText("");

    // Set statuses to loading
    setItems(prev => prev.map(item => {
      if (item.status === "pending" || item.status === "failed") {
        return { ...item, status: "loading" };
      }
      return item;
    }));

    // Perform concurrent requests
    const fetchPromises = itemsToFetch.map(async (item) => {
      try {
        const url = `/api/query?db=${item.db}&id=${encodeURIComponent(item.id)}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Error ${res.status}`);
        }

        const proteinData: ProteinData = await res.json();
        
        // Update state on completion
        setItems(prev => prev.map(p => {
          if (p.id === item.id && p.db === item.db) {
            return {
              ...p,
              status: "success",
              data: proteinData,
            };
          }
          return p;
        }));
      } catch (err: any) {
        setItems(prev => prev.map(p => {
          if (p.id === item.id && p.db === item.db) {
            return {
              ...p,
              status: "failed",
              error: err.message || "Failed to fetch metadata",
            };
          }
          return p;
        }));
      }
    });

    await Promise.all(fetchPromises);
    setIsProcessing(false);
  };

  // Export fully resolved items as combined spreadsheet-compliant CSV download
  const handleExportCSV = () => {
    const successfulItems = items.filter(item => item.status === "success" && item.data);
    if (successfulItems.length === 0) {
      setErrorText("No successfully parsed records exist to compile into a CSV file.");
      return;
    }

    // Build standard CSV
    const headers = ["ID", "Name", "Source Database", "Organism", "Gene Name", "Sequence Length", "Sequence", "Description"];
    const rows = successfulItems.map(item => {
      const data = item.data!;
      return [
        data.id,
        `"${data.name.replace(/"/g, '""')}"`,
        data.databaseSource,
        `"${data.organism.replace(/"/g, '""')}"`,
        data.geneName || "",
        data.sequenceLength,
        data.sequence,
        `"${(data.description || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bio_batch_resolved_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveItem = (idToRemove: string, dbToRemove: DBType) => {
    setItems(prev => prev.filter(item => !(item.id === idToRemove && item.db === dbToRemove)));
  };

  const handleClearAll = () => {
    setItems([]);
    setErrorText("");
  };

  // Compute operational statistics
  const stats = useMemo(() => {
    const total = items.length;
    const loadingCount = items.filter(i => i.status === "loading").length;
    const successCount = items.filter(i => i.status === "success").length;
    const failedCount = items.filter(i => i.status === "failed").length;
    const pendingCount = items.filter(i => i.status === "pending").length;
    return { total, loadingCount, successCount, failedCount, pendingCount };
  }, [items]);

  return (
    <div className="w-full mt-2.5 z-20">
      {/* Launch Control Panel Toggle */}
      <div className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FileSpreadsheet className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded leading-none">New</span>
              <h5 className="text-xs font-bold text-slate-200">Parallel Batch Processing Workbench</h5>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Upload a CSV/TXT list of multiple proteins/genes to catalog metadata in parallel.</p>
          </div>
        </div>

        <button
          id="toggle-batch-processor-btn"
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-1.5 text-[10px] font-black rounded border uppercase flex items-center gap-1.5 transition-all ${
            isOpen 
              ? "bg-slate-950 text-slate-400 border-slate-850 hover:text-slate-200" 
              : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-650/15"
          }`}
        >
          {isOpen ? "Close Console" : "Open Batch Console"}
          <ChevronRight className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90 text-slate-500" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mt-2 flex flex-col gap-4 animate-fadeIn shadow-2xl relative">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-black text-slate-100 uppercase tracking-widest">
                Batch Metadata Cataloguing Panel
              </h4>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive controls and ingestion forms layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Box: File Ingestors & Settings */}
            <div className="flex flex-col gap-3">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850 flex flex-col gap-2.5">
                <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wide">
                  Step 1: Ingestion DB Configuration
                </span>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 font-bold">Target Database Source:</label>
                  <select
                    id="batch-db-select"
                    value={targetDb}
                    onChange={(e) => setTargetDb(e.target.value as DBType)}
                    className="bg-slate-900 border border-slate-800 text-xs rounded-md text-slate-200 font-bold px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="omni">Global Federated Search</option>
                    <option value="uniprot">UniProt</option>
                    <option value="pdb">PDB Structure</option>
                    <option value="ncbi">NCBI Nucleotide</option>
                    <option value="alphafold">AlphaFold DB</option>
                    <option value="pubchem">PubChem</option>
                    <option value="kegg">KEGG Pathway</option>
                  </select>
                </div>
              </div>

              {/* Drag n Drop Upload Box */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive 
                    ? "border-emerald-500 bg-emerald-950/15" 
                    : "border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/5 text-slate-400"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <Upload className="w-8 h-8 text-slate-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-200">Drag & Drop ID File Here</span>
                <span className="text-[10px] text-slate-500 mt-1 leading-normal">
                  Supports comma/newline/semicolon delimited <br /><strong>.CSV</strong> or <strong>.TXT</strong> files.
                </span>
              </div>
            </div>

            {/* Right Box: Direct manual batch import */}
            <div className="flex flex-col gap-2.5 bg-slate-950/60 p-3 rounded-lg border border-slate-850 justify-between">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wide">
                  Alternative: Direct Paste Entry
                </span>
                
                <textarea
                  id="batch-manual-textarea"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Paste or write comma, tab, or newline separated symbols (e.g. P0DTC2, P01308, P42212, O15533)"
                  className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 leading-normal resize-none"
                />
              </div>

              <button
                id="batch-add-manual-btn"
                onClick={handleAddManualIDs}
                className="w-full py-1.5 mt-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white rounded-md text-[10px] uppercase font-black tracking-wider transition-colors flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                Parse & Inject into Queue
              </button>
            </div>

          </div>

          {/* Core Status Warnings & Messages */}
          {errorText && (
            <div className="bg-rose-950/45 border border-rose-800/65 rounded-lg p-3 text-[11px] text-rose-300 flex items-start gap-2.5 animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Cataloguer Notice:</strong>
                <span className="leading-normal">{errorText}</span>
              </div>
            </div>
          )}

          {/* Batch Items Queue Manager */}
          {items.length > 0 && (
            <div className="flex flex-col gap-3 mt-1.5 border-t border-slate-800/80 pt-4">
              
              {/* Controls Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-850">
                <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span className="text-slate-400 font-bold">Total:</span> 
                    <span className="text-slate-200 font-black">{stats.total}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-indigo-400 font-bold">Pending:</span> 
                    <span className="text-indigo-200 font-black">{stats.pendingCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-amber-400 font-bold">In-Flight:</span> 
                    <span className="text-amber-200 font-black">{stats.loadingCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-400 font-bold">Success:</span> 
                    <span className="text-emerald-250 font-black">{stats.successCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-red-400 font-bold">Failed:</span> 
                    <span className="text-red-300 font-black">{stats.failedCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAll}
                    disabled={isProcessing}
                    className="p-1.5 px-3 bg-slate-900 hover:bg-slate-850 hover:text-red-300 border border-slate-800 text-slate-400 disabled:opacity-50 text-[10px] uppercase font-bold transition-all rounded flex items-center gap-1"
                    title="Clear current workspace queue"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                    Clear Queue
                  </button>

                  <button
                    id="batch-export-csv-btn"
                    onClick={handleExportCSV}
                    disabled={stats.successCount === 0 || isProcessing}
                    className="p-1.5 px-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 disabled:opacity-50 text-[10px] uppercase font-bold transition-all rounded flex items-center gap-1"
                  >
                    <Download className="w-3 h-3 text-emerald-450" />
                    Export Resolved CSV
                  </button>

                  <button
                    id="batch-execute-fetch-btn"
                    onClick={handleParallelFetch}
                    disabled={isProcessing || (stats.pendingCount === 0 && stats.failedCount === 0)}
                    className="p-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded border border-indigo-500 shadow-md shadow-indigo-600/10 hover:shadow-indigo-650/20 disabled:opacity-50 text-[10px] uppercase font-black transition-all flex items-center gap-1.5"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                        <span>Querying...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current text-white" />
                        <span>Execute Parallel Fetch</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Real-time Progress Bar */}
              {isProcessing && (
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-305" 
                    style={{ width: `${( (stats.total - stats.pendingCount - stats.loadingCount) / stats.total) * 100}%` }}
                  />
                </div>
              )}

              {/* Scrollable Status Grid */}
              <div className="border border-slate-800/80 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px] font-mono leading-none">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-850 text-slate-400 select-none text-[9px] uppercase font-bold tracking-widest">
                      <th className="p-3">Protein/Gene ID</th>
                      <th className="p-3">Db Source</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Resolved Metadata Details</th>
                      <th className="p-3 text-right">Interactive Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50 bg-slate-900/40">
                    {items.map((item, idx) => {
                      const colors = item.status === "success" 
                        ? { text: "text-emerald-400", bg: "bg-emerald-950/30", bColor: "border-emerald-500/20" }
                        : item.status === "failed"
                        ? { text: "text-rose-450 text-rose-400", bg: "bg-rose-950/30", bColor: "border-rose-550/20" }
                        : item.status === "loading"
                        ? { text: "text-amber-400", bg: "bg-amber-950/30", bColor: "border-amber-550/20" }
                        : { text: "text-slate-400", bg: "bg-slate-950/50", bColor: "border-slate-850" };

                      return (
                        <tr key={`${item.id}-${idx}`} className="hover:bg-slate-950/35 transition-colors">
                          <td className="p-3 font-black text-slate-200 select-all">{item.id}</td>
                          <td className="p-3">
                            <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-1.5 py-0.5 rounded">
                              {item.db}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              {item.status === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
                              {item.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                              {item.status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                              {item.status === "pending" && <HelpCircle className="w-3.5 h-3.5 text-slate-500" />}
                              <span className={`text-[10px] font-black uppercase tracking-wider ${colors.text}`}>
                                {item.status}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 max-w-xs truncate text-slate-350">
                            {item.status === "success" && item.data ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-200">{item.data.name}</span>
                                {item.data.organism && (
                                  <span className="text-[9px] text-slate-500 italic">({item.data.organism})</span>
                                )}
                                <span className="text-[9px] font-black bg-slate-950/50 px-1 py-0.5 rounded text-indigo-400">
                                  {item.data.sequenceLength} aa
                                </span>
                              </div>
                            ) : item.status === "failed" ? (
                              <span className="text-red-400/90 text-[10px] leading-relaxed">{item.error}</span>
                            ) : (
                              <span className="text-slate-500 italic">Waiting...</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.status === "success" && item.data && (
                                <button
                                  onClick={() => onLoadRecord(item.data!)}
                                  className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/20 rounded font-black hover:scale-102 hover:text-white transition-all text-[9px] uppercase tracking-wide flex items-center gap-0.5"
                                  title="Load this record in the interactive workbench"
                                >
                                  Load Work
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveItem(item.id, item.db)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-600 hover:text-red-400 transition-colors"
                                title="Remove from queue"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
