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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-md bg-card rounded-xl p-6 border border-border relative flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition cursor-pointer disabled:opacity-50"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="size-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-destructive shrink-0">
            <Trash2 className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Delete Conversation</h3>
            <p className="text-xs text-muted-foreground">Permanently delete this chat thread</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 rounded-lg bg-secondary border border-border mb-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground font-mono break-all">
              "{chatTitle || 'this thread'}"
            </span>
            ? All messages and citations in this thread will be permanently removed from the database.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-8 px-3.5 text-xs font-medium rounded-lg border-border hover:bg-accent cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-none border border-red-500/50"
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
