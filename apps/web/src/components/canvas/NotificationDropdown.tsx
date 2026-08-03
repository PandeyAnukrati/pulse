"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GlassPanel } from "@aether/ui";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { io } from "socket.io-client";
import { useAuthStore } from "../../store/useAuthStore";

export function NotificationDropdown() {
  const { accessToken } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/notifications");
      setNotifications(data);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    fetchNotifications();

    // Listen to real-time notification socket events
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      query: { token: accessToken },
      transports: ["websocket"],
    });

    socket.on("notification", (notif: any) => {
      setNotifications((prev) => [notif, ...prev]);
      // Visual ping check
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(notif.title, { body: notif.message });
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, fetchNotifications]);

  // Request browser permission for native pushes
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const markAllAsRead = async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string, link?: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      if (link) {
        window.location.href = link;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="relative">
      {/* Bell trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className={`p-2 rounded-lg border bg-black/60 hover:bg-white/[0.04] transition-all relative flex items-center justify-center cursor-pointer ${
          isOpen ? "border-orange-500 text-orange-500" : "border-white/[0.04] text-white/60 hover:text-white"
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF5C00] text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown list */}
      {isOpen && (
        <div className="absolute right-0 top-11 w-80 z-50">
          <GlassPanel className="p-3 bg-[#0A0A0A]/95 border-white/[0.08] shadow-2xl flex flex-col gap-2.5 max-h-[400px] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-2 shrink-0">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[9px] text-[#FF5C00] hover:text-[#E55200] transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto space-y-1.5 min-h-[100px] max-h-[300px]">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-white/20" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10 text-xs text-white/20 font-light">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n.id, n.link)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-0.5 ${
                      n.isRead
                        ? "bg-transparent border-transparent text-white/40 hover:bg-white/[0.01]"
                        : "bg-white/[0.01] border-white/[0.03] text-white hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className={`text-[11px] font-semibold ${n.isRead ? "text-white/50" : "text-white"}`}>
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[10px] font-light text-white/60 leading-normal break-words">
                      {n.message}
                    </p>
                    <span className="text-[8px] text-white/20 font-mono mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </button>
                ))
              )}
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
