import React, { useState, useEffect, useRef } from 'react';
import { X, FolderGit2, Loader2, Plus, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, GitBranch, Cpu, Layers, KeyRound } from 'lucide-react';
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

    const hasKey = Boolean(user?.has_openai_key ?? user?.has_gemini_key);
    if (!hasKey) {
      setError('OpenAI API key is required to index a repository. Please add your key first.');
      setIsKeyModalOpen(true);
      return;
    }

    try {
      setError(null);
      setStage('indexing');
      setCurrentStepIndex(0);
      setElapsedSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      setCurrentStepIndex(0);
      const newRepo = await addRepository(cleanUrl);
      setActiveRepo(newRepo);

      setCurrentStepIndex(1);
      await triggerIndexing(newRepo.id);

      setTimeout(() => {
        setCurrentStepIndex(2);
      }, 3000);

      setTimeout(() => {
        setCurrentStepIndex(3);
      }, 6000);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const updated = await api.getRepository(newRepo.id);
          setActiveRepo(updated);

          if (updated.index_status === 'indexed') {
            cleanupTimers();
            setCurrentStepIndex(INDEXING_STEPS.length);
            setStage('completed');
            await fetchRepositories();
          } else if (updated.index_status === 'failed') {
            cleanupTimers();
            setError('Indexing failed. Check server logs.');
            setStage('error');
          }
        } catch {
          // Keep polling
        }
      }, 2000);
    } catch (err: any) {
      cleanupTimers();
      setError(err.message || 'Failed to start repository indexing.');
      setStage('error');
    }
  };

  const handleReset = () => {
    cleanupTimers();
    setStage('input');
    setError(null);
    setRepoUrl('');
    setActiveRepo(null);
    setCurrentStepIndex(0);
    setElapsedSeconds(0);
  };

  const handleOpenRepository = () => {
    if (activeRepo && onSuccess) {
      onSuccess(activeRepo.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E2E0D9] shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
            {stage === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : stage === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            ) : stage === 'indexing' ? (
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            ) : (
              <FolderGit2 className="w-5 h-5 text-amber-700" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#19243B] tracking-tight">
              {stage === 'input' && 'Add GitHub Repository'}
              {stage === 'indexing' && 'Indexing Repository...'}
              {stage === 'completed' && 'Repository Indexed'}
              {stage === 'error' && 'Indexing Failed'}
            </h3>
            <p className="text-xs text-[#526078]">
              {stage === 'input' && 'Clone, parse AST symbols, and generate architecture map'}
              {stage === 'indexing' && (activeRepo ? activeRepo.full_name : 'Processing codebase intelligence...')}
              {stage === 'completed' && 'Symbol extraction and vector embeddings ready'}
              {stage === 'error' && 'An issue occurred during repository indexing'}
            </p>
          </div>
        </div>

        {stage === 'input' && (
          <>
            {!(user?.has_openai_key ?? user?.has_gemini_key) && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>API key required for embeddings & indexing</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer shadow-sm"
                >
                  Add Key
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="repoUrl" className="block text-xs font-semibold text-[#19243B] mb-1.5">
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
                    className="w-full bg-[#F8F7F4] border border-[#E2E0D9] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-[#19243B] placeholder-[#687184] font-mono outline-none transition"
                  />
                  <GithubIcon className="w-4 h-4 text-[#687184] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-[#687184] mt-2">
                  Supports any public repository or private repositories you have access to.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E0D9]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!repoUrl.trim()}
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Connect & Index</span>
                </button>
              </div>
            </form>
          </>
        )}

        {stage === 'indexing' && (
          <div className="space-y-4 py-1">
            <div className="p-3 rounded-xl bg-[#F8F7F4] border border-[#E2E0D9] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                <span className="text-xs font-semibold text-[#19243B]">
                  Indexing repository...
                </span>
              </div>
              <span className="text-xs font-mono text-[#526078] font-bold">
                {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}s
              </span>
            </div>

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
                        ? 'bg-emerald-50/50 border-emerald-200 text-[#19243B]'
                        : isCurrent
                        ? 'bg-amber-50 border-amber-300 text-[#19243B] shadow-sm'
                        : 'bg-[#F8F7F4] border-[#E2E0D9] text-[#687184]'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                      ) : (
                        <StepIcon className="w-4 h-4 text-[#687184]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold ${isCurrent ? 'text-amber-900 font-bold' : isDone ? 'text-emerald-900' : 'text-[#526078]'}`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white text-amber-800 border border-amber-200 font-bold shadow-sm">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#526078] mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E2E0D9]">
              <span className="text-[11px] text-[#687184]">
                You can close this modal; indexing will continue.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
              >
                Hide & Run in Background
              </button>
            </div>
          </div>
        )}

        {stage === 'completed' && (
          <div className="space-y-4 py-1 animate-fadeIn">
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-emerald-950">Codebase Intelligence Ready</h4>
                <p className="text-xs text-emerald-800 mt-1">
                  AST symbol tables, import hierarchy, and semantic vector embeddings have been indexed.
                </p>
              </div>

              {activeRepo && (
                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-900 shadow-sm font-semibold">
                    {activeRepo.file_count || 0} Files
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-900 shadow-sm font-semibold">
                    {activeRepo.symbol_count || 0} Symbols
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-900 shadow-sm font-semibold">
                    {activeRepo.default_branch || 'main'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E0D9]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handleOpenRepository}
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
              >
                <span>Explore Repository</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="space-y-4 py-1 animate-fadeIn">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-950">Indexing Interrupted</p>
                <p className="text-rose-800">{error || 'An unexpected error occurred during repository indexing.'}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E0D9]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}
      </div>

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
