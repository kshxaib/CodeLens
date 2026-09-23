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
    <div className="rounded-2xl p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto my-12 bg-[#09090b] border border-[#1f1f23]">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${config.iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-white mb-1.5">{displayTitle}</h4>
      <p className="text-xs text-slate-400 mb-5 leading-relaxed">{displayMsg}</p>

      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-[#141416] hover:bg-[#1f1f23] border border-[#27272a] text-white text-xs font-medium px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
        )}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#0d1017] text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition cursor-pointer"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
