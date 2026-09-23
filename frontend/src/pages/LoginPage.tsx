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
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-[#000000]">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="rounded-3xl p-8 sm:p-10 border border-[#1f1f23] bg-[#09090b] shadow-2xl text-center">
          {/* Brand Icon */}
          <div className="w-14 h-14 rounded-2xl bg-[#141416] border border-[#27272a] flex items-center justify-center text-slate-200 mx-auto mb-6">
            <Code2 className="w-7 h-7" />
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
            <div className="w-full inline-flex items-center justify-center gap-3 bg-[#121214] text-amber-400 font-semibold py-3.5 px-6 rounded-xl border border-[#1f1f23] text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Authenticating with GitHub...</span>
            </div>
          ) : (
            <button
              onClick={() => loginWithGitHub()}
              className="w-full inline-flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-[#0d1017] font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-amber-500/10 text-sm sm:text-base transition cursor-pointer"
            >
              <GithubIcon className="w-5 h-5 text-[#0d1017]" />
              <span>Continue with GitHub</span>
            </button>
          )}

          {/* Trust & Security Badges */}
          <div className="mt-8 pt-6 border-t border-[#1f1f23] grid grid-cols-1 gap-3 text-left">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="p-1 rounded bg-[#141416] border border-[#27272a] text-slate-300">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span>Encrypted BYOK Key storage (AES-Fernet)</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="p-1 rounded bg-[#141416] border border-[#27272a] text-slate-300">
                <Zap className="w-4 h-4" />
              </span>
              <span>Works with free Google AI Studio keys</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="p-1 rounded bg-[#141416] border border-[#27272a] text-slate-300">
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
