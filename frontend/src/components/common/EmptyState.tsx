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
    <div className="glass-card rounded-2xl p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto my-12 border border-white/[0.08]">
      <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-lg font-semibold text-white mb-2">{displayTitle}</h4>
      <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">{displayDesc}</p>
      {displayAction && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg glow-purple transition"
        >
          <Plus className="w-4 h-4" />
          {displayAction}
        </button>
      )}
    </div>
  );
};
