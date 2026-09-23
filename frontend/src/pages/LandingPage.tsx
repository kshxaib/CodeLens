import React from 'react';
import { Link } from 'react-router-dom';
import {
  Code2,
  Sparkles,
  GitBranch,
  Network,
  MessageSquare,
  ShieldCheck,
  Zap,
  ArrowRight,
  Terminal,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user, loginWithGitHub } = useAuth();

  return (
    <div className="relative min-h-screen bg-[#0a0c10] text-slate-100 overflow-hidden">
      {/* Background Gradients & Glow Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-br from-purple-600/20 via-indigo-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[400px] bg-gradient-to-l from-cyan-500/15 via-blue-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-36 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Release Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-medium mb-8 backdrop-blur-md glow-purple">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>AI-Powered Multi-Language AST Architecture Engine</span>
          <ChevronRight className="w-3 h-3 text-purple-400" />
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-5xl mx-auto leading-[1.1]">
          Understand Complex Codebases in{' '}
          <span className="gradient-text">Seconds, Not Weeks.</span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 font-normal leading-relaxed">
          CodeLens turns any GitHub repository into an interactive 4-layer architecture map, calculates symbol blast radiuses, and streams real-time AI code answers with precise line citations.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold px-8 py-4 rounded-xl shadow-xl glow-purple text-base transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <button
              onClick={loginWithGitHub}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold px-8 py-4 rounded-xl shadow-xl glow-purple text-base transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Terminal className="w-5 h-5" />
              <span>Connect with GitHub</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <a
            href="https://github.com/kshxaib/CodeLens"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-slate-200 font-medium px-6 py-4 rounded-xl text-base transition cursor-pointer"
          >
            <GitBranch className="w-5 h-5 text-purple-400" />
            <span>View Source on GitHub</span>
          </a>
        </div>

        {/* Hero Artboard Preview Mockup (Screen 23 Showcase) */}
        <div className="relative mx-auto max-w-5xl rounded-2xl border border-white/[0.12] bg-[#121622]/90 backdrop-blur-2xl shadow-2xl p-2 sm:p-4 glow-purple overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] mb-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <span className="ml-2 font-mono text-slate-500">kshxaib/CodeLens — Architecture & Copilot</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
              <Sparkles className="w-3 h-3" /> Indexed & Ready
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
            {/* Interactive Architecture Preview */}
            <div className="glass-card rounded-xl p-4 md:col-span-2 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-purple-400" /> 4-Layer Architecture Topology
                </span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">
                  Tree-sitter AST
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 h-36 bg-[#0a0c10]/60 rounded-lg p-2.5 border border-white/[0.05]">
                <div className="bg-purple-900/20 border border-purple-500/30 rounded p-2 text-[11px]">
                  <div className="font-semibold text-purple-300">Presentation</div>
                  <div className="text-[10px] text-slate-500 mt-1">Navbar.tsx</div>
                  <div className="text-[10px] text-slate-500">Landing.tsx</div>
                </div>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded p-2 text-[11px]">
                  <div className="font-semibold text-blue-300">Application</div>
                  <div className="text-[10px] text-slate-500 mt-1">auth.py</div>
                  <div className="text-[10px] text-slate-500">chats.py</div>
                </div>
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded p-2 text-[11px]">
                  <div className="font-semibold text-emerald-300">Domain</div>
                  <div className="text-[10px] text-slate-500 mt-1">symbols.py</div>
                  <div className="text-[10px] text-slate-500">blast_radius.py</div>
                </div>
                <div className="bg-amber-900/20 border border-amber-500/30 rounded p-2 text-[11px]">
                  <div className="font-semibold text-amber-300">Infrastructure</div>
                  <div className="text-[10px] text-slate-500 mt-1">models.py</div>
                  <div className="text-[10px] text-slate-500">qdrant_store.py</div>
                </div>
              </div>
            </div>

            {/* AI Copilot Answer Preview with Citation */}
            <div className="glass-card rounded-xl p-4 border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 mb-2">
                  <MessageSquare className="w-3.5 h-3.5" /> AI Copilot Streaming
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  "Authentication uses JWT tokens verified in{' '}
                  <span className="inline-block px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] border border-purple-500/30">
                    auth.py:25-50
                  </span>{' '}
                  before scoping Qdrant similarity searches."
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
                <span>Citations: 2 files</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 100% Grounded
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20 border-t border-white/[0.08] bg-[#0c0f17]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything You Need to Master Any Codebase
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Built for software architects, engineering leads, and developers ramping up on legacy or fast-moving repositories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass-card rounded-2xl p-7 border border-white/[0.08]">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 mb-5">
                <Network className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">4-Layer Architecture Map</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Automatically groups modules into Presentation, Application, Domain, and Infrastructure layers using Tree-sitter AST parsing.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card rounded-2xl p-7 border border-white/[0.08]">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 mb-5">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Blast Radius Engine</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Calculates direct, upstream, and downstream call graph dependencies so you know every file impacted before changing code.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card rounded-2xl p-7 border border-white/[0.08]">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Zero-Data-Retention BYOK</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Bring your own free Google AI Studio key. Keys are AES-Fernet encrypted and your code is never stored or used to train public models.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Code2 className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-slate-300">CodeLens</span> — AI Codebase Intelligence Copilot
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/kshxaib/CodeLens" className="hover:text-purple-300 transition">
              GitHub
            </a>
            <Link to="/login" className="hover:text-purple-300 transition">
              Sign In
            </Link>
            <Link to="/profile" className="hover:text-purple-300 transition">
              Settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
