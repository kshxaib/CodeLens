import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Layers, Activity, GitBranch,
  Database, Shield, Server, Cpu, HardDrive, Terminal, Zap,
} from 'lucide-react';
import { GithubIcon } from '../components/common/Icons';
import { useAuthStore } from '../store/useAuthStore';

type SpecimenId = 's01' | 's02' | 's03';

interface SpecimenConfig {
  id: SpecimenId;
  code: string;
  name: string;
  meta: string;
  captionTag: string;
  captionTitle: string;
}

const SPECIMENS: SpecimenConfig[] = [
  {
    id: 's01',
    code: 'S · 01',
    name: 'FastAPI Architecture',
    meta: 'tiangolo/fastapi · 148 nodes · 210 edges',
    captionTag: 'ARCHITECTURE · 148 NODES · 210 EDGES',
    captionTitle: 'tiangolo/fastapi — Async ASGI stack with Starlette, Pydantic & SQLAlchemy',
  },
  {
    id: 's02',
    code: 'S · 02',
    name: 'Celery Task Pipeline',
    meta: 'celery/celery · 3 lanes · 24 steps',
    captionTag: 'WORKFLOW · 3 SWIM-LANES · 32 EDGES',
    captionTitle: 'celery/celery — Distributed task dispatch via AMQP broker & Billiard workers',
  },
  {
    id: 's03',
    code: 'S · 03',
    name: 'Flask Request Lifecycle',
    meta: 'pallets/flask · 5 actors · 16 traces',
    captionTag: 'SEQUENCE · 5 LIFELINES · 16 TRACES',
    captionTitle: 'pallets/flask — WSGI request through context, session auth & SQLAlchemy ORM',
  },
];

export const LandingPage: React.FC = () => {
  const { user, loginWithGitHub } = useAuthStore();
  const navigate = useNavigate();
  const [activeSpecimen, setActiveSpecimen] = useState<SpecimenId>('s01');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedBentoNode, setSelectedBentoNode] = useState<string | null>(null);

  const activeCfg = SPECIMENS.find((s) => s.id === activeSpecimen) || SPECIMENS[0];

  const handleAuthAction = () => {
    if (user) navigate('/dashboard');
    else loginWithGitHub();
  };

  const css = `
    .lp-root * { box-sizing: border-box; }
    .lp-grid-bg {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image:
        linear-gradient(rgba(17,20,25,.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(17,20,25,.04) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(ellipse 110% 55% at 50% 0%, black 15%, transparent 68%);
      -webkit-mask-image: radial-gradient(ellipse 110% 55% at 50% 0%, black 15%, transparent 68%);
    }
    .live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #16a34a;
      animation: lp-pulse 2.2s ease-in-out infinite; flex-shrink: 0;
    }
    @keyframes lp-pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(22,163,74,.35); }
      50%       { opacity: .7; box-shadow: 0 0 0 4px rgba(22,163,74,0); }
    }
    .spec-tab {
      border-radius: 10px; border: 1.5px solid rgba(17,20,25,.14);
      background: #fff; cursor: pointer;
      transition: border-color .15s, transform .15s, box-shadow .15s;
      text-align: left; padding: 10px 13px;
      display: flex; flex-direction: column; gap: 3px;
    }
    .spec-tab:hover { border-color: rgba(17,20,25,.4); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(17,20,25,.07); }
    .spec-tab.active { border-color: #111419; background: #111419; transform: translateY(-1px); box-shadow: 0 6px 22px rgba(17,20,25,.22); }
    .dcanvas {
      background: #fafbfc;
      background-image:
        linear-gradient(rgba(17,20,25,.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(17,20,25,.04) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .nd {
      position: absolute; border-radius: 8px; padding: 7px 9px;
      display: flex; flex-direction: column; gap: 3px;
      cursor: pointer; transition: all .14s ease;
      border: 1.5px solid; background: #fff;
    }
    .nd:hover { transform: translateY(-1px); }
    .nd-lbl { font-family: 'JetBrains Mono',monospace; font-size: 6.5px; font-weight: 700;
               text-transform: uppercase; letter-spacing: .08em;
               display: flex; align-items: center; gap: 3px; }
    .nd-ttl { font-family: 'JetBrains Mono',monospace; font-size: 10px; font-weight: 700; color: #111419; line-height: 1.2; }
    .nd-sub { font-family: 'JetBrains Mono',monospace; font-size: 7px; line-height: 1.3; opacity: .72; }
    .bento-card {
      border-radius: 14px; border: 1px solid rgba(20,23,26,.12);
      background: #fff; overflow: hidden;
      transition: box-shadow .18s, border-color .18s;
    }
    .bento-card:hover { box-shadow: 0 6px 28px rgba(17,20,25,.09); border-color: rgba(20,23,26,.22); }
    .bento-mini-canvas {
      background: #fafbfc;
      background-image:
        linear-gradient(rgba(17,20,25,.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(17,20,25,.04) 1px, transparent 1px);
      background-size: 14px 14px;
    }
  `;

  return (
    <div className="lp-root" style={{ minHeight: '100vh', background: '#f5f6f7', color: '#111419', fontFamily: "'Inter',-apple-system,sans-serif", overflowX: 'hidden', position: 'relative' }}>
      <style>{css}</style>
      <div className="lp-grid-bg" aria-hidden="true" />

      {/* ──────────────── NAV ──────────────── */}
      <header style={{ position: 'relative', zIndex: 30, borderBottom: '1px solid rgba(17,20,25,.08)', background: 'rgba(245,246,247,.92)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-.02em', color: '#111419', textDecoration: 'none' }}>
            CodeLens
          </Link>
          {user ? (
            <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#111419', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Dashboard <ArrowRight style={{ width: 14, height: 14, color: '#e14a0e' }} />
            </Link>
          ) : (
            <button onClick={handleAuthAction} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#111419', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              <GithubIcon style={{ width: 14, height: 14 }} /> Connect GitHub
            </button>
          )}
        </div>
      </header>

      {/* ──────────────── MAIN ──────────────── */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ══════════ SECTION 1 — HERO ══════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 476px', gap: 40, alignItems: 'start' }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 4 }}>

            <h1 style={{ fontFamily: 'Georgia,"Times New Roman",serif', fontStyle: 'italic', fontWeight: 400, fontSize: 52, color: '#111419', lineHeight: 1.08, letterSpacing: '-.025em', margin: '0 0 20px' }}>
              From any codebase<br />
              to architecture<br />
              <span style={{ color: '#e14a0e' }}>you can reason about.</span>
            </h1>

            <p style={{ fontSize: 15, color: '#5c6370', lineHeight: 1.72, maxWidth: 480, margin: '0 0 32px' }}>
              CodeLens parses real ASTs from any GitHub repo and generates 5 interactive
              architectural views — call graphs, dependency maps, blast radius simulations,
              and a grounded AI copilot that never hallucinates.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
              <Link to="/architecture" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: '#111419', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Explore the 5 views <ArrowRight style={{ width: 15, height: 15, color: '#e14a0e' }} />
              </Link>
              <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, border: '1.5px solid rgba(17,20,25,.18)', background: '#fff', color: '#333840', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                <Layers style={{ width: 15, height: 15, color: '#5c6370' }} /> Browse repos
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.18em', color: '#9ca3af', textTransform: 'uppercase' }}>Live Specimens</span>
              <span style={{ flex: 1, height: 1, background: 'rgba(17,20,25,.1)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {SPECIMENS.map((spec) => {
                const active = activeSpecimen === spec.id;
                return (
                  <button
                    key={spec.id}
                    className={`spec-tab${active ? ' active' : ''}`}
                    onClick={() => { setActiveSpecimen(spec.id); setSelectedNode(null); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: '#e14a0e' }}>{spec.code}</span>
                      {spec.id === 's01' && <Layers style={{ width: 12, height: 12, color: active ? 'rgba(255,255,255,.4)' : '#bdc3c9' }} />}
                      {spec.id === 's02' && <Activity style={{ width: 12, height: 12, color: active ? 'rgba(255,255,255,.4)' : '#bdc3c9' }} />}
                      {spec.id === 's03' && <GitBranch style={{ width: 12, height: 12, color: active ? 'rgba(255,255,255,.4)' : '#bdc3c9' }} />}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: active ? '#fff' : '#111419' }}>{spec.name}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: active ? 'rgba(255,255,255,.4)' : '#9ca3af' }}>{spec.meta}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT — Diagram Viewport */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 14, border: '1px solid rgba(17,20,25,.1)', background: '#fff', boxShadow: '0 8px 40px rgba(17,20,25,.09)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(17,20,25,.08)', background: '#f8f9fa', display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(239,68,68,.6)', display: 'block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(234,179,8,.6)', display: 'block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(34,197,94,.6)', display: 'block' }} />
              </div>
            </div>

            <div className="dcanvas" style={{ position: 'relative', height: 400, overflow: 'hidden', userSelect: 'none' }}>

              {/* S01 */}
              {activeSpecimen === 's01' && (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <defs>
                      {[
                        { id: 'a-slate', fill: '#64748b' }, { id: 'a-green', fill: '#16a34a' },
                        { id: 'a-rose', fill: '#e11d48' }, { id: 'a-violet', fill: '#7c3aed' },
                        { id: 'a-orange', fill: '#ea580c' },
                      ].map(({ id, fill }) => (
                        <marker key={id} id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                          <path d="M 0 2 L 9 5 L 0 8 z" fill={fill} />
                        </marker>
                      ))}
                    </defs>
                    <rect x="8" y="10" width="454" height="372" rx="10" fill="rgba(245,246,247,.55)" stroke="rgba(17,20,25,.11)" strokeWidth="1" strokeDasharray="5 4" />
                    <text x="20" y="25" fill="#9ca3af" fontSize="7.5" fontFamily="JetBrains Mono,monospace" fontWeight="700">VPC · tiangolo/fastapi</text>
                    <rect x="102" y="46" width="272" height="202" rx="8" fill="rgba(254,242,242,.35)" stroke="rgba(225,29,72,.22)" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="113" y="59" fill="#f43f5e" fontSize="7" fontFamily="JetBrains Mono,monospace" fontWeight="700">sg-fastapi · port 8000</text>
                    <line x1="22" y1="162" x2="46" y2="162" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#a-slate)" />
                    <line x1="116" y1="162" x2="138" y2="162" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#a-slate)" />
                    <line x1="228" y1="162" x2="250" y2="162" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#a-green)" />
                    <line x1="183" y1="93" x2="263" y2="145" stroke="#e11d48" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#a-rose)" />
                    <line x1="318" y1="144" x2="318" y2="106" stroke="#7c3aed" strokeWidth="1.5" markerEnd="url(#a-violet)" />
                    <line x1="363" y1="162" x2="386" y2="162" stroke="#7c3aed" strokeWidth="1.5" markerEnd="url(#a-violet)" />
                    <line x1="318" y1="184" x2="318" y2="254" stroke="#ea580c" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#a-orange)" />
                    <line x1="364" y1="272" x2="386" y2="272" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#a-green)" />
                  </svg>
                  <div style={{ position: 'absolute', top: 138, left: 10, width: 58, textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, margin: '0 auto 4px', borderRadius: '50%', border: '2px solid #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🌐</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, fontWeight: 700, color: '#64748b' }}>Internet</div>
                  </div>
                  <div onClick={() => setSelectedNode('cdn')} className="nd" style={{ top: 138, left: 46, width: 72, borderColor: selectedNode === 'cdn' ? '#f59e0b' : '#fde68a', background: selectedNode === 'cdn' ? '#fffbeb' : '#fff', boxShadow: selectedNode === 'cdn' ? '0 0 0 3px rgba(245,158,11,.18)' : undefined }}>
                    <div className="nd-lbl" style={{ color: '#92400e' }}><HardDrive style={{ width: 7, height: 7 }} /> CDN</div>
                    <div className="nd-ttl">CloudFront</div>
                    <div className="nd-sub" style={{ color: '#92400e' }}>200 PoPs</div>
                  </div>
                  <div onClick={() => setSelectedNode('lb')} className="nd" style={{ top: 138, left: 136, width: 92, borderColor: selectedNode === 'lb' ? '#38bdf8' : '#bae6fd', background: selectedNode === 'lb' ? '#f0f9ff' : '#fff', boxShadow: selectedNode === 'lb' ? '0 0 0 3px rgba(56,189,248,.18)' : undefined }}>
                    <div className="nd-lbl" style={{ color: '#0369a1' }}><Cpu style={{ width: 7, height: 7 }} /> Gateway</div>
                    <div className="nd-ttl">Nginx</div>
                    <div className="nd-sub" style={{ color: '#0369a1' }}>HTTPS :443</div>
                  </div>
                  <div onClick={() => setSelectedNode('auth')} className="nd" style={{ top: 64, left: 118, width: 88, borderColor: selectedNode === 'auth' ? '#fb7185' : '#fecdd3', background: selectedNode === 'auth' ? '#fff1f2' : '#fff', boxShadow: selectedNode === 'auth' ? '0 0 0 3px rgba(251,113,133,.18)' : undefined }}>
                    <div className="nd-lbl" style={{ color: '#9f1239' }}><Shield style={{ width: 7, height: 7 }} /> Auth</div>
                    <div className="nd-ttl">OAuth 2</div>
                    <div className="nd-sub" style={{ color: '#9f1239' }}>PKCE flow</div>
                  </div>
                  <div onClick={() => setSelectedNode('api')} className="nd" style={{ top: 136, left: 248, width: 114, border: '2px solid', borderColor: '#16a34a', background: selectedNode === 'api' ? '#f0fdf4' : '#fff', boxShadow: selectedNode === 'api' ? '0 0 0 3px rgba(22,163,74,.18), 0 6px 18px rgba(0,0,0,.09)' : '0 2px 8px rgba(0,0,0,.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="nd-lbl" style={{ color: '#166534' }}><Terminal style={{ width: 7, height: 7 }} /> FastAPI</div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6, background: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '2px 4px', borderRadius: 3 }}>ASGI</span>
                    </div>
                    <div className="nd-ttl">API Server</div>
                    <div className="nd-sub" style={{ color: '#166534' }}>uvicorn :8000</div>
                  </div>
                  <div onClick={() => setSelectedNode('redis')} className="nd" style={{ top: 66, left: 282, width: 78, borderColor: selectedNode === 'redis' ? '#a78bfa' : '#ddd6fe', background: selectedNode === 'redis' ? '#f5f3ff' : '#fff', boxShadow: selectedNode === 'redis' ? '0 0 0 3px rgba(167,139,250,.18)' : undefined }}>
                    <div className="nd-lbl" style={{ color: '#5b21b6' }}><Database style={{ width: 7, height: 7 }} /> Cache</div>
                    <div className="nd-ttl">Redis</div>
                    <div className="nd-sub" style={{ color: '#5b21b6' }}>:6379 · TTL</div>
                  </div>
                  <div onClick={() => setSelectedNode('pg')} className="nd" style={{ top: 138, left: 384, width: 70, borderColor: selectedNode === 'pg' ? '#818cf8' : '#c7d2fe', background: selectedNode === 'pg' ? '#eef2ff' : '#fff', boxShadow: selectedNode === 'pg' ? '0 0 0 3px rgba(129,140,248,.18)' : undefined }}>
                    <div className="nd-lbl" style={{ color: '#3730a3' }}><Database style={{ width: 7, height: 7 }} /> DB</div>
                    <div className="nd-ttl">Postgres</div>
                    <div className="nd-sub" style={{ color: '#3730a3' }}>:5432</div>
                  </div>
                  <div onClick={() => setSelectedNode('queue')} className="nd" style={{ top: 250, left: 280, width: 86, borderColor: selectedNode === 'queue' ? '#fb923c' : '#fed7aa', background: selectedNode === 'queue' ? '#fff7ed' : '#fff', boxShadow: selectedNode === 'queue' ? '0 0 0 3px rgba(251,146,60,.18)' : undefined }}>
                    <div className="nd-lbl" style={{ color: '#9a3412' }}><Server style={{ width: 7, height: 7 }} /> Queue</div>
                    <div className="nd-ttl">RabbitMQ</div>
                    <div className="nd-sub" style={{ color: '#9a3412' }}>AMQP :5672</div>
                  </div>
                  <div onClick={() => setSelectedNode('worker')} className="nd" style={{ top: 250, left: 384, width: 70, borderColor: selectedNode === 'worker' ? '#2dd4bf' : '#99f6e4', background: selectedNode === 'worker' ? '#f0fdfa' : '#fff', boxShadow: selectedNode === 'worker' ? '0 0 0 3px rgba(45,212,191,.18)' : undefined }}>
                    <div className="nd-lbl" style={{ color: '#115e59' }}><Zap style={{ width: 7, height: 7 }} /> Worker</div>
                    <div className="nd-ttl">Celery</div>
                    <div className="nd-sub" style={{ color: '#115e59' }}>pool ×8</div>
                  </div>
                  <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginRight: 2 }}>Legend</span>
                    {[
                      { label: 'CDN', bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
                      { label: 'Gateway', bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1' },
                      { label: 'Core', bg: '#f0fdf4', border: '#86efac', text: '#166534' },
                      { label: 'Data', bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6' },
                    ].map(({ label, bg, border, text }) => (
                      <span key={label} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, background: bg, border: `1px solid ${border}`, color: text, padding: '2px 6px', borderRadius: 4 }}>{label}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* S02 */}
              {activeSpecimen === 's02' && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 14, overflowY: 'auto', boxSizing: 'border-box' }}>
                  {([
                    { n: '01', title: 'Task Producer', sub: 'FastAPI application layer', badge: 'REST API', bdr: '#bae6fd', bg: 'rgba(240,249,255,.65)', hdr: 'rgba(224,242,254,.7)', dot: '#0ea5e9', txt: '#0c4a6e', left: { lbl: 'Trigger', code: 'task.apply_async()', sub: 'eta, countdown, retries' }, arrow: { label: 'serialize', color: '#38bdf8' }, right: { lbl: 'Kombu Encoder', code: 'JSON Signature', sub: 'headers + UUID task_id' }, connector: '▼ publish to AMQP exchange' },
                    { n: '02', title: 'Message Broker', sub: 'RabbitMQ cluster', badge: 'AMQP :5672', bdr: '#a7f3d0', bg: 'rgba(236,253,245,.65)', hdr: 'rgba(209,250,229,.7)', dot: '#10b981', txt: '#064e3b', left: { lbl: 'Exchange', code: 'Topic Router', sub: 'celery.direct binding' }, arrow: { label: 'route', color: '#34d399' }, right: { lbl: 'FIFO Queue', code: 'Worker Queue', sub: 'prefetch_count: 4' }, connector: '▼ consumer prefetch' },
                    { n: '03', title: 'Worker Pool', sub: 'Billiard multi-process', badge: 'concurrency: 8', bdr: '#d8b4fe', bg: 'rgba(250,245,255,.65)', hdr: 'rgba(243,232,255,.7)', dot: '#a855f7', txt: '#4a044e', left: { lbl: 'Execution', code: 'Worker Fork', sub: '8 subprocesses' }, arrow: { label: 'commit', color: '#c084fc' }, right: { lbl: 'Result Backend', code: 'PostgreSQL', sub: 'TaskState.SUCCESS' }, connector: null },
                  ] as const).map((lane) => (
                    <React.Fragment key={lane.n}>
                      <div style={{ borderRadius: 10, border: `1.5px solid ${lane.bdr}`, background: lane.bg, overflow: 'hidden', flex: 1 }}>
                        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${lane.bdr}`, background: lane.hdr, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: lane.dot, flexShrink: 0 }} />
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, fontWeight: 700, color: lane.txt, textTransform: 'uppercase' as const, letterSpacing: '.1em' }}>{lane.n} · {lane.title}</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, color: lane.dot }}>{lane.sub}</span>
                          </div>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, border: `1px solid ${lane.bdr}`, color: lane.txt, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{lane.badge}</span>
                        </div>
                        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, borderRadius: 8, border: `1.5px solid ${lane.bdr}`, background: '#fff', padding: '9px 11px' }}>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, color: lane.dot, fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 3 }}>{lane.left.lbl}</div>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: '#111419' }}>{lane.left.code}</div>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, color: '#6b7280', marginTop: 2 }}>{lane.left.sub}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <ArrowRight style={{ width: 16, height: 16, color: lane.arrow.color }} />
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, color: lane.arrow.color, fontWeight: 600 }}>{lane.arrow.label}</span>
                          </div>
                          <div style={{ flex: 1, borderRadius: 8, border: `1.5px solid ${lane.bdr}`, background: '#fff', padding: '9px 11px' }}>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, color: lane.dot, fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 3 }}>{lane.right.lbl}</div>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: '#111419' }}>{lane.right.code}</div>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, color: lane.n === '03' ? '#16a34a' : '#6b7280', marginTop: 2, fontWeight: lane.n === '03' ? 600 : 400 }}>{lane.right.sub}</div>
                          </div>
                        </div>
                      </div>
                      {lane.connector && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, background: '#fff', border: '1px solid #e5e7eb', color: '#9ca3af', padding: '3px 12px', borderRadius: 20 }}>{lane.connector}</span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* S03 */}
              {activeSpecimen === 's03' && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 14, boxSizing: 'border-box' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 }}>
                    {([
                      { role: 'Actor', name: 'Client', bdr: '#bae6fd', bg: '#f0f9ff', rtxt: '#0369a1', ntxt: '#0c4a6e' },
                      { role: 'Gateway', name: 'Gunicorn', bdr: '#fde68a', bg: '#fffbeb', rtxt: '#b45309', ntxt: '#78350f' },
                      { role: 'Core', name: 'Flask App', bdr: '#fecdd3', bg: '#fff1f2', rtxt: '#be123c', ntxt: '#881337' },
                      { role: 'Security', name: 'Session Auth', bdr: '#ddd6fe', bg: '#f5f3ff', rtxt: '#7c3aed', ntxt: '#4c1d95' },
                      { role: 'Storage', name: 'SQLAlchemy', bdr: '#c7d2fe', bg: '#eef2ff', rtxt: '#4338ca', ntxt: '#1e1b4b' },
                    ] as const).map(({ role, name, bdr, bg, rtxt, ntxt }) => (
                      <div key={name} style={{ textAlign: 'center', borderRadius: 8, padding: '7px 4px', border: `1.5px solid ${bdr}`, background: bg }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.1em', color: rtxt, marginBottom: 2 }}>{role}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: ntxt }}>{name}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
                    {([
                      { step: '01', label: 'GET /api/v1/repos', detail: 'HTTP/1.1 · TLS 1.3', indent: 0, bdr: '#bae6fd', bg: '#fff', stxt: '#0369a1', bold: false },
                      { step: '02', label: 'wsgi_app(environ, start_response)', detail: 'PEP-3333 environ dict', indent: 1, bdr: '#fde68a', bg: '#fff', stxt: '#b45309', bold: false },
                      { step: '03', label: 'push RequestContext & AppContext', detail: 'LocalProxy thread-local', indent: 2, bdr: '#fecdd3', bg: '#fff', stxt: '#be123c', bold: false },
                      { step: '04', label: 'verify itsdangerous HMAC cookie', detail: 'SecureCookieSession', indent: 3, bdr: '#ddd6fe', bg: '#fff', stxt: '#7c3aed', bold: false },
                      { step: '05', label: 'db.session.execute(select(Repo))', detail: 'pg8000 conn pool', indent: 4, bdr: '#c7d2fe', bg: '#fff', stxt: '#4338ca', bold: false },
                      { step: '06', label: '◀ 200 OK · jsonify(repos) · teardown ctx', detail: '12.4 ms total', indent: 0, bdr: '#86efac', bg: '#f0fdf4', stxt: '#15803d', bold: true },
                    ] as const).map(({ step, label, detail, indent, bdr, bg, stxt, bold }) => (
                      <div key={step} style={{ marginLeft: indent * 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, border: `1.5px solid ${bdr}`, background: bg, padding: '7px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: bdr, color: stxt, flexShrink: 0 }}>{step}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: bold ? 700 : 600, color: stxt }}>{label}</span>
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, color: bold ? '#16a34a' : '#9ca3af', fontWeight: bold ? 700 : 400, flexShrink: 0, marginLeft: 8 }}>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(17,20,25,.08)', background: '#f8f9fa' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: '.12em', color: '#e14a0e', textTransform: 'uppercase', marginBottom: 2 }}>{activeCfg.captionTag}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111419', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeCfg.captionTitle}</div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', border: '1px solid rgba(20,23,26,.18)', borderRadius: 14, background: '#f8faf9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          {[
            { value: '05', sup: null,  label: 'DIAGRAM VIEWS' },
            { value: '100', sup: '%',  label: 'AST ACCURACY' },
            { value: '04', sup: null,  label: 'VISUAL PRESETS' },
            { value: '0',  sup: 'HAL', label: 'HALLUCINATIONS' },
            { value: '00', sup: 'MAN', label: 'MANUAL SYNC' },
          ].map(({ value, sup, label }, i) => (
            <div key={label} style={{ padding: '20px 22px', borderLeft: i === 0 ? 'none' : '1px solid rgba(20,23,26,.14)' }}>
              <b style={{ display: 'block', fontFamily: 'Georgia,"Times New Roman",serif', fontStyle: 'italic', fontWeight: 400, fontSize: 36, color: '#15181b', lineHeight: 1, marginBottom: 8 }}>
                {value}
                {sup && <sup style={{ fontFamily: 'Inter,-apple-system,sans-serif', fontStyle: 'normal', fontSize: 13, fontWeight: 700, color: '#e14a0e', marginLeft: 2, verticalAlign: 'super' }}>{sup}</sup>}
              </b>
              <span style={{ display: 'block', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#60686d' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ══════════ SECTION 2 — FIVE WAYS ══════════ */}
        <div style={{ marginTop: 48 }}>

          {/* Section headline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.18em', color: '#9ca3af', textTransform: 'uppercase' }}>01 · VIEWS</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(17,20,25,.1)' }} />
          </div>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'Georgia,"Times New Roman",serif', fontStyle: 'italic', fontWeight: 400, fontSize: 42, color: '#111419', lineHeight: 1.1, letterSpacing: '-.02em', margin: '0 0 12px' }}>
              Five ways to see<br />your codebase.
            </h2>
            <p style={{ fontSize: 14, color: '#5c6370', lineHeight: 1.7, maxWidth: 480, margin: 0 }}>
              Architecture, workflows, sequences, data flows, or lifecycle — CodeLens
              parses real ASTs and picks the right visual language for every repo.
            </p>
          </div>

          {/* Bento Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, marginBottom: 12 }}>

            {/* T-01 Architecture — big card */}
            <div className="bento-card">
              <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(17,20,25,.08)', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, background: 'rgba(17,20,25,.07)', padding: '3px 7px', borderRadius: 5, color: '#5c6370', letterSpacing: '.1em' }}>T · 01</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: '.12em', color: '#9ca3af', textTransform: 'uppercase' }}>tiangolo/fastapi</span>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['rgba(239,68,68,.55)', 'rgba(234,179,8,.55)', 'rgba(34,197,94,.55)'].map((c, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'block' }} />)}
                </div>
              </div>
              <div className="dcanvas" style={{ position: 'relative', height: 280, overflow: 'hidden', userSelect: 'none' }}>
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <defs>
                    {[{ id: 'b-slate', fill: '#64748b' }, { id: 'b-green', fill: '#16a34a' }, { id: 'b-rose', fill: '#e11d48' }, { id: 'b-violet', fill: '#7c3aed' }, { id: 'b-orange', fill: '#ea580c' }].map(({ id, fill }) => (
                      <marker key={id} id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 2 L 9 5 L 0 8 z" fill={fill} /></marker>
                    ))}
                  </defs>
                  <rect x="8" y="10" width="530" height="258" rx="10" fill="rgba(245,246,247,.55)" stroke="rgba(17,20,25,.11)" strokeWidth="1" strokeDasharray="5 4" />
                  <text x="20" y="24" fill="#9ca3af" fontSize="7" fontFamily="JetBrains Mono,monospace" fontWeight="700">VPC · tiangolo/fastapi</text>
                  <rect x="156" y="34" width="250" height="142" rx="8" fill="rgba(254,242,242,.35)" stroke="rgba(225,29,72,.22)" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="166" y="47" fill="#f43f5e" fontSize="7" fontFamily="JetBrains Mono,monospace" fontWeight="700">sg-fastapi · port 8000</text>
                  <line x1="56" y1="138" x2="74" y2="138" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#b-slate)" />
                  <line x1="152" y1="138" x2="172" y2="138" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#b-slate)" />
                  <line x1="260" y1="138" x2="280" y2="138" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#b-green)" />
                  <line x1="230" y1="94" x2="280" y2="122" stroke="#e11d48" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#b-rose)" />
                  <line x1="337" y1="112" x2="337" y2="96" stroke="#7c3aed" strokeWidth="1.5" markerEnd="url(#b-violet)" />
                  <line x1="394" y1="138" x2="424" y2="138" stroke="#7c3aed" strokeWidth="1.5" markerEnd="url(#b-violet)" />
                  <line x1="337" y1="166" x2="337" y2="196" stroke="#ea580c" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#b-orange)" />
                  <line x1="380" y1="220" x2="424" y2="220" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#b-green)" />
                </svg>
                <div style={{ position: 'absolute', top: 118, left: 14, width: 42, textAlign: 'center' }}>
                  <div style={{ width: 26, height: 26, margin: '0 auto 2px', borderRadius: '50%', border: '2px solid #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🌐</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6.5, fontWeight: 700, color: '#64748b' }}>Internet</div>
                </div>
                {[
                  { key: 'cdn2', top: 114, left: 74, w: 78, bdr: '#fde68a', abdr: '#f59e0b', abg: '#fffbeb', lbl: 'CDN', lc: '#92400e', icon: <HardDrive style={{ width: 7, height: 7 }} />, ttl: 'CloudFront', sub: 'HTTPS :443' },
                  { key: 'lb2', top: 114, left: 172, w: 88, bdr: '#bae6fd', abdr: '#38bdf8', abg: '#f0f9ff', lbl: 'Gateway', lc: '#0369a1', icon: <Cpu style={{ width: 7, height: 7 }} />, ttl: 'Nginx', sub: 'HTTPS :443' },
                  { key: 'auth2', top: 48, left: 172, w: 88, bdr: '#fecdd3', abdr: '#fb7185', abg: '#fff1f2', lbl: 'Auth', lc: '#9f1239', icon: <Shield style={{ width: 7, height: 7 }} />, ttl: 'OAuth 2', sub: 'PKCE flow' },
                  { key: 'redis2', top: 48, left: 298, w: 78, bdr: '#ddd6fe', abdr: '#a78bfa', abg: '#f5f3ff', lbl: 'Cache', lc: '#5b21b6', icon: <Database style={{ width: 7, height: 7 }} />, ttl: 'Redis', sub: ':6379 TTL' },
                  { key: 'pg2', top: 114, left: 424, w: 84, bdr: '#c7d2fe', abdr: '#818cf8', abg: '#eef2ff', lbl: 'DB', lc: '#3730a3', icon: <Database style={{ width: 7, height: 7 }} />, ttl: 'Postgres', sub: ':5432' },
                  { key: 'queue2', top: 196, left: 298, w: 82, bdr: '#fed7aa', abdr: '#fb923c', abg: '#fff7ed', lbl: 'Queue', lc: '#9a3412', icon: <Server style={{ width: 7, height: 7 }} />, ttl: 'RabbitMQ', sub: 'AMQP :5672' },
                  { key: 'worker2', top: 196, left: 424, w: 84, bdr: '#99f6e4', abdr: '#2dd4bf', abg: '#f0fdfa', lbl: 'Worker', lc: '#115e59', icon: <Zap style={{ width: 7, height: 7 }} />, ttl: 'Celery', sub: 'pool ×8' },
                ].map(n => (
                  <div key={n.key} onClick={() => setSelectedBentoNode(n.key)} className="nd"
                    style={{ top: n.top, left: n.left, width: n.w, borderColor: selectedBentoNode === n.key ? n.abdr : n.bdr, background: selectedBentoNode === n.key ? n.abg : '#fff', boxShadow: selectedBentoNode === n.key ? `0 0 0 3px rgba(0,0,0,.08)` : undefined }}>
                    <div className="nd-lbl" style={{ color: n.lc }}>{n.icon} {n.lbl}</div>
                    <div className="nd-ttl">{n.ttl}</div>
                    <div className="nd-sub" style={{ color: n.lc }}>{n.sub}</div>
                  </div>
                ))}
                {/* FastAPI core special */}
                <div onClick={() => setSelectedBentoNode('api2')} className="nd"
                  style={{ top: 112, left: 280, width: 114, border: '2px solid', borderColor: '#16a34a', background: selectedBentoNode === 'api2' ? '#f0fdf4' : '#fff', boxShadow: selectedBentoNode === 'api2' ? '0 0 0 3px rgba(22,163,74,.18)' : '0 2px 8px rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="nd-lbl" style={{ color: '#166534' }}><Terminal style={{ width: 7, height: 7 }} /> FastAPI</div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6, background: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '2px 4px', borderRadius: 3 }}>ASGI</span>
                  </div>
                  <div className="nd-ttl">API Server</div>
                  <div className="nd-sub" style={{ color: '#166534' }}>uvicorn :8000</div>
                </div>
                <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {[{ label: 'Database 2', bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6' }, { label: 'Cloud 3', bg: '#fffbeb', border: '#fde68a', text: '#92400e' }, { label: 'Security 1', bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' }, { label: 'Message bus 1', bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' }].map(({ label, bg, border, text }) => (
                    <span key={label} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6.5, background: bg, border: `1px solid ${border}`, color: text, padding: '2px 5px', borderRadius: 4 }}>{label}</span>
                  ))}
                </div>
              </div>
              <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(17,20,25,.07)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111419', marginBottom: 4 }}>Architecture</div>
                <p style={{ fontSize: 12, color: '#5c6370', lineHeight: 1.6, margin: '0 0 8px' }}>System components, cloud resources, databases, caches, services, security groups, and the connections between them.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px' }}>
                  {['Cloud infrastructure', 'Microservices topology', 'Security boundaries', 'Network layout'].map(t => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#5c6370' }}>
                      <ArrowRight style={{ width: 10, height: 10, color: '#e14a0e', flexShrink: 0 }} /> {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column — Workflow + Sequence */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Workflow */}
              <div className="bento-card" style={{ flex: 1 }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(17,20,25,.07)' }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, background: 'rgba(17,20,25,.07)', padding: '2px 6px', borderRadius: 4, color: '#5c6370', letterSpacing: '.1em' }}>T · 02</span>
                </div>
                <div className="bento-mini-canvas" style={{ height: 110, padding: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[{ label: '01 · Task Producer', dot: '#0ea5e9', bdr: '#bae6fd', bg: 'rgba(240,249,255,.7)' }, { label: '02 · Message Broker', dot: '#10b981', bdr: '#a7f3d0', bg: 'rgba(236,253,245,.7)' }, { label: '03 · Worker Pool', dot: '#a855f7', bdr: '#d8b4fe', bg: 'rgba(250,245,255,.7)' }].map(lane => (
                    <div key={lane.label} style={{ borderRadius: 6, border: `1.5px solid ${lane.bdr}`, background: lane.bg, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: lane.dot, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.08em' }}>{lane.label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111419', marginBottom: 3 }}>Workflow</div>
                  <p style={{ fontSize: 11.5, color: '#5c6370', lineHeight: 1.55, margin: 0 }}>Swim-lane processes with semantic nodes — approval gates, async branches, and observability paths.</p>
                </div>
              </div>

              {/* Sequence */}
              <div className="bento-card" style={{ flex: 1 }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(17,20,25,.07)' }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, background: 'rgba(17,20,25,.07)', padding: '2px 6px', borderRadius: 4, color: '#5c6370', letterSpacing: '.1em' }}>T · 03</span>
                </div>
                <div className="bento-mini-canvas" style={{ height: 110, padding: 8, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3 }}>
                    {[{ n: 'Client', bdr: '#bae6fd', bg: '#f0f9ff', c: '#0369a1' }, { n: 'Gunicorn', bdr: '#fde68a', bg: '#fffbeb', c: '#b45309' }, { n: 'Flask', bdr: '#fecdd3', bg: '#fff1f2', c: '#be123c' }, { n: 'Session', bdr: '#ddd6fe', bg: '#f5f3ff', c: '#7c3aed' }, { n: 'ORM', bdr: '#c7d2fe', bg: '#eef2ff', c: '#4338ca' }].map(a => (
                      <div key={a.n} style={{ textAlign: 'center', border: `1px solid ${a.bdr}`, borderRadius: 5, background: a.bg, padding: '3px 2px' }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6, fontWeight: 700, color: a.c }}>{a.n}</div>
                      </div>
                    ))}
                  </div>
                  {[{ label: 'GET /api/v1/repos', bdr: '#bae6fd', c: '#0369a1', ml: 0 }, { label: 'wsgi_app(environ)', bdr: '#fde68a', c: '#b45309', ml: 10 }, { label: 'verify HMAC cookie', bdr: '#ddd6fe', c: '#7c3aed', ml: 20 }, { label: '◀ 200 OK · 12.4 ms', bdr: '#86efac', c: '#15803d', ml: 0 }].map(t => (
                    <div key={t.label} style={{ marginLeft: t.ml, border: `1.5px solid ${t.bdr}`, borderRadius: 5, background: '#fff', padding: '3px 7px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, fontWeight: 600, color: t.c }}>{t.label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111419', marginBottom: 3 }}>Sequence</div>
                  <p style={{ fontSize: 11.5, color: '#5c6370', lineHeight: 1.55, margin: 0 }}>API call chains, request lifecycles, auth checks — who calls whom, in what order, and what returns.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 12 }}>

            {/* Data Flow */}
            <div className="bento-card">
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(17,20,25,.07)' }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, background: 'rgba(17,20,25,.07)', padding: '2px 6px', borderRadius: 4, color: '#5c6370', letterSpacing: '.1em' }}>T · 04</span>
              </div>
              <div className="bento-mini-canvas" style={{ height: 140, padding: 12, position: 'relative', overflow: 'hidden' }}>
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  {[{ id: 'df-teal', fill: '#0d9488' }, { id: 'df-rose', fill: '#e11d48' }, { id: 'df-amber', fill: '#d97706' }, { id: 'df-violet', fill: '#7c3aed' }].map(({ id, fill }) => (
                    <marker key={id} id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 2 L 9 5 L 0 8 z" fill={fill} /></marker>
                  ))}
                  <line x1="80" y1="38" x2="128" y2="38" stroke="#0d9488" strokeWidth="1.5" markerEnd="url(#df-teal)" />
                  <line x1="214" y1="38" x2="244" y2="64" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 2" markerEnd="url(#df-amber)" />
                  <line x1="214" y1="38" x2="244" y2="100" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="3 2" markerEnd="url(#df-violet)" />
                </svg>
                {[
                  { label: 'GitHub\nWebhook', top: 20, left: 8, bdr: '#a7f3d0', bg: '#ecfdf5', c: '#065f46', w: 72 },
                  { label: 'AST\nParser', top: 20, left: 126, bdr: '#bae6fd', bg: '#f0f9ff', c: '#0369a1', w: 88 },
                  { label: 'KG\nWriter', top: 56, left: 242, bdr: '#fde68a', bg: '#fffbeb', c: '#92400e', w: 72 },
                  { label: 'Vector\nIndex', top: 93, left: 242, bdr: '#fecdd3', bg: '#fff1f2', c: '#9f1239', w: 72 },
                ].map(n => (
                  <div key={n.label} style={{ position: 'absolute', top: n.top, left: n.left, width: n.w, borderRadius: 7, border: `1.5px solid ${n.bdr}`, background: n.bg, padding: '5px 7px' }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, fontWeight: 700, color: n.c, whiteSpace: 'pre-line', lineHeight: 1.2 }}>{n.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111419', marginBottom: 3 }}>Data Flow</div>
                <p style={{ fontSize: 11.5, color: '#5c6370', lineHeight: 1.55, margin: 0 }}>Data pipelines, ETL workflows, analytics events, AST ingestion lineage, and knowledge graph writes.</p>
              </div>
            </div>

            {/* Lifecycle */}
            <div className="bento-card">
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(17,20,25,.07)' }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, background: 'rgba(17,20,25,.07)', padding: '2px 6px', borderRadius: 4, color: '#5c6370', letterSpacing: '.1em' }}>T · 05</span>
              </div>
              <div className="bento-mini-canvas" style={{ height: 140, padding: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 8, overflowX: 'hidden' }}>
                  {[
                    { label: 'IDLE', bg: '#f1f5f9', bdr: '#cbd5e1', c: '#475569' },
                    { label: 'INDEXING', bg: '#fffbeb', bdr: '#fde68a', c: '#92400e' },
                    { label: 'INDEXED', bg: '#f0fdf4', bdr: '#86efac', c: '#166534' },
                    { label: 'ANALYZING', bg: '#f0f9ff', bdr: '#bae6fd', c: '#0369a1' },
                    { label: 'READY', bg: '#fdf4ff', bdr: '#e9d5ff', c: '#7e22ce' },
                    { label: 'FAILED', bg: '#fff1f2', bdr: '#fecdd3', c: '#9f1239' },
                  ].map((s, i, arr) => (
                    <React.Fragment key={s.label}>
                      <div style={{ borderRadius: 5, border: `1.5px solid ${s.bdr}`, background: s.bg, padding: '4px 6px', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6, fontWeight: 700, color: s.c }}>{s.label}</div>
                      </div>
                      {i < arr.length - 1 && <div style={{ width: 8, height: 1, background: '#cbd5e1', flexShrink: 0 }} />}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { from: 'IDLE', to: 'INDEXING', label: 'trigger_index()', bdr: '#fde68a', c: '#b45309' },
                    { from: 'INDEXING', to: 'INDEXED', label: 'ast_complete()', bdr: '#86efac', c: '#15803d' },
                    { from: 'INDEXED', to: 'ANALYZING', label: 'run_analysis()', bdr: '#bae6fd', c: '#0369a1' },
                    { from: 'ANALYZING', to: 'READY', label: 'emit_views()', bdr: '#e9d5ff', c: '#7e22ce' },
                  ].map(t => (
                    <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${t.bdr}`, borderRadius: 6, background: '#fff', padding: '4px 8px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6.5, color: '#9ca3af' }}>{t.from}</span>
                      <ArrowRight style={{ width: 9, height: 9, color: t.c, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6.5, color: '#9ca3af' }}>{t.to}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, color: t.c, fontWeight: 600, marginLeft: 'auto' }}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111419', marginBottom: 3 }}>Lifecycle</div>
                <p style={{ fontSize: 11.5, color: '#5c6370', lineHeight: 1.55, margin: 0 }}>State machines, object lifecycles, deployment status transitions with wait states and retries.</p>
              </div>
            </div>

            {/* Dark CTA */}
            <div style={{ borderRadius: 14, background: '#111419', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 20px', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)', backgroundSize: '20px 20px', borderRadius: 14 }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.16em', color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginBottom: 14 }}>INDEX</div>
                <h3 style={{ fontFamily: 'Georgia,"Times New Roman",serif', fontStyle: 'italic', fontWeight: 400, fontSize: 22, color: '#fff', lineHeight: 1.25, margin: '0 0 8px' }}>
                  Browse the full<br />proof gallery
                </h3>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.4)', margin: 0, lineHeight: 1.6 }}>Live artifacts · every view · every repo</p>
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <Link to="/dashboard" style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <ArrowRight style={{ width: 13, height: 13, color: '#e14a0e' }} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ SECTION 3 — FEATURES ══════════ */}
        <div style={{ marginTop: 48 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.18em', color: '#9ca3af', textTransform: 'uppercase' }}>02 · FEATURES</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(17,20,25,.1)' }} />
          </div>

          <h2 style={{ fontFamily: 'Georgia,"Times New Roman",serif', fontStyle: 'italic', fontWeight: 400, fontSize: 42, letterSpacing: '-.02em', lineHeight: 1.1, color: '#111419', margin: '0 0 40px', maxWidth: 540 }}>
            Grounded intelligence,<br />zero hallucinations.
          </h2>

          {/* Feature cards — row 1: 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, border: '1px solid rgba(17,20,25,.12)', borderRadius: 14, overflow: 'hidden', marginBottom: 1 }}>
            {[
              {
                n: '01',
                title: 'AST-based knowledge graph',
                body: 'Tree-sitter parses every function, class, import, and call in your repo into a structured knowledge graph. No LLM inference — every edge is a verified source reference.',
                tags: 'TREE-SITTER · POSTGRES · NEO4J',
              },
              {
                n: '02',
                title: 'Blast radius analysis',
                body: 'Select any symbol and instantly see every caller, every downstream module, every test file that will break if you change it. Propagates across 5 hops before you merge.',
                tags: 'CHANGE-IMPACT · 5-HOP · PRE-MERGE',
              },
            ].map(({ n, title, body, tags }) => (
              <div key={n} style={{ background: '#fff', padding: '28px 28px 22px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 22, right: 24, fontFamily: 'Georgia,"Times New Roman",serif', fontStyle: 'italic', fontWeight: 400, fontSize: 32, color: 'rgba(17,20,25,.06)' }}>{n}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111419', lineHeight: 1.3, paddingRight: 40 }}>{title}</div>
                <p style={{ fontSize: 12.5, color: '#5c6370', lineHeight: 1.72, margin: 0 }}>{body}</p>
                <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: '.14em', color: '#6b7280', border: '1px solid rgba(17,20,25,.14)', borderRadius: 20, padding: '4px 10px' }}>{tags}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Feature cards — row 2: 3-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, border: '1px solid rgba(17,20,25,.12)', borderRadius: 14, overflow: 'hidden', marginBottom: 1 }}>
            {[
              {
                n: '03',
                title: 'Five unified views',
                body: 'Architecture, Workflow, Sequence, Data Flow, and Lifecycle — all generated from the same AST parse. Switch views without re-indexing.',
                tags: 'ARCH · WORKFLOW · SEQ · DF · LC',
              },
              {
                n: '04',
                title: 'Pathfinder traversal',
                body: 'Trace the exact call path between any two symbols. Finds the shortest route through imports, function calls, and module boundaries.',
                tags: 'BFS · CALL-GRAPH · MULTI-HOP',
              },
              {
                n: '05',
                title: 'AI copilot, grounded',
                body: 'Ask anything about the codebase. Every answer cites the exact file and line number from the AST — never extrapolated, always verifiable.',
                tags: 'GEMINI · OPENAI · SOURCE-CITED',
              },
            ].map(({ n, title, body, tags }) => (
              <div key={n} style={{ background: '#fff', padding: '24px 22px 20px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', borderLeft: '1px solid rgba(17,20,25,.08)' }}>
                <div style={{ position: 'absolute', top: 18, right: 18, fontFamily: 'Georgia,"Times New Roman",serif', fontStyle: 'italic', fontWeight: 400, fontSize: 28, color: 'rgba(17,20,25,.06)' }}>{n}</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#111419', lineHeight: 1.3, paddingRight: 36 }}>{title}</div>
                <p style={{ fontSize: 12, color: '#5c6370', lineHeight: 1.72, margin: 0 }}>{body}</p>
                <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, fontWeight: 700, letterSpacing: '.12em', color: '#6b7280', border: '1px solid rgba(17,20,25,.14)', borderRadius: 20, padding: '3px 9px' }}>{tags}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Feature cards — row 3: 3-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, border: '1px solid rgba(17,20,25,.12)', borderRadius: 14, overflow: 'hidden', marginBottom: 28 }}>
            {[
              {
                n: '06',
                title: 'Auto-refresh on push',
                body: 'Connect once via GitHub OAuth. Every git push or PR triggers a re-index automatically — your diagrams are always in sync with the latest commit.',
                tags: 'WEBHOOK · PR · ZERO-DRIFT',
              },
              {
                n: '07',
                title: 'Repository workspace',
                body: 'Add unlimited repos from any GitHub account. Each repo gets its own isolated knowledge graph, index status dashboard, and per-repo AI context.',
                tags: 'MULTI-REPO · ISOLATED · DASHBOARD',
              },
              {
                n: '08',
                title: 'Code viewer with AST links',
                body: 'Click any node in any view and jump directly to the source file and line. The built-in code viewer shows the full file with syntax highlighting.',
                tags: 'SOURCE-JUMP · HIGHLIGHT · INLINE',
              },
            ].map(({ n, title, body, tags }) => (
              <div key={n} style={{ background: '#fff', padding: '24px 22px 20px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', borderLeft: '1px solid rgba(17,20,25,.08)' }}>
                <div style={{ position: 'absolute', top: 18, right: 18, fontFamily: 'Georgia,"Times New Roman",serif', fontStyle: 'italic', fontWeight: 400, fontSize: 28, color: 'rgba(17,20,25,.06)' }}>{n}</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#111419', lineHeight: 1.3, paddingRight: 36 }}>{title}</div>
                <p style={{ fontSize: 12, color: '#5c6370', lineHeight: 1.72, margin: 0 }}>{body}</p>
                <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, fontWeight: 700, letterSpacing: '.12em', color: '#6b7280', border: '1px solid rgba(17,20,25,.14)', borderRadius: 20, padding: '3px 9px' }}>{tags}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Export formats strip */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.18em', color: '#9ca3af', textTransform: 'uppercase' }}>EXPORT FORMATS</span>
              <span style={{ flex: 1, height: 1, background: 'rgba(17,20,25,.1)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', border: '1px solid rgba(17,20,25,.12)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
              {[
                { name: 'PNG',              sub: 'Canvas · 2× native' },
                { name: 'SVG',              sub: 'Vector · embed in docs' },
                { name: 'JSON Graph',       sub: 'Raw graph · with evidence' },
                { name: 'Self-contained HTML', sub: 'Interactive · zero deps' },
                { name: 'View JSON',        sub: 'Workflow · Seq · DF · LC' },
              ].map(({ name, sub }, i) => (
                <div key={name} style={{ padding: '14px 16px', borderLeft: i === 0 ? 'none' : '1px solid rgba(17,20,25,.1)' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: '#111419', marginBottom: 3 }}>{name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#9ca3af' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ══════════ SECTION 4 — DESIGN SYSTEM ══════════ */}
        <div style={{ marginTop: 48 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.18em', color: '#9ca3af', textTransform: 'uppercase' }}>03 · DESIGN SYSTEM</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(17,20,25,.1)' }} />
          </div>

          <h2 style={{ fontFamily: 'Georgia,"Times New Roman",serif', fontStyle: 'italic', fontWeight: 400, fontSize: 42, letterSpacing: '-.02em', lineHeight: 1.1, color: '#111419', margin: '0 0 10px' }}>
            A semantic color language<br />for infrastructure.
          </h2>
          <p style={{ fontSize: 13.5, color: '#5c6370', lineHeight: 1.7, maxWidth: 480, margin: '0 0 36px' }}>
            Seven node types. Each with a coordinated color that stays
            consistent across all five views — architecture, workflow, sequence,
            data flow, and lifecycle.
          </p>

          {/* Color swatches grid */}
          <div style={{ border: '1px solid rgba(17,20,25,.12)', borderRadius: 14, background: '#f8f9fa', padding: 20, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
              {[
                {
                  role: 'FRONTEND',
                  example: 'React SPA',
                  sub: 'Fastify :8080',
                  bg: '#fffbeb', bdr: '#fde68a', lbl: '#b45309', txt: '#78350f',
                  desc: 'Client apps, browsers,\nmobile, UI',
                  roleColor: '#d97706',
                },
                {
                  role: 'BACKEND',
                  example: 'API Server',
                  sub: 'FastAPI :8000',
                  bg: '#f0fdf4', bdr: '#86efac', lbl: '#15803d', txt: '#14532d',
                  desc: 'Services, APIs, workers,\ndaemons',
                  roleColor: '#16a34a',
                },
                {
                  role: 'DATABASE',
                  example: 'Postgres',
                  sub: 'primary :5432',
                  bg: '#f5f3ff', bdr: '#ddd6fe', lbl: '#6d28d9', txt: '#4c1d95',
                  desc: 'DBs, caches, stores,\nvector search',
                  roleColor: '#7c3aed',
                },
                {
                  role: 'CLOUD',
                  example: 'CloudFront',
                  sub: 'CDN',
                  bg: '#fff7ed', bdr: '#fed7aa', lbl: '#c2410c', txt: '#7c2d12',
                  desc: 'Managed services, infra,\nobject stores',
                  roleColor: '#ea580c',
                },
                {
                  role: 'SECURITY',
                  example: 'Auth Provider',
                  sub: 'OAuth 2.0',
                  bg: '#fff1f2', bdr: '#fecdd3', lbl: '#be123c', txt: '#881337',
                  desc: 'Auth, secrets, guards,\nOAuth tokens',
                  roleColor: '#e11d48',
                },
                {
                  role: 'MESSAGE BUS',
                  example: 'RabbitMQ',
                  sub: 'events · AMQP',
                  bg: '#f0f9ff', bdr: '#bae6fd', lbl: '#0369a1', txt: '#0c4a6e',
                  desc: 'Kafka, RabbitMQ, SQS,\nSNS, NATS',
                  roleColor: '#0ea5e9',
                },
                {
                  role: 'EXTERNAL',
                  example: 'GitHub API',
                  sub: 'browser · mobile',
                  bg: '#f8fafc', bdr: '#e2e8f0', lbl: '#475569', txt: '#1e293b',
                  desc: 'Users, 3rd parties,\ngeneric',
                  roleColor: '#64748b',
                },
              ].map(({ role, example, sub, bg, bdr, lbl, txt, desc, roleColor }) => (
                <div key={role} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Light mode node card */}
                  <div style={{ borderRadius: 9, border: `1.5px solid ${bdr}`, background: bg, padding: '9px 11px' }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, fontWeight: 700, color: lbl, textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 3 }}>{role.split(' ')[0]}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 700, color: txt, lineHeight: 1.2 }}>{example}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, color: lbl, marginTop: 2, opacity: .8 }}>{sub}</div>
                  </div>
                  {/* Label + desc */}
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, fontWeight: 700, color: roleColor, letterSpacing: '.12em', textTransform: 'uppercase' as const, marginBottom: 4 }}>{role}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#6b7280', lineHeight: 1.6, whiteSpace: 'pre-line' as const }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

