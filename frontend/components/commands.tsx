"use client";
import { useState } from "react";

const groups = [
  {
    label: "Core",
    color: "#3b82f6",
    cmds: [
      {
        cmd: "persistent init",
        flags: "[--agent <id>] [--obsidian <path>] [--dry-run]",
        desc: "Full bootstrap. Detects stack, runs openspec init, installs skills.sh skills, patches agent file, connects Obsidian vault.",
        example: "persistent init --obsidian ~/Documents/MyVault",
      },
      {
        cmd: "persistent update",
        flags: "[--agent <id>]",
        desc: "Re-patch agent file from current config + run openspec update to refresh slash commands. Run after stack changes.",
        example: "persistent update --agent cursor",
      },
    ],
  },
  {
    label: "OpenSpec",
    color: "#3b82f6",
    cmds: [
      {
        cmd: "persistent spec",
        flags: '"feature"',
        desc: 'Shows the /opsx slash commands to use inside your agent for this feature. OpenSpec CLI handles spec creation — not persistent.',
        example: 'persistent spec "add stripe payments"',
      },
      {
        cmd: "persistent spec --list",
        flags: "",
        desc: "List active OpenSpec changes in openspec/changes/ with task progress.",
        example: "persistent spec --list",
      },
      {
        cmd: "persistent spec --seed-evolve <id>",
        flags: "",
        desc: "After /opsx:archive in your agent, run this to extract patterns from the archived change's design.md and merge them into SPECS/SEED.md.",
        example: "persistent spec --seed-evolve add-stripe-payments",
      },
      {
        cmd: "persistent spec --seed",
        flags: "",
        desc: "Re-initialize SPECS/SEED.md if it doesn't exist or you want a clean slate.",
        example: "persistent spec --seed",
      },
      {
        cmd: "persistent spec --seed-clean",
        flags: "",
        desc: "Deduplicate and compress SPECS/SEED.md. Removes repeated pattern lines that accumulate after multiple seed-evolve runs.",
        example: "persistent spec --seed-clean",
      },
    ],
  },
  {
    label: "Skills.sh",
    color: "#fbbf24",
    cmds: [
      {
        cmd: "persistent add-skill <skill>",
        flags: "",
        desc: "Install a skill from the skills.sh registry using npx skills add. Falls back to bundled builtin or placeholder if registry is unreachable.",
        example: "persistent add-skill vercel-labs/next-skills/next-best-practices",
      },
      {
        cmd: "persistent skill --search <query>",
        flags: "",
        desc: "Search the skills.sh registry (87k+ skills) for relevant skills. Browse more at skills.sh.",
        example: 'persistent skill --search "supabase postgres"',
      },
      {
        cmd: "persistent skill --create <id>",
        flags: "",
        desc: "Create a new skill from your project code patterns and Obsidian #pattern notes. Written to .skills/.",
        example: "persistent skill --create myteam/myapp/auth-patterns",
      },
      {
        cmd: "persistent skill --evolve <id>",
        flags: "",
        desc: "Add new patterns to an existing skill file. Pass --newPatterns via API or edit .skills/ directly.",
        example: "persistent skill --evolve myteam/myapp/auth-patterns",
      },
      {
        cmd: "persistent skill --update",
        flags: "",
        desc: "Update all installed skills to latest versions via npx skills update.",
        example: "persistent skill --update",
      },
      {
        cmd: "persistent skill --list",
        flags: "",
        desc: "List installed skills with source (skills.sh / builtin / local) and version info.",
        example: "persistent skill --list",
      },
    ],
  },
  {
    label: "Obsidian sync",
    color: "#a78bfa",
    cmds: [
      {
        cmd: "persistent sync",
        flags: "",
        desc: "Full bidirectional sync. Pull: vault → MEMORY/INDEX.md. Route: #decision → SEED.md, #spec/#decision → OpenSpec context block in MEMORY, #pattern → skill candidates. Push: SEED.md + archived specs → vault.",
        example: "persistent sync",
      },
      {
        cmd: "persistent sync --discover",
        flags: "",
        desc: "Auto-discover Obsidian vaults on this machine by reading Obsidian's own config file.",
        example: "persistent sync --discover",
      },
      {
        cmd: "persistent sync --pin <folder>",
        flags: "",
        desc: "Add a vault folder to the always-pull list. Persists to .persistent.json. Useful for project-specific note folders.",
        example: 'persistent sync --pin "Projects/OneRouter"',
      },
      {
        cmd: "persistent sync --one-way",
        flags: "",
        desc: "Pull from vault only (no write-back). For read-only vault setups or shared vaults.",
        example: "persistent sync --one-way",
      },
    ],
  },
  {
    label: "Analysis",
    color: "#60a5fa",
    cmds: [
      {
        cmd: "persistent analyze",
        flags: "[--key <key>] [--force] [--only <skills>]",
        desc: "AI-analyze your codebase → generate project-specific skill files in .skills/. Requires ANTHROPIC_API_KEY. Uses Claude to understand your actual patterns, not generic docs.",
        example: "persistent analyze --only vercel-labs/next-skills/next-best-practices",
      },
    ],
  },
];

const openspecSlashCmds = [
  { cmd: '/opsx:new "feature name"', desc: "Create a new change with id derived from feature name" },
  { cmd: "/opsx:ff", desc: "Fast-forward: generate proposal.md, design.md, tasks.md in one shot" },
  { cmd: "/opsx:apply", desc: "Implement all tasks in tasks.md sequentially" },
  { cmd: "/opsx:archive", desc: "Archive completed change → openspec/changes/archive/" },
  { cmd: "/opsx:onboard", desc: "First-time guided setup walkthrough" },
];

export default function Commands() {
  const [active, setActive] = useState(0);

  return (
    <section id="commands" className="border-t border-border bg-bg-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="section-label mb-6 sm:mb-8">COMMANDS</div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-text mb-8 sm:mb-12">
          Full CLI reference.
        </h2>

        {/* OpenSpec slash commands — top-level callout */}
        <div className="mb-8 border border-border overflow-hidden">
          <div className="px-4 sm:px-5 py-3 bg-bg-3 border-b border-border flex items-center justify-between">
            <span className="text-[#3b82f6] font-mono font-bold text-xs sm:text-sm">
              OpenSpec slash commands
            </span>
            <span className="text-muted font-mono text-[9px] sm:text-[10px] tracking-wider">
              RUN INSIDE YOUR AGENT — NOT IN TERMINAL
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {openspecSlashCmds.map((c, i) => (
              <div key={c.cmd}
                className={`px-4 py-3 border-border ${i > 0 ? "border-t sm:border-t-0 sm:border-l" : ""} ${i >= 2 ? "sm:border-t" : ""} ${i >= 3 ? "lg:border-t" : ""}`}>
                <div className="font-mono font-bold text-[10px] sm:text-xs text-[#3b82f6] mb-1 break-all">{c.cmd}</div>
                <div className="text-muted-2 font-mono text-[9px] sm:text-[10px] leading-relaxed">{c.desc}</div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-border bg-bg">
            <span className="text-muted font-mono text-[9px] sm:text-[10px]">
              Install: <span className="text-[#3b82f6]">npm install -g @fission-ai/openspec@latest</span>
              <span className="ml-3 text-muted">·</span>
              <span className="ml-3">Docs: <span className="text-[#3b82f6]">openspec.dev</span></span>
            </span>
          </div>
        </div>

        {/* Persistent CLI commands */}
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
                  <span style={{ color: groups[active].color }}
                    className="font-mono font-bold text-xs sm:text-sm break-all">{c.cmd}</span>
                  {c.flags && (
                    <span className="text-muted font-mono text-[10px] sm:text-xs break-all">{c.flags}</span>
                  )}
                </div>
                <div className="px-4 sm:px-5 py-4">
                  <p className="text-muted-2 font-mono text-[10px] sm:text-xs leading-relaxed mb-3">{c.desc}</p>
                  <div className="flex items-center gap-2 bg-bg-3 px-3 py-2 border border-border overflow-x-auto">
                    <span className="text-muted text-[10px] sm:text-xs font-mono shrink-0">e.g.</span>
                    <span className="text-muted-2 font-mono text-[10px] sm:text-xs break-all">{c.example}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plugin API */}
        <div className="mt-8 sm:mt-12 border border-border overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-border bg-bg-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-text font-mono font-semibold text-xs sm:text-sm">Plugin API</span>
            <span className="text-muted font-mono text-[9px] sm:text-[10px] tracking-wider whitespace-nowrap">FOR CLI TOOLS + EDITOR EXTENSIONS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-4 sm:p-6 md:border-r border-border">
              <p className="text-muted-2 font-mono text-[10px] sm:text-xs leading-relaxed mb-4">
                Use persistent as a library inside your own CLI tool or editor extension.
                Register your native AI instance and persistent handles the full bootstrap.
              </p>
              <div className="text-accent font-mono text-[10px] sm:text-xs break-all">
                npm install @kousthubha/persistent
              </div>
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
