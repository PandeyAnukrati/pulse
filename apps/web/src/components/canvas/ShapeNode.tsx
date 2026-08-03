import React, { useState, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@aether/ui";

type ShapeNodeData = {
  content: string;
  shape?: "rectangle" | "circle";
  onChange?: (id: string, content: string) => void;
  creator?: {
    name: string;
    initials: string;
    color: string;
  };
};

export const ShapeNode = ({ id, data, selected }: NodeProps & { data: ShapeNodeData }) => {
  const [content, setContent] = useState(data.content || "");
  const shape = data.shape || "rectangle";

  useEffect(() => {
    setContent(data.content || "");
  }, [data.content]);

  const handleBlur = () => {
    if (data.onChange) {
      data.onChange(id, content);
    }
  };

  return (
    <div
      className={cn(
        "backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl text-white/90 text-center flex items-center justify-center relative p-3 group",
        shape === "circle" ? "w-[120px] h-[120px] rounded-full" : "w-[160px] h-[80px] rounded-lg",
        selected ? "ring-1 ring-white/30 border-white/20 bg-white/[0.04]" : ""
      )}
    >
      {/* Target Connection Handles */}
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity !bg-[#8B5CF6]" />
      <Handle type="target" position={Position.Left} className="opacity-0 group-hover:opacity-100 transition-opacity !bg-[#8B5CF6]" />

      {/* Editable Label Input */}
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        placeholder="Name..."
        className="bg-transparent border-0 w-full text-xs font-light text-center focus:outline-none focus:ring-0 text-white/80 placeholder-white/20 nodrag"
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

      {/* Source Connection Handles */}
      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity !bg-[#8B5CF6]" />
      <Handle type="source" position={Position.Right} className="opacity-0 group-hover:opacity-100 transition-opacity !bg-[#8B5CF6]" />
    </div>
  );
};
