"use client";
import { useState } from "react";

const groups = [
  {
    label: "Core",
    color: "#3b82f6",
    cmds: [
      { cmd: "persistent init", flags: "[--agent <id>] [--obsidian <path>] [--dry-run]", desc: "Full bootstrap. Detects stack, installs skills, patches agent files, connects Obsidian.", example: "persistent init --obsidian ~/obsidian/MyVault" },
      { cmd: "persistent update", flags: "[--agent <id>]", desc: "Re-patch agent file from current config. Run after stack changes or adding a new agent.", example: "persistent update --agent cursor" },
    ],
  },
  {
    label: "Spec lifecycle",
    color: "#fbbf24",
    cmds: [
      { cmd: 'persistent spec "<feature>"', flags: "", desc: "Propose a new feature spec. Creates proposal.md, design.md, tasks.md under SPECS/active/.", example: 'persistent spec "add razorpay payments"' },
      { cmd: "persistent spec --validate <slug>", flags: "", desc: "Validate a spec against SEED.md constraints and generation-spec rules.", example: "persistent spec --validate add-razorpay-payments" },
      { cmd: "persistent spec --archive <slug>", flags: "", desc: "Archive a completed spec. Extracts patterns → evolves SEED.md. Writes back to Obsidian vault.", example: "persistent spec --archive add-razorpay-payments" },
      { cmd: "persistent spec --list", flags: "", desc: "List all active specs with progress (completed/total tasks).", example: "persistent spec --list" },
      { cmd: "persistent spec --seed", flags: "", desc: "Regenerate SEED.md from all archived spec patterns from scratch.", example: "persistent spec --seed" },
    ],
  },
  {
    label: "Skills",
    color: "#fbbf24",
    cmds: [
      { cmd: "persistent add-skill <skill>", flags: "", desc: "Install a specific skill and update the agent's context file.", example: "persistent add-skill supabase/rls-patterns" },
      { cmd: "persistent skill --search <query>", flags: "", desc: "Search the skills.sh registry for relevant skills.", example: 'persistent skill --search "react auth"' },
      { cmd: "persistent skill --create <id>", flags: "", desc: "Create a skill from your project patterns and Obsidian #pattern notes.", example: "persistent skill --create myteam/auth-patterns" },
      { cmd: "persistent skill --evolve <id>", flags: "", desc: "Merge new patterns into an existing skill file.", example: "persistent skill --evolve myteam/auth-patterns" },
      { cmd: "persistent skill --update", flags: "", desc: "Update all installed skills to latest versions via skills.sh.", example: "persistent skill --update" },
      { cmd: "persistent skill --list", flags: "", desc: "List all installed skills with source and version.", example: "persistent skill --list" },
    ],
  },
  {
    label: "Obsidian sync",
    color: "#a78bfa",
    cmds: [
      { cmd: "persistent sync", flags: "", desc: "Bidirectional sync. Pull tagged notes → route to OpenSpec/skills/memory. Push specs/SEED → vault.", example: "persistent sync" },
      { cmd: "persistent sync --discover", flags: "", desc: "Auto-discover Obsidian vaults on this machine from Obsidian's own config.", example: "persistent sync --discover" },
      { cmd: 'persistent sync --pin <folder>', flags: "", desc: "Add a vault folder to the always-pull list. Persists to .persistent.json.", example: 'persistent sync --pin "Projects/OneRouter"' },
      { cmd: "persistent sync --one-way", flags: "", desc: "Pull-only mode (legacy). Skips write-back to vault.", example: "persistent sync --one-way" },
    ],
  },
  {
    label: "Analysis",
    color: "#60a5fa",
    cmds: [
      { cmd: "persistent analyze", flags: "[--key <key>] [--force] [--only <skills>]", desc: "AI-analyze your code → generate project-specific skill files. Requires ANTHROPIC_API_KEY.", example: "persistent analyze --only vercel/nextjs,prisma/best-practices" },
    ],
  },
];

export default function Commands() {
  const [active, setActive] = useState(0);

  return (
    <section id="commands" className="border-t border-border bg-bg-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="section-label mb-6 sm:mb-8">COMMANDS</div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-text mb-8 sm:mb-12">Full CLI reference.</h2>

        <div className="flex flex-col lg:flex-row gap-0 border border-border overflow-hidden">
          <div className="lg:w-48 flex flex-row lg:flex-col lg:border-r border-b lg:border-b-0 border-border overflow-x-auto">
            {groups.map((g, i) => (
              <button key={g.label} onClick={() => setActive(i)}
                className={`text-left px-3 sm:px-4 py-3 font-mono text-[11px] sm:text-xs whitespace-nowrap transition-all border-b lg:border-b last:border-b-0 border-border ${
                  active === i ? "bg-bg-3 text-text" : "text-muted-2 hover:text-text hover:bg-bg-2"
                }`}>
                <span style={{ color: active === i ? g.color : undefined }}>{g.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-x-auto">
            {groups[active].cmds.map((c, i) => (
              <div key={c.cmd} className={`${i > 0 ? "border-t border-border" : ""}`}>
                <div className="px-4 sm:px-5 py-3 bg-bg-3 flex flex-wrap items-baseline gap-2 border-b border-border">
                  <span className="text-muted font-mono text-xs sm:text-sm">$</span>
                  <span style={{ color: groups[active].color }} className="font-mono font-bold text-xs sm:text-sm break-all">{c.cmd}</span>
                  {c.flags && <span className="text-muted font-mono text-[10px] sm:text-xs break-all">{c.flags}</span>}
                </div>
                <div className="px-4 sm:px-5 py-4">
                  <p className="text-muted-2 font-mono text-[10px] sm:text-xs leading-relaxed mb-3">{c.desc}</p>
                  <div className="flex items-center gap-2 bg-bg-3 px-3 py-2 border border-border overflow-x-auto">
                    <span className="text-muted text-[10px] sm:text-xs font-mono">e.g.</span>
                    <span className="text-muted-2 font-mono text-[10px] sm:text-xs break-all">{c.example}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 sm:mt-12 border border-border overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-border bg-bg-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-text font-mono font-semibold text-xs sm:text-sm">Plugin API</span>
            <span className="text-muted font-mono text-[9px] sm:text-[10px] tracking-wider whitespace-nowrap">FOR CLI TOOLS + EDITOR EXTENSIONS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-4 sm:p-6 md:border-r border-border">
              <p className="text-muted-2 font-mono text-[10px] sm:text-xs leading-relaxed mb-4">
                Use persistent as a library inside your own CLI tool or editor extension.
                Register your native AI instance for spec-driven context generation.
              </p>
              <div className="text-accent font-mono text-[10px] sm:text-xs break-all">npm install @kousthubha/persistent</div>
            </div>
            <div className="p-4 sm:p-6 bg-bg overflow-x-auto">
              <pre className="text-[10px] sm:text-xs font-mono leading-relaxed">
                <span className="text-muted">{"// Claude Code, Cursor, Windsurf, etc.\n"}</span>
                <span className="text-accent">{"import"}</span>
                <span className="text-text">{" { createPersistentPlugin } "}</span>
                <span className="text-accent">{"from"}</span>
                <span className="text-lime">{" '@kousthubha/persistent/plugin';\n\n"}</span>
                <span className="text-accent">{"const"}</span>
                <span className="text-text">{" pst = "}</span>
                <span className="text-accent">{"await"}</span>
                <span className="text-text">{" createPersistentPlugin(root);\n"}</span>
                <span className="text-accent">{"await"}</span>
                <span className="text-text">{" pst.registerCliAI(nativeAI);\n"}</span>
                <span className="text-accent">{"await"}</span>
                <span className="text-text">{" pst.detectAndSetup({ useCliAI: "}</span>
                <span className="text-lime">{"true"}</span>
                <span className="text-text">{" });"}</span>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
