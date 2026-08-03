"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../utils/api";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Panel,
  useReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { StickyNode } from "./StickyNode";
import { ShapeNode } from "./ShapeNode";
import { TextNode } from "./TextNode";
import { ImageNode } from "./ImageNode";
import { CommentPinNode } from "./CommentPinNode";
import { NotificationDropdown } from "./NotificationDropdown";
import { AiSidebar } from "./AiSidebar";
import { useCollaboration } from "../../hooks/useCollaboration";
import { useAuthStore } from "../../store/useAuthStore";
import { GlassPanel, Button } from "@aether/ui";
import {
  StickyNote,
  Square,
  Circle,
  Type,
  Trash2,
  MousePointer,
  Undo2,
  Redo2,
  History,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  Image as ImageIcon,
  Bot
} from "lucide-react";
import * as Y from "yjs";

// Register custom node templates
const nodeTypes = {
  stickyNote: StickyNode,
  shape: ShapeNode,
  text: TextNode,
  imageNode: ImageNode,
  commentPin: CommentPinNode,
};

const colors = ["#FF5C00", "#8B5CF6", "#10B981", "#3B82F6", "#F59E0B", "#EC4899"];
const getUserColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

interface CanvasBuilderProps {
  boardId: string;
  boardName: string;
}

export default function CanvasBuilder({ boardId, boardName }: CanvasBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  const { screenToFlowPosition } = useReactFlow();
  const { user, accessToken } = useAuthStore();

  // History & Snapshot management states
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"snapshots" | "timeline">("snapshots");
  const [versions, setVersions] = useState<any[]>([]);
  const [newVersionName, setNewVersionName] = useState("");
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);

  // Time travel replay states
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewEventIndex, setPreviewEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewSnapshotOverride, setPreviewSnapshotOverride] = useState<any | null>(null);

  // Comments Mode states
  const [isCommentsMode, setIsCommentsMode] = useState(false);
  const [newCommentCoords, setNewCommentCoords] = useState<{ x: number; y: number } | null>(null);
  const [showNewCommentForm, setShowNewCommentForm] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // AI Assistant states
  const [showAiSidebar, setShowAiSidebar] = useState(false);

  // Connect Yjs Collaboration Stream
  const {
    ydoc,
    presenceList,
    remoteCursors,
    broadcastCursor,
    isSynced,
    isConnected,
    liveEvents,
    broadcastEvent,
    fetchEvents,
    comments,
    createComment,
    resolveComment,
    deleteComment
  } = useCollaboration(boardId);

  // Initialize Yjs Shared Maps (nodes and edges are synchronized conflict-free)
  const yNodes = useMemo(() => ydoc.getMap<string>("nodes"), [ydoc]);
  const yEdges = useMemo(() => ydoc.getMap<string>("edges"), [ydoc]);

  // Set up collaborative Undo/Redo manager tracking changes to both nodes and edges
  const undoManager = useMemo(() => new Y.UndoManager([yNodes, yEdges]), [yNodes, yEdges]);

  // Callback to update node content inside Yjs map
  const handleNodeContentChange = useCallback((id: string, newContent: string) => {
    const val = yNodes.get(id);
    if (!val) return;
    try {
      const nodeObj = JSON.parse(val);
      nodeObj.data.content = newContent;
      yNodes.set(id, JSON.stringify(nodeObj));
      broadcastEvent("UPDATE_NODE_CONTENT", { id, content: newContent });
    } catch (e) {
      console.error(e);
    }
  }, [yNodes, broadcastEvent]);

  // Callback to update sticky note color inside Yjs map
  const handleNodeColorChange = useCallback((id: string, newColor: string) => {
    const val = yNodes.get(id);
    if (!val) return;
    try {
      const nodeObj = JSON.parse(val);
      nodeObj.data.color = newColor;
      yNodes.set(id, JSON.stringify(nodeObj));
      broadcastEvent("UPDATE_NODE_COLOR", { id, color: newColor });
    } catch (e) {
      console.error(e);
    }
  }, [yNodes, broadcastEvent]);

  // Synchronize Yjs Map states into local React Flow states
  useEffect(() => {
    if (!isSynced) return;

    const syncStates = () => {
      const currentNodes: Node[] = [];
      yNodes.forEach((val) => {
        try {
          const parsed = JSON.parse(val);
          currentNodes.push({
            ...parsed,
            data: {
              ...parsed.data,
              onChange: handleNodeContentChange,
              onColorChange: handleNodeColorChange,
            }
          });
        } catch (e) {
          console.error(e);
        }
      });

      const currentEdges: Edge[] = [];
      yEdges.forEach((val) => {
        try {
          currentEdges.push(JSON.parse(val));
        } catch (e) {
          console.error(e);
        }
      });

      setNodes(currentNodes);
      setEdges(currentEdges);
    };

    // Initial sync
    syncStates();

    // Setup observers
    yNodes.observe(syncStates);
    yEdges.observe(syncStates);

    return () => {
      yNodes.unobserve(syncStates);
      yEdges.unobserve(syncStates);
    };
  }, [isSynced, yNodes, yEdges, handleNodeContentChange, handleNodeColorChange, setNodes, setEdges]);

  // Intercept React Flow node changes (e.g. selection, deletion) to sync deletions back to Yjs map
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
    changes.forEach((c) => {
      if (c.type === "remove") {
        yNodes.delete(c.id);
        broadcastEvent("DELETE_NODE", { id: c.id });
      }
    });
  }, [onNodesChange, yNodes, broadcastEvent]);

  // Intercept React Flow edge changes to sync deletions back to Yjs map
  const handleEdgesChange = useCallback((changes: any[]) => {
    onEdgesChange(changes);
    changes.forEach((c) => {
      if (c.type === "remove") {
        yEdges.delete(c.id);
        broadcastEvent("DELETE_EDGE", { id: c.id });
      }
    });
  }, [onEdgesChange, yEdges, broadcastEvent]);

  // Handle local connection creations and write to Yjs map
  const onConnect = useCallback(
    (params: Connection) => {
      const id = `edge-${Date.now()}`;
      const newEdge = {
        id,
        ...params,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#8B5CF6", strokeWidth: 1.5 },
      };
      yEdges.set(id, JSON.stringify(newEdge));
      broadcastEvent("CREATE_EDGE", newEdge);
    },
    [yEdges, broadcastEvent]
  );

  // Sync drag positions to Yjs map when dragging completes
  const onNodeDragStop = useCallback((_: any, node: Node) => {
    const val = yNodes.get(node.id);
    if (!val) return;
    try {
      const nodeObj = JSON.parse(val);
      nodeObj.position = node.position;
      yNodes.set(node.id, JSON.stringify(nodeObj));
      broadcastEvent("MOVE_NODE", { id: node.id, position: node.position });
    } catch (e) {
      console.error(e);
    }
  }, [yNodes, broadcastEvent]);

  // Handle cursor broadcasts relative to current flow pan/zoom
  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    const flowPos = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    broadcastCursor(flowPos.x, flowPos.y);
  }, [screenToFlowPosition, broadcastCursor]);

  // Add a Sticky Note Node
  const addStickyNote = useCallback(() => {
    const id = `sticky-${Date.now()}`;
    const creator = user ? {
      name: `${user.firstName} ${user.lastName}`,
      initials: `${user.firstName[0]}${user.lastName[0]}`,
      color: getUserColor(user.id),
    } : undefined;

    const newNode = {
      id,
      type: "stickyNote",
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: {
        content: "",
        color: "orange",
        creator,
      },
    };
    yNodes.set(id, JSON.stringify(newNode));
    broadcastEvent("CREATE_NODE", newNode);
  }, [yNodes, user, broadcastEvent]);

  // Add a Shape Node (Rectangle or Circle)
  const addShape = useCallback((shapeType: "rectangle" | "circle") => {
    const id = `shape-${Date.now()}`;
    const creator = user ? {
      name: `${user.firstName} ${user.lastName}`,
      initials: `${user.firstName[0]}${user.lastName[0]}`,
      color: getUserColor(user.id),
    } : undefined;

    const newNode = {
      id,
      type: "shape",
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: {
        content: shapeType === "circle" ? "Circle" : "Rectangle",
        shape: shapeType,
        creator,
      },
    };
    yNodes.set(id, JSON.stringify(newNode));
    broadcastEvent("CREATE_NODE", newNode);
  }, [yNodes, user, broadcastEvent]);

  // Add a Text Annotation Node
  const addText = useCallback(() => {
    const id = `text-${Date.now()}`;
    const creator = user ? {
      name: `${user.firstName} ${user.lastName}`,
      initials: `${user.firstName[0]}${user.lastName[0]}`,
      color: getUserColor(user.id),
    } : undefined;

    const newNode = {
      id,
      type: "text",
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: {
        content: "Click to edit text",
        creator,
      },
    };
    yNodes.set(id, JSON.stringify(newNode));
    broadcastEvent("CREATE_NODE", newNode);
  }, [yNodes, user, broadcastEvent]);

  // Clear Canvas Board atomically
  const clearCanvas = useCallback(() => {
    if (confirm("Are you sure you want to clear the entire canvas board?")) {
      ydoc.transact(() => {
        yNodes.clear();
        yEdges.clear();
      });
      broadcastEvent("CLEAR_CANVAS", {});
    }
  }, [ydoc, yNodes, yEdges, broadcastEvent]);

  // History controls
  const handleUndo = useCallback(() => {
    undoManager.undo();
    broadcastEvent("UNDO", {});
  }, [undoManager, broadcastEvent]);

  const handleRedo = useCallback(() => {
    undoManager.redo();
    broadcastEvent("REDO", {});
  }, [undoManager, broadcastEvent]);

  // Image Node upload triggers
  const handleImageUploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("http://localhost:3001/api/files/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();

        const id = `image-${Date.now()}`;
        const creator = user ? {
          name: `${user.firstName} ${user.lastName}`,
          color: getUserColor(user.id),
        } : undefined;

        const newNode = {
          id,
          type: "imageNode",
          position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
          data: {
            url,
            creator,
          },
        };
        
        yNodes.set(id, JSON.stringify(newNode));
        broadcastEvent("CREATE_NODE", newNode);
      } catch (err) {
        alert("Image upload failed. Please try again.");
      }
    };
    input.click();
  };

  // Comments placement and replies creation
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    if (!isCommentsMode) return;
    const flowPos = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setNewCommentCoords({ x: flowPos.x, y: flowPos.y });
    setShowNewCommentForm(true);
  }, [isCommentsMode, screenToFlowPosition]);

  const handleNewCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !newCommentCoords || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      await createComment(newCommentText, newCommentCoords.x, newCommentCoords.y);
      setNewCommentText("");
      setShowNewCommentForm(false);
      setNewCommentCoords(null);
      setIsCommentsMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Add layout nodes and edges generated by AI
  const handleGenerateLayout = useCallback((layout: { nodes: any[]; edges: any[] }) => {
    ydoc.transact(() => {
      // Loop through generated nodes and add them
      (layout.nodes || []).forEach((node) => {
        const id = node.id || `node-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const completeNode = {
          ...node,
          id,
          position: node.position || { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
          data: {
            ...node.data,
            creator: user ? {
              name: `${user.firstName} ${user.lastName}`,
              color: getUserColor(user.id)
            } : undefined
          }
        };
        yNodes.set(id, JSON.stringify(completeNode));
        broadcastEvent("CREATE_NODE", completeNode);
      });

      // Loop through generated edges and add them
      (layout.edges || []).forEach((edge) => {
        const id = edge.id || `edge-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const completeEdge = {
          ...edge,
          id
        };
        yEdges.set(id, JSON.stringify(completeEdge));
        broadcastEvent("CREATE_EDGE", completeEdge);
      });
    });
  }, [ydoc, yNodes, yEdges, user, broadcastEvent]);


  // Replay Timeline state builder
  const reconstructStateFromEvents = useCallback((endIndex: number) => {
    const tempNodes: Record<string, Node> = {};
    const tempEdges: Record<string, Edge> = {};

    const eventsToPlay = liveEvents.slice(0, endIndex);

    eventsToPlay.forEach((ev) => {
      const { eventType, payload } = ev;
      if (!payload) return;

      switch (eventType) {
        case "CREATE_NODE": {
          if (payload.id) {
            tempNodes[payload.id] = {
              ...payload,
              data: {
                ...payload.data,
                onChange: () => {},
                onColorChange: () => {},
              }
            };
          }
          break;
        }
        case "MOVE_NODE": {
          if (payload.id && tempNodes[payload.id] && payload.position) {
            tempNodes[payload.id].position = payload.position;
          }
          break;
        }
        case "UPDATE_NODE_CONTENT": {
          if (payload.id && tempNodes[payload.id]) {
            tempNodes[payload.id].data = {
              ...tempNodes[payload.id].data,
              content: payload.content,
            };
          }
          break;
        }
        case "UPDATE_NODE_COLOR": {
          if (payload.id && tempNodes[payload.id]) {
            tempNodes[payload.id].data = {
              ...tempNodes[payload.id].data,
              color: payload.color,
            };
          }
          break;
        }
        case "DELETE_NODE": {
          if (payload.id) {
            delete tempNodes[payload.id];
          }
          break;
        }
        case "CREATE_EDGE": {
          if (payload.id) {
            tempEdges[payload.id] = payload;
          }
          break;
        }
        case "DELETE_EDGE": {
          if (payload.id) {
            delete tempEdges[payload.id];
          }
          break;
        }
        case "CLEAR_CANVAS": {
          Object.keys(tempNodes).forEach((k) => delete tempNodes[k]);
          Object.keys(tempEdges).forEach((k) => delete tempEdges[k]);
          break;
        }
        case "CREATE_SNAPSHOT":
        case "RESTORE": {
          if (payload.snapshotState) {
            const { nodes: snapshotNodes, edges: snapshotEdges } = payload.snapshotState;
            Object.keys(tempNodes).forEach((k) => delete tempNodes[k]);
            Object.keys(tempEdges).forEach((k) => delete tempEdges[k]);
            if (snapshotNodes) {
              snapshotNodes.forEach((n: any) => {
                tempNodes[n.id] = { ...n, data: { ...n.data, onChange: () => {}, onColorChange: () => {} } };
              });
            }
            if (snapshotEdges) {
              snapshotEdges.forEach((e: any) => {
                tempEdges[e.id] = e;
              });
            }
          }
          break;
        }
        default:
          break;
      }
    });

    return {
      nodes: Object.values(tempNodes),
      edges: Object.values(tempEdges),
    };
  }, [liveEvents]);

  const previewState = useMemo(() => {
    if (!isPreviewMode) return null;
    if (previewSnapshotOverride) return previewSnapshotOverride;
    return reconstructStateFromEvents(previewEventIndex);
  }, [isPreviewMode, previewEventIndex, previewSnapshotOverride, reconstructStateFromEvents]);

  // Merge regular drawing nodes with comment pin overlay nodes
  const mergedNodes = useMemo(() => {
    const baseNodes = isPreviewMode ? (previewState?.nodes || []) : nodes;
    
    const commentNodes = comments.map((c) => ({
      id: `comment-pin-${c.id}`,
      type: "commentPin",
      position: { x: c.x, y: c.y },
      data: {
        commentId: c.id,
        isResolved: c.isResolved,
        authorInitials: c.user ? `${c.user.firstName[0]}${c.user.lastName[0]}` : "C",
        authorName: c.user ? `${c.user.firstName} ${c.user.lastName}` : "Collaborator",
        content: c.content,
        createdAt: c.createdAt,
        replies: c.replies || [],
        onAddReply: (parentId: string, text: string) => createComment(text, c.x, c.y, undefined, parentId),
        onResolve: (id: string, res: boolean) => resolveComment(id, res),
        onDelete: (id: string) => deleteComment(id),
      },
      draggable: false,
    }));

    return [...baseNodes, ...commentNodes];
  }, [isPreviewMode, previewState, nodes, comments, createComment, resolveComment, deleteComment]);

  // Play / pause timeline runner
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && isPreviewMode) {
      interval = setInterval(() => {
        setPreviewEventIndex((prev) => {
          if (prev >= liveEvents.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isPreviewMode, liveEvents.length]);

  const fetchVersions = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>(`/workspaces/${boardId}/versions`);
      setVersions(data);
    } catch (e) {
      console.error("Failed to load versions:", e);
    }
  }, [boardId]);

  useEffect(() => {
    if (showHistoryPanel) {
      fetchVersions();
    }
  }, [showHistoryPanel, fetchVersions]);

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim()) return;
    setIsSavingVersion(true);
    try {
      const nodesArr: any[] = [];
      yNodes.forEach((val) => {
        try { nodesArr.push(JSON.parse(val)); } catch {}
      });
      const edgesArr: any[] = [];
      yEdges.forEach((val) => {
        try { edgesArr.push(JSON.parse(val)); } catch {}
      });
      const snapshotState = { nodes: nodesArr, edges: edgesArr };

      const version = await apiFetch(`/workspaces/${boardId}/versions`, {
        method: "POST",
        json: {
          name: newVersionName,
          snapshotState
        }
      });
      setVersions((prev) => [version, ...prev]);
      setNewVersionName("");
      fetchEvents();
    } catch (e) {
      alert("Failed to save snapshot.");
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm("Are you sure you want to restore the canvas to this version? All current progress will be replaced.")) return;
    setIsRestoringVersion(true);
    try {
      await apiFetch(`/workspaces/${boardId}/versions/${versionId}/restore`, {
        method: "POST"
      });
      setShowHistoryPanel(false);
      setIsPreviewMode(false);
      setIsPlaying(false);
      setPreviewSnapshotOverride(null);
      fetchEvents();
    } catch (e) {
      alert("Failed to restore snapshot.");
    } finally {
      setIsRestoringVersion(false);
    }
  };

  const getEventSummary = (type: string, payload: any) => {
    if (!payload) return "";
    switch (type) {
      case "CREATE_NODE":
        return `Created ${payload.type || "node"} (${payload.id})`;
      case "MOVE_NODE":
        return `Moved node ${payload.id}`;
      case "UPDATE_NODE_CONTENT":
        return `Updated content in ${payload.id}`;
      case "UPDATE_NODE_COLOR":
        return `Changed color of ${payload.id} to ${payload.color}`;
      case "DELETE_NODE":
        return `Deleted node ${payload.id}`;
      case "CREATE_EDGE":
        return `Connected ${payload.source} → ${payload.target}`;
      case "DELETE_EDGE":
        return `Deleted edge ${payload.id}`;
      case "CLEAR_CANVAS":
        return `Cleared whiteboard canvas`;
      case "UNDO":
        return `Performed Undo action`;
      case "REDO":
        return `Performed Redo action`;
      case "CREATE_SNAPSHOT":
        return `Saved snapshot: "${payload.name}"`;
      case "RESTORE":
        return `Restored canvas to: "${payload.name}"`;
      default:
        return `Triggered ${type}`;
    }
  };

  return (
    <div className={`w-full h-full relative bg-[#050505] overflow-hidden ${isCommentsMode ? "cursor-crosshair" : ""}`}>
      <ReactFlow
        nodes={mergedNodes}
        edges={isPreviewMode ? (previewState?.edges || []) : edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        onPointerMove={handlePointerMove}
        onPaneClick={handlePaneClick}
        nodesDraggable={!isPreviewMode && !isCommentsMode}
        nodesConnectable={!isPreviewMode && !isCommentsMode}
        elementsSelectable={!isPreviewMode && !isCommentsMode}
        fitView
        className="glass-grid-bg"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="#222"
          gap={24}
          size={1}
          variant={BackgroundVariant.Dots}
        />

        {/* Render Remote Cursors */}
        {Object.values(remoteCursors).map((cursor) => (
          <div
            key={cursor.socketId}
            className="absolute pointer-events-none z-50 transition-all duration-75 ease-out select-none"
            style={{
              position: "absolute",
              left: cursor.x,
              top: cursor.y,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              style={{ transform: "rotate(-15deg)" }}
            >
              <path
                d="M3 3V21L9 15H18L3 3Z"
                fill={cursor.color}
                stroke="#000000"
                strokeWidth="2"
              />
            </svg>
            <div
              className="mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-white shadow-md select-none font-mono"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.firstName}
            </div>
          </div>
        ))}

        {/* Floating Top Header: Board details & Sync State indicator */}
        <Panel position="top-left" className="m-4">
          <GlassPanel className="px-4 py-2.5 flex items-center gap-3 bg-black/60 border-white/[0.04]">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white">{boardName}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
                <span className="text-[8px] text-white/30 font-mono tracking-widest uppercase">
                  {isConnected ? (isSynced ? "synchronized" : "syncing...") : "offline"}
                </span>
              </div>
            </div>
          </GlassPanel>
        </Panel>

        {/* Floating Top Right Panel: Presence Badges & Notification Center */}
        <Panel position="top-right" className="m-4 flex items-center gap-3">
          <NotificationDropdown />
          <div className="flex -space-x-1.5 overflow-hidden">
            {presenceList.map((p) => (
              <div
                key={p.socketId}
                className="w-7 h-7 rounded-full border border-[#050505] bg-white/[0.03] text-white text-[9px] font-bold uppercase flex items-center justify-center cursor-help select-none hover:-translate-y-0.5 transition-transform"
                style={{
                  borderLeftColor: p.color,
                  borderTopColor: p.color,
                  borderRightColor: p.color,
                  borderBottomColor: p.color,
                }}
                title={`${p.firstName} ${p.lastName}`}
              >
                {p.firstName[0]}
                {p.lastName[0]}
              </div>
            ))}
          </div>
        </Panel>

        {/* Floating Top Center Toolbar: Custom Elements */}
        <Panel position="top-center" className="m-4">
          <GlassPanel className="p-1.5 flex items-center gap-1.5 bg-black/60 border-white/[0.04] shadow-2xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={addStickyNote}
              className="text-white/60 hover:text-white hover:bg-white/[0.04] px-2.5 h-8 gap-1.5"
              title="Add Sticky Note"
            >
              <StickyNote className="w-3.5 h-3.5 text-[#FF5C00]" />
              <span className="text-xs font-light">Sticky</span>
            </Button>
            
            <div className="w-px h-4 bg-white/[0.08]" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => addShape("rectangle")}
              className="text-white/60 hover:text-white hover:bg-white/[0.04] px-2.5 h-8 gap-1.5"
              title="Add Rectangle Shape"
            >
              <Square className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span className="text-xs font-light">Rectangle</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => addShape("circle")}
              className="text-white/60 hover:text-white hover:bg-white/[0.04] px-2.5 h-8 gap-1.5"
              title="Add Circle Shape"
            >
              <Circle className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span className="text-xs font-light">Circle</span>
            </Button>

            <div className="w-px h-4 bg-white/[0.08]" />

            <Button
              variant="ghost"
              size="sm"
              onClick={addText}
              className="text-white/60 hover:text-white hover:bg-white/[0.04] px-2.5 h-8 gap-1.5"
              title="Add Text"
            >
              <Type className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-light">Text</span>
            </Button>
            
            <div className="w-px h-4 bg-white/[0.08]" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleImageUploadClick}
              className="text-white/60 hover:text-white hover:bg-white/[0.04] px-2.5 h-8 gap-1.5"
              title="Upload Image"
            >
              <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-xs font-light">Image</span>
            </Button>

            <div className="w-px h-4 bg-white/[0.08]" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCommentsMode(!isCommentsMode)}
              className={`px-2.5 h-8 gap-1.5 transition-colors ${isCommentsMode ? "text-[#FF5C00] bg-white/[0.05]" : "text-white/60 hover:text-white hover:bg-white/[0.04]"}`}
              title="Toggle Comments Mode"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#FF5C00]" />
              <span className="text-xs font-light">Comments</span>
            </Button>

            <div className="w-px h-4 bg-white/[0.08]" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className={`px-2.5 h-8 gap-1.5 transition-colors ${showHistoryPanel ? "text-[#FF5C00] bg-white/[0.05]" : "text-white/60 hover:text-white hover:bg-white/[0.04]"}`}
              title="Whiteboard History & Time Travel"
            >
              <History className="w-3.5 h-3.5 text-[#FF5C00]" />
              <span className="text-xs font-light">History</span>
            </Button>

            <div className="w-px h-4 bg-white/[0.08]" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAiSidebar(!showAiSidebar)}
              className={`px-2.5 h-8 gap-1.5 transition-colors ${showAiSidebar ? "text-[#FF5C00] bg-white/[0.05]" : "text-white/60 hover:text-white hover:bg-white/[0.04]"}`}
              title="Aether AI Assistant"
            >
              <Bot className="w-3.5 h-3.5 text-[#FF5C00]" />
              <span className="text-xs font-light">AI</span>
            </Button>

            <div className="w-px h-4 bg-white/[0.08]" />

            <Button
              variant="ghost"
              size="sm"
              onClick={clearCanvas}
              className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 px-2 h-8"
              title="Clear Board"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </GlassPanel>
        </Panel>

        {/* Custom Navigation / History floating controls */}
        <Panel position="bottom-right" className="m-4">
          <Controls
            showInteractive={false}
            className="!m-0 !bg-transparent !border-0 !shadow-none gap-1.5 flex flex-col"
          >
            <div className="flex flex-col gap-1.5">
              {/* Undo / Redo History Primitives */}
              <div className="flex gap-1.5 p-1 bg-black/60 rounded-lg border border-white/[0.04] backdrop-blur-md">
                <Button
                  variant="glass"
                  size="icon"
                  onClick={handleUndo}
                  className="w-7 h-7 rounded-md bg-transparent border-0 hover:bg-white/[0.04]"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5 text-white/50 hover:text-white" />
                </Button>
                <Button
                  variant="glass"
                  size="icon"
                  onClick={handleRedo}
                  className="w-7 h-7 rounded-md bg-transparent border-0 hover:bg-white/[0.04]"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5 text-white/50 hover:text-white" />
                </Button>
              </div>
              
              <Button
                variant="glass"
                size="icon"
                onClick={clearCanvas}
                className="w-8 h-8 rounded-lg bg-black/60 border-white/[0.04] hover:bg-white/[0.04] self-end"
                title="Pan Mode"
              >
                <MousePointer className="w-3.5 h-3.5 text-white/50" />
              </Button>
            </div>
          </Controls>
        </Panel>
      </ReactFlow>

      {/* Floating Whiteboard History & Snapshot Panel */}
      <AnimatePresence>
        {showHistoryPanel && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-16 right-4 bottom-16 w-80 z-20"
          >
            <GlassPanel className="w-full h-full bg-[#0A0A0A]/90 backdrop-blur-md border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#FF5C00]" />
                  <span className="text-sm font-semibold text-white">Board History</span>
                </div>
                <button
                  onClick={() => {
                    setShowHistoryPanel(false);
                    setIsPreviewMode(false);
                    setIsPlaying(false);
                    setPreviewSnapshotOverride(null);
                  }}
                  className="text-white/40 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/[0.04]"
                >
                  Close
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/[0.05] p-1 bg-white/[0.02]">
                <button
                  onClick={() => {
                    setActiveTab("snapshots");
                    setIsPreviewMode(false);
                    setIsPlaying(false);
                    setPreviewSnapshotOverride(null);
                  }}
                  className={`flex-1 py-1.5 text-center text-xs rounded-md font-medium transition-colors ${
                    activeTab === "snapshots"
                      ? "bg-white/[0.05] text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  Snapshots
                </button>
                <button
                  onClick={() => {
                    setActiveTab("timeline");
                  }}
                  className={`flex-1 py-1.5 text-center text-xs rounded-md font-medium transition-colors ${
                    activeTab === "timeline"
                      ? "bg-white/[0.05] text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  Time Travel
                </button>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col min-h-0">
                {activeTab === "snapshots" ? (
                  <div className="space-y-4 flex flex-col flex-grow">
                    {/* Capture New Snapshot form */}
                    <form onSubmit={handleSaveVersion} className="space-y-2 shrink-0">
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        New Manual Snapshot
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          placeholder="Snapshot name"
                          value={newVersionName}
                          onChange={(e) => setNewVersionName(e.target.value)}
                          className="flex-1 h-8 bg-white/[0.02] border border-white/[0.05] rounded-md px-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#FF5C00]"
                        />
                        <button
                          type="submit"
                          disabled={isSavingVersion}
                          className="h-8 bg-[#FF5C00] hover:bg-[#E55200] disabled:bg-[#FF5C00]/50 rounded-md px-3 text-xs font-semibold text-white transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </form>

                    <div className="h-px bg-white/[0.05] shrink-0" />

                    {/* Versions List */}
                    <div className="space-y-2 flex-grow overflow-y-auto min-h-0">
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">
                        Saved Snapshots
                      </div>
                      
                      {versions.length === 0 ? (
                        <div className="text-center py-8 text-xs text-white/20 font-light">
                          No snapshots saved yet.
                        </div>
                      ) : (
                        versions.map((ver) => (
                          <div
                            key={ver.id}
                            className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] transition-colors group flex flex-col gap-2"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-white/90 truncate">
                                {ver.name}
                              </span>
                              <span className="text-[9px] text-white/30 block mt-0.5 font-mono">
                                {new Date(ver.createdAt).toLocaleString()}
                              </span>
                              {ver.createdBy && (
                                <span className="text-[9px] text-[#FF5C00]/60 block mt-0.5">
                                  by {ver.createdBy.firstName} {ver.createdBy.lastName}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => {
                                  if (ver.canvasData) {
                                    try {
                                      const doc = new Y.Doc();
                                      const binary = Buffer.from(ver.canvasData, 'base64');
                                      Y.applyUpdate(doc, new Uint8Array(binary));
                                      const nodesMap = doc.getMap('nodes');
                                      const edgesMap = doc.getMap('edges');
                                      const nodesArr: any[] = [];
                                      nodesMap.forEach((val: any) => {
                                        try { nodesArr.push(JSON.parse(val)); } catch {}
                                      });
                                      const edgesArr: any[] = [];
                                      edgesMap.forEach((val: any) => {
                                        try { edgesArr.push(JSON.parse(val)); } catch {}
                                      });
                                      setPreviewSnapshotOverride({ nodes: nodesArr, edges: edgesArr });
                                      setIsPreviewMode(true);
                                    } catch (e) {
                                      console.error("Failed to preview snapshot:", e);
                                    }
                                  }
                                }}
                                className="text-[9px] px-2 py-1 rounded bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => handleRestoreVersion(ver.id)}
                                disabled={isRestoringVersion}
                                className="text-[9px] px-2 py-1 rounded bg-[#FF5C00]/10 border border-[#FF5C00]/20 text-[#FF5C00] hover:bg-[#FF5C00]/25 transition-colors font-medium disabled:opacity-50"
                              >
                                {isRestoringVersion ? "Restoring..." : "Restore"}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 flex flex-col flex-grow min-h-0">
                    <div className="flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        Replay Whiteboard History
                      </span>
                      <button
                        onClick={() => {
                          setIsPreviewMode(!isPreviewMode);
                          if (isPreviewMode) {
                            setIsPlaying(false);
                            setPreviewSnapshotOverride(null);
                          } else {
                            setPreviewEventIndex(liveEvents.length);
                            setPreviewSnapshotOverride(null);
                          }
                        }}
                        className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase tracking-wider transition-colors ${
                          isPreviewMode
                            ? "bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-[#FF5C00]"
                            : "bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white"
                        }`}
                      >
                        {isPreviewMode ? "Exit Preview" : "Enter Preview"}
                      </button>
                    </div>

                    {isPreviewMode && (
                      <div className="p-3 rounded-lg border border-[#FF5C00]/20 bg-[#FF5C00]/5 space-y-3 shrink-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">Timeline Progress</span>
                          <span className="text-[#FF5C00] font-bold font-mono">
                            {previewEventIndex} / {liveEvents.length}
                          </span>
                        </div>

                        {/* Scrub Slider */}
                        <input
                          type="range"
                          min="0"
                          max={liveEvents.length}
                          value={previewEventIndex}
                          onChange={(e) => {
                            setPreviewEventIndex(Number(e.target.value));
                            setPreviewSnapshotOverride(null);
                            setIsPlaying(false);
                          }}
                          className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#FF5C00]"
                        />

                        {/* Play/Pause controls */}
                        <div className="flex gap-2 justify-center items-center">
                          <button
                            onClick={() => {
                              setPreviewEventIndex(0);
                              setPreviewSnapshotOverride(null);
                            }}
                            title="Rewind to Beginning"
                            className="p-1.5 rounded hover:bg-white/[0.05] text-white/50 hover:text-white transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (previewEventIndex >= liveEvents.length) {
                                setPreviewEventIndex(0);
                              }
                              setIsPlaying(!isPlaying);
                              setPreviewSnapshotOverride(null);
                            }}
                            className="p-2 rounded-full bg-[#FF5C00] text-white hover:bg-[#E55200] transition-colors"
                          >
                            {isPlaying ? (
                              <Pause className="w-4 h-4 fill-white" />
                            ) : (
                              <Play className="w-4 h-4 fill-white translate-x-0.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Event logs log scroll */}
                    <div className="space-y-1.5 flex-grow overflow-y-auto min-h-0 pr-1">
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5">
                        Event Sourcing Log
                      </div>
                      {liveEvents.length === 0 ? (
                        <div className="text-center py-8 text-xs text-white/20 font-light">
                          No whiteboard events recorded yet.
                        </div>
                      ) : (
                        liveEvents.map((ev, index) => {
                          const isActive = isPreviewMode && previewEventIndex === index + 1;
                          const isPast = isPreviewMode && previewEventIndex > index + 1;
                          
                          return (
                            <button
                              key={ev.id || index}
                              onClick={() => {
                                setIsPreviewMode(true);
                                setPreviewEventIndex(index + 1);
                                setPreviewSnapshotOverride(null);
                                setIsPlaying(false);
                              }}
                              className={`w-full text-left p-2 rounded transition-colors text-[10px] flex items-start gap-2 border ${
                                isActive
                                  ? "bg-[#FF5C00]/10 border-[#FF5C00]/30 text-[#FF5C00]"
                                  : isPast
                                  ? "bg-white/[0.02] border-transparent text-white/70"
                                  : "bg-transparent border-transparent text-white/30 hover:bg-white/[0.01]"
                              }`}
                            >
                              <span className="font-mono text-white/20 mt-0.5">#{index + 1}</span>
                              <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold uppercase tracking-wider text-[8px] text-[#8B5CF6]">
                                    {ev.eventType}
                                  </span>
                                  <span className="text-[8px] text-white/20 font-mono">
                                    {new Date(ev.createdAt).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="truncate text-white/60 mt-0.5 font-light">
                                  {getEventSummary(ev.eventType, ev.payload)}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Comment Thread Modal Overlay */}
      <AnimatePresence>
        {showNewCommentForm && newCommentCoords && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm pointer-events-auto"
            >
              <GlassPanel className="p-6 bg-[#090909]/95 border-white/[0.08] shadow-2xl rounded-2xl">
                <h3 className="text-sm font-semibold mb-3 text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#FF5C00]" />
                  Add Comment Thread
                </h3>
                <form onSubmit={handleNewCommentSubmit} className="space-y-4">
                  <textarea
                    required
                    rows={3}
                    placeholder="Write your comment here... Use @name to mention team members."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/[0.05] rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#FF5C00]"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCommentForm(false);
                        setNewCommentCoords(null);
                      }}
                      className="px-3 py-1.5 rounded-md hover:bg-white/[0.04] text-xs text-white/60 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingComment}
                      className="px-4 py-1.5 rounded-md bg-[#FF5C00] text-white hover:bg-[#E55200] disabled:bg-[#FF5C00]/50 text-xs font-semibold transition-colors"
                    >
                      Place Pin
                    </button>
                  </div>
                </form>
              </GlassPanel>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Assistant Sidebar Panel Overlay */}
      <AnimatePresence>
        {showAiSidebar && (
          <div className="absolute right-4 top-4 bottom-4 z-40 pointer-events-none flex items-stretch">
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex"
            >
              <AiSidebar
                onClose={() => setShowAiSidebar(false)}
                boardNodes={nodes}
                boardEdges={edges}
                onGenerateLayout={handleGenerateLayout}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
