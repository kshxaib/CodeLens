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
  const { updateOpenAIKey } = useAuthStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setError('Please enter a valid OpenAI API key.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await updateOpenAIKey(cleanKey);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#19243B]/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-sm bg-[#FFFFFF] rounded-2xl p-6 border border-[#E2E0D9] shadow-xl relative flex flex-col">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute right-4 top-4 text-[#8C96A5] hover:text-[#19243B] p-1 rounded-md hover:bg-[#F0EEE9] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#19243B]">Add OpenAI API Key</h3>
          <p className="text-xs text-[#526078] mt-0.5">Required for repository indexing and AI Copilot</p>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="modalApiKey" className="block text-xs font-semibold text-[#19243B] mb-1.5">
              OpenAI API Key
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
                placeholder="sk-proj-... or sk-..."
                disabled={submitting}
                autoFocus
                className="w-full bg-[#FFFFFF] border border-[#E2E0D9] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-3 py-2 text-xs text-[#19243B] placeholder-[#8C96A5] font-mono transition outline-none shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C96A5] hover:text-[#19243B] transition cursor-pointer"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end text-[11px]">
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-800 hover:text-amber-900 font-medium transition"
            >
              Get API key from OpenAI Platform <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E0D9]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !apiKeyInput.trim()}
              className="inline-flex items-center justify-center gap-1.5 bg-[#111419] hover:bg-[#23272f] text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

export const AddOpenAIKeyModal = AddGeminiKeyModal;
