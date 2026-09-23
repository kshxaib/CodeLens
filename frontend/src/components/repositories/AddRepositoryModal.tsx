import React, { useState } from 'react';
import { X, FolderGit2, Loader2, Plus, AlertCircle } from 'lucide-react';
import { GithubIcon } from '../common/Icons';
import { useWorkspace } from '../../context/WorkspaceContext';

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (repoId: number) => void;
}

export const AddRepositoryModal: React.FC<AddRepositoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addRepository } = useWorkspace();
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = repoUrl.trim();
    if (!cleanUrl) {
      setError('Please enter a GitHub repository URL.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newRepo = await addRepository(cleanUrl);
      setRepoUrl('');
      onClose();
      if (onSuccess) {
        onSuccess(newRepo.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add repository. Please check URL and permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-white/[0.12] shadow-2xl relative glow-purple">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-5 top-5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl gradient-purple-blue flex items-center justify-center text-white shadow-lg">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Add GitHub Repository</h3>
            <p className="text-xs text-slate-400">Clone, parse AST symbols, and generate architecture map</p>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="repoUrl" className="block text-xs font-medium text-slate-300 mb-1.5">
              GitHub Repository URL
            </label>
            <div className="relative">
              <input
                id="repoUrl"
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                disabled={loading}
                autoFocus
                className="w-full bg-[#0d1017] border border-white/[0.1] focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 font-mono outline-none transition"
              />
              <GithubIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Supports public and private GitHub repositories.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !repoUrl.trim()}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg glow-purple transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting Repo...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Connect & Index</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
