import React, { useState, useEffect, useRef } from 'react';
import { MessageSquarePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<void> | void;
  isLoading?: boolean;
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Please enter a thread name.');
      return;
    }

    try {
      setError(null);
      await onCreate(cleanTitle);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create chat thread.');
    }
  };

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
          <div className="size-9 rounded-xl bg-[#FEF7EC] border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
            <MessageSquarePlus className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#19243B] tracking-tight">New Chat Thread</h3>
            <p className="text-xs text-[#526078]">Give your conversation a title</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="threadTitle" className="block text-xs font-semibold text-[#19243B] mb-1.5">
              Thread Name
            </label>
            <input
              ref={inputRef}
              id="threadTitle"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Auth flow architecture, API latency debug..."
              maxLength={80}
              disabled={isLoading}
              className="w-full bg-[#FFFFFF] border border-[#E2E0D9] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#19243B] placeholder-[#8C96A5] outline-none shadow-2xs transition font-sans"
            />
            {error && (
              <p className="text-[11px] text-rose-600 mt-1.5 font-medium">{error}</p>
            )}
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
              type="submit"
              disabled={isLoading || !title.trim()}
              className="h-8 px-4 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Thread</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
