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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfileSettingsPage: React.FC = () => {
  const { user, updateGeminiKey, refreshUser } = useAuth();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Account & Security Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your GitHub identity and configure your BYOK (Bring Your Own Key) Gemini API credentials.
        </p>
      </div>

      {/* Grid: Profile Card & API Key Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: GitHub Profile Info */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-16 h-16 rounded-2xl border-2 border-purple-500/40 object-cover shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl gradient-purple-blue flex items-center justify-center text-white text-xl font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-white">{user.username}</h3>
                <p className="text-xs text-slate-400">{user.email || 'GitHub OAuth User'}</p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3" /> GitHub Connected
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs border-t border-white/[0.08] pt-4">
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
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.08] text-[11px] text-slate-500 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>Zero-retention architecture active</span>
          </div>
        </div>

        {/* Right: BYOK Gemini Key Management (Screens 21-25) */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 lg:col-span-2 border border-white/[0.08] shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <KeyRound className="w-5 h-5" />
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
              className="hidden sm:inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
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
            <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1 rounded bg-purple-500/20 text-purple-400">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-white">Active Gemini Key Configured</div>
                  <div className="text-[11px] font-mono text-purple-300">{user.masked_gemini_key}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRevokeKey}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 transition disabled:opacity-50 cursor-pointer"
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
                  className="w-full bg-[#0d1017] border border-white/[0.1] focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 font-mono transition outline-none"
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
                Encrypted with AES-Fernet before saving. Handshake tested on submit.
              </span>

              <button
                type="submit"
                disabled={submitting || !apiKeyInput.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg glow-purple transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
    </div>
  );
};
