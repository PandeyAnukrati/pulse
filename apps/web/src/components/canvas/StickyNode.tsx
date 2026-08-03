import React, { useState, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@aether/ui";

type StickyNodeData = {
  content: string;
  color?: string;
  onChange?: (id: string, content: string) => void;
  onColorChange?: (id: string, color: string) => void;
  creator?: {
    name: string;
    initials: string;
    color: string;
  };
};

export const StickyNode = ({ id, data, selected }: NodeProps & { data: StickyNodeData }) => {
  const [content, setContent] = useState(data.content || "");
  const color = data.color || "orange";

  useEffect(() => {
    setContent(data.content || "");
  }, [data.content]);

  const handleBlur = () => {
    if (data.onChange) {
      data.onChange(id, content);
    }
  };

  const colors: Record<string, string> = {
    orange: "border-orange-500/30 bg-orange-950/10 shadow-orange-500/5 text-orange-200",
    purple: "border-purple-500/30 bg-purple-950/10 shadow-purple-500/5 text-purple-200",
    green: "border-emerald-500/30 bg-emerald-950/10 shadow-emerald-500/5 text-emerald-200",
    blue: "border-blue-500/30 bg-blue-950/10 shadow-blue-500/5 text-blue-200",
    yellow: "border-yellow-500/30 bg-yellow-950/10 shadow-yellow-500/5 text-yellow-200",
  };

  const dotColors: Record<string, string> = {
    orange: "bg-orange-500",
    purple: "bg-purple-500",
    green: "bg-emerald-500",
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
  };

  return (
    <div
      className={cn(
        "min-w-[160px] min-h-[160px] max-w-[240px] rounded-lg border backdrop-blur-md p-4 flex flex-col justify-between shadow-xl relative",
        colors[color],
        selected ? "ring-1 ring-white/30" : ""
      )}
    >
      {/* Target Handles */}
      <Handle type="target" position={Position.Top} className="opacity-0 hover:opacity-100 transition-opacity !bg-[#FF5C00]" />
      <Handle type="target" position={Position.Left} className="opacity-0 hover:opacity-100 transition-opacity !bg-[#FF5C00]" />

      {/* Node Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/[0.03] nodrag">
        <div className="flex items-center gap-1.5">
          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", dotColors[color])} />
          <span className="text-[9px] uppercase font-bold tracking-wider text-white/30">Sticky Note</span>
        </div>

        {/* Color Palette Switcher */}
        <div className="flex gap-1">
          {Object.keys(colors).map((c) => (
            <button
              key={c}
              onClick={() => data.onColorChange && data.onColorChange(id, c)}
              className={cn(
                "w-2.5 h-2.5 rounded-full border border-white/10 hover:scale-125 transition-transform",
                dotColors[c],
                color === c && "border-white/60 scale-110"
              )}
            />
          ))}
        </div>
      </div>

      {/* Content Area */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        placeholder="Type here..."
        className="flex-grow w-full bg-transparent border-0 resize-none text-xs font-light focus:outline-none focus:ring-0 p-0 text-white/80 placeholder-white/20 nodrag leading-relaxed"
      />

      {/* Creator Tag Indicator */}
      {data.creator && (
        <div 
          className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded text-[8px] font-bold text-white shadow-md border border-white/10 select-none uppercase tracking-wider font-mono z-10"
          style={{ backgroundColor: data.creator.color }}
          title={`Added by ${data.creator.name}`}
        >
          {data.creator.initials}
        </div>
      )}

      {/* Source Handles */}
      <Handle type="source" position={Position.Bottom} className="opacity-0 hover:opacity-100 transition-opacity !bg-[#FF5C00]" />
      <Handle type="source" position={Position.Right} className="opacity-0 hover:opacity-100 transition-opacity !bg-[#FF5C00]" />
    </div>
  );
};
