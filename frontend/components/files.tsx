const files = [
  {
    path: "CLAUDE.md",
    label: "AGENT CONTEXT FILE",
    color: "#3b82f6",
    desc: "Context-dense brief written directly into the agent's own file. The AI reads this at session start. Commit this.",
    commit: true,
    lines: [
      { text: "> specflow-context", c: "#3b82f6" },
      { text: "> stack: nextjs|prisma|clerk|stripe|shadcn", c: "#3b82f699" },
      { text: "> agents: [claude-code,cursor]", c: "#3b82f699" },
      { text: "> skills: [vercel/nextjs,prisma/best-practices,stripe/node]", c: "#3b82f699" },
      { text: "> spec: SPECS/active/add-payments/ — read before implementing", c: "#fbbf24" },
      { text: "> memory: MEMORY/INDEX.md — synced 2026-03-11", c: "#a78bfa" },
      { text: "", c: "" },
      { text: "## Critical Patterns", c: "#ececec" },
      { text: "- All DB queries use Prisma (never raw SQL)", c: "#b0b0b0" },
      { text: "- Auth routes protected with Clerk middleware", c: "#b0b0b0" },
      { text: "- API responses wrapped in standardized envelope", c: "#b0b0b0" },
      { text: "", c: "" },
      { text: "## Hard Constraints", c: "#ececec" },
      { text: "- Do not modify migration files", c: "#b0b0b0" },
      { text: "- Never store auth tokens in localStorage", c: "#b0b0b0" },
    ],
  },
  {
    path: "SPECS/SEED.md",
    label: "ARCHITECTURAL DNA",
    color: "#fbbf24",
    desc: "Your patterns, anti-patterns, decisions. Fill in once. Evolves automatically when specs are archived. Commit this.",
    commit: true,
    lines: [
      { text: "# SEED — Architectural DNA", c: "#ececec" },
      { text: "> Evolved from 6 archived specs · 2026-03-11", c: "#fbbf2499" },
      { text: "", c: "" },
      { text: "## Stack", c: "#ececec" },
      { text: "- nextjs (App Router), prisma, clerk, stripe", c: "#b0b0b0" },
      { text: "", c: "" },
      { text: "## Patterns", c: "#ececec" },
      { text: "- Validate all inputs with Zod before DB writes", c: "#b0b0b0" },
      { text: "- Payments via Stripe (Razorpay for IN market)", c: "#b0b0b0" },
      { text: "- Use server actions for mutations, REST for public APIs", c: "#b0b0b0" },
      { text: "", c: "" },
      { text: "## Anti-Patterns", c: "#ececec" },
      { text: "- Direct SQL queries (always use Prisma)", c: "#888" },
      { text: "- Hardcoded API keys in source", c: "#888" },
    ],
  },
  {
    path: "MEMORY/INDEX.md",
    label: "HOT NOTES FROM OBSIDIAN",
    color: "#a78bfa",
    desc: "Top notes from your Obsidian vault — tagged #specflow, #hot, #bug. Re-synced on demand. Gitignore this.",
    commit: false,
    lines: [
      { text: "# memory", c: "#ececec" },
      { text: "## vault", c: "#ececec" },
      { text: "path:/Users/sky/obsidian/OneRouter", c: "#a78bfa99" },
      { text: "last-sync:2026-03-11T09:23:00Z", c: "#a78bfa99" },
      { text: "tagged:#specflow=3 pinned=2", c: "#a78bfa99" },
      { text: "", c: "" },
      { text: "## hot-notes", c: "#ececec" },
      { text: "", c: "" },
      { text: "### Projects/OneRouter/Architecture.md", c: "#a78bfa" },
      { text: "> source:tagged:#specflow · modified:2026-03-10", c: "#888" },
      { text: "Unified SDK over Stripe + Razorpay + PayPal", c: "#b0b0b0" },
      { text: "Provider selected at runtime by currency", c: "#b0b0b0" },
    ],
  },
];

export default function Files() {
  return (
    <section className="border-t border-border bg-bg-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="section-label mb-6 sm:mb-8">THE FILES</div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-text mb-3">Three files. Full context.</h2>
        <p className="text-muted-2 font-mono text-xs sm:text-sm mb-8 sm:mb-12 max-w-lg">
          specflow writes these to your project. Your agent reads them. Two go in git. One stays local.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-border">
          {files.map((file, i) => (
            <div key={file.path} className={`${i > 0 ? "lg:border-l border-t lg:border-t-0 border-border" : ""}`}>
              <div className="px-5 py-3 border-b border-border bg-bg-3 flex items-center justify-between">
                <span style={{ color: file.color }} className="font-mono font-bold text-xs">{file.path}</span>
                <span className={`text-[10px] font-mono tracking-wider ${file.commit ? "text-lime" : "text-muted"}`}>
                  {file.commit ? "✓ COMMIT" : "⊘ GITIGNORED"}
                </span>
              </div>
              <div className="px-5 py-4 border-b border-border">
                <span className="text-[10px] font-mono tracking-[0.2em]" style={{ color: file.color }}>{file.label}</span>
                <p className="text-muted-2 font-mono text-xs leading-relaxed mt-2">{file.desc}</p>
              </div>
              <div className="bg-bg p-4 overflow-x-auto">
                <pre className="text-[11px] font-mono leading-relaxed">
                  {file.lines.map((line, li) => (
                    <span key={li} style={{ color: line.c || "transparent" }} className="block min-h-[1.4em]">{line.text || "\u00a0"}</span>
                  ))}
                </pre>
              </div>
            </div>
          ))}
        </div>

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
              <div><span className="text-[#f87171]">MEMORY/INDEX.md</span><span className="text-muted">   # personal vault content</span></div>
              <div><span className="text-[#f87171]">.specflow.json</span><span className="text-muted">    # contains local paths</span></div>
              <div><span className="text-[#f87171]">.skills/</span><span className="text-muted">           # regenerated on demand</span></div>
            </div>
            <div>
              <div className="text-muted text-xs mb-2"># commit these</div>
              <div><span className="text-lime">CLAUDE.md</span><span className="text-muted">  (or agents.md, .cursor/rules/, etc.)</span></div>
              <div><span className="text-lime">SPECS/SEED.md</span></div>
              <div><span className="text-lime">SPECS/active/</span></div>
              <div><span className="text-lime">SPECS/archive/</span></div>
              <div><span className="text-lime">.specflow/generation-spec.json</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
