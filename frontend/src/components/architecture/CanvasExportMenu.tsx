/**
 * CanvasExportMenu — Export functionality for the Architecture Canvas.
 *
 * Supports:
 * - PNG (canvas screenshot via html-to-image)
 * - SVG (ReactFlow to SVG)
 * - JSON (raw Knowledge Graph data with evidence metadata)
 * - Self-contained HTML (interactive viewer with embedded graph data)
 *
 * The exported graph preserves all source evidence metadata.
 */
import React, { useState, useRef } from 'react';
import {
  Download,
  Image,
  FileJson,
  FileCode2,
  Globe,
  Loader2,
  Check,
  ChevronDown,
} from 'lucide-react';
import type { KnowledgeGraphData } from '../../types';

interface CanvasExportMenuProps {
  kgData: KnowledgeGraphData | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  repoName?: string;
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadText = (text: string, filename: string, mimeType = 'text/plain') => {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(blob, filename);
};

export const CanvasExportMenu: React.FC<CanvasExportMenuProps> = ({
  kgData,
  canvasRef,
  repoName = 'codelens',
}) => {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const slug = repoName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const markDone = (key: string) => {
    setDone(key);
    setExporting(null);
    setTimeout(() => setDone(null), 2000);
  };

  const exportJSON = async () => {
    if (!kgData) return;
    setExporting('json');
    try {
      const payload = {
        generated_at: new Date().toISOString(),
        generator: 'codelens-v1',
        repository: repoName,
        total_nodes: kgData.nodes.length,
        total_edges: kgData.edges.length,
        nodes: kgData.nodes,
        edges: kgData.edges,
        metadata: kgData.metadata || {},
      };
      downloadText(
        JSON.stringify(payload, null, 2),
        `codelens-graph-${slug}.json`,
        'application/json'
      );
      markDone('json');
    } catch (e) {
      console.error('JSON export failed', e);
      setExporting(null);
    }
  };

  const exportPNG = async () => {
    if (!canvasRef.current) return;
    setExporting('png');
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: '#000000',
        pixelRatio: 2,
        filter: (node) => {
          // Exclude toolbar and controls from screenshot
          if (node instanceof HTMLElement) {
            if (node.classList.contains('react-flow__controls')) return false;
            if (node.classList.contains('react-flow__minimap')) return false;
          }
          return true;
        },
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadBlob(blob, `codelens-arch-${slug}.png`);
      markDone('png');
    } catch (e) {
      console.error('PNG export failed', e);
      setExporting(null);
    }
  };

  const exportSVG = async () => {
    if (!canvasRef.current) return;
    setExporting('svg');
    try {
      const { toSvg } = await import('html-to-image');
      const dataUrl = await toSvg(canvasRef.current, {
        backgroundColor: '#000000',
        filter: (node) => {
          if (node instanceof HTMLElement) {
            if (node.classList.contains('react-flow__controls')) return false;
            if (node.classList.contains('react-flow__minimap')) return false;
          }
          return true;
        },
      });
      // Convert data URL to text
      const svgText = decodeURIComponent(dataUrl.split(',')[1]);
      downloadText(svgText, `codelens-arch-${slug}.svg`, 'image/svg+xml');
      markDone('svg');
    } catch (e) {
      console.error('SVG export failed', e);
      setExporting(null);
    }
  };

  const exportHTML = async () => {
    if (!kgData) return;
    setExporting('html');
    try {
      const ARCH_TIER_COLORS: Record<string, string> = {
        presentation: '#f59e0b',
        api_gateway: '#38bdf8',
        application: '#10b981',
        domain: '#818cf8',
        infrastructure: '#c084fc',
        external: '#f43f5e',
      };

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CodeLens — ${repoName} Architecture</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; color: #f4f4f5; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; }
  header { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #27272a; background: #09090b; }
  header h1 { font-size: 14px; font-weight: 700; color: #fff; }
  header span { font-size: 11px; color: #71717a; }
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; border: 1px solid; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  main { padding: 20px; }
  .stats { display: flex; gap: 16px; margin-bottom: 20px; }
  .stat { background: #09090b; border: 1px solid #1f1f23; border-radius: 12px; padding: 12px 16px; }
  .stat-num { font-size: 20px; font-weight: 700; color: #fff; }
  .stat-label { font-size: 10px; color: #71717a; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
  .section-title { font-size: 10px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; margin-bottom: 24px; }
  .node-card { background: #09090b; border: 1px solid #1f1f23; border-radius: 12px; padding: 12px; transition: border-color .15s; cursor: default; }
  .node-card:hover { border-color: #3f3f46; }
  .node-name { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .node-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .node-file { font-size: 10px; color: #52525b; margin-top: 6px; border-top: 1px solid #1f1f23; padding-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .edge-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #09090b; border: 1px solid #1f1f23; border-radius: 8px; margin-bottom: 6px; }
  .edge-source { color: #38bdf8; font-weight: 700; }
  .edge-target { color: #34d399; font-weight: 700; }
  .edge-rel { color: #a78bfa; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; background: #1e1b4b; border-radius: 4px; }
  .arrow { color: #52525b; }
  .conf-high { color: #10b981; }
  .conf-med { color: #f59e0b; }
  .conf-low { color: #71717a; }
  .evidence-section { background: #060608; border: 1px solid #1a1a1f; border-radius: 8px; padding: 8px 10px; margin-top: 6px; }
  .evidence-item { font-size: 9px; color: #52525b; border-left: 2px solid #27272a; padding-left: 6px; margin-top: 4px; }
  .evidence-item a { color: #38bdf8; text-decoration: none; }
  footer { padding: 16px 20px; border-top: 1px solid #1f1f23; color: #52525b; font-size: 10px; }
  .search-bar { display: flex; gap: 8px; margin-bottom: 16px; }
  .search-bar input { flex: 1; background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 6px 12px; color: #fff; font-family: inherit; font-size: 12px; outline: none; }
  .search-bar input:focus { border-color: #f59e0b; }
</style>
</head>
<body>
<header>
  <h1>⬡ CodeLens Architecture</h1>
  <span>${repoName}</span>
  <span style="color:#27272a">•</span>
  <span>Generated ${new Date().toLocaleDateString()}</span>
  <span class="badge" style="color:#10b981;border-color:#10b981;background:rgba(16,185,129,0.1);margin-left:auto">
    ${kgData.nodes.length} nodes · ${kgData.edges.length} edges
  </span>
</header>
<main>
  <div class="stats">
    ${Object.entries(ARCH_TIER_COLORS).map(([tier, color]) => {
      const count = kgData.nodes.filter(n => {
        if (tier === 'external') return n.type === 'external_service';
        if (tier === 'infrastructure') return ['database','queue','storage'].includes(n.type);
        if (tier === 'domain') return n.type === 'database_model';
        if (tier === 'application') return ['service','worker'].includes(n.type);
        if (tier === 'api_gateway') return ['api_endpoint','application'].includes(n.type);
        if (tier === 'presentation') return n.type === 'component';
        return false;
      }).length;
      if (!count) return '';
      return `<div class="stat"><div class="stat-num" style="color:${color}">${count}</div><div class="stat-label">${tier.replace('_',' ')}</div></div>`;
    }).join('')}
  </div>

  <div class="search-bar">
    <input type="text" id="search" placeholder="Search nodes..." oninput="filterNodes(this.value)" />
  </div>

  <p class="section-title">Architecture Nodes</p>
  <div class="grid" id="nodes-grid">
    ${kgData.nodes.map(n => {
      const tier = n.type === 'external_service' ? 'external' :
        ['database','queue','storage'].includes(n.type) ? 'infrastructure' :
        n.type === 'database_model' ? 'domain' :
        ['service','worker'].includes(n.type) ? 'application' :
        ['api_endpoint','application'].includes(n.type) ? 'api_gateway' :
        n.type === 'component' ? 'presentation' : 'application';
      const color = ARCH_TIER_COLORS[tier] || '#71717a';
      const conf = n.confidence_level === 'deterministic' ? 'conf-high' : n.confidence_level === 'high' ? 'conf-high' : n.confidence_level === 'medium' ? 'conf-med' : 'conf-low';
      const hasEvidence = n.evidence && n.evidence.length > 0;
      return `<div class="node-card" data-name="${(n.name||'').toLowerCase()} ${(n.type||'').toLowerCase()} ${(n.source_files||[]).join(' ').toLowerCase()}">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
    <span class="badge" style="color:${color};border-color:${color}40;background:${color}18">${tier.replace('_',' ')}</span>
    <span class="badge ${conf}" style="border-color:currentColor30;background:${n.confidence_level==='deterministic'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)'}">${Math.round((n.confidence||0.85)*100)}%${n.confidence_level==='deterministic'?' ✓':''}</span>
  </div>
  <div class="node-name">${n.name || n.display_name}</div>
  <div class="node-meta">
    <span class="badge" style="color:#71717a;border-color:#27272a;background:#09090b">${n.type.replace(/_/g,' ')}</span>
    ${n.symbols && n.symbols.length > 0 ? `<span style="color:#52525b;font-size:10px">${n.symbols.length} symbols</span>` : ''}
    ${hasEvidence ? `<span style="color:#10b981;font-size:10px">✓ evidence</span>` : `<span style="color:#f59e0b;font-size:10px">⚠ inferred</span>`}
  </div>
  ${n.source_files && n.source_files.length > 0 ? `<div class="node-file" title="${n.source_files.join(', ')}">${n.source_files[0]}</div>` : ''}
</div>`;
    }).join('\n')}
  </div>

  <p class="section-title">Relationships (${kgData.edges.length})</p>
  ${kgData.edges.map(e => {
    const src = kgData.nodes.find(n => n.id === e.source);
    const tgt = kgData.nodes.find(n => n.id === e.target);
    const conf = e.confidence_level === 'deterministic' ? 'conf-high' : e.confidence_level === 'high' ? 'conf-high' : e.confidence_level === 'medium' ? 'conf-med' : 'conf-low';
    const evidenceList = e.evidence || [];
    return `<div class="edge-row">
  <span class="edge-source">${src?.name || e.source}</span>
  <span class="arrow">→</span>
  <span class="edge-rel">${e.relationship_type}</span>
  <span class="arrow">→</span>
  <span class="edge-target">${tgt?.name || e.target}</span>
  <span class="badge ${conf}" style="border-color:currentColor30;background:transparent;margin-left:auto">${Math.round((e.confidence||0.8)*100)}%</span>
  ${evidenceList.length > 0 ? evidenceList.map(ev => `<span style="font-size:9px;color:#52525b">${ev.file_path || ''}${ev.start_line ? ':'+ev.start_line : ''}</span>`).join('') : '<span style="font-size:9px;color:#f59e0b">inferred</span>'}
</div>`;
  }).join('\n')}
</main>
<footer>
  Generated by CodeLens on ${new Date().toISOString()} · This file is self-contained and includes all source evidence metadata.
</footer>
<script>
  function filterNodes(q) {
    const lq = q.toLowerCase();
    document.querySelectorAll('#nodes-grid .node-card').forEach(el => {
      const text = el.getAttribute('data-name') || '';
      el.style.display = text.includes(lq) ? '' : 'none';
    });
  }
</script>
</body>
</html>`;

      downloadText(html, `codelens-arch-${slug}.html`, 'text/html');
      markDone('html');
    } catch (e) {
      console.error('HTML export failed', e);
      setExporting(null);
    }
  };

  const items = [
    {
      key: 'png',
      label: 'PNG Image',
      desc: 'Canvas screenshot at 2× resolution',
      icon: Image,
      action: exportPNG,
    },
    {
      key: 'svg',
      label: 'SVG Vector',
      desc: 'Scalable vector (embed in docs)',
      icon: FileCode2,
      action: exportSVG,
    },
    {
      key: 'json',
      label: 'JSON Graph',
      desc: 'Raw graph data with source evidence',
      icon: FileJson,
      action: exportJSON,
    },
    {
      key: 'html',
      label: 'Self-contained HTML',
      desc: 'Interactive viewer with embedded data',
      icon: Globe,
      action: exportHTML,
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-600 transition cursor-pointer text-xs font-mono"
        title="Export"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-[#0c0c0e] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-[#1f1f23]">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Export Architecture
            </p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              const isLoading = exporting === item.key;
              const isDone = done === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => { item.action(); setOpen(false); }}
                  disabled={!!exporting}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition cursor-pointer text-left disabled:opacity-50 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                    ) : isDone ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Icon className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-200 font-mono group-hover:text-white transition">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 border-t border-[#1f1f23]">
            <p className="text-[9px] text-zinc-600 font-mono">
              All exports include source evidence metadata
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
