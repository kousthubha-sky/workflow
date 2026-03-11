"use client";
import { useState } from "react";

const groups = [
  {
    label: "Core",
    color: "#00ff87",
    cmds: [
      {
        cmd: "specflow init",
        flags: "[--agent <id>] [--obsidian <path>] [--dry-run]",
        desc: "Full bootstrap. Detects stack, installs skills, patches agent files, connects Obsidian.",
        example: "specflow init --obsidian ~/obsidian/MyVault",
      },
      {
        cmd: "specflow update",
        flags: "[--agent <id>]",
        desc: "Re-patch agent file from current config. Run after stack changes or adding a new agent.",
        example: "specflow update --agent cursor",
      },
    ],
  },
  {
    label: "Spec lifecycle",
    color: "#f59e0b",
    cmds: [
      {
        cmd: 'specflow spec "<feature>"',
        flags: "",
        desc: "Propose a new feature spec. Creates proposal.md, design.md, tasks.md under SPECS/active/.",
        example: 'specflow spec "add razorpay payments"',
      },
      {
        cmd: "specflow spec --validate <slug>",
        flags: "",
        desc: "Validate a spec against SEED.md constraints and generation-spec rules.",
        example: "specflow spec --validate add-razorpay-payments",
      },
      {
        cmd: "specflow spec --archive <slug>",
        flags: "",
        desc: "Archive a completed spec. Extracts patterns → evolves SEED.md. Writes back to Obsidian vault.",
        example: "specflow spec --archive add-razorpay-payments",
      },
      {
        cmd: "specflow spec --list",
        flags: "",
        desc: "List all active specs with progress (completed/total tasks).",
        example: "specflow spec --list",
      },
      {
        cmd: "specflow spec --seed",
        flags: "",
        desc: "Regenerate SEED.md from all archived spec patterns from scratch.",
        example: "specflow spec --seed",
      },
    ],
  },
  {
    label: "Skills",
    color: "#f59e0b",
    cmds: [
      {
        cmd: "specflow add-skill <skill>",
        flags: "",
        desc: "Install a specific skill and update AGENT_CONTEXT.md. Tries registry → builtin → placeholder.",
        example: "specflow add-skill supabase/rls-patterns",
      },
      {
        cmd: "specflow skill --search <query>",
        flags: "",
        desc: "Search the skills.sh registry for relevant skills.",
        example: 'specflow skill --search "react auth"',
      },
      {
        cmd: "specflow skill --create <id>",
        flags: "",
        desc: "Create a skill from your project patterns and Obsidian #pattern notes.",
        example: "specflow skill --create myteam/auth-patterns",
      },
      {
        cmd: "specflow skill --evolve <id>",
        flags: "",
        desc: "Merge new patterns into an existing skill file.",
        example: "specflow skill --evolve myteam/auth-patterns",
      },
      {
        cmd: "specflow skill --update",
        flags: "",
        desc: "Update all installed skills to latest versions via skills.sh.",
        example: "specflow skill --update",
      },
      {
        cmd: "specflow skill --list",
        flags: "",
        desc: "List all installed skills with source (registry/builtin/placeholder) and version.",
        example: "specflow skill --list",
      },
    ],
  },
  {
    label: "Obsidian sync",
    color: "#60a5fa",
    cmds: [
      {
        cmd: "specflow sync",
        flags: "",
        desc: "Bidirectional sync. Pull tagged notes → route to OpenSpec/skills/memory. Push specs/SEED → vault.",
        example: "specflow sync",
      },
      {
        cmd: "specflow sync --discover",
        flags: "",
        desc: "Auto-discover Obsidian vaults on this machine from Obsidian's own config.",
        example: "specflow sync --discover",
      },
      {
        cmd: 'specflow sync --pin <folder>',
        flags: "",
        desc: "Add a vault folder to the always-pull list. Persists to .specflow.json.",
        example: 'specflow sync --pin "Projects/OneRouter"',
      },
      {
        cmd: "specflow sync --one-way",
        flags: "",
        desc: "Pull-only mode (legacy). Skips write-back to vault.",
        example: "specflow sync --one-way",
      },
    ],
  },
  {
    label: "Analysis",
    color: "#a78bfa",
    cmds: [
      {
        cmd: "specflow analyze",
        flags: "[--key <key>] [--force] [--only <skills>]",
        desc: "AI-analyze your code → generate project-specific skill files. Requires ANTHROPIC_API_KEY.",
        example: "specflow analyze --only vercel/nextjs,prisma/best-practices",
      },
    ],
  },
];

export default function Commands() {
  const [active, setActive] = useState(0);

  return (
    <section id="commands" className="border-t border-border bg-bg-2">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="section-label mb-8">COMMANDS</div>

        <h2 className="text-2xl md:text-3xl font-mono font-bold text-text mb-12">
          Full CLI reference.
        </h2>

        <div className="flex flex-col lg:flex-row gap-0 border border-border">
          {/* Sidebar */}
          <div className="lg:w-48 flex flex-row lg:flex-col lg:border-r border-b lg:border-b-0 border-border overflow-x-auto">
            {groups.map((g, i) => (
              <button
                key={g.label}
                onClick={() => setActive(i)}
                className={`text-left px-4 py-3 font-mono text-xs whitespace-nowrap transition-all border-b lg:border-b last:border-b-0 border-border ${
                  active === i
                    ? "bg-bg-3 text-text"
                    : "text-muted-2 hover:text-text hover:bg-bg-2"
                }`}
              >
                <span style={{ color: active === i ? g.color : undefined }}>{g.label}</span>
              </button>
            ))}
          </div>

          {/* Commands */}
          <div className="flex-1">
            {groups[active].cmds.map((c, i) => (
              <div
                key={c.cmd}
                className={`${i > 0 ? "border-t border-border" : ""}`}
              >
                {/* Command line */}
                <div className="px-5 py-3 bg-bg-3 flex flex-wrap items-baseline gap-2 border-b border-border">
                  <span className="text-muted font-mono text-sm">$</span>
                  <span style={{ color: groups[active].color }} className="font-mono font-bold text-sm">{c.cmd}</span>
                  {c.flags && <span className="text-muted font-mono text-xs">{c.flags}</span>}
                </div>
                <div className="px-5 py-4">
                  <p className="text-muted-2 font-mono text-xs leading-relaxed mb-3">{c.desc}</p>
                  <div className="flex items-center gap-2 bg-bg-3 px-3 py-2 border border-border">
                    <span className="text-muted text-xs font-mono">e.g.</span>
                    <span className="text-muted-2 font-mono text-xs">{c.example}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plugin API callout */}
        <div className="mt-12 border border-border">
          <div className="px-6 py-3 border-b border-border bg-bg-3 flex items-center justify-between">
            <span className="text-text font-mono font-semibold text-sm">Plugin API</span>
            <span className="text-muted font-mono text-[10px] tracking-wider">FOR CLI TOOLS + EDITOR EXTENSIONS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 md:border-r border-border">
              <p className="text-muted-2 font-mono text-xs leading-relaxed mb-4">
                Use specflow as a library inside your own CLI tool or editor extension.
                Register your native AI instance for spec-driven context generation.
              </p>
              <div className="text-green font-mono text-xs">npm install @kousthubha/specflow</div>
            </div>
            <div className="p-6 bg-bg overflow-x-auto">
              <pre className="text-xs font-mono leading-relaxed">
                <span className="text-muted">{"// Claude Code, Cursor, Windsurf, etc.\n"}</span>
                <span className="text-blue">{"import"}</span>
                <span className="text-text">{" { createSpecflowPlugin } "}</span>
                <span className="text-blue">{"from"}</span>
                <span className="text-green">{" '@kousthubha/specflow/plugin';\n\n"}</span>
                <span className="text-blue">{"const"}</span>
                <span className="text-text">{" sf = "}</span>
                <span className="text-blue">{"await"}</span>
                <span className="text-text">{" createSpecflowPlugin(root);\n"}</span>
                <span className="text-blue">{"await"}</span>
                <span className="text-text">{" sf.registerCliAI(nativeAI);\n"}</span>
                <span className="text-blue">{"await"}</span>
                <span className="text-text">{" sf.detectAndSetup({ useCliAI: "}</span>
                <span className="text-green">{"true"}</span>
                <span className="text-text">{" });"}</span>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
