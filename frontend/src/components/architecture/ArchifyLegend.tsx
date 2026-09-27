import React from 'react';
import { ARCHIFY_SEMANTICS, type ArchifySemanticKind } from './constants';
import type { ArchKGNode } from '../../types';

interface ArchifyLegendProps {
  nodes: ArchKGNode[];
  activeCategory: string; // 'all' or semantic kind
  onSelectCategory: (category: string) => void;
}

export const ArchifyLegend: React.FC<ArchifyLegendProps> = ({
  nodes,
  activeCategory,
  onSelectCategory,
}) => {
  // Count nodes per semantic kind
  const counts: Record<ArchifySemanticKind, number> = {
    backend: 0,
    database: 0,
    cloud: 0,
    security: 0,
    messagebus: 0,
    external: 0,
  };

  nodes.forEach((n) => {
    const t = (n.type || '').toLowerCase();
    const l = (n.layer || '').toLowerCase();
    const name = (n.name || '').toLowerCase();

    if (t.includes('auth') || t.includes('security') || name.includes('auth') || name.includes('jwt')) {
      counts.security++;
    } else if (t.includes('queue') || t.includes('message') || t.includes('event') || name.includes('queue') || name.includes('sqs')) {
      counts.messagebus++;
    } else if (t === 'database' || t === 'database_model' || t.includes('cache') || l === 'domain' || name.includes('redis') || name.includes('postgres') || name.includes('db')) {
      counts.database++;
    } else if (t === 'storage' || t === 'external_service' || name.includes('s3') || name.includes('cdn') || name.includes('cloudfront') || name.includes('load_balancer')) {
      counts.cloud++;
    } else if (t === 'component' || t === 'presentation' || l === 'presentation' || name.includes('user') || name.includes('client')) {
      counts.external++;
    } else {
      counts.backend++;
    }
  });

  const categories: ArchifySemanticKind[] = [
    'backend',
    'database',
    'cloud',
    'security',
    'messagebus',
    'external',
  ];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-[#E2E0D9] rounded-xl shadow-xs text-xs font-mono select-none">
      <span className="text-[11px] font-bold text-[#15181B] tracking-tight uppercase pr-1 border-r border-[#E2E0D9]">
        Legend
      </span>

      <button
        onClick={() => onSelectCategory('all')}
        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
          activeCategory === 'all'
            ? 'bg-[#15181B] text-white shadow-xs'
            : 'text-[#60686D] hover:text-[#15181B] hover:bg-[#F8F7F4]'
        }`}
      >
        All ({nodes.length})
      </button>

      {categories.map((cat) => {
        const count = counts[cat];
        if (count === 0) return null;
        const cfg = ARCHIFY_SEMANTICS[cat];
        const isActive = activeCategory === cat;

        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(isActive ? 'all' : cat)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
              isActive
                ? 'ring-2 ring-amber-500/80 shadow-xs'
                : 'hover:border-[#15181B]/40'
            }`}
            style={{
              backgroundColor: isActive ? cfg.fill : 'transparent',
              borderColor: cfg.stroke,
              color: cfg.textPrimary,
            }}
            title={`Filter by ${cfg.label} (${count} nodes)`}
          >
            <span
              className="w-2.5 h-1.5 rounded-[1.5px] border shrink-0"
              style={{
                backgroundColor: cfg.fill,
                borderColor: cfg.stroke,
              }}
            />
            <span>{cfg.label}</span>
            <span className="text-[9px] opacity-75 ml-0.5 font-bold">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
