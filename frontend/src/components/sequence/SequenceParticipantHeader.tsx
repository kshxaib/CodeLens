import React from 'react';
import type { SequenceParticipant } from '../../types';
import { getParticipantConfig, cleanParticipantName } from './constants';

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
        const displayName = cleanParticipantName(p.name);

        return (
          <div
            key={p.id}
            style={{ width: `${columnWidth}px` }}
            className="flex-shrink-0 flex flex-col items-center relative"
          >
            <div
              style={
                isActive
                  ? {
                      borderColor: cfg.dot,
                      boxShadow: `0 0 0 3px ${cfg.dot}35, 0 8px 24px ${cfg.dot}20`,
                      transform: 'scale(1.04)',
                    }
                  : undefined
              }
              className={`pointer-events-auto z-20 w-[190px] p-3 rounded-2xl bg-white/95 backdrop-blur-xl border transition-all duration-300 shadow-md flex flex-col items-center text-center ${
                !isActive ? 'border-[#E2E0D9] hover:border-zinc-400' : ''
              }`}
            >
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold border mb-2 ${cfg.badgeBg}`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                <span>{cfg.label}</span>
              </div>

              <div className="flex items-center gap-2 mb-1 justify-center w-full">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cfg.dot}18`, color: cfg.dot }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-[#19243B] font-mono truncate" title={displayName}>
                  {displayName}
                </h3>
              </div>

              <p className="text-[10px] font-mono text-[#526078] truncate w-full" title={p.description || cfg.sub}>
                {p.description || cfg.sub}
              </p>
            </div>

            <div
              style={{
                height: `${diagramHeight}px`,
                borderColor: isActive ? cfg.dot : '#D5D2CA',
                opacity: isActive ? 1 : 0.8,
                borderWidth: isActive ? '1.5px' : '1px',
              }}
              className="absolute top-[88px] w-0 border-l border-dashed transition-all duration-200 z-0"
            />
          </div>
        );
      })}
    </div>
  );
};
