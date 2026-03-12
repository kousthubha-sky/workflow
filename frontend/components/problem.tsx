"use client";

import { Zap, Shuffle, Brain, FileText } from "lucide-react";

const pains = [
  {
    icon: Zap,
    title: "CONTEXT DIES EVERY SESSION",
    desc: "You spend 10 minutes re-explaining your stack, patterns, and constraints to your agent. Every. Single. Time.",
  },
  {
    icon: Shuffle,
    title: "SWITCHING AGENTS BREAKS EVERYTHING",
    desc: "Moved from Cursor to Claude Code? Your carefully crafted prompts go nowhere. Start from scratch.",
  },
  {
    icon: Brain,
    title: "THE AGENT DOESN'T KNOW YOUR RULES",
    desc: "It uses raw SQL instead of Prisma. Skips auth middleware. Ignores the patterns you've built over months.",
  },
  {
    icon: FileText,
    title: "SPECS LIVE IN YOUR HEAD",
    desc: "No structured spec means the agent implements the wrong thing, then you fix it, then it regresses.",
  },
];

export default function Problem() {
  return (
    <section className="border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="section-label mb-6 sm:mb-8">THE PROBLEM</div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-text mb-3 leading-tight">
          Your agent has no memory.
        </h2>
        <p className="text-muted-2 font-mono text-xs sm:text-sm mb-8 sm:mb-12 max-w-lg">
          AI coding agents are powerful but stateless. Every session starts from zero.
          persistent makes your project the context — persistent, structured, version-controlled.
        </p>

        {/* 2×2 bordered grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 border border-border">
          {pains.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className={`p-4 sm:p-6 md:p-8 card-hover ${
                  i % 2 !== 0 ? "md:border-l border-border" : ""
                } ${i >= 2 ? "border-t border-border" : ""}`}
              >
                <Icon size={20} className="text-muted-2 mb-3" strokeWidth={1.5} />
                <h3 className="text-text font-mono font-semibold text-[10px] sm:text-xs tracking-wider mb-3">{p.title}</h3>
                <p className="text-muted-2 font-mono text-[10px] sm:text-xs leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <span className="text-muted font-mono text-xs tracking-wider uppercase">
            persistent solves this with three tools ↓
          </span>
        </div>
      </div>
    </section>
  );
}
