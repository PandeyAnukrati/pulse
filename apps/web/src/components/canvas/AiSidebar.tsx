"use client";

import React, { useState, useRef, useEffect } from "react";
import { GlassPanel } from "@aether/ui";
import { Bot, User, Send, Loader2, Sparkles, FileText, LayoutTemplate, Network, Copy, Check } from "lucide-react";
import { apiFetch } from "../../utils/api";

interface AiSidebarProps {
  onClose: () => void;
  boardNodes: any[];
  boardEdges: any[];
  onGenerateLayout: (layout: { nodes: any[]; edges: any[] }) => void;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export function AiSidebar({ onClose, boardNodes, boardEdges, onGenerateLayout }: AiSidebarProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "generators">("chat");
  
  // Chat States
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { sender: "ai", text: "Hello! I am your Aether AI Assistant. Ask me to generate a system design layout, write documentation for this board, or convert notes to UML!" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Generator States
  const [archPrompt, setArchPrompt] = useState("");
  const [archLoading, setArchLoading] = useState(false);

  const [umlPrompt, setUmlPrompt] = useState("");
  const [umlLoading, setUmlLoading] = useState(false);

  const [docLoading, setDocLoading] = useState(false);
  const [compiledDocs, setCompiledDocs] = useState("");
  const [copied, setCopied] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput;
    setChatInput("");
    setChatHistory((prev) => [...prev, { sender: "user", text: userMessage }]);
    setChatLoading(true);

    try {
      const boardContext = JSON.stringify({ nodes: boardNodes, edges: boardEdges });
      const res = await apiFetch<{ response: string }>("/ai/chat", {
        method: "POST",
        json: { message: userMessage, boardContext }
      });
      setChatHistory((prev) => [...prev, { sender: "ai", text: res.response }]);
    } catch (err) {
      setChatHistory((prev) => [...prev, { sender: "ai", text: "Sorry, I ran into an issue communicating with the AI service." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateArchitecture = async () => {
    if (!archPrompt.trim() || archLoading) return;
    setArchLoading(true);
    try {
      const layout = await apiFetch<{ nodes: any[]; edges: any[] }>("/ai/generate-architecture", {
        method: "POST",
        json: { prompt: archPrompt }
      });
      onGenerateLayout(layout);
      setArchPrompt("");
      setChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: `I have successfully drawn a visual diagram layout on the whiteboard canvas for: "${archPrompt}".` }
      ]);
      setActiveTab("chat");
    } catch (err) {
      alert("Failed to generate architecture diagram.");
    } finally {
      setArchLoading(false);
    }
  };

  const handleGenerateUml = async () => {
    if (!umlPrompt.trim() || umlLoading) return;
    setUmlLoading(true);
    try {
      const layout = await apiFetch<{ nodes: any[]; edges: any[] }>("/ai/notes-to-uml", {
        method: "POST",
        json: { notes: umlPrompt }
      });
      onGenerateLayout(layout);
      setUmlPrompt("");
      setChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: `I have converted your text notes into a visual UML node flow on the canvas.` }
      ]);
      setActiveTab("chat");
    } catch (err) {
      alert("Failed to compile UML nodes.");
    } finally {
      setUmlLoading(false);
    }
  };

  const handleGenerateDocs = async () => {
    if (docLoading) return;
    setDocLoading(true);
    try {
      const boardState = JSON.stringify({ nodes: boardNodes, edges: boardEdges });
      const res = await apiFetch<{ documentation: string }>("/ai/generate-documentation", {
        method: "POST",
        json: { boardState }
      });
      setCompiledDocs(res.documentation);
    } catch (err) {
      alert("Failed to summarize board state.");
    } finally {
      setDocLoading(false);
    }
  };

  const copyDocsToClipboard = () => {
    navigator.clipboard.writeText(compiledDocs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassPanel className="w-80 h-[calc(100vh-2rem)] bg-[#050505]/95 border-white/[0.08] shadow-2xl flex flex-col pointer-events-auto">
      {/* Title Header */}
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#FF5C00]/10 border border-[#FF5C00]/20 text-[#FF5C00]">
            <Bot className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-white">Aether AI Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white transition-colors"
        >
          Close
        </button>
      </div>

      {/* Tabs list */}
      <div className="px-4 py-2 border-b border-white/[0.04] flex gap-2 shrink-0">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "chat"
              ? "bg-[#FF5C00] text-white"
              : "bg-white/[0.02] border border-white/[0.05] text-white/40 hover:text-white"
          }`}
        >
          <Sparkles className="w-3 h-3" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab("generators")}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "generators"
              ? "bg-[#FF5C00] text-white"
              : "bg-white/[0.02] border border-white/[0.05] text-white/40 hover:text-white"
          }`}
        >
          <LayoutTemplate className="w-3 h-3" />
          Generators
        </button>
      </div>

      {/* Main Panels */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {activeTab === "chat" ? (
          <div className="flex-grow flex flex-col overflow-hidden">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 items-start ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border uppercase text-[8px] font-bold ${
                      msg.sender === "user"
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                        : "bg-[#FF5C00]/10 border-[#FF5C00]/30 text-[#FF5C00]"
                    }`}
                  >
                    {msg.sender === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  </div>
                  <div
                    className={`p-3 rounded-xl border text-[11px] leading-relaxed break-words font-light max-w-[80%] ${
                      msg.sender === "user"
                        ? "bg-purple-500/5 border-purple-500/10 text-white/90"
                        : "bg-white/[0.02] border-white/[0.05] text-white/80"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-[#FF5C00]">
                    <Bot className="w-3 h-3" />
                  </div>
                  <div className="p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF5C00]" />
                    <span className="text-[10px] text-white/40 font-mono">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-white/[0.06] flex gap-1.5 shrink-0 bg-black/45">
              <input
                type="text"
                required
                placeholder="Ask assistant to help build or write..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-grow h-8 bg-white/[0.02] border border-white/[0.05] rounded-md px-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#FF5C00]"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="w-8 h-8 rounded-md bg-[#FF5C00] text-white flex items-center justify-center hover:bg-[#E55200] disabled:bg-[#FF5C00]/50 transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto p-4 space-y-5">
            {/* System Architecture Generator */}
            <div className="space-y-2 border-b border-white/[0.04] pb-4">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-[#FF5C00]" />
                System Design Architecture
              </label>
              <textarea
                rows={2}
                placeholder="Describe your system (e.g. Microservices Gateway with Redis, or Three-tier web application)..."
                value={archPrompt}
                onChange={(e) => setArchPrompt(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.05] rounded-lg p-2 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#FF5C00]"
              />
              <button
                onClick={handleGenerateArchitecture}
                disabled={archLoading}
                className="w-full py-1.5 rounded bg-[#FF5C00]/15 border border-[#FF5C00]/30 hover:bg-[#FF5C00]/25 text-[#FF5C00] text-[10px] font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {archLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Draw Architecture Layout"}
              </button>
            </div>

            {/* Notes to UML Converter */}
            <div className="space-y-2 border-b border-white/[0.04] pb-4">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5 text-[#FF5C00]" />
                Notes to UML Flowchart
              </label>
              <textarea
                rows={2}
                placeholder="Enter textual step notes (e.g. Register -> Validate -> Send verification code -> Save to DB)..."
                value={umlPrompt}
                onChange={(e) => setUmlPrompt(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.05] rounded-lg p-2 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#FF5C00]"
              />
              <button
                onClick={handleGenerateUml}
                disabled={umlLoading}
                className="w-full py-1.5 rounded bg-[#FF5C00]/15 border border-[#FF5C00]/30 hover:bg-[#FF5C00]/25 text-[#FF5C00] text-[10px] font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {umlLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Generate Flowchart Nodes"}
              </button>
            </div>

            {/* Summarize Whiteboard to Documentation */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#FF5C00]" />
                Whiteboard to Documentation
              </label>
              <button
                onClick={handleGenerateDocs}
                disabled={docLoading}
                className="w-full py-1.5 rounded bg-[#FF5C00]/15 border border-[#FF5C00]/30 hover:bg-[#FF5C00]/25 text-[#FF5C00] text-[10px] font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {docLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Summarize & Generate Docs"}
              </button>

              {compiledDocs && (
                <div className="relative mt-2 p-2 bg-white/[0.01] border border-white/[0.04] rounded-lg text-left">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] text-white/30 font-mono">COMPILED MARKDOWN</span>
                    <button
                      onClick={copyDocsToClipboard}
                      className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <pre className="text-[9px] font-mono text-white/70 overflow-x-auto whitespace-pre-wrap max-h-40 bg-black/30 p-2 rounded border border-white/[0.02]">
                    {compiledDocs}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
