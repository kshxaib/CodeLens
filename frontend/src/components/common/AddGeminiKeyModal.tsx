import React, { useState } from 'react';
import { X, ExternalLink, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
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
      <div className="w-full max-w-sm bg-black rounded-xl p-5 border border-[#27272a] relative flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-900 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">Add Gemini API Key</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Required for repository indexing and AI chat</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-[#141416] border border-red-500/30 flex items-start gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="modalApiKey" className="block text-xs font-medium text-zinc-300 mb-1">
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
                className="w-full bg-[#0c0c0e] border border-[#27272a] focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 font-mono transition outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end text-[11px]">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition"
            >
              Get free key from Google AI Studio <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f1f23]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !apiKeyInput.trim()}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-200 text-black text-xs font-medium px-3.5 py-1.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Save Key</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
