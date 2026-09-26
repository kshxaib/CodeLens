import React from 'react';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';

interface RevokeKeyConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  maskedKey?: string | null;
}

export const RevokeKeyConfirmModal: React.FC<RevokeKeyConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  maskedKey,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#09090b] rounded-2xl p-6 border border-[#27272a] shadow-2xl relative flex flex-col transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#18181b] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Remove Gemini API Key</h3>
            <p className="text-xs text-slate-400">Revoke AI indexing and Copilot access</p>
          </div>
        </div>

        {/* Warning Body */}
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 mb-4 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-300 leading-relaxed">
            Are you sure you want to remove your Gemini API key? Code indexing, architecture mapping, and AI chat will be disabled until a new key is provided.
          </p>
        </div>

        {maskedKey && (
          <div className="p-2.5 rounded-xl bg-[#121214] border border-[#27272a] mb-5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Active Key:</span>
            <span className="font-mono text-white text-xs">{maskedKey}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f1f23]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-lg shadow-rose-600/20 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Remove Key</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
