import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

interface ChatMessageMarkdownProps {
  content: string;
}

const CodeBlock: React.FC<{
  language?: string;
  children: React.ReactNode;
}> = ({ language, children }) => {
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-zinc-800 bg-[#0d1117] overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 font-mono text-[11px]">
        <span className="text-zinc-400">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition py-0.5 px-1.5 rounded hover:bg-zinc-800 cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto font-mono text-zinc-200 leading-relaxed">
        <pre className="!bg-transparent !p-0 !m-0 font-mono text-xs">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
};

export const ChatMessageMarkdown: React.FC<ChatMessageMarkdownProps> = ({ content }) => {
  return (
    <div className="text-sm leading-relaxed text-zinc-200 space-y-2.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-zinc-800">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-white mt-3.5 mb-1.5 pb-0.5 border-b border-zinc-800/60">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-zinc-100 mt-2.5 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed text-zinc-300 font-normal">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 mb-2.5 text-zinc-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 mb-2.5 text-zinc-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-100">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-zinc-300">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-amber-500/50 pl-3.5 py-0.5 my-2.5 text-zinc-400 italic bg-amber-500/5 rounded-r">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-800 text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-900 text-zinc-300 font-medium">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-zinc-900/30 transition">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-zinc-300">{children}</td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition"
            >
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 text-amber-300 font-mono text-[12px] border border-zinc-700/40"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock language={match ? match[1] : undefined}>
                {children}
              </CodeBlock>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
