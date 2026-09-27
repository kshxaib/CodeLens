import React from 'react';
import { Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteChatConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  chatTitle?: string;
  isLoading?: boolean;
}

export const DeleteChatConfirmModal: React.FC<DeleteChatConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  chatTitle,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#19243B]/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-2xl p-6 border border-[#E2E0D9] shadow-xl relative flex flex-col">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-[#8C96A5] hover:text-[#19243B] p-1 rounded-md hover:bg-[#F0EEE9] transition cursor-pointer disabled:opacity-50"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="size-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <Trash2 className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#19243B] tracking-tight">Delete Conversation</h3>
            <p className="text-xs text-[#526078]">Permanently delete this chat thread</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E2E0D9] mb-5">
          <p className="text-xs text-[#526078] leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-[#19243B] font-mono break-all">
              "{chatTitle || 'this thread'}"
            </span>
            ? All messages and citations in this thread will be permanently removed from the database.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E0D9]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-8 px-3.5 text-xs font-medium rounded-xl border-[#E2E0D9] bg-white hover:bg-[#FAF9F5] text-[#526078] hover:text-[#19243B] cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="h-8 px-3.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs border-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="mr-1.5 size-3.5" />
                <span>Delete Thread</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
