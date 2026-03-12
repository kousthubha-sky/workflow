"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function Footer() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText("npx @kousthubha/specflow init");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-xl md:text-2xl font-mono font-bold text-text mb-2 tracking-tight uppercase">
            Your agent has no memory.
          </h2>
          <h2 className="text-xl md:text-2xl font-mono font-bold text-accent mb-8 tracking-tight uppercase">
            Give it one.
          </h2>
          <div className="flex justify-center">
            <div className="cmd-box group max-w-md w-full" onClick={handleCopy}>
              <span className="text-muted text-sm">$</span>
              <span className="text-text text-sm font-mono flex-1">npx @kousthubha/specflow init</span>
              {copied ? (
                <Check size={14} className="text-lime shrink-0" />
              ) : (
                <Copy size={14} className="text-muted group-hover:text-muted-2 transition-colors shrink-0" />
              )}
            </div>
          </div>
        </div>

        <div className="section-divider mb-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-accent text-sm font-mono font-bold">&gt;_</span>
            <span className="text-text font-mono font-semibold text-sm tracking-wide">specflow</span>
            <span className="text-muted font-mono text-[10px] tracking-wider">V0.2.0 · MIT · OPEN SOURCE</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="https://github.com/kousthubha-sky/workflow" target="_blank" rel="noopener noreferrer"
              className="text-muted hover:text-muted-2 font-mono text-xs transition-colors flex items-center gap-1.5 tracking-wider uppercase">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              GitHub ↗
            </a>
            <a href="https://openspec.dev" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-accent font-mono text-xs transition-colors tracking-wider uppercase">OpenSpec ↗</a>
            <a href="https://skills.sh" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-amber font-mono text-xs transition-colors tracking-wider uppercase">Skills.sh ↗</a>
            <a href="https://obsidian.md" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-purple font-mono text-xs transition-colors tracking-wider uppercase">Obsidian ↗</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
