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
    <div className="my-3 rounded-xl border border-[#2B3545] bg-[#1E2532] overflow-hidden text-xs shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161C28] border-b border-[#2B3545] text-slate-300 font-mono text-[11px]">
        <span className="text-slate-300 font-medium">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition py-0.5 px-1.5 rounded hover:bg-white/10 cursor-pointer"
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
      <div className="p-3.5 overflow-x-auto font-mono text-[#F3F4F6] leading-relaxed">
        <pre className="!bg-transparent !p-0 !m-0 font-mono text-xs">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
};

export const ChatMessageMarkdown: React.FC<ChatMessageMarkdownProps> = ({ content }) => {
  return (
    <div className="text-sm leading-relaxed text-[#19243B] space-y-2.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-[#19243B] mt-4 mb-2 pb-1 border-b border-[#E2E0D9]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-[#19243B] mt-3.5 mb-1.5 pb-0.5 border-b border-[#E2E0D9]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-[#19243B] mt-2.5 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed text-[#2C384E] font-normal">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 mb-2.5 text-[#2C384E]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 mb-2.5 text-[#2C384E]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[#19243B]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#526078]">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-amber-500 pl-3.5 py-1 my-2.5 text-[#526078] italic bg-[#FEF7EC] rounded-r">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-[#E2E0D9] bg-white">
              <table className="min-w-full divide-y divide-[#E2E0D9] text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#F0EEE9] text-[#19243B] font-medium">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#E2E0D9] bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#F8F7F4] transition">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-[#19243B]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-[#526078]">{children}</td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 hover:text-amber-800 underline underline-offset-2 transition font-medium"
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
                  className="px-1.5 py-0.5 rounded-md bg-[#F0EEE9] text-[#B45309] font-mono text-[12px] border border-[#E2E0D9]"
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
