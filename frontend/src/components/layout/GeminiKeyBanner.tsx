import React from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const GeminiKeyBanner: React.FC = () => {
  const { user } = useAuth();

  if (!user || user.has_openai_key || user.has_gemini_key) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs sm:text-sm text-amber-200/90 flex items-center justify-between transition-all">
      <div className="flex items-center gap-2.5">
        <span className="p-1 rounded bg-amber-500/20 text-amber-400">
          <KeyRound className="w-3.5 h-3.5" />
        </span>
        <span>
          <strong className="text-amber-300 font-semibold">OpenAI API Key Required:</strong> Add your OpenAI API key to unlock code embeddings and AI Copilot.
        </span>
      </div>
      <Link
        to="/profile"
        className="inline-flex items-center gap-1 font-medium text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 rounded-md transition-colors"
      >
        Configure Key <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
};

export const OpenAIKeyBanner = GeminiKeyBanner;
