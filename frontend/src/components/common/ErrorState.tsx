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
          iconColor: 'text-amber-700 bg-[#FEF7EC] border-amber-200',
          title: 'Permission Denied (403)',
          message: 'You do not have permission to view or index this repository.',
        };
      case '404':
        return {
          icon: FileQuestion,
          iconColor: 'text-rose-700 bg-rose-50 border-rose-200',
          title: 'Resource Not Found (404)',
          message: 'The requested repository, file, or chat thread does not exist.',
        };
      case 'network':
        return {
          icon: WifiOff,
          iconColor: 'text-sky-700 bg-sky-50 border-sky-200',
          title: 'Network Connection Issue',
          message: 'Unable to connect to the CodeLens backend server. Please check your internet or retry.',
        };
      case 'general':
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-rose-700 bg-rose-50 border-rose-200',
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
    <div className="rounded-2xl p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto my-12 bg-[#FFFFFF] border border-[#E2E0D9] shadow-xs">
      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 shadow-2xs ${config.iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-[#19243B] mb-1.5 tracking-tight">{displayTitle}</h4>
      <p className="text-xs text-[#526078] mb-5 leading-relaxed">{displayMsg}</p>

      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-[#FFFFFF] hover:bg-[#FAF9F5] border border-[#E2E0D9] text-[#19243B] text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#526078]" />
            Try Again
          </button>
        )}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
