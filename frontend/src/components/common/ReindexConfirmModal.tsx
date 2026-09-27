import React from 'react';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReindexConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  repoName?: string;
  isIndexing?: boolean;
}

export const ReindexConfirmModal: React.FC<ReindexConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  repoName,
  isIndexing = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#19243B]/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-[#E2E0D9] shadow-xl relative flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isIndexing}
          className="absolute right-4 top-4 text-[#8C96A5] hover:text-[#19243B] p-1 rounded-md hover:bg-[#F0EEE9] transition cursor-pointer disabled:opacity-50"
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-[#FAF9F5] border border-[#E2E0D9] flex items-center justify-center text-[#19243B] shrink-0">
            <RefreshCw className="size-4.5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#19243B] tracking-tight">Re-run AST Index</h3>
            <p className="text-xs text-[#526078] mt-0.5">
              Repository: <span className="font-semibold text-[#19243B]">{repoName || 'Codebase'}</span>
            </p>
          </div>
        </div>

        {/* Short clean notice */}
        <div className="flex items-center gap-2 text-xs text-[#526078] mb-5 p-3 rounded-xl bg-[#FAF9F5] border border-[#E2E0D9]">
          <AlertCircle className="size-4 text-amber-600 shrink-0" />
          <span>Existing indexed data and architecture maps will be refreshed.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E0D9]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isIndexing}
            className="h-8.5 px-3.5 text-xs font-medium rounded-lg border-[#E2E0D9] bg-white hover:bg-[#FAF9F5] text-[#526078] hover:text-[#19243B] cursor-pointer"
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isIndexing}
            className="h-8.5 px-4 text-xs font-semibold rounded-lg bg-[#111419] hover:bg-[#23272f] text-white flex items-center gap-1.5 transition-all shadow-xs hover:shadow active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 text-amber-400 ${isIndexing ? 'animate-spin' : ''}`} />
            <span>{isIndexing ? 'Starting Index...' : 'Confirm Re-index'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
