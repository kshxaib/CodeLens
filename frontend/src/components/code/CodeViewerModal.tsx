import React, { useState, useEffect } from 'react';
import { X, FileCode2, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import type { FileContentResponse } from '../../types';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  repositoryId: number;
  fileId?: number;
  filePath?: string;
  highlightLines?: { start: number; end: number };
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  isOpen,
  onClose,
  repositoryId,
  fileId,
  filePath,
  highlightLines,
}) => {
  const [fileData, setFileData] = useState<FileContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || (!fileId && !filePath)) return;

    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);
        if (fileId) {
          const res = await api.getFileContent(repositoryId, fileId);
          setFileData(res);
        } else if (filePath) {
          const files = await api.getFiles(repositoryId);
          const found = files.find((f) => f.file_path === filePath);
          if (found) {
            const res = await api.getFileContent(repositoryId, found.id);
            setFileData(res);
          } else {
            setError(`File "${filePath}" could not be found in repository index.`);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load source file content.');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [isOpen, repositoryId, fileId, filePath]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (fileData?.content) {
      navigator.clipboard.writeText(fileData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = fileData?.content ? fileData.content.split('\n') : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-5xl h-[85vh] glass-card rounded-2xl border border-white/[0.12] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f23] bg-[#09090b]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#141416] border border-[#27272a] flex items-center justify-center text-slate-200 shrink-0">
              <FileCode2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white truncate font-mono">
                {fileData?.file_path || filePath || 'Source File Viewer'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {fileData ? `${fileData.line_count} lines • ${fileData.language || 'text'}` : 'Loading metadata...'}
                {highlightLines && (
                  <span className="ml-2 text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Lines {highlightLines.start}-{highlightLines.end}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!fileData?.content}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition text-xs flex items-center gap-1.5 cursor-pointer"
              title="Copy Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto bg-[#0a0c10] font-mono text-xs text-slate-200">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-zinc-400 gap-2 select-none">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs font-mono">Loading source...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-rose-300 gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="max-w-md">{error}</p>
            </div>
          ) : (
            <div className="py-4">
              {lines.map((line, idx) => {
                const lineNum = idx + 1;
                const isHighlighted =
                  highlightLines &&
                  lineNum >= highlightLines.start &&
                  lineNum <= highlightLines.end;

                return (
                  <div
                    key={lineNum}
                    id={`line-${lineNum}`}
                    className={`flex items-start px-4 py-0.5 leading-5 hover:bg-white/[0.03] transition-colors ${
                      isHighlighted ? 'bg-purple-500/20 border-l-2 border-purple-400' : ''
                    }`}
                  >
                    <span className="w-12 shrink-0 select-none text-right pr-4 text-slate-600">
                      {lineNum}
                    </span>
                    <pre className="flex-1 overflow-x-auto whitespace-pre font-mono text-slate-200">
                      {line || ' '}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
