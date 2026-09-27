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
      <div className="w-12 h-12 rounded-2xl bg-[#FEF7EC] border border-amber-200/80 flex items-center justify-center mb-4 shadow-xs">
        <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
      </div>
      <h3 className="text-sm font-bold text-[#19243B] font-mono tracking-tight">
        {title}
      </h3>
    </div>
  );
};
