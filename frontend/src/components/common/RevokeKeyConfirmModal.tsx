import React from 'react';
import { X, Loader2 } from 'lucide-react';

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
      <div className="w-full max-w-sm bg-black rounded-xl p-5 border border-[#27272a] relative flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-900 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">Remove OpenAI API Key</h3>
          <p className="text-xs text-zinc-400 mt-1">Are you sure you want to remove this key?</p>
        </div>

        {/* Active Key Display */}
        {maskedKey && (
          <div className="px-3 py-2 rounded-lg bg-[#0c0c0e] border border-[#222226] mb-4 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Active Key:</span>
            <span className="font-mono text-zinc-200">{maskedKey}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f1f23]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <span>Remove Key</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
