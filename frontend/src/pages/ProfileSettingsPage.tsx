import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ExternalLink, Shield, Trash2, Loader2, Save, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import { LogoutConfirmModal } from '../components/common/LogoutConfirmModal';
import { RevokeKeyConfirmModal } from '../components/common/RevokeKeyConfirmModal';

export const ProfileSettingsPage: React.FC = () => {
  const { user, updateOpenAIKey, removeOpenAIKey, updateGeminiKey, removeGeminiKey, refreshUser } = useAuthStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const hasKey = user ? Boolean(user.has_openai_key ?? user.has_gemini_key) : false;
  const maskedKey = user?.masked_openai_key || user?.masked_gemini_key || null;

  const extractErrorMessage = (err: any, fallback: string): string => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail[0]?.msg || fallback;
    }
    const msg = err?.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (typeof err?.message === 'string') return err.message;
    return fallback;
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setFeedback({ type: 'error', message: 'Please enter a valid OpenAI API key.' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);
      const updateFn = updateOpenAIKey || updateGeminiKey;
      await updateFn(cleanKey);
      await refreshUser();
      sessionStorage.setItem('openai_key_just_verified', 'true');
      setFeedback({
        type: 'success',
        message: 'OpenAI API key successfully verified and securely stored.',
      });
      setApiKeyInput('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: extractErrorMessage(err, 'Failed to verify OpenAI API key. Please check the key and try again.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeKey = async () => {
    try {
      setSubmitting(true);
      setFeedback(null);
      const removeFn = removeOpenAIKey || removeGeminiKey;
      await removeFn();
      await refreshUser();
      setFeedback({ type: 'success', message: 'OpenAI API key removed.' });
      setIsRevokeModalOpen(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: extractErrorMessage(err, 'Failed to remove key.'),
      });
      setIsRevokeModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <WorkspaceLayout>
      <div>
        <div className="text-muted-foreground text-xs font-mono mb-1">
          Profile & Settings
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#19243B] tracking-tight">Account & Security Settings</h1>
        <p className="text-xs sm:text-sm text-[#526078] mt-1">
          Manage your GitHub identity and configure your BYOK (Bring Your Own Key) OpenAI API credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl p-6 bg-[#FFFFFF] border border-[#E2E0D9] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-4 mb-6">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user?.username || 'User'}
                  className="w-16 h-16 rounded-2xl border border-[#E2E0D9] object-cover shadow-2xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#F0EEE9] flex items-center justify-center text-[#19243B] text-xl font-bold border border-[#E2E0D9] font-mono">
                  {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-[#19243B]">{user?.username || 'Developer'}</h3>
                <p className="text-xs text-[#526078]">{user?.email || 'GitHub OAuth User'}</p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> GitHub Connected
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs border-t border-[#E2E0D9] pt-4">
              <div className="flex justify-between py-1">
                <span className="text-[#526078]">GitHub ID</span>
                <span className="font-mono text-[#19243B]">{user.github_id}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#526078]">Account Created</span>
                <span className="text-[#19243B]">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-[#E2E0D9]">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF9F5] hover:bg-rose-50 text-rose-700 border border-[#E2E0D9] hover:border-rose-200 text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of CodeLens</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E2E0D9] text-[11px] text-[#687184] flex items-center gap-1.5 font-mono">
            <Shield className="w-3.5 h-3.5 text-amber-700" />
            <span>Zero-retention client key architecture</span>
          </div>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 lg:col-span-2 bg-[#FFFFFF] border border-[#E2E0D9] shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF9F5] border border-[#E2E0D9] flex items-center justify-center text-amber-700">
                <KeyRound className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#19243B]">OpenAI API Key (BYOK)</h2>
                <p className="text-xs text-[#526078]">Used exclusively for embeddings and real-time AI Copilot answers</p>
              </div>
            </div>

            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900 font-semibold cursor-pointer"
            >
              Get OpenAI Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {feedback && (
            <div
              className={`mb-6 p-3.5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 border transition-all ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          {hasKey ? (
            <div className="mb-6 p-4 rounded-xl bg-[#FAF9F5] border border-[#E2E0D9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-[#19243B]">Active OpenAI Key Configured</div>
                  <div className="text-[11px] font-mono text-[#526078]">{maskedKey}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRevokeModalOpen(true)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-800 bg-[#FFFFFF] hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-[#E2E0D9] hover:border-rose-300 transition disabled:opacity-50 cursor-pointer shadow-2xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Revoke Key
              </button>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-[#FEF7EC] border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="font-medium">No OpenAI API key is currently saved. Please enter a key below to enable indexing and chat.</span>
            </div>
          )}

          <form onSubmit={handleSaveKey} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-xs font-semibold text-[#19243B] mb-1.5">
                {hasKey ? 'Update OpenAI API Key' : 'Enter OpenAI API Key'}
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-proj-... or sk-..."
                  disabled={submitting}
                  className="w-full bg-[#FFFFFF] border border-[#E2E0D9] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-4 py-2.5 text-sm text-[#19243B] placeholder-[#8C96A5] font-mono transition outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C96A5] hover:text-[#19243B] transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-[#687184]">
                Encrypted with AES-Fernet before saving. Handshake verified on submit.
              </span>

              <button
                type="submit"
                disabled={submitting || !apiKeyInput.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Handshake...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Test & Save Key</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />

      <RevokeKeyConfirmModal
        isOpen={isRevokeModalOpen}
        onClose={() => setIsRevokeModalOpen(false)}
        onConfirm={handleRevokeKey}
        isLoading={submitting}
        maskedKey={maskedKey}
      />
    </WorkspaceLayout>
  );
};
