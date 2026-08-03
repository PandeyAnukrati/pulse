import React, { useState, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@aether/ui";

type TextNodeData = {
  content: string;
  onChange?: (id: string, content: string) => void;
  creator?: {
    name: string;
    initials: string;
    color: string;
  };
};

export const TextNode = ({ id, data, selected }: NodeProps & { data: TextNodeData }) => {
  const [content, setContent] = useState(data.content || "Text Annotation");

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
        "p-2 bg-transparent text-left relative group min-w-[80px]",
        selected ? "ring-1 ring-white/10 rounded" : ""
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0 group-hover:opacity-100 transition-opacity !bg-white/40" />
      
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        placeholder="Enter text..."
        className="bg-transparent border-0 w-full text-sm font-light text-white focus:outline-none focus:ring-0 placeholder-white/20 nodrag"
      />

      {/* Creator Tag Indicator */}
      {data.creator && (
        <div 
          className="absolute -bottom-1 -right-1 px-1.2 py-0.5 rounded-[4px] text-[7px] font-bold text-white shadow bg-[#8B5CF6] select-none uppercase tracking-wider font-mono z-10"
          style={{ backgroundColor: data.creator.color }}
          title={`Added by ${data.creator.name}`}
        >
          {data.creator.initials}
        </div>
      )}
      
      <Handle type="source" position={Position.Right} className="opacity-0 group-hover:opacity-100 transition-opacity !bg-white/40" />
    </div>
  );
};
