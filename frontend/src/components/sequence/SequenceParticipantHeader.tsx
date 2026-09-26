import React from 'react';
import type { SequenceParticipant } from '../../types';
import { getParticipantConfig } from './constants';

interface SequenceParticipantHeaderProps {
  participants: SequenceParticipant[];
  columnWidth: number;
  diagramHeight: number;
  activeParticipantIds?: Set<string>;
}

export const SequenceParticipantHeader: React.FC<SequenceParticipantHeaderProps> = ({
  participants,
  columnWidth,
  diagramHeight,
  activeParticipantIds,
}) => {
  return (
    <div className="relative flex select-none pointer-events-none">
      {participants.map((p) => {
        const cfg = getParticipantConfig(p.participant_type);
        const Icon = cfg.icon;
        const isActive = activeParticipantIds?.has(p.id);

        return (
          <div
            key={p.id}
            style={{ width: `${columnWidth}px` }}
            className="flex-shrink-0 flex flex-col items-center relative"
          >
            {/* Top Participant Card (Interactive pointer-events-auto) */}
            <div
              className={`pointer-events-auto z-20 w-[190px] p-3 rounded-2xl bg-[#0c0c0e]/95 backdrop-blur-xl border transition-all duration-300 shadow-xl flex flex-col items-center text-center ${
                isActive
                  ? 'border-sky-400 ring-2 ring-sky-400/40 shadow-[0_0_25px_rgba(56,189,248,0.25)] scale-105'
                  : 'border-[#1f1f23] hover:border-zinc-500'
              }`}
            >
              {/* Type Pill */}
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold border mb-2 ${cfg.badgeBg}`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                <span>{cfg.label}</span>
              </div>

              {/* Icon + Name */}
              <div className="flex items-center gap-2 mb-1 justify-center w-full">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cfg.dot}18`, color: cfg.dot }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-white font-mono truncate" title={p.name}>
                  {p.name}
                </h3>
              </div>

              {/* Subtitle Role */}
              <p className="text-[10px] font-mono text-zinc-500 truncate w-full" title={p.description || cfg.sub}>
                {p.description || cfg.sub}
              </p>
            </div>

            {/* Vertical Lifeline Line dropping down the diagram height */}
            <div
              style={{
                height: `${diagramHeight}px`,
                borderColor: isActive ? '#38bdf8' : '#27272a',
              }}
              className={`absolute top-[88px] w-0 border-l border-dashed transition-colors duration-200 z-0 ${
                isActive ? 'border-sky-400 opacity-80' : 'border-zinc-800 opacity-60'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
};
