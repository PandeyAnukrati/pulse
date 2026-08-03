import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { apiFetch } from "../utils/api";

const API_SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export interface RemoteCursor {
  socketId: string;
  userId: string;
  firstName: string;
  lastName: string;
  color: string;
  x: number;
  y: number;
}

export interface PresenceUser {
  userId: string;
  socketId: string;
  firstName: string;
  lastName: string;
  color: string;
  isTyping: boolean;
  selectedNodeId?: string;
}

export function useCollaboration(boardId: string) {
  const { accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  
  const [presenceList, setPresenceList] = useState<PresenceUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);

  const fetchEvents = useCallback(async () => {
    if (!boardId) return;
    try {
      const data = await apiFetch<any[]>(`/workspaces/${boardId}/events`);
      setLiveEvents(data);
    } catch (e) {
      console.error("Failed to fetch whiteboard events:", e);
    }
  }, [boardId]);

  const fetchComments = useCallback(async () => {
    if (!boardId) return;
    try {
      const data = await apiFetch<any[]>(`/comments/workspace/${boardId}`);
      setComments(data);
    } catch (e) {
      console.error("Failed to fetch whiteboard comments:", e);
    }
  }, [boardId]);

  useEffect(() => {
    if (accessToken && boardId) {
      fetchEvents();
      fetchComments();
    }
  }, [accessToken, boardId, fetchEvents, fetchComments]);

  const createComment = useCallback(async (content: string, x: number, y: number, nodeId?: string, parentId?: string) => {
    try {
      await apiFetch("/comments", {
        method: "POST",
        json: { workspaceId: boardId, content, x, y, nodeId, parentId }
      });
    } catch (e) {
      console.error("Failed to create comment:", e);
    }
  }, [boardId]);

  const resolveComment = useCallback(async (commentId: string, isResolved: boolean) => {
    try {
      await apiFetch(`/comments/${commentId}/resolve`, {
        method: "PATCH",
        json: { isResolved }
      });
    } catch (e) {
      console.error("Failed to resolve comment:", e);
    }
  }, []);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await apiFetch(`/comments/${commentId}`, {
        method: "DELETE"
      });
    } catch (e) {
      console.error("Failed to delete comment:", e);
    }
  }, []);

  const broadcastEvent = useCallback((eventType: string, payload: any) => {
    const event = { eventType, payload };
    if (socketRef.current?.connected) {
      socketRef.current.emit("canvas-event", event);
      // Optimistically add to liveEvents
      setLiveEvents((prev) => [
        ...prev,
        {
          eventType,
          payload,
          createdAt: new Date().toISOString(),
          userId: "me", // Placeholder to recognize self actions
        }
      ]);
    } else {
      // Buffer event in localStorage
      const queueKey = `offline-events-${boardId}`;
      const existing = localStorage.getItem(queueKey);
      const queue = existing ? JSON.parse(existing) : [];
      queue.push({
        eventType,
        payload,
        createdAt: new Date().toISOString(),
        isOffline: true
      });
      localStorage.setItem(queueKey, JSON.stringify(queue));
    }
  }, [boardId]);

  // Initialize a persistent client Yjs Doc for this board
  const ydoc = useMemo(() => new Y.Doc(), [boardId]);

  // Throttling mechanism for cursor broadcasts (throttled at ~33ms / 30fps)
  const lastBroadcastTime = useRef<number>(0);

  useEffect(() => {
    if (!accessToken || !boardId) return;

    // 1. Initialize IndexedDB local storage cache for offline capability
    const indexeddbProvider = new IndexeddbPersistence(`board-${boardId}`, ydoc);

    // 2. Open connection with authorization JWT token in query parameters
    const socket = io(API_SOCKET_URL, {
      query: { token: accessToken },
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-board", { boardId });

      // Flush offline event queue
      const queueKey = `offline-events-${boardId}`;
      const existing = localStorage.getItem(queueKey);
      if (existing) {
        try {
          const queue = JSON.parse(existing);
          if (queue.length > 0) {
            queue.forEach((ev: any) => {
              socket.emit("canvas-event", { eventType: ev.eventType, payload: ev.payload });
            });
            localStorage.removeItem(queueKey);
          }
        } catch (e) {
          console.error("Failed to flush offline events:", e);
        }
      }

      // Start Yjs CRDT synchronization step 1: send our state vector
      const stateVector = Y.encodeStateVector(ydoc);
      socket.emit("yjs-sync-step-1", Buffer.from(stateVector));
    });

    socket.on("canvas-event", (data: any) => {
      setLiveEvents((prev) => [...prev, data]);
    });

    socket.on("comment-created", (comment: any) => {
      setComments((prev) => {
        if (comment.parentId) {
          // Add reply to target parent comment thread
          return prev.map((c) => {
            if (c.id === comment.parentId) {
              const replies = c.replies || [];
              if (replies.find((r: any) => r.id === comment.id)) return c;
              return { ...c, replies: [...replies, comment] };
            }
            return c;
          });
        } else {
          // Add new top-level comment thread
          if (prev.find((c) => c.id === comment.id)) return prev;
          return [...prev, comment];
        }
      });
    });

    socket.on("comment-resolved", (data: { commentId: string; isResolved: boolean }) => {
      setComments((prev) =>
        prev.map((c) => (c.id === data.commentId ? { ...c, isResolved: data.isResolved } : c))
      );
    });

    socket.on("comment-deleted", (data: { commentId: string }) => {
      setComments((prev) => prev.filter((c) => c.id !== data.commentId));
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setIsSynced(false);
      setPresenceList([]);
      setRemoteCursors({});
    });

    // 3. Bind Yjs synchronization protocols
    socket.on("yjs-sync-step-1", (serverStateVector: ArrayBuffer) => {
      // Compute missing updates vector and transmit back to server
      const update = Y.encodeStateAsUpdate(ydoc, new Uint8Array(serverStateVector));
      socket.emit("yjs-update", Buffer.from(update));
    });

    socket.on("yjs-sync-step-2", (serverUpdate: ArrayBuffer) => {
      // Apply missing server states to local doc, tagging the socket as origin to prevent loops
      Y.applyUpdate(ydoc, new Uint8Array(serverUpdate), socket);
      setIsSynced(true);
    });

    socket.on("yjs-update", (updatePayload: ArrayBuffer) => {
      // Apply incoming update stream, tagging the socket as origin
      Y.applyUpdate(ydoc, new Uint8Array(updatePayload), socket);
    });

    // Listen to local Yjs Doc modifications and stream back to server
    const handleLocalUpdate = (update: Uint8Array, origin: any) => {
      // Skip if update originated from the websocket connection itself to prevent looping
      if (origin !== socket) {
        socket.emit("yjs-update", Buffer.from(update));
      }
    };

    ydoc.on("update", handleLocalUpdate);

    // 4. Live presence callbacks
    socket.on("presence-update", (list: PresenceUser[]) => {
      setPresenceList(list);
    });

    socket.on("cursor-update", (data: { socketId: string; userId: string; x: number; y: number }) => {
      setPresenceList((prevPresence) => {
        const user = prevPresence.find((u) => u.socketId === data.socketId);
        if (!user) return prevPresence;

        setRemoteCursors((prevCursors) => ({
          ...prevCursors,
          [data.socketId]: {
            socketId: data.socketId,
            userId: data.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            color: user.color,
            x: data.x,
            y: data.y,
          },
        }));

        return prevPresence;
      });
    });

    socket.on("user-disconnected", (socketId: string) => {
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    return () => {
      ydoc.off("update", handleLocalUpdate);
      socket.disconnect();
      indexeddbProvider.destroy();
      socketRef.current = null;
    };
  }, [accessToken, boardId, ydoc]);

  // Broadcast local cursor position with throttling
  const broadcastCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastBroadcastTime.current > 33) {
      if (socketRef.current?.connected) {
        socketRef.current.emit("cursor-move", { x, y });
        lastBroadcastTime.current = now;
      }
    }
  }, []);

  // Broadcast local typing status
  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing-change", { isTyping });
    }
  }, []);

  // Broadcast selection change on node click
  const broadcastSelection = useCallback((nodeId?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("selection-change", { nodeId });
    }
  }, []);

  return {
    ydoc,
    presenceList,
    remoteCursors,
    isConnected,
    isSynced,
    broadcastCursor,
    broadcastTyping,
    broadcastSelection,
    liveEvents,
    setLiveEvents,
    broadcastEvent,
    fetchEvents,
    comments,
    createComment,
    resolveComment,
    deleteComment,
    fetchComments,
  };
}
