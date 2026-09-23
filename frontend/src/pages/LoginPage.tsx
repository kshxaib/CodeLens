import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Code2, ShieldCheck, Zap, Layers, Loader2, AlertCircle } from 'lucide-react';
import { GithubIcon } from '../components/common/Icons';
import { useAuthStore } from '../store/useAuthStore';

export const LoginPage: React.FC = () => {
  const { user, loginWithGitHub, handleCallback, loading: authLoading } = useAuthStore();
  const [callbackProcessing, setCallbackProcessing] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');

    if (code && !user) {
      setCallbackProcessing(true);
      setCallbackError(null);
      handleCallback(code)
        .then(() => {
          navigate('/dashboard', { replace: true });
        })
        .catch((err: any) => {
          console.error('OAuth callback error', err);
          setCallbackError(err.message || 'GitHub authentication failed. Please try again.');
        })
        .finally(() => {
          setCallbackProcessing(false);
        });
    } else if (user && !authLoading) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location, handleCallback]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#0d1017]">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="glass-card rounded-3xl p-8 sm:p-10 border border-[#22283a] bg-[#131722] shadow-2xl text-center">
          {/* Brand Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] mx-auto mb-6">
            <Code2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            Welcome to CodeLens
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-8 leading-relaxed">
            Connect your GitHub account to start mapping repository architectures and chatting with AI.
          </p>

          {/* Callback Error Alert */}
          {callbackError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{callbackError}</span>
            </div>
          )}

          {/* GitHub Connect Button / Loading State */}
          {callbackProcessing ? (
            <div className="w-full inline-flex items-center justify-center gap-3 bg-[#1c2130] text-amber-400 font-semibold py-3.5 px-6 rounded-xl border border-amber-500/30 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Authenticating with GitHub...</span>
            </div>
          ) : (
            <button
              onClick={() => loginWithGitHub()}
              className="w-full inline-flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-[#0d1017] font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-amber-500/20 text-sm sm:text-base transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <GithubIcon className="w-5 h-5 text-[#0d1017]" />
              <span>Continue with GitHub</span>
            </button>
          )}

          {/* Trust & Security Badges */}
          <div className="mt-8 pt-6 border-t border-[#22283a] grid grid-cols-1 gap-3 text-left">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="p-1 rounded bg-amber-500/10 text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span>Encrypted BYOK Key storage (AES-Fernet)</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="p-1 rounded bg-cyan-500/10 text-cyan-400">
                <Zap className="w-4 h-4" />
              </span>
              <span>Works with free Google AI Studio keys</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="p-1 rounded bg-purple-500/10 text-purple-400">
                <Layers className="w-4 h-4" />
              </span>
              <span>Ephemeral shallow clone &amp; instant vector indexing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
