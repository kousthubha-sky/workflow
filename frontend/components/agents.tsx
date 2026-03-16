"use client";

const agents = [
  { rank: 1, id: "claude-code", label: "Claude Code", file: "CLAUDE.md", detect: "CLAUDE.md in repo root" },
  { rank: 2, id: "cursor", label: "Cursor", file: ".cursor/rules/persistent.mdc", detect: ".cursor/ directory" },
  { rank: 3, id: "copilot", label: "GitHub Copilot", file: ".github/copilot-instructions.md", detect: ".github/copilot-instructions.md" },
  { rank: 4, id: "windsurf", label: "Windsurf", file: ".windsurfrules", detect: ".windsurfrules file" },
  { rank: 5, id: "opencode", label: "OpenCode", file: "agents.md", detect: "agents.md in root" },
  { rank: 6, id: "continue", label: "Continue.dev", file: ".continue/context.md", detect: ".continue/ directory" },
  { rank: 7, id: "aider", label: "Aider", file: ".aider/context.md", detect: ".aider.conf.yml" },
];

export default function Agents() {
  return (
    <section className="border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="section-label mb-6 sm:mb-8">SUPPORTED AGENTS</div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-text mb-3">Works with every agent.</h2>
        <p className="text-muted-2 font-mono text-xs sm:text-sm mb-8 sm:mb-12 max-w-lg">
          persistent auto-detects which agent you use from your project structure.
          Same context block injected into every agent file — switch agents without losing context.
        </p>

        <div className="border border-border mb-8 sm:mb-12 overflow-x-auto">
          <div className="grid grid-cols-[35px_1fr_1fr_auto] sm:grid-cols-[40px_1fr_1fr_auto] md:grid-cols-[50px_180px_1fr_120px] gap-2 px-3 sm:px-4 py-3 border-b border-border bg-bg-2 min-w-full">
            <span className="text-muted font-mono text-[9px] sm:text-[10px] tracking-wider">#</span>
            <span className="text-muted font-mono text-[9px] sm:text-[10px] tracking-wider">AGENT</span>
            <span className="text-muted font-mono text-[9px] sm:text-[10px] tracking-wider hidden md:block">FILE</span>
            <span className="text-muted font-mono text-[9px] sm:text-[10px] tracking-wider text-right">DETECTION</span>
          </div>
          {agents.map((agent) => (
            <div key={agent.id} className="grid grid-cols-[35px_1fr_1fr_auto] sm:grid-cols-[40px_1fr_1fr_auto] md:grid-cols-[50px_180px_1fr_120px] gap-2 px-3 sm:px-4 py-3 border-b border-border last:border-b-0 row-hover min-w-full">
              <span className="text-muted font-mono text-[10px] sm:text-xs">{agent.rank}</span>
              <span className="text-text font-mono text-[10px] sm:text-xs font-semibold truncate">{agent.label}</span>
              <span className="text-accent font-mono text-[10px] sm:text-xs hidden md:block truncate">{agent.file}</span>
              <span className="text-muted-2 font-mono text-[9px] sm:text-[10px] text-right whitespace-nowrap">
                <span className="text-lime mr-1">✓</span>auto
              </span>
            </div>
          ))}
          <div className="grid grid-cols-[35px_1fr_1fr_auto] sm:grid-cols-[40px_1fr_1fr_auto] md:grid-cols-[50px_180px_1fr_120px] gap-2 px-3 sm:px-4 py-3 bg-bg-2 min-w-full">
            <span className="text-muted font-mono text-[10px] sm:text-xs">—</span>
            <span className="text-muted-2 font-mono text-[10px] sm:text-xs">Generic</span>
            <span className="text-muted font-mono text-[10px] sm:text-xs hidden md:block">CLAUDE.md / agents.md</span>
            <span className="text-muted font-mono text-[9px] sm:text-[10px] text-right">fallback</span>
          </div>
        </div>

        <div className="border border-border max-w-2xl">
          <div className="terminal-header">
            <div className="terminal-dot bg-[#ff5f57]" />
            <div className="terminal-dot bg-[#febc2e]" />
            <div className="terminal-dot bg-[#28c840]" />
            <span className="text-muted text-xs ml-2">persistent init — agent context output</span>
          </div>
          <div className="terminal-body">
            <div><span className="text-muted-2">Auto-detected: </span><span className="text-text">Claude Code</span></div>
            <div className="mt-2"><span className="text-accent">?</span><span className="text-text"> Select your AI agent:</span></div>
            <div className="mt-1 space-y-0.5">
              <div><span className="text-lime">❯</span> <span className="text-text">Claude Code</span>         <span className="text-muted text-xs">CLAUDE.md</span></div>
              <div><span className="text-muted"> </span> <span className="text-muted-2">Cursor</span>              <span className="text-muted text-xs">.cursor/rules/persistent.mdc</span></div>
              <div><span className="text-muted"> </span> <span className="text-muted-2">GitHub Copilot</span>    <span className="text-muted text-xs">.github/copilot-instructions.md</span></div>
              <div><span className="text-muted"> </span> <span className="text-muted-2">Windsurf</span>          <span className="text-muted text-xs">.windsurfrules</span></div>
            </div>
            <div className="mt-3"><span className="text-lime">✓</span> <span className="text-text">Agent: Claude Code</span></div>
            <div className="mt-1"><span className="text-[#60a5fa]">◐</span> <span className="text-[#60a5fa]">Analyzing project...</span></div>
            <div><span className="text-lime">✓</span> <span className="text-text">12 patterns, 5 constraints extracted</span></div>
            <div><span className="text-lime">✓</span> <span className="text-text">CLAUDE.md patched [claude-code]</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
