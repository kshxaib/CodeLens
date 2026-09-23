import React, { useState } from 'react';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  Trash2,
  Loader2,
  Save,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import { LogoutConfirmModal } from '../components/common/LogoutConfirmModal';

export const ProfileSettingsPage: React.FC = () => {
  const { user, updateGeminiKey, refreshUser } = useAuthStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setFeedback({ type: 'error', message: 'Please enter a valid Gemini API key.' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);
      await updateGeminiKey(cleanKey);
      await refreshUser();
      setFeedback({
        type: 'success',
        message: 'Gemini API key successfully verified and securely stored.',
      });
      setApiKeyInput('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to verify Gemini API key. Please check the key and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!window.confirm('Are you sure you want to remove your Gemini API key? Code indexing and AI chat will be disabled until a new key is provided.')) {
      return;
    }
    try {
      setSubmitting(true);
      await updateGeminiKey('');
      setFeedback({ type: 'success', message: 'Gemini API key removed.' });
      await refreshUser();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove key.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <WorkspaceLayout>
      {/* Header */}
      <div>
        <div className="text-muted-foreground text-xs font-mono mb-1">
          Workspace / Profile & Settings
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Account & Security Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your GitHub identity and configure your BYOK (Bring Your Own Key) Gemini API credentials.
        </p>
      </div>

      {/* Grid: Profile Card & API Key Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: GitHub Profile Info */}
        <div className="rounded-xl p-6 bg-[#09090b] border border-[#1f1f23] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user?.username || 'User'}
                  className="w-16 h-16 rounded-2xl border border-[#27272a] object-cover shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#141416] flex items-center justify-center text-slate-200 text-xl font-bold border border-[#27272a] font-mono">
                  {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-white">{user?.username || 'Developer'}</h3>
                <p className="text-xs text-slate-400">{user?.email || 'GitHub OAuth User'}</p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-[#141416] border border-[#27272a] text-slate-300 text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> GitHub Connected
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs border-t border-[#1f1f23] pt-4">
              <div className="flex justify-between py-1">
                <span className="text-slate-400">GitHub ID</span>
                <span className="font-mono text-slate-200">{user.github_id}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Account Created</span>
                <span className="text-slate-200">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-[#1f1f23]">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#141416] hover:bg-rose-500/10 text-rose-400 border border-[#27272a] hover:border-rose-500/30 text-xs font-semibold transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of CodeLens</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1f1f23] text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Zero-retention client key architecture</span>
          </div>
        </div>

        {/* Right: BYOK Gemini Key Management */}
        <div className="rounded-xl p-6 sm:p-8 lg:col-span-2 bg-[#09090b] border border-[#1f1f23] shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#141416] border border-[#27272a] flex items-center justify-center text-slate-300">
                <KeyRound className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Google Gemini API Key (BYOK)</h2>
                <p className="text-xs text-slate-400">Used exclusively for embeddings and real-time AI Copilot answers</p>
              </div>
            </div>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
            >
              Get Free Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`mb-6 p-3.5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 border transition-all ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Current Key Status */}
          {user.has_gemini_key ? (
            <div className="mb-6 p-4 rounded-xl bg-[#121214] border border-[#1f1f23] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1 rounded bg-[#18181b] text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-white">Active Gemini Key Configured</div>
                  <div className="text-[11px] font-mono text-slate-400">{user.masked_gemini_key}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRevokeKey}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-[#141416] hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-[#27272a] hover:border-rose-500/30 transition disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Revoke Key
              </button>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>No Gemini API key is currently saved. Please enter a key below to enable indexing and chat.</span>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSaveKey} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-xs font-medium text-slate-300 mb-1.5">
                {user.has_gemini_key ? 'Update Gemini API Key' : 'Enter Google Gemini API Key'}
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  disabled={submitting}
                  className="w-full bg-[#121214] border border-[#1f1f23] focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 font-mono transition outline-none"
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

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-400">
                Encrypted with AES-Fernet before saving. Handshake verified on submit.
              </span>

              <button
                type="submit"
                disabled={submitting || !apiKeyInput.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#0d1017] text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
    </WorkspaceLayout>
  );
};
