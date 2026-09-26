import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  title?: string;
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = 'Loading...',
}) => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-12 h-12 rounded-2xl bg-[#141416] border border-[#27272a] flex items-center justify-center mb-4 shadow-xl">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
      <h3 className="text-sm font-bold text-white font-mono tracking-tight">
        {title}
      </h3>
    </div>
  );
};
