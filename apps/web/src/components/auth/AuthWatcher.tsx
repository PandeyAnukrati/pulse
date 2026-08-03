"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../store/useAuthStore";
import { apiFetch } from "../../utils/api";
import { Loader2 } from "lucide-react";

export function AuthWatcher({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, setUser, setAccessToken } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      // If we already have a token in memory, we are authenticated
      if (accessToken) {
        setIsChecking(false);
        return;
      }

      // Try to silently refresh from the HttpOnly refresh token cookie
      try {
        const response = await apiFetch("/auth/refresh", {
          method: "POST",
        });
        
        setUser(response.user);
        setAccessToken(response.accessToken);
      } catch (e) {
        // Refresh failed (cookie expired or not present)
        const isPublicPage =
          pathname === "/" || pathname === "/login" || pathname === "/register";
          
        if (!isPublicPage) {
          router.push("/login");
        }
      } finally {
        setIsChecking(false);
      }
    };

    restoreSession();
  }, [accessToken, pathname, router, setUser, setAccessToken]);

  const isPublicPage =
    pathname === "/" || pathname === "/login" || pathname === "/register";

  // Block rendering on protected routes while checking session to prevent flickering redirects
  if (isChecking && !isPublicPage) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF5C00]" />
          <span className="text-xs text-white/40 tracking-wider">Restoring Session...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
