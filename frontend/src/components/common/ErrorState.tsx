import React from 'react';
import { ShieldAlert, FileQuestion, WifiOff, AlertTriangle, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorStateProps {
  type?: 'permission' | '404' | 'network' | 'general';
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'general',
  title,
  message,
  onRetry,
}) => {
  const getConfig = () => {
    switch (type) {
      case 'permission':
        return {
          icon: ShieldAlert,
          iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          title: 'Permission Denied (403)',
          message: 'You do not have permission to view or index this repository.',
        };
      case '404':
        return {
          icon: FileQuestion,
          iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          title: 'Resource Not Found (404)',
          message: 'The requested repository, file, or chat thread does not exist.',
        };
      case 'network':
        return {
          icon: WifiOff,
          iconColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
          title: 'Network Connection Issue',
          message: 'Unable to connect to the CodeLens backend server. Please check your internet or retry.',
        };
      case 'general':
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          title: 'An Unexpected Error Occurred',
          message: message || 'Something went wrong while processing your request.',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displayMsg = message || config.message;

  return (
    <div className="glass-card rounded-2xl p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto my-12 border border-white/[0.08]">
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-5 ${config.iconColor}`}>
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-lg font-semibold text-white mb-2">{displayTitle}</h4>
      <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">{displayMsg}</p>

      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
        )}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg glow-purple transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
