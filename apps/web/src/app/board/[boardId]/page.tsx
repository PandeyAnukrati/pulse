"use client";

export const runtime = "edge";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/useAuthStore";
import CanvasBuilder from "../../../components/canvas/CanvasBuilder";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import Link from "next/link";
import { Button } from "@aether/ui";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const boardId = params.boardId as string;
  const [boardName, setBoardName] = useState("Collaborative Board");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }

    // Mock fetching workspace metadata (or let's just use defaults for local sandbox)
    setBoardName(`Board Workspace`);
    setLoading(false);
  }, [accessToken, boardId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF5C00]" />
          <span className="text-xs text-white/40 tracking-wider">Opening Canvas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-[#050505] relative overflow-hidden select-none">
      {/* Tiny Global Header Bar */}
      <header className="h-12 w-full border-b border-white/[0.04] bg-[#070707] flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-white/50 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
          </Link>
          <div className="w-px h-4 bg-white/[0.08]" />
          <span className="text-xs text-white/60 font-light truncate">Aether Editor</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FF5C00]/10 border border-[#FF5C00]/25 text-[10px] text-[#FF5C00] font-medium font-mono uppercase tracking-wider">
            ● local sandbox
          </div>
        </div>
      </header>

      {/* Full Screen Canvas Editor */}
      <div className="flex-grow w-full relative">
        <ReactFlowProvider>
          <CanvasBuilder boardId={boardId} boardName={boardName} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
