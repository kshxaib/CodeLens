import React, { useState } from 'react';
import { KeyRound, X, ExternalLink, AlertCircle, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface AddGeminiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddGeminiKeyModal: React.FC<AddGeminiKeyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { updateGeminiKey } = useAuthStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setError('Please enter a valid Gemini API key.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await updateGeminiKey(cleanKey);
      setApiKeyInput('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to verify API key. Please check the key and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#09090b] rounded-2xl p-6 border border-[#27272a] shadow-2xl relative flex flex-col transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#18181b] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Add Gemini API Key</h3>
            <p className="text-xs text-slate-400">Enable repository indexing & AI chat</p>
          </div>
        </div>

        {/* Modal Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          CodeLens uses Google Gemini to generate 4-layer architecture maps, semantic code embeddings, and run grounded AI copilot chat.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="modalApiKey" className="block text-xs font-medium text-slate-300 mb-1.5">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                id="modalApiKey"
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="AIzaSy..."
                disabled={submitting}
                autoFocus
                className="w-full bg-[#121214] border border-[#27272a] focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 font-mono transition outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Free tier available</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 hover:underline"
            >
              Get free key from Google AI Studio <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f1f23]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !apiKeyInput.trim()}
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-lg shadow-amber-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
