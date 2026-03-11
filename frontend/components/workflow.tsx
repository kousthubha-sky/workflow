"use client";

const steps = [
  {
    num: "01",
    day: "Day 0",
    title: "Bootstrap once",
    color: "#00ff87",
    cmd: "specflow init",
    what: [
      "Reads your package.json → detects stack automatically",
      "Multi-select prompt: pick which agents you use",
      "Patches CLAUDE.md, .cursor/rules/, .windsurfrules — all at once",
      "Pulls skills from skills.sh for every detected dependency",
      "Connects Obsidian vault if you have one",
      "Writes SPECS/SEED.md — fill in your architecture decisions",
    ],
    terminal: [
      { prompt: "$", text: "specflow init", color: "#00ff87" },
      { prompt: "✓", text: "Stack: nextjs, prisma, clerk, stripe, shadcn", color: "#00ff87" },
      { prompt: "?", text: "Agents: ◉ Claude Code  ◉ Cursor  ◯ Copilot", color: "#60a5fa" },
      { prompt: "✓", text: "10 skills installed → .skills/", color: "#00ff87" },
      { prompt: "✓", text: "CLAUDE.md patched", color: "#00ff87" },
      { prompt: "✓", text: ".cursor/rules/specflow.mdc patched", color: "#00ff87" },
      { prompt: "✓", text: "SPECS/SEED.md ready — fill in your patterns", color: "#f59e0b" },
    ],
  },
  {
    num: "02",
    day: "Before every feature",
    title: "Spec first, code second",
    color: "#f59e0b",
    cmd: 'specflow spec "add feature"',
    what: [
      "Creates SPECS/active/<slug>/ with three files",
      "proposal.md — problem, solution, scope, open questions",
      "design.md — data model, API surface, components, constraints",
      "tasks.md — actionable checklist",
      "Your agent reads the spec before implementing",
      "No more re-explaining the feature every session",
    ],
    terminal: [
      { prompt: "$", text: 'specflow spec "add razorpay payments"', color: "#f59e0b" },
      { prompt: "✓", text: "Proposing: add-razorpay-payments", color: "#f59e0b" },
      { prompt: "→", text: "SPECS/active/add-razorpay-payments/proposal.md", color: "#888" },
      { prompt: "→", text: "SPECS/active/add-razorpay-payments/design.md", color: "#888" },
      { prompt: "→", text: "SPECS/active/add-razorpay-payments/tasks.md", color: "#888" },
      { prompt: "", text: "", color: "" },
      { prompt: "→", text: "Validate: specflow spec --validate add-razorpay-payments", color: "#555" },
    ],
  },
  {
    num: "03",
    day: "During the session",
    title: "Your notes become context",
    color: "#60a5fa",
    cmd: "specflow sync",
    what: [
      "Jot decisions in Obsidian while you build",
      "#decision → feeds SEED.md, shapes future specs",
      "#pattern → feeds skills, improves future code",
      "#bug → shows up in MEMORY/INDEX.md for your agent",
      "Run sync any time to pull fresh notes in",
      "Agent reads MEMORY/INDEX.md at session start",
    ],
    terminal: [
      { prompt: "$", text: "specflow sync", color: "#60a5fa" },
      { prompt: "↓", text: "Pulling vault → MEMORY/INDEX.md", color: "#60a5fa" },
      { prompt: "→", text: "3 #decision notes → OpenSpec SEED", color: "#00ff87" },
      { prompt: "→", text: "2 #pattern notes → skills evolution", color: "#f59e0b" },
      { prompt: "→", text: "1 #bug note → MEMORY/INDEX.md", color: "#60a5fa" },
      { prompt: "↑", text: "Pushing SEED.md snapshot → vault", color: "#60a5fa" },
      { prompt: "✓", text: "Bidirectional sync complete", color: "#60a5fa" },
    ],
  },
  {
    num: "04",
    day: "Feature shipped",
    title: "Archive and evolve",
    color: "#a78bfa",
    cmd: "specflow spec --archive add-razorpay-payments",
    what: [
      "Moves spec to SPECS/archive/ with timestamp",
      "Extracts patterns from design.md automatically",
      "Merges new patterns into SEED.md — it gets smarter",
      "Writes spec summary back to your Obsidian vault",
      "Next spec starts with everything you just learned",
      "SEED.md evolves from real shipped work, not docs",
    ],
    terminal: [
      { prompt: "$", text: "specflow spec --archive add-razorpay-payments", color: "#a78bfa" },
      { prompt: "✓", text: "Archived → SPECS/archive/2026-03-11-add-razorpay-payments/", color: "#a78bfa" },
      { prompt: "✓", text: "Patterns extracted from design.md", color: "#a78bfa" },
      { prompt: "✓", text: "SEED.md evolved (+3 patterns)", color: "#00ff87" },
      { prompt: "✓", text: "Spec written back to Obsidian vault", color: "#60a5fa" },
      { prompt: "", text: "", color: "" },
      { prompt: "→", text: "Next spec starts smarter", color: "#555" },
    ],
  },
];

export default function Workflow() {
  return (
    <section id="workflow" className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="section-label mb-8">THE WORKFLOW</div>

        <h2 className="text-2xl md:text-3xl font-mono font-bold text-text mb-3">
          How a dev uses specflow.
        </h2>
        <p className="text-muted-2 font-mono text-sm mb-12 max-w-lg">
          Four moments in your development lifecycle. Each one builds on the last.
          SEED.md gets smarter with every feature you ship.
        </p>

        <div className="space-y-0">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`grid grid-cols-1 lg:grid-cols-[1fr_1fr] border border-border ${
                i > 0 ? "border-t-0" : ""
              }`}
            >
              {/* Left — content */}
              <div className="p-6 md:p-8 lg:border-r border-border">
                <div className="flex items-center gap-4 mb-5">
                  {/* Big number */}
                  <span
                    className="font-mono font-bold text-3xl"
                    style={{ color: step.color + "33" }}
                  >
                    {step.num}
                  </span>
                  <div>
                    <span
                      className="text-[10px] font-mono tracking-[0.2em] uppercase"
                      style={{ color: step.color }}
                    >
                      {step.day}
                    </span>
                    <h3 className="text-text font-mono font-bold text-lg">{step.title}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-5">
                  <span className="text-muted text-sm font-mono">$</span>
                  <code className="font-mono text-sm" style={{ color: step.color }}>{step.cmd}</code>
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

              {/* Right — terminal */}
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
                      {line.text ? (
                        <>
                          <span className="text-muted">{line.prompt} </span>
                          <span style={{ color: line.color }}>{line.text}</span>
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 border border-border p-6 text-center bg-bg-2">
          <p className="text-muted-2 font-mono text-sm">The loop closes: archived specs → SEED.md → better specs → better code.</p>
          <p className="text-muted font-mono text-xs mt-1">SEED.md evolves from real shipped features, not documentation nobody maintains.</p>
        </div>
      </div>
    </section>
  );
}
