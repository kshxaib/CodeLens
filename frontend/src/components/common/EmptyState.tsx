import React from 'react';
import { FolderGit2, Search, Plus } from 'lucide-react';

interface EmptyStateProps {
  type?: 'repositories' | 'search' | 'chats';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'repositories',
  title,
  description,
  actionText,
  onAction,
}) => {
  const getDefaultContent = () => {
    switch (type) {
      case 'search':
        return {
          icon: Search,
          title: 'No Matching Results',
          description: 'No files, symbols, or repositories matched your query. Try a different search term.',
        };
      case 'chats':
        return {
          icon: FolderGit2,
          title: 'No Conversations Yet',
          description: 'Start a new conversation thread to chat with the AI Codebase Copilot.',
          actionText: 'Start New Chat',
        };
      case 'repositories':
      default:
        return {
          icon: FolderGit2,
          title: 'No Repositories Connected',
          description: 'Connect a public or private GitHub repository to index code symbols and generate architecture maps.',
          actionText: 'Add Repository',
        };
    }
  };

  const defaults = getDefaultContent();
  const Icon = defaults.icon;
  const displayTitle = title || defaults.title;
  const displayDesc = description || defaults.description;
  const displayAction = actionText || defaults.actionText;

  return (
    <div className="rounded-2xl p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto my-12 bg-[#09090b] border border-[#1f1f23]">
      <div className="w-12 h-12 rounded-xl bg-[#141416] border border-[#27272a] flex items-center justify-center text-slate-300 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-white mb-1.5">{displayTitle}</h4>
      <p className="text-xs text-slate-400 mb-5 leading-relaxed">{displayDesc}</p>
      {displayAction && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#0d1017] text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {displayAction}
        </button>
      )}
    </div>
  );
};
