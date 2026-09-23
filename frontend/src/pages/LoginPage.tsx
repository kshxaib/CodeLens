import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Code2, ShieldCheck, Zap, Layers } from 'lucide-react';
import { GithubIcon } from '../components/common/Icons';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { user, loginWithGitHub, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && !loading) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-600/15 via-indigo-600/10 to-cyan-500/10 blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="glass-card rounded-3xl p-8 sm:p-10 border border-white/[0.1] shadow-2xl glow-purple text-center">
          {/* Brand Icon */}
          <div className="w-16 h-16 rounded-2xl gradient-purple-blue flex items-center justify-center text-white shadow-xl glow-purple mx-auto mb-6">
            <Code2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            Welcome to CodeLens
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-8 leading-relaxed">
            Connect your GitHub account to start mapping repository architectures and chatting with AI.
          </p>

          {/* GitHub Connect Button */}
          <button
            onClick={loginWithGitHub}
            className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg glow-purple text-sm sm:text-base transition transform hover:-translate-y-0.5 cursor-pointer"
          >
            <GithubIcon className="w-5 h-5" />
            <span>Continue with GitHub</span>
          </button>

          {/* Trust & Security Badges */}
          <div className="mt-8 pt-6 border-t border-white/[0.08] grid grid-cols-1 gap-3 text-left">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="p-1 rounded bg-purple-500/10 text-purple-400">
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
              <span className="p-1 rounded bg-indigo-500/10 text-indigo-400">
                <Layers className="w-4 h-4" />
              </span>
              <span>Ephemeral shallow clone & instant vector indexing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
