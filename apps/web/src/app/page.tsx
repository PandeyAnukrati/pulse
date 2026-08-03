"use client";

import Link from "next/link";
import { GlassPanel, Button } from "@aether/ui";
import { motion } from "framer-motion";
import { Sparkles, Layers, RefreshCw, Zap, ArrowRight } from "lucide-react";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="relative min-h-screen bg-[#050505] glass-grid-bg overflow-hidden flex flex-col justify-between">
      {/* Background Decorative Glow Panels */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5C00] animate-pulse" />
          <span className="font-bold tracking-widest text-lg bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            AETHER
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="glass" size="sm" className="bg-[#FF5C00]/10 border-[#FF5C00]/25 text-[#FF5C00] hover:bg-[#FF5C00]/20">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-6 py-12 flex-grow flex flex-col items-center justify-center text-center z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
          className="max-w-3xl flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.05] text-xs text-white/60 mb-6 backdrop-blur-md">
            <Sparkles className="w-3 h-3 text-[#FF5C00]" />
            <span>Now in Technical Preview</span>
          </div>

          <h1 id="hero-title" className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-none">
            A real-time workspace
            <span className="block mt-2 bg-gradient-to-r from-[#FF5C00] via-[#8B5CF6] to-white bg-clip-text text-transparent">
              designed to feel weightless.
            </span>
          </h1>

          <p className="text-base md:text-lg text-white/50 max-w-xl mb-10 leading-relaxed font-light">
            Combining an infinite collaborative canvas, offline-first synchronization, and event-sourced history. Packaged in a minimal glass-and-canvas interface.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto">
            <Link href="/register">
              <Button variant="primary" size="lg" className="w-full sm:w-auto group">
                Enter Sandbox
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="glass" size="lg" className="w-full sm:w-auto">
                Sign in with Organization
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Feature Cards Grid (Minimal & Clean) */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10"
        >
          <motion.div variants={itemVariants}>
            <GlassPanel hoverEffect className="p-6 text-left flex flex-col justify-between h-48 bg-white/[0.01] border-white/[0.04]">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF5C00]">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1.5">Infinite Canvas</h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Structured mind maps, connectors, code boxes, and notes working seamlessly inside a responsive panning coordinate grid.
                </p>
              </div>
            </GlassPanel>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassPanel hoverEffect className="p-6 text-left flex flex-col justify-between h-48 bg-white/[0.01] border-white/[0.04]">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[#8B5CF6]">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1.5">Offline-First CRDT</h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Disconnect at any time. Aether keeps editing in local memory, auto-merging edits with zero merge conflicts when back online.
                </p>
              </div>
            </GlassPanel>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassPanel hoverEffect className="p-6 text-left flex flex-col justify-between h-48 bg-white/[0.01] border-white/[0.04]">
              <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1.5">Real-Time Engine</h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Smooth 60fps cursor sync, dynamic typing presence, and instant changes broadcasted via customized WebSockets and Redis.
                </p>
              </div>
            </GlassPanel>
          </motion.div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/[0.03] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30 z-10">
        <span>&copy; {new Date().getFullYear()} Aether Workspace. All rights reserved.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white/60 transition-colors">Documentation</a>
          <a href="#" className="hover:text-white/60 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white/60 transition-colors">Github</a>
        </div>
      </footer>
    </div>
  );
}
