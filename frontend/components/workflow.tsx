"use client";

const steps = [
  {
    num: "01",
    day: "Day 0",
    title: "Bootstrap once",
    color: "#3b82f6",
    cmd: "persistent init",
    what: [
      "Reads your package.json → detects stack automatically",
      "Prompts for agent (Claude Code, Cursor, Copilot, Windsurf...)",
      "Analyzes your codebase for patterns, constraints, and anti-patterns",
      "Installs skills.sh skills for every detected dependency",
      "Writes SPECS/SEED.md with real architectural DNA from your code",
      "Connects Obsidian vault if you have one",
    ],
    terminal: [
      { prompt: "$", text: "persistent init", color: "#ececec" },
      { prompt: "✓", text: "Stack: nextjs, supabase, shadcn, stripe", color: "#bef264" },
      { prompt: "✓", text: "6 skills installed → .skills/", color: "#bef264" },
      { prompt: "◐", text: "Analyzing project...", color: "#60a5fa" },
      { prompt: "✓", text: "12 patterns, 5 constraints, 4 anti-patterns extracted", color: "#bef264" },
      { prompt: "✓", text: "SPECS/SEED.md created (project-specific)", color: "#fbbf24" },
      { prompt: "✓", text: "CLAUDE.md patched [claude-code]", color: "#bef264" },
    ],
  },
  {
    num: "02",
    day: "Before every feature",
    title: "Spec first, code second",
    color: "#fbbf24",
    cmd: '/opsx:new "add feature"   (inside your agent)',
    what: [
      "Use /opsx:new inside your agent — not a separate terminal",
      "/opsx:ff generates proposal.md, design.md, tasks.md",
      "openspec/changes/<id>/ holds the full change plan",
      "/opsx:apply implements all tasks against the spec",
      "Your agent reads the spec before every implementation step",
      "No more re-explaining context each new session",
    ],
    terminal: [
      { prompt: "you", text: '/opsx:new "add stripe payments"', color: "#ececec" },
      { prompt: "→", text: "openspec/changes/add-stripe-payments/ created", color: "#888" },
      { prompt: "you", text: "/opsx:ff", color: "#ececec" },
      { prompt: "✓", text: "proposal.md — why + what + scope", color: "#bef264" },
      { prompt: "✓", text: "design.md — data model + API surface", color: "#bef264" },
      { prompt: "✓", text: "tasks.md — 8 implementation tasks", color: "#bef264" },
      { prompt: "you", text: "/opsx:apply", color: "#ececec" },
    ],
  },
  {
    num: "03",
    day: "During the session",
    title: "Your notes become context",
    color: "#a78bfa",
    cmd: "persistent sync",
    what: [
      "Jot decisions in Obsidian while you build",
      "#decision notes → merged into SPECS/SEED.md",
      "#spec notes → OpenSpec context block in MEMORY/INDEX.md",
      "#pattern notes → flagged as skill candidates",
      "Run sync any time — vault ↔ project stays in sync",
      "Agent reads MEMORY/INDEX.md at session start automatically",
    ],
    terminal: [
      { prompt: "$", text: "persistent sync", color: "#ececec" },
      { prompt: "↓", text: "Pulling vault → MEMORY/INDEX.md", color: "#a78bfa" },
      { prompt: "→", text: "3 #decision notes → SPECS/SEED.md", color: "#3b82f6" },
      { prompt: "→", text: "2 #spec notes → MEMORY/INDEX.md OpenSpec block", color: "#3b82f6" },
      { prompt: "→", text: "2 #pattern notes → skill candidates found", color: "#fbbf24" },
      { prompt: "↑", text: "Pushing SEED.md + specs → vault", color: "#a78bfa" },
      { prompt: "✓", text: "Bidirectional sync complete", color: "#bef264" },
    ],
  },
  {
    num: "04",
    day: "Feature shipped",
    title: "Archive and evolve",
    color: "#60a5fa",
    cmd: "/opsx:archive   →   persistent spec --seed-evolve <id>",
    what: [
      "/opsx:archive in your agent — moves change to openspec/changes/archive/",
      "Then: persistent spec --seed-evolve <id> — extracts patterns from design.md",
      "Patterns merge into SPECS/SEED.md — it gets smarter",
      "persistent spec --seed-clean deduplicates SEED.md over time",
      "Spec summary written back to your Obsidian vault",
      "Next spec starts with everything you just learned",
    ],
    terminal: [
      { prompt: "you", text: "/opsx:archive", color: "#ececec" },
      { prompt: "✓", text: "Archived → openspec/changes/archive/add-stripe-payments/", color: "#bef264" },
      { prompt: "$", text: "persistent spec --seed-evolve add-stripe-payments", color: "#ececec" },
      { prompt: "✓", text: "SEED.md evolved (+4 patterns)", color: "#60a5fa" },
      { prompt: "✓", text: "Spec written back → Obsidian vault", color: "#a78bfa" },
      { prompt: "$", text: "persistent spec --seed-clean", color: "#888" },
      { prompt: "✓", text: "SEED.md deduplicated", color: "#bef264" },
    ],
  },
];

export default function Workflow() {
  return (
    <section id="workflow" className="border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="section-label mb-8">THE WORKFLOW</div>
        <h2 className="text-2xl md:text-3xl font-mono font-bold text-text mb-3">How a dev uses persistent.</h2>
        <p className="text-muted-2 font-mono text-sm mb-12 max-w-lg">
          Four moments in your development lifecycle. Each one builds on the last.
          SEED.md gets smarter with every feature you ship.
        </p>

        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.num}
              className={`grid grid-cols-1 lg:grid-cols-[1fr_1fr] border border-border ${i > 0 ? "border-t-0" : ""}`}>
              <div className="p-6 md:p-8 lg:border-r border-border">
                <div className="flex items-center gap-4 mb-5">
                  <span className="font-mono font-bold text-3xl"
                    style={{ color: step.color + "33" }}>{step.num}</span>
                  <div>
                    <span className="text-[10px] font-mono tracking-[0.2em] uppercase"
                      style={{ color: step.color }}>{step.day}</span>
                    <h3 className="text-text font-mono font-bold text-lg">{step.title}</h3>
                  </div>
                </div>
                <div className="flex items-start gap-2 mb-5">
                  <span className="text-muted text-sm font-mono mt-0.5 shrink-0">$</span>
                  <code className="font-mono text-sm break-all" style={{ color: step.color }}>{step.cmd}</code>
                </div>
                <ul className="space-y-2">
                  {step.what.map((w) => (
                    <li key={w} className="flex items-start gap-2">
                      <span style={{ color: step.color }} className="text-xs mt-0.5 shrink-0">→</span>
                      <span className="text-muted-2 font-mono text-xs leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-bg-2 border-t lg:border-t-0 border-border">
                <div className="terminal-header">
                  <div className="terminal-dot bg-[#ff5f57]" />
                  <div className="terminal-dot bg-[#febc2e]" />
                  <div className="terminal-dot bg-[#28c840]" />
                  <span className="text-muted text-xs ml-2">~/my-project</span>
                </div>
                <div className="terminal-body">
                  {step.terminal.map((line, li) => (
                    <div key={li} className="min-h-[1.8em]">
                      {line.text
                        ? <><span className="text-muted">{line.prompt} </span><span style={{ color: line.color }}>{line.text}</span></>
                        : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 border border-border p-6 text-center bg-bg-2">
          <p className="text-muted-2 font-mono text-sm">
            The loop closes: archived changes → SEED.md → better specs → better code.
          </p>
          <p className="text-muted font-mono text-xs mt-1">
            OpenSpec owns the spec files. persistent owns SEED.md. Obsidian owns your thinking.
          </p>
        </div>
      </div>
    </section>
  );
}
