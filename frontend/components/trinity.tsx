"use client";

const tools = [
  {
    name: "OpenSpec",
    url: "https://openspec.dev",
    color: "#3b82f6",
    label: "SPEC LIFECYCLE",
    tagline: "Specs that survive sessions",
    desc: "Install @fission-ai/openspec globally. Use /opsx slash commands inside your agent to create, fast-forward, implement, and archive changes. persistent bootstraps it and evolves SEED.md from completed changes.",
    commands: [
      { cmd: '/opsx:new "add payments"', comment: "# inside your agent → creates change" },
      { cmd: "/opsx:ff", comment: "# fast-forward → proposal + design + tasks" },
      { cmd: "/opsx:apply", comment: "# implement all tasks" },
      { cmd: "/opsx:archive", comment: "# archive → then run seed-evolve below" },
    ],
    persistentCmds: [
      { cmd: "persistent spec --seed-evolve add-payments", comment: "# pull patterns → SEED.md" },
      { cmd: "persistent spec --seed-clean", comment: "# deduplicate SEED.md" },
    ],
    files: [
      "openspec/changes/<id>/proposal.md",
      "openspec/changes/<id>/design.md",
      "openspec/changes/<id>/tasks.md",
      "openspec/specs/<feature>/spec.md",
      "SPECS/SEED.md",
    ],
    tags: ["#spec", "#decision", "#architecture"],
  },
  {
    name: "Skills.sh",
    url: "https://skills.sh",
    color: "#fbbf24",
    label: "SKILL ECOSYSTEM",
    tagline: "Best practices, per library",
    desc: "87k+ skills in the registry. persistent installs the right ones for your stack automatically. One markdown file per dependency — your agent reads Prisma patterns, shadcn conventions, auth flows — all from .skills/.",
    commands: [
      { cmd: "persistent add-skill vercel-labs/next-skills/next-best-practices", comment: "# install from registry" },
      { cmd: 'persistent skill --search "supabase"', comment: "# discover skills" },
      { cmd: "persistent skill --create myteam/auth-patterns", comment: "# from Obsidian + code" },
    ],
    persistentCmds: [],
    files: [
      ".skills/vercel-labs/next-skills--next-best-practices.md",
      ".skills/shadcn/ui--shadcn.md",
      ".skills/supabase/agent-skills--supabase-postgres-best-practices.md",
    ],
    tags: ["#pattern", "#skill", "#best-practice"],
  },
  {
    name: "Obsidian",
    url: "https://obsidian.md",
    color: "#a78bfa",
    label: "BIDIRECTIONAL MEMORY",
    tagline: "Your notes become agent context",
    desc: "Tag notes in Obsidian — #decision routes to SEED.md, #pattern routes to skill creation, #spec becomes OpenSpec context in MEMORY/INDEX.md. Completed specs and SEED.md write back to your vault.",
    commands: [
      { cmd: "persistent sync", comment: "# vault ↔ project (bidirectional)" },
      { cmd: 'persistent sync --pin "Projects/MyApp"', comment: "# always pull a folder" },
      { cmd: "persistent sync --discover", comment: "# auto-find your vaults" },
    ],
    persistentCmds: [],
    files: [
      "MEMORY/INDEX.md",
      "vault/persistent/specs/<id>.md",
      "vault/persistent/SEED.md",
    ],
    tags: ["#persistent", "#hot", "#bug", "#workflow"],
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
          persistent bootstraps OpenSpec, Skills.sh, and Obsidian into a single
          command. Each does one thing. Together they give your agent full context.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-border">
          {tools.map((tool, i) => (
            <div key={tool.name} className={`flex flex-col border-border ${i === 1 ? "border-b md:border-b-0 md:border-l" : i === 2 ? "border-t md:border-t-0 md:border-l" : i === 0 ? "md:border-r" : ""}`}>
              <div className="p-4 sm:p-6 border-b border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <a href={tool.url} target="_blank" rel="noopener noreferrer"
                      className="font-mono font-bold text-xs sm:text-sm md:text-base hover:underline"
                      style={{ color: tool.color }}>
                      {tool.name} ↗
                    </a>
                    <div className="text-muted font-mono text-[9px] sm:text-[10px] tracking-[0.2em] mt-1">{tool.label}</div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {tool.tags.map((t) => (
                      <span key={t} className="text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 border"
                        style={{ color: tool.color, borderColor: tool.color + "33" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-muted-2 font-mono text-[10px] sm:text-xs leading-relaxed">{tool.desc}</p>
              </div>

              <div className="p-3 sm:p-4 border-b border-border bg-bg-2">
                {tool.commands.map((c) => (
                  <div key={c.cmd} className="mb-1 last:mb-0">
                    <span className="text-muted text-[10px] sm:text-xs font-mono">
                      {c.cmd.startsWith("/opsx") ? "  " : "$ "}
                    </span>
                    <span style={{ color: tool.color }} className="text-[10px] sm:text-xs font-mono break-all">{c.cmd}</span>
                    <span className="text-muted text-[10px] sm:text-xs font-mono"> {c.comment}</span>
                  </div>
                ))}
                {tool.persistentCmds.length > 0 && (
                  <>
                    <div className="mt-2 mb-1 border-t border-border pt-2">
                      <span className="text-muted font-mono text-[9px] tracking-[0.15em]">PERSISTENT COMMANDS</span>
                    </div>
                    {tool.persistentCmds.map((c) => (
                      <div key={c.cmd} className="mb-1 last:mb-0">
                        <span className="text-muted text-[10px] sm:text-xs font-mono">$ </span>
                        <span style={{ color: tool.color }} className="text-[10px] sm:text-xs font-mono break-all">{c.cmd}</span>
                        <span className="text-muted text-[10px] sm:text-xs font-mono"> {c.comment}</span>
                      </div>
                    ))}
                  </>
                )}
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
                { tag: "#persistent, #hot, #bug, #workflow", color: "#a78bfa" },
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
                { dest: "OpenSpec context block in MEMORY/INDEX.md → SEED.md", color: "#3b82f6" },
                { dest: "Skills.sh candidates → persistent skill --create", color: "#fbbf24" },
                { dest: "MEMORY/INDEX.md (always pulled)", color: "#a78bfa" },
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
