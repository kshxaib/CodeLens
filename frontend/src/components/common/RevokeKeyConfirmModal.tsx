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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#19243B]/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-sm bg-[#FFFFFF] rounded-2xl p-6 border border-[#E2E0D9] shadow-xl relative flex flex-col">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-[#8C96A5] hover:text-[#19243B] p-1 rounded-md hover:bg-[#F0EEE9] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#19243B]">Remove OpenAI API Key</h3>
          <p className="text-xs text-[#526078] mt-1">Are you sure you want to remove this key?</p>
        </div>

        {maskedKey && (
          <div className="px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E2E0D9] mb-4 flex items-center justify-between text-xs">
            <span className="text-[#526078]">Active Key:</span>
            <span className="font-mono font-medium text-[#19243B]">{maskedKey}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E0D9]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
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
