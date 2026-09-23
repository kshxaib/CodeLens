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
        <div className="w-16 h-16 rounded-2xl gradient-purple-blue flex items-center justify-center text-white shadow-2xl glow-purple animate-pulse">
          <Code2 className="w-8 h-8" />
        </div>
        <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-[#12161f] border border-purple-500/30 text-purple-400">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
        {title}
        <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
      </h3>
      <p className="text-sm text-slate-400 max-w-sm">{message}</p>
    </div>
  );
};
