"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassPanel, Button, Input } from "@aether/ui";
import { useAuthStore } from "../../store/useAuthStore";
import { apiFetch } from "../../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  FolderKanban,
  Plus,
  Users,
  LogOut,
  ChevronDown,
  UserPlus,
  Check,
  Compass,
  AlertCircle
} from "lucide-react";
import { Organization, Workspace, OrganizationMember, Role } from "@aether/types";

export default function Dashboard() {
  const router = useRouter();
  const { user, accessToken, activeOrg, setActiveOrg, logout } = useAuthStore();

  const [orgs, setOrgs] = useState<(Organization & { role: Role })[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [usersPool, setUsersPool] = useState<{ id: string; email: string; firstName: string; lastName: string }[]>([]);

  // Modals / Dropdowns states
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);

  // Forms states
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("MEMBER");

  const [loading, setLoading] = useState({
    orgs: true,
    workspaces: false,
    members: false,
    action: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Protected Route Guard
  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
    } else {
      fetchOrgs(false);
    }
  }, [accessToken]);

  // Load workspaces and members when activeOrg changes with background polling
  useEffect(() => {
    if (!activeOrg) {
      setWorkspaces([]);
      setMembers([]);
      return;
    }

    // Initial load
    fetchWorkspaces(activeOrg.id, false);
    fetchMembers(activeOrg.id, false);

    // Poll silently in the background every 5 seconds
    const interval = setInterval(() => {
      fetchOrgs(true);
      fetchWorkspaces(activeOrg.id, true);
      fetchMembers(activeOrg.id, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeOrg]);

  // Fetch all registered users in the database for selection dropdown
  useEffect(() => {
    if (showInviteMember) {
      fetchUsersPool();
    }
  }, [showInviteMember]);

  const fetchUsersPool = async () => {
    try {
      const list = await apiFetch<{ id: string; email: string; firstName: string; lastName: string }[]>("/organizations/users-pool");
      setUsersPool(list);
    } catch (err) {
      console.error("Failed to load users pool:", err);
    }
  };

  const fetchOrgs = async (isSilent = false) => {
    if (!isSilent) {
      setLoading((prev) => ({ ...prev, orgs: true }));
    }
    try {
      const list = await apiFetch<(Organization & { role: Role })[]>("/organizations");
      setOrgs(list);
      if (list.length > 0 && !activeOrg) {
        setActiveOrg(list[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load organizations.");
    } finally {
      if (!isSilent) {
        setLoading((prev) => ({ ...prev, orgs: false }));
      }
    }
  };

  const fetchWorkspaces = async (orgId: string, isSilent = false) => {
    if (!isSilent) {
      setLoading((prev) => ({ ...prev, workspaces: true }));
    }
    try {
      const list = await apiFetch<Workspace[]>(`/organizations/${orgId}/workspaces`);
      setWorkspaces(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      if (!isSilent) {
        setLoading((prev) => ({ ...prev, workspaces: false }));
      }
    }
  };

  const fetchMembers = async (orgId: string, isSilent = false) => {
    if (!isSilent) {
      setLoading((prev) => ({ ...prev, members: true }));
    }
    try {
      const list = await apiFetch<OrganizationMember[]>(`/organizations/${orgId}/members`);
      setMembers(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      if (!isSilent) {
        setLoading((prev) => ({ ...prev, members: false }));
      }
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, action: true }));
    setError(null);
    try {
      const newOrg = await apiFetch<Organization>("/organizations", {
        method: "POST",
        json: { name: newOrgName, slug: newOrgSlug },
      });
      setOrgs((prev) => [...prev, { ...newOrg, role: "OWNER" }]);
      setActiveOrg(newOrg);
      setNewOrgName("");
      setNewOrgSlug("");
      setShowCreateOrg(false);
    } catch (err: any) {
      setError(err.message || "Failed to create organization.");
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setLoading((prev) => ({ ...prev, action: true }));
    try {
      const ws = await apiFetch<Workspace>(`/organizations/${activeOrg.id}/workspaces`, {
        method: "POST",
        json: { name: newWorkspaceName },
      });
      setWorkspaces((prev) => [...prev, ws]);
      setNewWorkspaceName("");
      setShowCreateWorkspace(false);
    } catch (err: any) {
      setError(err.message || "Failed to create workspace.");
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setLoading((prev) => ({ ...prev, action: true }));
    setError(null);
    try {
      const member = await apiFetch<OrganizationMember>(`/organizations/${activeOrg.id}/members`, {
        method: "POST",
        json: { email: inviteEmail, role: inviteRole },
      });
      setMembers((prev) => [...prev, member]);
      setInviteEmail("");
      setShowInviteMember(false);
    } catch (err: any) {
      setError(err.message || "Failed to invite member.");
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    logout();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050505] flex text-white relative">
      {/* Sidebar background glow */}
      <div className="absolute top-0 left-0 w-[300px] h-[300px] rounded-full bg-orange-500/[0.02] blur-[80px] pointer-events-none" />

      {/* Main Side Nav */}
      <aside className="w-64 border-r border-white/[0.04] bg-[#070707] flex flex-col justify-between z-10">
        <div>
          {/* Active Organization Switcher */}
          <div className="p-4 border-b border-white/[0.04] relative">
            <button
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all text-left text-sm"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#FF5C00]" />
                <span className="font-semibold truncate">
                  {loading.orgs ? "Loading..." : activeOrg?.name || "No Organization"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-white/40" />
            </button>

            {/* Dropdown list */}
            <AnimatePresence>
              {showOrgDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-16 left-4 right-4 bg-[#0A0A0A] border border-white/[0.08] rounded-lg shadow-2xl p-1 z-20 space-y-0.5"
                >
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setActiveOrg(org);
                        setShowOrgDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.04] text-xs text-left transition-colors"
                    >
                      <span className="truncate">{org.name}</span>
                      {activeOrg?.id === org.id && <Check className="w-3.5 h-3.5 text-[#FF5C00]" />}
                    </button>
                  ))}
                  <div className="h-px bg-white/[0.05] my-1" />
                  <button
                    onClick={() => {
                      setShowCreateOrg(true);
                      setShowOrgDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#FF5C00] hover:bg-[#FF5C00]/10 rounded-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Organization
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Org Options / Workspace Navigation */}
          <nav className="p-4 space-y-1">
            <div className="text-[10px] font-bold tracking-widest text-white/30 uppercase px-3 mb-2">
              WORKSPACE VIEWS
            </div>
            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] text-white text-sm font-medium transition-colors">
              <FolderKanban className="w-4 h-4 text-orange-400" />
              Boards
            </button>
            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/50 hover:bg-white/[0.02] hover:text-white text-sm font-medium transition-colors">
              <Users className="w-4 h-4" />
              Team Members
            </button>
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center font-bold text-xs text-[#FF5C00] uppercase select-none">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold truncate">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-[10px] text-white/40 truncate">{user.email}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/[0.04] rounded-lg transition-colors text-white/50 hover:text-white"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Board View */}
      <main className="flex-grow p-10 z-10 overflow-y-auto">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Collaborative Boards</h1>
            <p className="text-sm text-white/40 mt-1">
              Select or create an interactive canvas to get started.
            </p>
          </div>
          {activeOrg && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateWorkspace(true)}
              className="bg-[#FF5C00]"
            >
              <Plus className="w-4 h-4" />
              Create Board
            </Button>
          )}
        </header>

        {/* Errors display */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Workspaces Grid */}
        <section className="mb-12">
          {loading.workspaces ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-white/[0.01] border border-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-white/[0.08] text-center">
              <Compass className="w-8 h-8 text-white/20 mb-3" />
              <p className="text-sm text-white/40 font-light">No boards found inside this organization.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateWorkspace(true)}
                className="mt-3 text-[#FF5C00] hover:text-[#E55200]"
              >
                Create your first board
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {workspaces.map((ws) => (
                <motion.div
                  key={ws.id}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <GlassPanel
                    onClick={() => router.push(`/board/${ws.id}`)}
                    className="p-6 h-36 flex flex-col justify-between hover:bg-white/[0.03] transition-colors cursor-pointer border-white/[0.04] shadow-md"
                  >
                    <div>
                      <h3 className="text-sm font-semibold truncate">{ws.name}</h3>
                      <span className="text-[10px] text-white/30 block mt-1">
                        Updated {new Date(ws.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/60 pt-4 border-t border-white/[0.03]">
                      <span>Open Canvas</span>
                      <Plus className="w-3.5 h-3.5 text-[#FF5C00] rotate-45" />
                    </div>
                  </GlassPanel>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Team Management */}
        {activeOrg && (
          <section className="max-w-4xl border-t border-white/[0.04] pt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">Team Directory</h2>
                <p className="text-xs text-white/40">Users with permission to access organization boards.</p>
              </div>
              <Button
                variant="glass"
                size="sm"
                onClick={() => setShowInviteMember(true)}
                className="text-purple-400 border-purple-500/20 hover:bg-purple-500/10"
              >
                <UserPlus className="w-4 h-4" />
                Invite Member
              </Button>
            </div>

            <div className="space-y-2">
              {loading.members ? (
                <div className="h-20 bg-white/[0.01] rounded-lg animate-pulse" />
              ) : (
                members.map((m) => (
                  <GlassPanel
                    key={m.id}
                    className="p-4 flex items-center justify-between border-white/[0.03] bg-white/[0.005]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center font-bold text-[10px] text-purple-400 uppercase select-none">
                        {m.user?.firstName[0]}
                        {m.user?.lastName[0]}
                      </div>
                      <div>
                        <span className="text-xs font-semibold block">
                          {m.user?.firstName} {m.user?.lastName}
                        </span>
                        <span className="text-[10px] text-white/40">{m.user?.email}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/50 uppercase tracking-widest font-semibold font-mono">
                      {m.role}
                    </span>
                  </GlassPanel>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* MODAL WINDOWS (Rendered with overlay) */}

      {/* Create Org Modal */}
      <AnimatePresence>
        {showCreateOrg && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <GlassPanel className="p-6 bg-[#090909] border-white/[0.08]">
                <h3 className="text-md font-bold mb-4">Create Organization</h3>
                <form onSubmit={handleCreateOrg} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Org Name</label>
                    <Input
                      type="text"
                      required
                      placeholder="Acme Corp"
                      value={newOrgName}
                      onChange={(e) => {
                        setNewOrgName(e.target.value);
                        setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Slug Identifier</label>
                    <Input
                      type="text"
                      required
                      placeholder="acme-corp"
                      value={newOrgSlug}
                      onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateOrg(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={loading.action}>
                      Create
                    </Button>
                  </div>
                </form>
              </GlassPanel>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {showCreateWorkspace && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <GlassPanel className="p-6 bg-[#090909] border-white/[0.08]">
                <h3 className="text-md font-bold mb-4">Create Collaborative Board</h3>
                <form onSubmit={handleCreateWorkspace} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Board Name</label>
                    <Input
                      type="text"
                      required
                      placeholder="Sprint 1 Planning"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateWorkspace(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={loading.action}>
                      Create Board
                    </Button>
                  </div>
                </form>
              </GlassPanel>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invite Member Modal */}
      <AnimatePresence>
        {showInviteMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <GlassPanel className="p-6 bg-[#090909] border-white/[0.08]">
                <h3 className="text-md font-bold mb-4">Invite Team Member</h3>
                <form onSubmit={handleInviteMember} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Select Registered User</label>
                    <select
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full h-10 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-xs text-white backdrop-blur-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option className="bg-[#0B0B0B]" value="">-- Choose User --</option>
                      {usersPool.map((u) => (
                        <option key={u.id} className="bg-[#0B0B0B]" value={u.email}>
                          {u.firstName} {u.lastName} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="text-center text-[8px] text-white/20 uppercase font-bold py-0.5">OR</div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Enter Email Manually</label>
                    <Input
                      type="email"
                      required
                      placeholder="coworker@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Organization Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as Role)}
                      className="w-full h-10 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-xs text-white backdrop-blur-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option className="bg-[#0B0B0B]" value="MEMBER">MEMBER</option>
                      <option className="bg-[#0B0B0B]" value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowInviteMember(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={loading.action}>
                      Send Invite
                    </Button>
                  </div>
                </form>
              </GlassPanel>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
