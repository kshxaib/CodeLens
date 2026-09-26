import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  CircleAlert,
  Code2,
  Compass,
  Copy,
  Check,
  GitBranch,
  Network,
  Sparkles,
} from 'lucide-react';
import { GithubIcon } from '../components/common/Icons';
import { useAuthStore } from '../store/useAuthStore';

export const LandingPage: React.FC = () => {
  const { user, loginWithGitHub } = useAuthStore();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`app/auth/middleware.py:27-31\nauthenticate_request(request)`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAuthAction = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      loginWithGitHub();
    }
  };

  return (
    <div data-appearance="dark" className="min-h-screen bg-[#000000] text-[#f4f4f5]">
      <style>{`
        @keyframes clFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes clFadeUpSm { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes clFadeUpCard { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes clBlink { 0%, 45% { opacity: 1; } 50%, 95% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes clPulseHighlight { 0% { background-color: rgba(245, 158, 11, 0.05); } 50% { background-color: rgba(245, 158, 11, 0.22); } 100% { background-color: rgba(245, 158, 11, 0.1); } }
        @keyframes clDot { 0% { left: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
        }
        .cl-anim-eyebrow { animation: clFadeUp 600ms ease-out 0ms both; }
        .cl-anim-headline { animation: clFadeUp 600ms ease-out 100ms both; }
        .cl-anim-desc1 { animation: clFadeUp 600ms ease-out 200ms both; }
        .cl-anim-desc2 { animation: clFadeUp 600ms ease-out 300ms both; }
        .cl-anim-cta { animation: clFadeUp 600ms ease-out 400ms both; }
        .cl-anim-note { animation: clFadeUp 600ms ease-out 500ms both; }
        .cl-anim-preview { animation: clFadeUp 700ms ease-out 600ms both; }
        .cl-card-1 { animation: clFadeUpCard 600ms ease-out 0ms both; }
        .cl-card-2 { animation: clFadeUpCard 600ms ease-out 120ms both; }
        .cl-card-3 { animation: clFadeUpCard 600ms ease-out 240ms both; }
        .cl-card-hover { transition: transform 220ms ease-out, border-color 220ms ease-out; }
        .cl-card-hover:hover { transform: translateY(-4px); border-color: rgba(245, 158, 11, 0.35); }
        .cl-icon-hover { transition: filter 220ms ease-out, color 220ms ease-out; }
        .cl-card-hover:hover .cl-icon-hover { filter: drop-shadow(0 0 8px currentColor); }
        .cl-cursor { animation: clBlink 1s step-start infinite; }
        .cl-highlight-pulse { animation: clPulseHighlight 2s ease-in-out infinite; }
        .cl-node-hover { transition: transform 200ms ease-out, border-color 200ms ease-out, filter 200ms ease-out; }
        .cl-node-hover:hover { transform: translateY(-2px); filter: brightness(1.15); }
        .cl-dot { position: absolute; top: 50%; width: 6px; height: 6px; border-radius: 9999px; background: #f59e0b; transform: translateY(-50%); animation: clDot 3.5s linear infinite; }
        .cl-nav-link { transition: color 200ms ease-out; }
        .cl-nav-link:hover { color: #f59e0b; }
        .cl-cta-btn { transition: transform 180ms ease-out, box-shadow 180ms ease-out, background-color 180ms ease-out; }
        .cl-cta-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4); }
        .cl-cta-btn:active { transform: translateY(0); }
        .cl-workflow-step { animation: clFadeUpSm 500ms ease-out both; }
        .cl-meta-fade { animation: clFadeUpSm 500ms ease-out both; }
      `}</style>

      {/* Main Top Navigation */}
      <nav
        className="backdrop-blur-md bg-[#000000]/90 sticky z-50 top-0 h-16"
        aria-label="Main navigation"
      >
        <div className="flex mr-auto ml-auto pr-6 pl-6 justify-between items-center h-full max-w-7xl">
          <Link
            to="/"
            className="transition-colors text-[#f4f4f5] flex items-center shrink-0 gap-2.5"
            aria-label="CodeLens home"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Code2 className="size-5" aria-hidden="true" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">
              CodeLens
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="cl-cta-btn font-medium rounded-lg bg-amber-500 hover:bg-amber-400 text-[#000000] text-sm inline-flex px-4 py-2 items-center gap-2 h-9 font-semibold transition"
              >
                <span>Dashboard</span>
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <button
                onClick={handleAuthAction}
                className="cl-cta-btn font-medium rounded-lg bg-[#09090b] hover:bg-[#18181b] text-[#f4f4f5] text-sm border border-[#1f1f23] hover:border-amber-500/40 inline-flex px-4 py-2 items-center gap-2 h-9 cursor-pointer transition shadow-sm"
              >
                <GithubIcon className="size-4 text-white" aria-hidden="true" />
                <span>Continue with GitHub</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main>
        {/* Hero Section */}
        <section className="bg-[#000000] border-b border-[#1f1f23] pt-20 pr-6 pb-24 pl-6 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/5 blur-3xl pointer-events-none -z-10" />

          <div className="mr-auto ml-auto max-w-7xl">
            <div className="text-center mr-auto ml-auto max-w-3xl">
              <p className="cl-anim-eyebrow font-mono font-semibold text-amber-400 text-xs tracking-[0.22em] uppercase">
                CODEBASE INTELLIGENCE
              </p>
              <h1 className="cl-anim-headline font-extrabold text-gray-50 text-4xl sm:text-5xl lg:text-6xl leading-[1.08] -tracking-[0.03em] mt-5">
                Understand Any Codebase.
              </h1>
              <p className="cl-anim-desc1 text-gray-200 text-lg sm:text-xl leading-8 mt-6 mr-auto ml-auto max-w-2xl font-normal">
                AI-powered codebase intelligence with answers you can actually verify.
              </p>
              <p className="cl-anim-desc2 text-[#9ca3af] text-sm sm:text-base leading-7 mt-4 mr-auto ml-auto max-w-2xl">
                Connect a GitHub repository, ask questions in natural language, trace architecture, and jump directly from AI answers to the exact source code behind them.
              </p>
              <div className="cl-anim-cta flex mt-8 flex-wrap justify-center items-center gap-3">
                <button
                  onClick={handleAuthAction}
                  className="cl-cta-btn font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0d1017] text-sm inline-flex px-5 py-2.5 items-center gap-2 h-11 shadow-[0_4px_20px_rgba(245,158,11,0.25)] cursor-pointer"
                >
                  <GithubIcon className="size-4" />
                  <span>Continue with GitHub</span>
                </button>
                <a
                  href="#how-it-works"
                  className="cl-cta-btn font-semibold rounded-lg bg-[#111827] hover:bg-[#1a202c] text-gray-100 text-sm border border-[#374151] hover:border-amber-500/30 inline-flex px-5 py-2.5 items-center h-11 transition"
                >
                  Explore how it works
                </a>
              </div>
              <p className="cl-anim-note text-[#6b7280] text-xs mt-6 font-mono">
                GitHub-connected • Grounded in your code • Exact file &amp; line citations
              </p>
            </div>

            {/* Live Interactive Preview Screen */}
            <div className="cl-anim-preview shadow-[0px_25px_60px_-15px_rgba(0,0,0,0.6)] rounded-2xl bg-[#111827] border border-[#374151] mt-16 mr-auto ml-auto max-w-6xl overflow-hidden">
              <div className="border-b border-[#374151] flex pt-3.5 pr-5 pb-3.5 pl-5 flex-wrap justify-between items-center gap-4 bg-[#0d121c]">
                <div className="font-semibold text-sm flex items-center gap-3 text-white">
                  <div className="w-5 h-5 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Code2 className="size-3.5" />
                  </div>
                  <span>CodeLens Copilot</span>
                </div>
                <div className="font-mono rounded-lg bg-gray-950 text-[#9ca3af] text-xs border border-[#374151] flex pt-1.5 pr-3 pb-1.5 pl-3 items-center gap-2">
                  <GitBranch className="size-3.5 text-amber-400" />
                  <span>kshxaib/CodeLens</span>
                  <ChevronDown className="size-3.5 text-slate-500" />
                </div>
                <div className="text-xs flex items-center gap-4">
                  <span className="text-[#4ade80] flex items-center gap-2 font-mono">
                    <span className="rounded-full bg-[#4ade80] size-2 animate-pulse" />
                    Indexed
                  </span>
                  <span className="text-[#9ca3af] font-mono flex items-center gap-1.5">
                    <Sparkles className="size-3 text-amber-400" /> OpenAI GPT-4o Active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[420px]">
                {/* Left: Copilot Chat */}
                <div className="border-b lg:border-b-0 lg:border-r border-[#374151] pt-6 pr-6 pb-6 pl-6 flex flex-col justify-between bg-[#111827]">
                  <div>
                    <div className="flex mb-5 justify-between items-center">
                      <span className="font-medium text-[#9ca3af] text-xs uppercase tracking-wider">
                        Copilot Chat
                      </span>
                      <span className="font-mono text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        100% Grounded
                      </span>
                    </div>
                    <div className="rounded-xl bg-gray-100 text-gray-950 text-sm leading-6 ml-auto pt-3 pr-4 pb-3 pl-4 max-w-sm font-medium shadow-md">
                      Where is authentication middleware implemented?
                    </div>
                    <div className="rounded-xl bg-[#1f2937] border border-[#374151] mt-5 pt-5 pr-5 pb-5 pl-5">
                      <h3 className="font-semibold text-gray-50 text-sm sm:text-base">
                        Authentication middleware is implemented in
                        <span className="cl-cursor align-middle bg-amber-400 inline-block ml-1 w-0.5 h-4" />
                      </h3>
                      <p className="text-[#9ca3af] text-xs sm:text-sm leading-6 mt-3">
                        The request is validated before reaching protected routes through the repository authentication layer.
                      </p>
                      <div className="cl-anim-note font-mono rounded-lg bg-gray-950 text-amber-400 text-xs leading-6 border border-amber-500/30 mt-5 pt-3.5 pr-4 pb-3.5 pl-4">
                        <div className="font-semibold">backend/app/auth/middleware.py</div>
                        <div className="text-[#9ca3af]">authenticate_request()</div>
                        <div className="text-gray-400">L24–56 · Verified in AST</div>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="transition-colors text-[#9ca3af] hover:text-amber-400 text-xs inline-flex mt-4 items-center gap-1.5 cursor-pointer font-mono"
                      >
                        {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                        {copied ? 'Copied to clipboard' : 'Copy reference'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Source Code Viewer with Line Highlights */}
                <div className="pt-6 pr-6 pb-6 pl-6 bg-[#0a0d14] flex flex-col">
                  <div className="flex mb-4 justify-between items-center">
                    <span className="font-mono text-amber-400 text-xs flex items-center gap-1.5">
                      <Code2 className="size-3.5" /> backend/app/auth/middleware.py
                    </span>
                    <span className="font-mono rounded-md text-[#9ca3af] text-[10px] border border-[#374151] pt-1 pr-2 pb-1 pl-2 bg-[#111827]">
                      Python
                    </span>
                  </div>
                  <pre className="font-mono rounded-xl bg-gray-950 text-[#9ca3af] text-xs leading-7 border border-[#374151] pt-5 pr-5 pb-5 pl-5 flex-1 overflow-x-auto">
                    <code>
                      <div><span className="text-[#4b5563] select-none mr-4 inline-block w-5">24</span><span className="text-purple-400">from</span> functools <span className="text-purple-400">import</span> wraps</div>
                      <div><span className="text-[#4b5563] select-none mr-4 inline-block w-5">25</span><span className="text-purple-400">from</span> app.auth.tokens <span className="text-purple-400">import</span> verify_token</div>
                      <div><span className="text-[#4b5563] select-none mr-4 inline-block w-5">26</span></div>
                      <div className="cl-highlight-pulse bg-amber-500/15 text-amber-200 border-l-2 border-amber-400 pl-2 -ml-2 rounded-r">
                        <span className="text-amber-400 select-none mr-2 font-bold inline-block w-5">27</span><span className="text-purple-300 font-semibold">def</span> <span className="text-amber-300 font-semibold">authenticate_request</span>(request):
                      </div>
                      <div className="cl-highlight-pulse bg-amber-500/15 text-amber-200 border-l-2 border-amber-400 pl-2 -ml-2 rounded-r">
                        <span className="text-amber-400 select-none mr-2 font-bold inline-block w-5">28</span>    token = request.headers.get(<span className="text-emerald-300">"Authorization"</span>)
                      </div>
                      <div className="cl-highlight-pulse bg-amber-500/15 text-amber-200 border-l-2 border-amber-400 pl-2 -ml-2 rounded-r">
                        <span className="text-amber-400 select-none mr-2 font-bold inline-block w-5">29</span>    <span className="text-purple-300">if not</span> token:
                      </div>
                      <div className="cl-highlight-pulse bg-amber-500/15 text-amber-200 border-l-2 border-amber-400 pl-2 -ml-2 rounded-r">
                        <span className="text-amber-400 select-none mr-2 font-bold inline-block w-5">30</span>        <span className="text-rose-400">raise</span> UnauthorizedError()
                      </div>
                      <div className="cl-highlight-pulse bg-amber-500/15 text-amber-200 border-l-2 border-amber-400 pl-2 -ml-2 rounded-r">
                        <span className="text-amber-400 select-none mr-2 font-bold inline-block w-5">31</span>    <span className="text-purple-300">return</span> verify_token(token)
                      </div>
                      <div><span className="text-[#4b5563] select-none mr-4 inline-block w-5">32</span></div>
                      <div><span className="text-[#4b5563] select-none mr-4 inline-block w-5">33</span><span className="text-purple-400">def</span> <span className="text-blue-300">require_user</span>(handler):</div>
                      <div><span className="text-[#4b5563] select-none mr-4 inline-block w-5">34</span>    <span className="text-cyan-400">@wraps</span>(handler)</div>
                      <div><span className="text-[#4b5563] select-none mr-4 inline-block w-5">35</span>    <span className="text-purple-400">def</span> <span className="text-blue-300">wrapped</span>(request):</div>
                      <div><span className="text-[#4b5563] select-none mr-4 inline-block w-5">36</span>        <span className="text-purple-400">return</span> handler(request)</div>
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section
          id="product"
          className="border-b border-[#22283a] pt-24 pr-6 pb-24 pl-6 bg-[#0d1017]"
        >
          <div className="mr-auto ml-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase font-semibold">
                THE PROBLEM
              </p>
              <h2 className="font-extrabold text-3xl sm:text-4xl tracking-tight mt-4 text-white">
                Stop searching your codebase blindly.
              </h2>
              <p className="text-slate-400 text-lg mt-4 leading-relaxed">
                CodeLens keeps code, context, and architecture connected with zero guesswork.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 mt-12 gap-5">
              <div className="cl-card-1 cl-card-hover rounded-2xl bg-[#131722] border border-[#22283a] pt-7 pr-6 pb-7 pl-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6">
                  <Compass className="cl-icon-hover size-5" />
                </div>
                <h3 className="font-bold text-lg text-white">
                  Unfamiliar codebases
                </h3>
                <p className="text-slate-400 text-sm leading-6 mt-3">
                  Tracing functions, imports, services, and data flows manually takes hours of onboarding time.
                </p>
              </div>

              <div className="cl-card-2 cl-card-hover rounded-2xl bg-[#131722] border border-[#22283a] pt-7 pr-6 pb-7 pl-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6">
                  <CircleAlert className="cl-icon-hover size-5" />
                </div>
                <h3 className="font-bold text-lg text-white">
                  Unverifiable AI answers
                </h3>
                <p className="text-slate-400 text-sm leading-6 mt-3">
                  Generic coding assistants hallucinate file paths and invent methods without showing where the answer came from.
                </p>
              </div>

              <div className="cl-card-3 cl-card-hover rounded-2xl bg-[#131722] border border-[#22283a] pt-7 pr-6 pb-7 pl-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6">
                  <Network className="cl-icon-hover size-5" />
                </div>
                <h3 className="font-bold text-lg text-white">
                  Hidden architecture
                </h3>
                <p className="text-slate-400 text-sm leading-6 mt-3">
                  Critical dependencies and change blast radiuses are invisible when navigating individual files.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features / Core Capabilities */}
        <section
          id="features"
          className="border-b border-[#22283a] pt-24 pr-6 pb-24 pl-6 bg-[#0b0e14]"
        >
          <div className="mr-auto ml-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase font-semibold">
                CORE CAPABILITIES
              </p>
              <h2 className="font-extrabold text-3xl sm:text-4xl tracking-tight mt-4 text-white">
                From question to source code.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 mt-12 gap-5">
              {/* Card 1 */}
              <div className="cl-card-1 rounded-2xl bg-[#111827] border border-[#374151] pt-6 pr-6 pb-6 pl-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white">Ask your codebase</h3>
                  <div className="rounded-xl bg-gray-950 border border-[#374151] mt-5 pt-4 pr-4 pb-4 pl-4">
                    <p className="text-gray-100 text-sm font-medium">
                      How does a user login request reach the database?
                    </p>
                    <div className="rounded-lg bg-[#1f2937] text-[#9ca3af] text-xs leading-6 mt-4 pt-3 pr-3 pb-3 pl-3 border border-[#374151]">
                      The login request enters through the auth route, passes the session service, and reaches the database model
                      <span className="cl-cursor align-middle bg-amber-400 inline-block ml-1 w-0.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="cl-card-2 rounded-2xl bg-[#111827] border border-[#374151] pt-6 pr-6 pb-6 pl-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white">Verify every answer</h3>
                  <div className="cl-anim-note font-mono rounded-xl bg-gray-950 text-xs leading-6 border border-amber-500/40 mt-5 pt-3.5 pr-4 pb-3.5 pl-4">
                    <div className="text-amber-400 font-semibold">app/auth/routes.py</div>
                    <div className="text-gray-200">github_callback</div>
                    <div className="text-[#9ca3af]">L33–96</div>
                  </div>
                  <div className="font-mono rounded-xl bg-gray-950 text-[#9ca3af] text-[11px] leading-6 border border-[#374151] mt-3 pt-3 pr-3 pb-3 pl-3 overflow-hidden">
                    <div className="cl-highlight-pulse bg-amber-500/10 text-amber-200 pl-2 rounded">
                      33 def github_callback(code):
                    </div>
                    <div className="cl-highlight-pulse bg-amber-500/10 text-amber-200 pl-2 rounded">
                      34 session = create_session(code)
                    </div>
                    <div className="cl-highlight-pulse bg-amber-500/10 text-amber-200 pl-2 rounded">
                      35 return session
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="cl-card-3 rounded-2xl bg-[#111827] border border-[#374151] pt-6 pr-6 pb-6 pl-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white">See the architecture</h3>
                  <div className="rounded-xl bg-gray-950 border border-[#374151] relative mt-5 pt-4 pr-4 pb-4 pl-4 min-h-[220px] flex items-center justify-center">
                    <div className="text-xs flex flex-col items-center gap-2.5 w-full">
                      <div className="cl-node-hover rounded-lg bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/50 py-2 px-4 font-mono text-center w-36">
                        API Route
                      </div>
                      <div className="bg-[#374151] relative w-0.5 h-3">
                        <span className="cl-dot" />
                      </div>
                      <ArrowDown className="text-slate-500 size-3.5" />
                      <div className="cl-node-hover rounded-lg bg-[#c084fc]/10 text-[#c084fc] border border-[#c084fc]/50 py-2 px-4 font-mono text-center w-36">
                        Service Layer
                      </div>
                      <div className="bg-[#374151] relative w-0.5 h-3">
                        <span className="cl-dot" />
                      </div>
                      <ArrowDown className="text-slate-500 size-3.5" />
                      <div className="flex gap-2 justify-center">
                        <div className="cl-node-hover rounded-lg bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/50 py-1.5 px-2.5 font-mono text-[11px]">
                          DB Model
                        </div>
                        <div className="cl-node-hover rounded-lg bg-cyan-400/10 text-cyan-300 border border-cyan-400/50 py-1.5 px-2.5 font-mono text-[11px]">
                          External API
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="border-b border-[#22283a] pt-24 pr-6 pb-24 pl-6 bg-[#0d1017]"
        >
          <div className="mr-auto ml-auto max-w-7xl">
            <p className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase font-semibold">
              HOW IT WORKS
            </p>
            <h2 className="font-extrabold text-3xl sm:text-4xl tracking-tight mt-4 text-white">
              Ask. Trace. Verify.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 mt-12 gap-5">
              {/* Step 1 */}
              <div className="cl-card-1 rounded-2xl bg-[#131722] border border-[#22283a] pt-7 pr-6 pb-7 pl-6 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-amber-400 text-xs font-semibold">
                    STEP 01
                  </span>
                  <h3 className="font-bold text-xl text-white mt-4">Ask</h3>
                  <p className="text-slate-400 text-sm leading-6 mt-3">
                    Ask a natural-language question about any part of the repository.
                  </p>
                </div>
                <p className="font-mono rounded-lg bg-[#0a0d14] text-gray-200 text-xs border border-[#22283a] mt-6 pt-3.5 pr-4 pb-3.5 pl-4">
                  Where is authentication implemented?
                </p>
              </div>

              {/* Step 2 */}
              <div className="cl-card-2 rounded-2xl bg-[#131722] border border-[#22283a] pt-7 pr-6 pb-7 pl-6 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-amber-400 text-xs font-semibold">
                    STEP 02
                  </span>
                  <h3 className="font-bold text-xl text-white mt-4">Trace</h3>
                  <p className="text-slate-400 text-sm leading-6 mt-3">
                    CodeLens retrieves relevant code chunks and extracts symbols, AST trees, and cross-file dependencies.
                  </p>
                </div>
                <div className="flex mt-6 flex-wrap gap-2">
                  <span className="font-mono rounded-full text-[#60a5fa] bg-blue-500/10 text-xs border border-blue-500/30 pt-1 pr-3 pb-1 pl-3">
                    Qdrant vectors
                  </span>
                  <span className="font-mono rounded-full text-[#c084fc] bg-purple-500/10 text-xs border border-purple-500/30 pt-1 pr-3 pb-1 pl-3">
                    AST symbols
                  </span>
                  <span className="font-mono rounded-full text-[#4ade80] bg-emerald-500/10 text-xs border border-emerald-500/30 pt-1 pr-3 pb-1 pl-3">
                    repository context
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="cl-card-3 rounded-2xl bg-[#131722] border border-[#22283a] pt-7 pr-6 pb-7 pl-6 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-amber-400 text-xs font-semibold">
                    STEP 03
                  </span>
                  <h3 className="font-bold text-xl text-white mt-4">Verify</h3>
                  <p className="text-slate-400 text-sm leading-6 mt-3">
                    Click citations to open the exact file and highlighted line range behind the answer in an integrated viewer.
                  </p>
                </div>
                <div className="font-mono text-slate-400 text-xs grid mt-6 gap-2.5 grid-cols-2 bg-[#0a0d14] p-3.5 rounded-lg border border-[#22283a]">
                  <span className="cl-meta-fade">File</span>
                  <span className="cl-meta-fade text-slate-200">app/auth/routes.py</span>
                  <span className="cl-meta-fade">Symbol</span>
                  <span className="cl-meta-fade text-slate-200">github_callback</span>
                  <span className="cl-meta-fade">Line range</span>
                  <span className="cl-meta-fade text-amber-400 font-semibold">L33–96</span>
                  <span className="cl-meta-fade">Source</span>
                  <span className="cl-meta-fade text-emerald-400 font-semibold">Grounded &amp; Highlighted</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section
          id="architecture"
          className="border-b border-[#22283a] pt-24 pr-6 pb-24 pl-6 bg-[#0b0e14]"
        >
          <div className="mr-auto ml-auto max-w-7xl">
            <p className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase font-semibold">
              ARCHITECTURE INTELLIGENCE
            </p>
            <h2 className="font-extrabold text-3xl sm:text-4xl tracking-tight mt-4 text-white">
              See how your system actually connects.
            </h2>
            <p className="text-slate-400 text-lg mt-4 max-w-2xl leading-relaxed">
              Turn repository structure and multi-language dependencies into an interactive 4-layer architecture map.
            </p>

            <div className="rounded-2xl bg-gray-950 border border-[#374151] relative mt-12 pt-8 pr-8 pb-8 pl-8 overflow-hidden shadow-2xl">
              <div className="[background-image:linear-gradient(#374151_1px,transparent_1px),linear-gradient(90deg,#374151_1px,transparent_1px)] opacity-20 absolute top-0 right-0 bottom-0 left-0 bg-[size:32px_32px]" />

              <div className="flex relative pt-16 pb-16 justify-between items-center gap-4 sm:gap-6 overflow-x-auto min-w-[700px]">
                <div className="cl-node-hover text-center rounded-xl bg-[#111827] text-[#60a5fa] text-sm border border-[#60a5fa] pt-4 pr-4 pb-4 pl-4 min-w-[140px] font-mono shadow-[0_0_15px_rgba(96,165,250,0.15)]">
                  Frontend UI
                </div>
                <div className="bg-[#60a5fa]/30 relative flex-1 h-0.5 min-w-[24px]">
                  <span className="cl-dot" />
                </div>
                <ArrowRight className="text-[#60a5fa] shrink-0 size-5" />

                <div className="cl-node-hover text-center rounded-xl bg-[#111827] text-[#60a5fa] text-sm border border-[#60a5fa] pt-4 pr-4 pb-4 pl-4 min-w-[140px] font-mono shadow-[0_0_15px_rgba(96,165,250,0.15)]">
                  API Routes
                </div>
                <div className="bg-[#c084fc]/30 relative flex-1 h-0.5 min-w-[24px]">
                  <span className="cl-dot" />
                </div>
                <ArrowRight className="text-[#c084fc] shrink-0 size-5" />

                <div className="cl-node-hover text-center shadow-[0px_0px_20px_rgba(192,132,252,0.3)] rounded-xl bg-[#c084fc]/15 text-[#c084fc] text-sm border-2 border-[#c084fc] pt-4 pr-4 pb-4 pl-4 min-w-[140px] font-mono">
                  Services
                </div>
                <div className="bg-[#4ade80]/30 relative flex-1 h-0.5 min-w-[24px]">
                  <span className="cl-dot" />
                </div>
                <ArrowRight className="text-[#4ade80] shrink-0 size-5" />

                <div className="cl-node-hover text-center rounded-xl bg-[#111827] text-[#4ade80] text-sm border border-[#4ade80] pt-4 pr-4 pb-4 pl-4 min-w-[140px] font-mono shadow-[0_0_15px_rgba(74,222,128,0.15)]">
                  Database
                </div>
                <div className="bg-cyan-400/30 relative flex-1 h-0.5 min-w-[24px]">
                  <span className="cl-dot" />
                </div>
                <ArrowRight className="text-cyan-300 shrink-0 size-5" />

                <div className="cl-node-hover text-center rounded-xl bg-[#111827] text-cyan-300 text-sm border border-cyan-400 pt-4 pr-4 pb-4 pl-4 min-w-[140px] font-mono shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                  External APIs
                </div>
              </div>

              <div className="rounded-lg bg-[#111827] text-amber-400 text-xs border border-amber-500/40 absolute top-6 left-6 pt-2 pr-3 pb-2 pl-3 font-mono">
                Blast radius analysis
              </div>

              <div className="flex absolute right-6 bottom-6 items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 mr-2 hidden sm:inline">Interactive Topology</span>
                <button className="rounded-md bg-[#111827] hover:bg-[#1f2937] text-slate-300 text-xs border border-[#374151] pt-1.5 pr-3 pb-1.5 pl-3 transition font-mono">
                  Fit view
                </button>
              </div>
            </div>

            <p className="text-slate-400 text-sm mt-5">
              Inspect upstream callers and downstream dependencies before changing critical code.
            </p>
          </div>
        </section>

        {/* Grounded AI Section */}
        <section className="border-b border-[#22283a] pt-24 pr-6 pb-24 pl-6 bg-[#0d1017]">
          <div className="mr-auto ml-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase font-semibold">
                GROUNDED AI
              </p>
              <h2 className="font-extrabold text-3xl sm:text-4xl tracking-tight mt-4 text-white">
                AI answers backed by your code.
              </h2>
            </div>

            <div className="rounded-2xl bg-[#111827] border border-[#374151] grid grid-cols-1 lg:grid-cols-2 mt-12 overflow-hidden shadow-2xl">
              <div className="pt-8 pr-8 pb-8 pl-8 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xl text-white">
                    Authentication is handled by...
                  </h3>
                  <p className="text-slate-400 leading-7 mt-4 text-sm sm:text-base">
                    The auth route validates the OAuth callback, creates the user session, and passes the authenticated identity into the protected request flow.
                  </p>
                  <div className="font-mono text-xs mt-6 space-y-2">
                    <div className="cl-meta-fade rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 pt-3 pr-3 pb-3 pl-3">
                      backend/app/api/auth.py · github_callback · L33–96
                    </div>
                    <div className="cl-meta-fade rounded-lg bg-gray-950 text-slate-300 border border-[#374151] pt-3 pr-3 pb-3 pl-3">
                      backend/app/auth/security.py · create_session · L12–48
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-[#374151] text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Repository-scoped retrieval
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Exact source citations
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Line-level verification
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Zero code retention
                  </div>
                </div>
              </div>

              <div className="border-t lg:border-t-0 lg:border-l border-[#374151] pt-8 pr-8 pb-8 pl-8 bg-[#0a0d14]">
                <div className="font-mono text-slate-400 text-xs flex justify-between items-center">
                  <span className="text-amber-400 font-semibold">backend/app/api/auth.py</span>
                  <span className="bg-[#111827] px-2 py-0.5 rounded border border-[#374151]">Python</span>
                </div>
                <div className="font-mono rounded-xl bg-gray-950 text-[#9ca3af] text-xs leading-8 border border-[#374151] mt-5 pt-5 pr-5 pb-5 pl-5 overflow-x-auto">
                  <div className="cl-highlight-pulse bg-amber-500/15 text-amber-200 pl-3 border-l-2 border-amber-400 rounded-r">
                    33 def github_callback(code: str, db: Session):
                  </div>
                  <div className="cl-highlight-pulse bg-amber-500/15 text-amber-200 pl-3 border-l-2 border-amber-400 rounded-r">
                    34     session = create_user_session(db, code)
                  </div>
                  <div className="cl-highlight-pulse bg-amber-500/15 text-amber-200 pl-3 border-l-2 border-amber-400 rounded-r">
                    {'35     return {"session_token": session.token}'}
                  </div>
                  <div className="pl-3 text-[#4b5563]">36</div>
                  <div className="pl-3 text-slate-400">96     return response</div>
                </div>
              </div>
            </div>

            <p className="font-semibold text-lg sm:text-xl mt-8 text-white">
              CodeLens does not just answer. It shows you exactly where the answer came from.
            </p>
          </div>
        </section>

        {/* Developer Workflow Section */}
        <section className="border-b border-[#22283a] pt-24 pr-6 pb-24 pl-6 bg-[#0b0e14]">
          <div className="mr-auto ml-auto max-w-7xl">
            <p className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase font-semibold">
              DEVELOPER WORKFLOW
            </p>
            <h2 className="font-extrabold text-3xl sm:text-4xl tracking-tight mt-4 text-white">
              A connected developer workflow.
            </h2>
            <div className="flex mt-12 flex-wrap justify-center items-center gap-3">
              <div className="cl-workflow-step rounded-xl bg-[#131722] text-sm text-slate-200 border border-[#22283a] pt-3.5 pr-4 pb-3.5 pl-4 font-medium">
                1. Connect GitHub
              </div>
              <ArrowRight className="text-amber-400 size-4" />
              <div className="cl-workflow-step rounded-xl bg-[#131722] text-sm text-slate-200 border border-[#22283a] pt-3.5 pr-4 pb-3.5 pl-4 font-medium">
                2. Index Codebase
              </div>
              <ArrowRight className="text-amber-400 size-4" />
              <div className="cl-workflow-step rounded-xl bg-[#131722] text-sm text-slate-200 border border-[#22283a] pt-3.5 pr-4 pb-3.5 pl-4 font-medium">
                3. Ask Questions
              </div>
              <ArrowRight className="text-amber-400 size-4" />
              <div className="cl-workflow-step rounded-xl bg-[#131722] text-sm text-slate-200 border border-[#22283a] pt-3.5 pr-4 pb-3.5 pl-4 font-medium">
                4. Qdrant Retrieval
              </div>
              <ArrowRight className="text-amber-400 size-4" />
              <div className="cl-workflow-step rounded-xl bg-[#131722] text-sm text-slate-200 border border-[#22283a] pt-3.5 pr-4 pb-3.5 pl-4 font-medium">
                5. AI Stream
              </div>
              <ArrowRight className="text-amber-400 size-4" />
              <div className="cl-workflow-step rounded-xl bg-amber-500/10 text-sm text-amber-400 border border-amber-500/40 pt-3.5 pr-4 pb-3.5 pl-4 font-semibold">
                6. Citation &amp; Source Lines
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#22283a] py-8 text-center text-xs text-[#6b7280] bg-[#0d1017]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Code2 className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">CodeLens</span> — AI Codebase Intelligence Copilot
          </div>
          <div className="flex items-center gap-6 font-medium">
            <a href="https://github.com/kshxaib/CodeLens" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition">
              GitHub
            </a>
            <Link to="/login" className="hover:text-amber-400 transition">
              Sign In
            </Link>
            <Link to="/profile" className="hover:text-amber-400 transition">
              Settings &amp; BYOK Key
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
