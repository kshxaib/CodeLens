import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FolderGit2,
  Loader2,
  Plus,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  GitBranch,
  Cpu,
  Layers,
  KeyRound,
} from 'lucide-react';
import { GithubIcon } from '../common/Icons';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { AddGeminiKeyModal } from '../common/AddGeminiKeyModal';
import { api } from '../../api/client';
import type { RepositoryItem } from '../../types';

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (repoId: number) => void;
}

type ModalStage = 'input' | 'indexing' | 'completed' | 'error';

interface IndexingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const INDEXING_STEPS: IndexingStep[] = [
  {
    id: 'verify',
    label: 'Connecting & Authorizing',
    description: 'Validating GitHub repository access and clone URL',
    icon: FolderGit2,
  },
  {
    id: 'clone',
    label: 'Ephemeral Git Clone',
    description: 'Executing shallow clone (--depth 1) into isolated sandbox',
    icon: GitBranch,
  },
  {
    id: 'ast',
    label: 'AST Parsing & Symbol Extraction',
    description: 'Inspecting code hierarchy, classes, functions, and imports',
    icon: Cpu,
  },
  {
    id: 'embeddings',
    label: 'Vector Embeddings & RAG Index',
    description: 'Generating semantic vector embeddings for intelligent code search',
    icon: Layers,
  },
];

export const AddRepositoryModal: React.FC<AddRepositoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuthStore();
  const { addRepository, triggerIndexing, fetchRepositories } = useWorkspaceStore();
  const [stage, setStage] = useState<ModalStage>('input');
  const [repoUrl, setRepoUrl] = useState('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [activeRepo, setActiveRepo] = useState<RepositoryItem | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupTimers = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupTimers();
      setStage('input');
      setRepoUrl('');
      setActiveRepo(null);
      setCurrentStepIndex(0);
      setElapsedSeconds(0);
      setError(null);
    }
    return () => cleanupTimers();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = repoUrl.trim();
    if (!cleanUrl) {
      setError('Please enter a GitHub repository URL.');
      return;
    }

    if (!user?.has_gemini_key) {
      setError('Gemini API key is required to index a repository. Please add your key first.');
      setIsKeyModalOpen(true);
      return;
    }

    try {
      setError(null);
      setStage('indexing');
      setCurrentStepIndex(0);
      setElapsedSeconds(0);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      // Step 1: Add repository to database
      setCurrentStepIndex(0);
      const newRepo = await addRepository(cleanUrl);
      setActiveRepo(newRepo);

      // Step 2: Trigger backend indexing
      setCurrentStepIndex(1);
      await triggerIndexing(newRepo.id);

      // Simulated step visuals while background executes
      const stepProgression = setTimeout(() => {
        setCurrentStepIndex(2);
      }, 3000);

      const stepProgression2 = setTimeout(() => {
        setCurrentStepIndex(3);
      }, 6000);

      // Poll repository index status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const updated = await api.getRepository(newRepo.id);
          setActiveRepo(updated);

          if (updated.index_status === 'indexed') {
            cleanupTimers();
            clearTimeout(stepProgression);
            clearTimeout(stepProgression2);
            setCurrentStepIndex(INDEXING_STEPS.length);
            setStage('completed');
            await fetchRepositories();
          } else if (updated.index_status === 'failed') {
            cleanupTimers();
            clearTimeout(stepProgression);
            clearTimeout(stepProgression2);
            setStage('error');
            setError('Repository indexing failed. Please verify the URL or ensure your Gemini API key is configured.');
          }
        } catch (pollErr: any) {
          console.warn('Status poll warning:', pollErr);
        }
      }, 1500);

    } catch (err: any) {
      cleanupTimers();
      setStage('error');
      setError(err.message || 'Failed to connect repository. Please verify the URL and your access permissions.');
    }
  };

  const handleOpenRepository = () => {
    if (activeRepo && onSuccess) {
      onSuccess(activeRepo.id);
    }
    onClose();
  };

  const handleReset = () => {
    cleanupTimers();
    setStage('input');
    setError(null);
    setCurrentStepIndex(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[#09090b] rounded-2xl p-6 sm:p-7 border border-[#1f1f23] shadow-2xl relative flex flex-col transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#18181b] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#141416] border border-[#27272a] flex items-center justify-center text-slate-300">
            {stage === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-white" />
            ) : stage === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            ) : (
              <FolderGit2 className="w-5 h-5 text-slate-300" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {stage === 'input' && 'Add GitHub Repository'}
              {stage === 'indexing' && 'Indexing Repository...'}
              {stage === 'completed' && 'Repository Indexed'}
              {stage === 'error' && 'Indexing Failed'}
            </h3>
            <p className="text-xs text-slate-400">
              {stage === 'input' && 'Clone, parse AST symbols, and generate architecture map'}
              {stage === 'indexing' && (activeRepo ? activeRepo.full_name : 'Processing codebase intelligence...')}
              {stage === 'completed' && 'Symbol extraction and vector embeddings ready'}
              {stage === 'error' && 'An issue occurred during repository indexing'}
            </p>
          </div>
        </div>

        {/* STAGE 1: INPUT FORM */}
        {stage === 'input' && (
          <>
            {!user?.has_gemini_key && (
              <div className="mb-4 p-3 rounded-xl bg-black border border-[#27272a] text-zinc-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Gemini API key required for indexing</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(true)}
                  className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-black text-[11px] font-medium rounded-lg transition cursor-pointer"
                >
                  Add Key
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-[#141416] border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

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
                    autoFocus
                    className="w-full bg-[#121214] border border-[#1f1f23] focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-600 font-mono outline-none transition"
                  />
                  <GithubIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Supports any public repository or private repositories you have access to.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f1f23]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!repoUrl.trim()}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#0d1017] text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Connect & Index</span>
                </button>
              </div>
            </form>
          </>
        )}

        {/* STAGE 2: LIVE INDEXING PROGRESS */}
        {stage === 'indexing' && (
          <div className="space-y-4 py-1">
            {/* Timer Bar */}
            <div className="p-3 rounded-xl bg-[#121214] border border-[#1f1f23] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                <span className="text-xs font-medium text-slate-300">
                  Indexing pipeline running in background
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400 font-medium">
                {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}s
              </span>
            </div>

            {/* Step Progression List */}
            <div className="space-y-2.5">
              {INDEXING_STEPS.map((step, idx) => {
                const isDone = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-[#121214] border-[#1f1f23] text-slate-300'
                        : isCurrent
                        ? 'bg-[#18181b] border-[#27272a] text-white shadow-sm'
                        : 'bg-[#0e0e10] border-transparent text-slate-600'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-slate-300" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                      ) : (
                        <StepIcon className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold ${isCurrent ? 'text-white' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#27272a] text-slate-300 border border-[#3f3f46]">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer with Background dismissal option */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1f1f23]">
              <span className="text-[11px] text-slate-500">
                You can close this modal; indexing will continue.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
              >
                Hide & Run in Background
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: COMPLETED SUCCESS */}
        {stage === 'completed' && (
          <div className="space-y-4 py-1 animate-fadeIn">
            <div className="p-4 rounded-xl bg-[#121214] border border-[#1f1f23] space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-white">Codebase Intelligence Ready</h4>
                <p className="text-xs text-slate-400 mt-1">
                  AST symbol tables, import hierarchy, and semantic vector embeddings have been indexed.
                </p>
              </div>

              {activeRepo && (
                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-[#18181b] border border-[#27272a] text-slate-300">
                    {activeRepo.file_count || 0} Files
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#18181b] border border-[#27272a] text-slate-300">
                    {activeRepo.symbol_count || 0} Symbols
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#18181b] border border-[#27272a] text-slate-300">
                    {activeRepo.default_branch || 'main'}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f1f23]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handleOpenRepository}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#0d1017] text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition cursor-pointer"
              >
                <span>Explore Repository</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 4: ERROR / FAILED */}
        {stage === 'error' && (
          <div className="space-y-4 py-1 animate-fadeIn">
            <div className="p-4 rounded-xl bg-[#121214] border border-[#1f1f23] text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-white">Indexing Interrupted</p>
                <p className="text-slate-400">{error || 'An unexpected error occurred during repository indexing.'}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f1f23]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#0d1017] text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Gemini Key Modal */}
      {isKeyModalOpen && (
        <AddGeminiKeyModal
          isOpen={isKeyModalOpen}
          onClose={() => setIsKeyModalOpen(false)}
          onSuccess={() => {
            setIsKeyModalOpen(false);
            setError(null);
          }}
        />
      )}
    </div>
  );
};
