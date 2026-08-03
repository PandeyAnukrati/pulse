"use client";

import React, { useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { GlassPanel } from "@aether/ui";
import { MessageSquare, Check, Trash2, Send } from "lucide-react";

export function CommentPinNode({ data, selected }: NodeProps) {
  const [newReply, setNewReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const commentId = data.commentId as string;
  const isResolved = data.isResolved as boolean;
  const authorInitials = data.authorInitials as string || "C";
  const authorName = data.authorName as string || "Collaborator";
  const content = data.content as string || "";
  const createdAt = data.createdAt as string || "";
  const replies = data.replies as any[] || [];
  
  const onAddReply = data.onAddReply as ((parentId: string, text: string) => Promise<void>) | undefined;
  const onResolve = data.onResolve as ((commentId: string, resolved: boolean) => Promise<void>) | undefined;
  const onDelete = data.onDelete as ((commentId: string) => Promise<void>) | undefined;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || submitting || !onAddReply) return;
    setSubmitting(true);
    try {
      await onAddReply(commentId, newReply);
      setNewReply("");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Target connection handles */}
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      
      {/* Floating Circular Pin Bubble */}
      <button
        className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs uppercase shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
          isResolved
            ? "bg-zinc-800 border-zinc-700 text-zinc-400"
            : selected
            ? "bg-[#FF5C00] border-white text-white scale-110"
            : "bg-[#FF5C00]/15 border-[#FF5C00]/40 text-[#FF5C00] backdrop-blur-md"
        }`}
      >
        <MessageSquare className="w-4 h-4" />
      </button>

      {/* Floating Thread Popover Card (Displayed when the pin node is clicked/selected) */}
      {selected && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 w-72 pointer-events-auto">
          <GlassPanel className="p-4 bg-[#0A0A0A]/95 border-white/[0.08] shadow-2xl rounded-xl flex flex-col gap-3 max-h-[350px] overflow-hidden">
            {/* Header / Thread status */}
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                Comment Thread
              </span>
              <div className="flex gap-2">
                {onResolve && (
                  <button
                    onClick={() => onResolve(commentId, !isResolved)}
                    title={isResolved ? "Reopen Thread" : "Resolve Thread"}
                    className={`p-1 rounded transition-colors ${
                      isResolved
                        ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                        : "text-white/40 hover:text-emerald-400 hover:bg-white/[0.04]"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(commentId)}
                    title="Delete Thread"
                    className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-white/[0.04] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable replies container */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-0.5">
              {/* Root Comment Message */}
              <div className="flex gap-2.5 items-start">
                <div className="w-6 h-6 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-[#FF5C00] font-bold text-[9px] flex items-center justify-center shrink-0 uppercase select-none">
                  {authorInitials}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-white truncate">
                      {authorName}
                    </span>
                    <span className="text-[8px] text-white/20 font-mono">
                      {createdAt ? new Date(createdAt).toLocaleTimeString() : ""}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 font-light mt-0.5 whitespace-pre-wrap break-words">
                    {content}
                  </p>
                </div>
              </div>

              {/* Thread Replies */}
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-2.5 items-start pl-4 border-l border-white/[0.03]">
                  <div className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold text-[8px] flex items-center justify-center shrink-0 uppercase select-none">
                    {reply.user ? `${reply.user.firstName[0]}${reply.user.lastName[0]}` : "R"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold text-white/80 truncate">
                        {reply.user ? `${reply.user.firstName} ${reply.user.lastName}` : "Reply"}
                      </span>
                      <span className="text-[8px] text-white/20 font-mono">
                        {new Date(reply.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 font-light mt-0.5 whitespace-pre-wrap break-words">
                      {reply.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Form */}
            {!isResolved && onAddReply && (
              <form onSubmit={handleReplySubmit} className="flex gap-1.5 mt-2 border-t border-white/[0.04] pt-2 shrink-0">
                <input
                  type="text"
                  required
                  placeholder="Reply to thread..."
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  className="flex-grow h-8 bg-white/[0.02] border border-white/[0.05] rounded-md px-2 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#FF5C00]"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-8 h-8 rounded-md bg-[#FF5C00] text-white flex items-center justify-center hover:bg-[#E55200] disabled:bg-[#FF5C00]/50 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </GlassPanel>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}
