"use client";

const tools = [
  {
    name: "OpenSpec",
    url: "https://openspec.dev",
    color: "#3b82f6",
    label: "SPEC LIFECYCLE",
    tagline: "Specs that survive sessions",
    desc: "Structured feature specs that live in your repo. Your agent reads them before every task. When a spec ships, patterns are extracted into SEED.md automatically.",
    commands: [
      { cmd: 'specflow spec "add payments"', comment: "# create proposal + design + tasks" },
      { cmd: "specflow spec --validate add-payments", comment: "# check SEED compliance" },
      { cmd: "specflow spec --archive add-payments", comment: "# extract patterns → SEED" },
    ],
    files: ["SPECS/SEED.md", "SPECS/active/<slug>/proposal.md", "SPECS/active/<slug>/design.md", "SPECS/active/<slug>/tasks.md"],
    tags: ["#spec", "#decision", "#architecture"],
  },
  {
    name: "Skills.sh",
    url: "https://skills.sh",
    color: "#fbbf24",
    label: "SKILL ECOSYSTEM",
    tagline: "Best practices, per library",
    desc: "One markdown file per dependency. Your agent reads Prisma patterns, Stripe integration guides, shadcn conventions — all from .skills/. Updated as your stack evolves.",
    commands: [
      { cmd: 'specflow skill --search "react auth"', comment: "# find community skills" },
      { cmd: "specflow skill --create my-patterns", comment: "# from your code + Obsidian" },
      { cmd: "specflow add-skill supabase/rls-patterns", comment: "# install a specific skill" },
    ],
    files: [".skills/vercel/nextjs.md", ".skills/stripe/stripe-node.md", ".skills/supabase/rls-patterns.md"],
    tags: ["#pattern", "#skill", "#best-practice"],
  },
  {
    name: "Obsidian",
    url: "https://obsidian.md",
    color: "#a78bfa",
    label: "BIDIRECTIONAL MEMORY",
    tagline: "Your notes become agent context",
    desc: "Tag notes in Obsidian — #decision routes to SEED.md, #pattern routes to skills. Archived specs write back to your vault. Your thinking persists across tools.",
    commands: [
      { cmd: "specflow sync", comment: "# vault ↔ project (bidirectional)" },
      { cmd: 'specflow sync --pin "Projects/MyApp"', comment: "# always pull a folder" },
      { cmd: "specflow sync --discover", comment: "# auto-find your vaults" },
    ],
    files: ["MEMORY/INDEX.md", "vault/specflow/specs/<slug>.md", "vault/specflow/SEED.md"],
    tags: ["#specflow", "#hot", "#bug", "#workflow"],
  },
];

export default function Trinity() {
  return (
    <section id="how-it-works" className="border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="section-label mb-6 sm:mb-8">THE THREE-TOOL TRINITY</div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-text mb-3">
          Three tools. One workflow.
        </h2>
        <p className="text-muted-2 font-mono text-xs sm:text-sm mb-8 sm:mb-12 max-w-lg">
          specflow orchestrates OpenSpec, Skills.sh, and Obsidian into a single command.
          Each does one thing perfectly. Together they give your agent full context.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-border">
          {tools.map((tool, i) => (
            <div key={tool.name} className={`flex flex-col border-border ${i === 1 ? "border-b md:border-b-0 md:border-l" : i === 2 ? "border-t md:border-t-0 md:border-l" : i === 0 ? "md:border-r" : ""}`}>
              <div className="p-4 sm:p-6 border-b border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <a href={tool.url} target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-xs sm:text-sm md:text-base hover:underline" style={{ color: tool.color }}>
                      {tool.name} ↗
                    </a>
                    <div className="text-muted font-mono text-[9px] sm:text-[10px] tracking-[0.2em] mt-1">{tool.label}</div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {tool.tags.map((t) => (
                      <span key={t} className="text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 border" style={{ color: tool.color, borderColor: tool.color + "33" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-text font-mono font-semibold text-xs sm:text-sm mb-2">{tool.tagline}</p>
                <p className="text-muted-2 font-mono text-[10px] sm:text-xs leading-relaxed">{tool.desc}</p>
              </div>
              <div className="p-3 sm:p-4 border-b border-border bg-bg-2">
                {tool.commands.map((c) => (
                  <div key={c.cmd} className="mb-1 last:mb-0">
                    <span className="text-muted text-[10px] sm:text-xs font-mono">$ </span>
                    <span style={{ color: tool.color }} className="text-[10px] sm:text-xs font-mono break-all">{c.cmd}</span>
                    <span className="text-muted text-[10px] sm:text-xs font-mono"> {c.comment}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 sm:p-4">
                <div className="text-muted font-mono text-[9px] sm:text-[10px] mb-2 tracking-[0.2em]">FILES</div>
                {tool.files.map((f) => (
                  <div key={f} className="flex items-center gap-2 mb-1">
                    <span style={{ color: tool.color }} className="text-[10px] sm:text-xs shrink-0">→</span>
                    <span className="text-muted-2 font-mono text-[10px] sm:text-xs break-all">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 border border-border overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-border bg-bg-2">
            <span className="text-muted font-mono text-[9px] sm:text-[10px] tracking-[0.2em]">TAG ROUTING — OBSIDIAN → DESTINATIONS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 border-t md:border-t-0 border-border">
            <div className="p-4 sm:p-6 border-b md:border-b-0 md:border-r border-border">
              <div className="text-muted-2 font-mono text-[10px] sm:text-xs mb-3 tracking-wider">OBSIDIAN TAGS</div>
              {[
                { tag: "#spec, #decision, #architecture", color: "#3b82f6" },
                { tag: "#pattern, #skill, #best-practice", color: "#fbbf24" },
                { tag: "#specflow, #hot, #bug, #workflow", color: "#a78bfa" },
              ].map((r) => (
                <div key={r.tag} className="mb-2 text-xs font-mono" style={{ color: r.color }}>{r.tag}</div>
              ))}
            </div>
            <div className="hidden md:flex items-center justify-center border-x border-border">
              <span className="text-muted-2 text-lg">→</span>
            </div>
            <div className="p-4 sm:p-6">
              <div className="text-muted-2 font-mono text-[10px] sm:text-xs mb-3 tracking-wider">ROUTED TO</div>
              {[
                { dest: "OpenSpec → SEED.md evolution", color: "#3b82f6" },
                { dest: "Skills.sh → skill creation", color: "#fbbf24" },
                { dest: "Memory → MEMORY/INDEX.md", color: "#a78bfa" },
              ].map((r) => (
                <div key={r.dest} className="mb-2 text-xs font-mono" style={{ color: r.color }}>{r.dest}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
