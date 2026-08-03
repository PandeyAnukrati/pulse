"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassPanel, Button, Input } from "@aether/ui";
import { motion } from "framer-motion";
import { apiFetch } from "../../../utils/api";
import { useAuthStore } from "../../../store/useAuthStore";
import { ArrowLeft, User, Mail, KeyRound } from "lucide-react";

export default function Register() {
  const router = useRouter();
  const { setUser, setAccessToken } = useAuthStore();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiFetch("/auth/register", {
        method: "POST",
        json: { firstName, lastName, email, password },
      });

      // Auto login on successful register
      setUser(response.user);
      setAccessToken(response.accessToken);
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] glass-grid-bg flex items-center justify-center p-6">
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] rounded-full bg-orange-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Floating Back Button */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Button>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] mb-3" />
          <span className="font-bold tracking-widest text-xs text-white/40 uppercase">AETHER WORKSPACE</span>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">Get Started Today</h2>
        </div>

        <GlassPanel className="p-8 bg-white/[0.01] border-white/[0.04] shadow-2xl shadow-black/80">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-white/50 uppercase block">
                  First Name
                </label>
                <div className="relative flex items-center">
                  <Input
                    type="text"
                    placeholder="Jane"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-9"
                  />
                  <User className="absolute left-3 w-4 h-4 text-white/30" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-white/50 uppercase block">
                  Last Name
                </label>
                <Input
                  type="text"
                  placeholder="Doe"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider text-white/50 uppercase block">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Input
                  type="email"
                  placeholder="jane@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
                <Mail className="absolute left-3 w-4 h-4 text-white/30" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider text-white/50 uppercase block">
                Password
              </label>
              <div className="relative flex items-center">
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
                <KeyRound className="absolute left-3 w-4 h-4 text-white/30" />
              </div>
            </div>

            <Button
              type="submit"
              variant="secondary"
              isLoading={isLoading}
              className="w-full h-11 bg-purple-600 hover:bg-purple-500 border border-purple-500/20"
            >
              Create Free Account
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-white/40">
            Already have an account?{" "}
            <Link href="/login" className="text-[#8B5CF6] hover:text-[#7C3AED] transition-colors font-medium">
              Sign In
            </Link>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
