const files = [
  {
    path: "AGENT_CONTEXT.md",
    label: "UNIVERSAL CONTEXT",
    color: "#00ff87",
    desc: "Context-dense brief injected into every agent file. Low token count, high information density. Commit this.",
    commit: true,
    lines: [
      { text: "> specflow-context", c: "#00ff87" },
      { text: "> stack: nextjs|prisma|clerk|stripe|shadcn", c: "#00ff8799" },
      { text: "> agents: [claude-code,cursor]", c: "#00ff8799" },
      { text: "> skills: [vercel/nextjs,prisma/best-practices,stripe/node]", c: "#00ff8799" },
      { text: "> spec: SPECS/active/add-payments/ — read before implementing", c: "#f59e0b" },
      { text: "> memory: MEMORY/INDEX.md — synced 2026-03-11", c: "#60a5fa" },
      { text: "", c: "" },
      { text: "## Critical Patterns", c: "#e2e2e2" },
      { text: "- All DB queries use Prisma (never raw SQL)", c: "#b0b0b0" },
      { text: "- Auth routes protected with Clerk middleware", c: "#b0b0b0" },
      { text: "- API responses wrapped in standardized envelope", c: "#b0b0b0" },
      { text: "", c: "" },
      { text: "## Hard Constraints", c: "#e2e2e2" },
      { text: "- Do not modify migration files", c: "#b0b0b0" },
      { text: "- Never store auth tokens in localStorage", c: "#b0b0b0" },
    ],
  },
  {
    path: "SPECS/SEED.md",
    label: "ARCHITECTURAL DNA",
    color: "#f59e0b",
    desc: "Your patterns, anti-patterns, decisions. Fill in once. Evolves automatically when specs are archived. Commit this.",
    commit: true,
    lines: [
      { text: "# SEED — Architectural DNA", c: "#e2e2e2" },
      { text: "> Evolved from 6 archived specs · 2026-03-11", c: "#f59e0b99" },
      { text: "", c: "" },
      { text: "## Stack", c: "#e2e2e2" },
      { text: "- nextjs (App Router), prisma, clerk, stripe", c: "#b0b0b0" },
      { text: "", c: "" },
      { text: "## Patterns", c: "#e2e2e2" },
      { text: "- Validate all inputs with Zod before DB writes", c: "#b0b0b0" },
      { text: "- Payments via Stripe (Razorpay for IN market)", c: "#b0b0b0" },
      { text: "- Use server actions for mutations, REST for public APIs", c: "#b0b0b0" },
      { text: "", c: "" },
      { text: "## Anti-Patterns", c: "#e2e2e2" },
      { text: "- Direct SQL queries (always use Prisma)", c: "#888" },
      { text: "- Hardcoded API keys in source", c: "#888" },
    ],
  },
  {
    path: "MEMORY/INDEX.md",
    label: "HOT NOTES FROM OBSIDIAN",
    color: "#60a5fa",
    desc: "Top notes from your Obsidian vault — tagged #specflow, #hot, #bug. Re-synced on demand. Gitignore this.",
    commit: false,
    lines: [
      { text: "# memory", c: "#e2e2e2" },
      { text: "## vault", c: "#e2e2e2" },
      { text: "path:/Users/sky/obsidian/OneRouter", c: "#60a5fa99" },
      { text: "last-sync:2026-03-11T09:23:00Z", c: "#60a5fa99" },
      { text: "tagged:#specflow=3 pinned=2", c: "#60a5fa99" },
      { text: "", c: "" },
      { text: "## hot-notes", c: "#e2e2e2" },
      { text: "", c: "" },
      { text: "### Projects/OneRouter/Architecture.md", c: "#60a5fa" },
      { text: "> source:tagged:#specflow · modified:2026-03-10", c: "#888" },
      { text: "Unified SDK over Stripe + Razorpay + PayPal", c: "#b0b0b0" },
      { text: "Provider selected at runtime by currency", c: "#b0b0b0" },
    ],
  },
];

export default function Files() {
  return (
    <section className="border-t border-border bg-bg-2">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="section-label mb-8">THE FILES</div>

        <h2 className="text-2xl md:text-3xl font-mono font-bold text-text mb-3">
          Three files. Full context.
        </h2>
        <p className="text-muted-2 font-mono text-sm mb-12 max-w-lg">
          specflow writes these to your project. Your agent reads them.
          Two go in git. One stays local.
        </p>

        {/* Three file cards in bordered grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 border border-border">
          {files.map((file, i) => (
            <div
              key={file.path}
              className={`${i > 0 ? "lg:border-l border-t lg:border-t-0 border-border" : ""}`}
            >
              {/* File header */}
              <div className="px-5 py-3 border-b border-border bg-bg-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ color: file.color }} className="font-mono font-bold text-xs">{file.path}</span>
                </div>
                <span className={`text-[10px] font-mono tracking-wider ${file.commit ? "text-green" : "text-muted"}`}>
                  {file.commit ? "✓ COMMIT" : "⊘ GITIGNORED"}
                </span>
              </div>

              {/* Label + description */}
              <div className="px-5 py-4 border-b border-border">
                <span
                  className="text-[10px] font-mono tracking-[0.2em]"
                  style={{ color: file.color }}
                >
                  {file.label}
                </span>
                <p className="text-muted-2 font-mono text-xs leading-relaxed mt-2">{file.desc}</p>
              </div>

              {/* Code preview */}
              <div className="bg-bg p-4 overflow-x-auto">
                <pre className="text-[11px] font-mono leading-relaxed">
                  {file.lines.map((line, li) => (
                    <span key={li} style={{ color: line.c || "transparent" }} className="block min-h-[1.4em]">
                      {line.text || "\u00a0"}
                    </span>
                  ))}
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* Gitignore tip */}
        <div className="mt-8 border border-border">
          <div className="terminal-header">
            <div className="terminal-dot bg-[#ff5f57]" />
            <div className="terminal-dot bg-[#febc2e]" />
            <div className="terminal-dot bg-[#28c840]" />
            <span className="text-muted text-xs ml-2">.gitignore</span>
          </div>
          <div className="terminal-body grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <div>
              <div className="text-muted text-xs mb-2"># do not commit</div>
              <div><span className="text-[#ff5f57]">MEMORY/INDEX.md</span><span className="text-muted">   # personal vault content</span></div>
              <div><span className="text-[#ff5f57]">.specflow.json</span><span className="text-muted">    # contains local paths</span></div>
              <div><span className="text-[#ff5f57]">.skills/</span><span className="text-muted">           # regenerated on demand</span></div>
            </div>
            <div>
              <div className="text-muted text-xs mb-2"># commit these</div>
              <div><span className="text-green">AGENT_CONTEXT.md</span></div>
              <div><span className="text-green">SPECS/SEED.md</span></div>
              <div><span className="text-green">SPECS/active/</span></div>
              <div><span className="text-green">SPECS/archive/</span></div>
              <div><span className="text-green">.specflow/generation-spec.json</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
