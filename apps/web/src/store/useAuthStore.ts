import { create } from "zustand";
import { User, Organization } from "@aether/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  activeOrg: Organization | null;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setActiveOrg: (org: Organization | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  activeOrg: null,
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setActiveOrg: (activeOrg) => set({ activeOrg }),
  logout: () => set({ user: null, accessToken: null, activeOrg: null }),
}));
