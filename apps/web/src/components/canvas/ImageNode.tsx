"use client";

import React, { useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { GlassPanel } from "@aether/ui";
import { Image as ImageIcon, Loader2 } from "lucide-react";

export function ImageNode({ data, selected }: NodeProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const url = data.url as string;
  const creator = data.creator as { name: string; color: string } | undefined;

  return (
    <div className="relative group">
      {/* Node selection outline overlay */}
      <div
        className={`absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-[1px] pointer-events-none ${
          selected ? "opacity-100 ring-2 ring-[#FF5C00]/50" : ""
        }`}
      />

      <GlassPanel className="p-1 rounded-xl bg-black/75 border-white/[0.06] overflow-hidden flex flex-col items-center justify-center min-w-[200px] min-h-[150px] max-w-[400px]">
        {/* Loader */}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
            <Loader2 className="w-5 h-5 animate-spin text-[#FF5C00]" />
          </div>
        )}

        {/* Error State */}
        {error ? (
          <div className="flex flex-col items-center gap-2 p-6 text-white/40">
            <ImageIcon className="w-6 h-6" />
            <span className="text-[10px] font-light">Failed to load image</span>
          </div>
        ) : (
          <img
            src={url}
            alt="Uploaded whiteboard node"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            className="w-full h-auto rounded-lg object-contain select-none max-h-[300px]"
            draggable={false}
          />
        )}

        {/* Bottom meta badge showing image uploader */}
        {creator && (
          <div className="w-full px-2 py-1.5 flex items-center justify-between border-t border-white/[0.04] mt-1 text-[8px] text-white/40 font-mono">
            <span>IMAGE</span>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: creator.color }} />
              {creator.name}
            </span>
          </div>
        )}
      </GlassPanel>

      {/* Target connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !border-0 !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500 !border-0 !w-2 !h-2"
      />
    </div>
  );
}
