import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Sparkles, RefreshCw, Bot, User, HelpCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { ProteinData } from "../types";
import { auth } from "../lib/firebase";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface ChatBoxProps {
  activeRecord: ProteinData | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ChatBox({ activeRecord, isOpen = true, onClose }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAbortControllerRef = useRef<AbortController | null>(null);

  // Cleanup in-flight requests on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      chatAbortControllerRef.current?.abort();
    };
  }, []);

  // Initialize conversations when active record changes
  useEffect(() => {
    if (activeRecord) {
      setMessages([
        {
          role: "ai",
          content: `🧬 **BioHelix AI Advisor Online.** I am ready to analyze **${activeRecord.name}** (Accession: \`${activeRecord.id}\`, Locus/Gene: \`${activeRecord.geneName || "N/A"}\`). \n\nAsk me about its tertiary structure, physiological targeting, disease pathways, or structural homology.`
        }
      ]);
    } else {
      setMessages([
        {
          role: "ai",
          content: "🤖 **System Standby.** Please search and fetch a protein sequence first above to begin live interactive bio-consultations."
        }
      ]);
    }
  }, [activeRecord]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Suggested follow-up prompts
  const suggestions = activeRecord
    ? [
        `What is the therapeutic significance of ${activeRecord.geneName || activeRecord.name}?`,
        `Describe the molecular mechanism of ${activeRecord.id}.`,
        `Are there secondary structure predictions for this sequence?`,
        `In what clinical conditions is ${activeRecord.geneName || activeRecord.name} implicated?`
      ]
    : [
        "What is the difference between UniProt and PDB?",
        "What are AlphaFold structure predictions?",
        "How is Needleman-Wunsch global alignment calculated?"
      ];

  const handleSend = async (textToSend: string) => {
    const queryText = textToSend.trim();
    if (!queryText) return;

    // Abort previous in-flight chat calls
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    chatAbortControllerRef.current = controller;

    // Append user message
    const updatedMessages = [...messages, { role: "user", content: queryText } as Message];
    setMessages(updatedMessages);
    setInput("");
    setChatLoading(true);

    try {
      // Map frontend messages into the API history structure
      const apiMessages = updatedMessages.map(m => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.content
      }));

      let headers: Record<string, string> = { "Content-Type": "application/json" };
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: apiMessages,
          activeRecord: activeRecord
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error("Advisor system experienced an operational error.");
      }

      const data = await res.json();
      if (chatAbortControllerRef.current === controller) {
        setMessages(prev => [...prev, { role: "ai", content: data.content || "No structural response formulated." }]);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return; // Ignore aborted requests
      setMessages(prev => [
        ...prev,
        { role: "ai", content: `❌ **Error:** Connection to AI advisor lost. ${err.message}` }
      ]);
    } finally {
      if (chatAbortControllerRef.current === controller) {
        setChatLoading(false);
      }
    }
  };

  const parseMarkdown = (text: string) => {
    // Simple inline decorator for rendering code segments, bolding, lists, and headings cleanly
    return text.split("\n").map((line, idx) => {
      let cleaned = line;
      // Headers
      if (cleaned.startsWith("### ")) return <h4 key={idx} className="text-xs font-black text-emerald-400 mt-2 mb-1">{cleaned.slice(4)}</h4>;
      if (cleaned.startsWith("## ")) return <h3 key={idx} className="text-xs font-black text-emerald-300 mt-3 mb-1">{cleaned.slice(3)}</h3>;
      if (cleaned.startsWith("# ")) return <h2 key={idx} className="text-sm font-black text-emerald-200 mt-3 mb-1.5">{cleaned.slice(2)}</h2>;
      
      // Bullets
      const isBullet = cleaned.startsWith("- ") || cleaned.startsWith("* ");
      if (isBullet) {
        cleaned = cleaned.slice(2);
      }

      // Format bold blocks **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      const codeRegex = /`(.*?)`/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      // Unpack bold and code segments
      const textToScan = cleaned;
      const combinedMatches: { type: 'bold' | 'code', word: string, index: number }[] = [];
      
      let boldMatch;
      while ((boldMatch = boldRegex.exec(textToScan)) !== null) {
        combinedMatches.push({ type: 'bold', word: boldMatch[1], index: boldMatch.index });
      }
      let codeMatch;
      while ((codeMatch = codeRegex.exec(textToScan)) !== null) {
        combinedMatches.push({ type: 'code', word: codeMatch[1], index: codeMatch.index });
      }

      // Sort matches by index
      combinedMatches.sort((a, b) => a.index - b.index);

      let currentTextPointer = 0;
      const elements: React.ReactNode[] = [];
      
      combinedMatches.forEach((m, mIdx) => {
        // Skip overlaps if Regex scanned parts out of order
        if (m.index < currentTextPointer) return;
        
        // Add preceding text
        if (m.index > currentTextPointer) {
          elements.push(textToScan.slice(currentTextPointer, m.index));
        }
        
        // Add decorated word
        if (m.type === 'bold') {
          elements.push(<strong key={`b-${mIdx}`} className="font-extrabold text-teal-350 text-teal-300">{m.word}</strong>);
          currentTextPointer = m.index + m.word.length + 4; // account for ** **
        } else {
          elements.push(<code key={`c-${mIdx}`} className="bg-slate-950 px-1 py-0.5 rounded text-rose-400 font-mono text-[10px]">{m.word}</code>);
          currentTextPointer = m.index + m.word.length + 2; // account for ` `
        }
      });

      if (currentTextPointer < textToScan.length) {
        elements.push(textToScan.slice(currentTextPointer));
      }

      const content = elements.length > 0 ? elements : cleaned;

      if (isBullet) {
        return (
          <li key={idx} className="ml-3 list-disc text-slate-300 text-[11px] leading-relaxed pl-1 mt-0.5">
            {content}
          </li>
        );
      }
      return <p key={idx} className="text-slate-300 text-[11px] leading-relaxed mt-1">{content}</p>;
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute top-[102%] left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border border-emerald-500/20 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[420px] filter"
    >
      {/* Target Intelligent Co-pilot Header */}
      <div className="bg-gradient-to-r from-slate-950 to-slate-900 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">BioHelix AI Advisor</span>
            <span className="text-[9px] text-slate-500 font-mono mt-0.5">Live Bioinformatic Chat Interface</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMessages([])} 
            className="p-1 text-slate-500 hover:text-slate-300 text-[10px] font-mono hover:bg-slate-800 rounded transition-colors"
            title="Clear Chat Terminal"
          >
            Clear Log
          </button>
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-1 text-slate-500 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Thread list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-teal-900 scrollbar-track-transparent">
        {messages.map((m, i) => (
          <div 
            key={i} 
            className={`flex gap-3 items-start ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar block */}
            <div 
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-[10px] borer shadow-sm ${
                m.role === "user" 
                  ? "bg-emerald-600 border-emerald-500 text-white font-extrabold" 
                  : "bg-slate-950 border-slate-800 text-emerald-400"
              }`}
            >
              {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Content text */}
            <div 
              className={`rounded-lg px-3.5 py-2.5 max-w-[85%] text-xs shadow-md ${
                m.role === "user" 
                  ? "bg-slate-800 border border-slate-705 text-emerald-50" 
                  : "bg-slate-950/60 border border-slate-850 text-slate-200"
              }`}
            >
              <div className="space-y-1">
                {parseMarkdown(m.content)}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {chatLoading && (
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-slate-950 border border-slate-800 text-emerald-400">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="rounded-lg px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 text-slate-450 flex items-center gap-2 text-xs">
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">Running sequence analysis...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Biological Prompts */}
      <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-850 shrink-0">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-emerald-500" />
          Recommended Structural & Pathway Inquiries
        </span>
        <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar pb-1 max-h-[64px] scrollbar-none">
          {suggestions.map((sug, sIdx) => (
            <button
              key={`sug-${sIdx}`}
              onClick={() => handleSend(sug)}
              disabled={chatLoading}
              className="text-[10px] text-slate-400 hover:text-emerald-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded px-2 py-1 transition-all whitespace-nowrap text-left shrink-0 max-w-[280px] truncate"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Target prompt input box */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend(input)}
          disabled={chatLoading}
          placeholder={
            activeRecord 
              ? `Ask anything about ${activeRecord.name}...` 
              : "Search or fetch a gene/protein above to start chat..."
          }
          className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
        />
        <button
          onClick={() => handleSend(input)}
          disabled={chatLoading || !input.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded px-3 py-1 text-xs font-bold transition-all flex items-center justify-center shadow-md shadow-emerald-700/10"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
