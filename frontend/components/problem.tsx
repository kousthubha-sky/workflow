"use client";

const pains = [
  {
    icon: "⚡",
    title: "CONTEXT DIES EVERY SESSION",
    desc: "You spend 10 minutes re-explaining your stack, patterns, and constraints to your agent. Every. Single. Time.",
  },
  {
    icon: "🔀",
    title: "SWITCHING AGENTS BREAKS EVERYTHING",
    desc: "Moved from Cursor to Claude Code? Your carefully crafted prompts go nowhere. Start from scratch.",
  },
  {
    icon: "🧠",
    title: "THE AGENT DOESN'T KNOW YOUR RULES",
    desc: "It uses raw SQL instead of Prisma. Skips auth middleware. Ignores the patterns you've built over months.",
  },
  {
    icon: "📄",
    title: "SPECS LIVE IN YOUR HEAD",
    desc: "No structured spec means the agent implements the wrong thing, then you fix it, then it regresses.",
  },
];

export default function Problem() {
  return (
    <section className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="section-label mb-8">THE PROBLEM</div>

        <h2 className="text-2xl md:text-3xl font-mono font-bold text-text mb-3 leading-tight">
          Your agent has no memory.
        </h2>
        <p className="text-muted-2 font-mono text-sm mb-12 max-w-lg">
          AI coding agents are powerful but stateless. Every session starts from zero.
          specflow makes your project the context — persistent, structured, version-controlled.
        </p>

        {/* 2×2 bordered grid — openspec.dev style */}
        <div className="grid grid-cols-1 md:grid-cols-2 border border-border">
          {pains.map((p, i) => (
            <div
              key={p.title}
              className={`p-6 md:p-8 card-hover ${
                i % 2 !== 0 ? "md:border-l border-border" : ""
              } ${i >= 2 ? "border-t border-border" : ""}`}
            >
              <div className="text-xl mb-3">{p.icon}</div>
              <h3 className="text-text font-mono font-semibold text-xs tracking-wider mb-3">{p.title}</h3>
              <p className="text-muted-2 font-mono text-xs leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <span className="text-muted font-mono text-xs tracking-wider uppercase">
            specflow solves this with three tools ↓
          </span>
        </div>
      </div>
    </section>
  );
}
