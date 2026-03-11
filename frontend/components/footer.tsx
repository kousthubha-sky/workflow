"use client";
import { useState } from "react";

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
        {/* Final CTA */}
        <div className="text-center mb-16">
          <h2 className="text-xl md:text-2xl font-mono font-bold text-text mb-2 tracking-tight uppercase">
            Your agent has no memory.
          </h2>
          <h2 className="text-xl md:text-2xl font-mono font-bold text-green mb-8 tracking-tight uppercase">
            Give it one.
          </h2>
          <div className="flex justify-center">
            <div className="cmd-box group max-w-md w-full" onClick={handleCopy}>
              <span className="text-muted text-sm">$</span>
              <span className="text-green text-sm font-mono flex-1">npx @kousthubha/specflow init</span>
              {copied ? (
                <span className="text-green text-xs">copied!</span>
              ) : (
                <svg className="text-muted group-hover:text-muted-2 transition-colors shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="1" />
                  <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="section-divider mb-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-green text-sm font-mono font-bold">&gt;_</span>
            <span className="text-text font-mono font-semibold text-sm tracking-wide">specflow</span>
            <span className="text-muted font-mono text-[10px] tracking-wider">V0.2.0 · MIT · OPEN SOURCE</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/kousthubha-sky/workflow"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-muted-2 font-mono text-xs transition-colors flex items-center gap-1.5 tracking-wider uppercase"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub ↗
            </a>
            <a href="https://openspec.dev" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-green font-mono text-xs transition-colors tracking-wider uppercase">OpenSpec ↗</a>
            <a href="https://skills.sh" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-amber font-mono text-xs transition-colors tracking-wider uppercase">Skills.sh ↗</a>
            <a href="https://obsidian.md" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-blue font-mono text-xs transition-colors tracking-wider uppercase">Obsidian ↗</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
