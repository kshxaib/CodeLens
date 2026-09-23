import React from 'react';
import { Loader2, Code2, Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  title?: string;
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = 'Initializing CodeLens',
  message = 'Loading workspace state and codebase intelligence...',
}) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[#141416] border border-[#27272a] flex items-center justify-center text-slate-200 shadow-xl">
          <Code2 className="w-7 h-7 text-amber-400" />
        </div>
        <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-[#09090b] border border-[#1f1f23] text-amber-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
        {title}
        <Sparkles className="w-4 h-4 text-amber-400" />
      </h3>
      <p className="text-xs text-slate-400 max-w-sm">{message}</p>
    </div>
  );
};
