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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
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
          <div className="size-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-primary shrink-0">
            <MessageSquarePlus className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">New Chat Thread</h3>
            <p className="text-xs text-muted-foreground">Give your conversation a title</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="threadTitle" className="block text-xs font-medium text-muted-foreground mb-1.5">
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
              className="w-full bg-secondary border border-border focus:border-ring rounded-lg px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none transition font-sans"
            />
            {error && (
              <p className="text-[11px] text-destructive mt-1.5">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
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
              type="submit"
              disabled={isLoading || !title.trim()}
              className="h-8 px-4 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-none disabled:opacity-50"
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
