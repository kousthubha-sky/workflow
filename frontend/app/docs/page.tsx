"use client";
import Link from "next/link";
import { useState } from "react";

function G({ children }: { children: React.ReactNode }) { return <span style={{ color: "#00e87a" }}>{children}</span>; }
function A({ children }: { children: React.ReactNode }) { return <span style={{ color: "#f59e0b" }}>{children}</span>; }
function B({ children }: { children: React.ReactNode }) { return <span style={{ color: "#60a5fa" }}>{children}</span>; }
function M({ children }: { children: React.ReactNode }) { return <span style={{ color: "#444" }}>{children}</span>; }

function Code({ children, lang }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ border: "1px solid #1a1a1a", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "7px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#333", fontSize: 11, fontFamily: "inherit" }}>{lang ?? "bash"}</span>
        <button onClick={() => { navigator.clipboard?.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          style={{ color: "#333", fontSize: 11, cursor: "pointer", fontFamily: "inherit", background: "none", border: "none" }}>
          {copied ? <G>copied</G> : "copy"}
        </button>
      </div>
      <pre style={{ padding: "14px 18px", fontSize: 12.5, lineHeight: 1.85, overflowX: "auto", background: "#090909" }}>
        <code style={{ fontFamily: "inherit", color: "#888", whiteSpace: "pre" }}>{children}</code>
      </pre>
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-mono font-bold" style={{ color: "#d4d4d4", fontSize: "1.2rem", marginBottom: 12, marginTop: 48, paddingTop: 8, borderTop: "1px solid #141414" }}>
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="font-mono font-semibold" style={{ color: "#aaa", fontSize: "0.95rem", marginBottom: 10, marginTop: 28 }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="font-mono" style={{ color: "#555", fontSize: 13, lineHeight: 1.85, marginBottom: 14 }}>{children}</p>;
}

function Cmd({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div style={{ borderBottom: "1px solid #141414", padding: "14px 0" }}>
      <div className="font-mono font-semibold mb-1" style={{ color: "#00e87a", fontSize: 13 }}>{cmd}</div>
      <div className="font-mono" style={{ color: "#555", fontSize: 12.5, lineHeight: 1.7 }}>{desc}</div>
    </div>
  );
}

const sections = [
  { id: "install", label: "Installation" },
  { id: "init", label: "init" },
  { id: "spec", label: "spec" },
  { id: "skill", label: "skill" },
  { id: "sync", label: "sync" },
  { id: "analyze", label: "analyze" },
  { id: "config", label: "Config file" },
  { id: "gitignore", label: ".gitignore" },
  { id: "plugin", label: "Plugin API" },
  { id: "obsidian", label: "Obsidian setup" },
  { id: "generation-spec", label: "generation-spec.json" },
];

export default function Docs() {
  return (
    <>
      {/* nav */}
      <nav style={{ borderBottom: "1px solid #141414", background: "#09090999", backdropFilter: "blur(12px)", position: "fixed", top: 0, left: 0, right: 0, zIndex: 50 }}>
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="font-mono font-bold text-sm" style={{ color: "#00e87a" }}>specflow</Link>
          <div className="flex items-center gap-5">
            <Link href="/" className="font-mono text-xs" style={{ color: "#444" }}>← home</Link>
            <a href="https://github.com/kousthubha-sky/workflow" target="_blank" rel="noopener noreferrer"
              className="font-mono text-xs px-3 py-1.5 rounded" style={{ border: "1px solid #1e1e1e", color: "#555" }}>
              GitHub
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 flex gap-12">
        {/* sidebar */}
        <aside className="hidden lg:block w-44 shrink-0 sticky top-20 self-start">
          <div className="font-mono text-xs mb-4" style={{ color: "#333", letterSpacing: "0.1em" }}>DOCS</div>
          <nav className="space-y-1">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}
                className="block font-mono text-xs py-1 transition-colors hover:text-[#d4d4d4]"
                style={{ color: "#3d3d3d" }}>
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* content */}
        <main className="flex-1 min-w-0" style={{ maxWidth: 720 }}>
          <div className="font-mono font-bold mb-1" style={{ color: "#d4d4d4", fontSize: "1.8rem" }}>Documentation</div>
          <P>Everything you need to use specflow in your project.</P>

          {/* ── Install ── */}
          <H2 id="install">Installation</H2>
          <P>Run without installing (recommended for first use):</P>
          <Code>{`npx @kousthubha/specflow init`}</Code>
          <P>Or install globally:</P>
          <Code>{`npm install -g @kousthubha/specflow`}</Code>
          <P>Requires Node 18+. No API keys needed for core features — only <code style={{color:"#888"}}>analyze</code> uses Anthropic.</P>

          {/* ── init ── */}
          <H2 id="init">specflow init</H2>
          <P>Full project bootstrap. Run once from your project root.</P>
          <Code>{`specflow init [--agent <id>] [--obsidian <path>] [--dry-run]`}</Code>

          <P>What it does:</P>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            {[
              "Reads package.json / pyproject.toml / go.mod / Cargo.toml → detects stack",
              "Prompts multi-select: which agents do you use? (pre-selects detected one)",
              "Patches each agent's context file simultaneously",
              "Pulls skills from skills.sh for every detected dependency",
              "Optionally connects Obsidian vault",
              "Writes SPECS/SEED.md and AGENT_CONTEXT.md",
              "Saves .specflow.json config",
            ].map((item) => (
              <li key={item} className="font-mono mb-1" style={{ color: "#555", fontSize: 12.5, lineHeight: 1.8 }}>
                <G>→</G> {item}
              </li>
            ))}
          </ul>

          <H3>Flags</H3>
          <div style={{ border: "1px solid #141414", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
            {[
              ["--agent <id>", "Force a specific agent. Values: claude-code, cursor, copilot, windsurf, opencode, continue, aider"],
              ["--obsidian <path>", "Absolute path to your Obsidian vault root (the folder containing .obsidian/)"],
              ["--dry-run", "Preview everything that would be written without touching any files"],
            ].map(([flag, desc]) => (
              <div key={flag} style={{ borderBottom: "1px solid #141414", padding: "12px 16px", display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
                <code className="font-mono" style={{ color: "#00e87a", fontSize: 12 }}>{flag}</code>
                <span className="font-mono" style={{ color: "#555", fontSize: 12 }}>{desc}</span>
              </div>
            ))}
          </div>

          {/* ── spec ── */}
          <H2 id="spec">specflow spec</H2>
          <P>OpenSpec lifecycle — propose, validate, archive, list, regenerate SEED.</P>

          <Cmd cmd={`specflow spec "add feature name"`} desc="Propose a new spec. Creates SPECS/active/<slug>/ with proposal.md, design.md, tasks.md." />
          <Cmd cmd="specflow spec --validate <slug>" desc="Validate a spec against SEED.md constraints and generation-spec rules. Catches missing sections, SEED conflicts." />
          <Cmd cmd="specflow spec --archive <slug>" desc="Archive a completed spec. Extracts patterns from design.md, merges into SEED.md. Moves spec to SPECS/archive/. Writes spec back to Obsidian vault." />
          <Cmd cmd="specflow spec --list" desc="List all active specs with task completion progress." />
          <Cmd cmd="specflow spec --seed" desc="Regenerate SEED.md from all archived spec patterns." />

          <H3>Spec file structure</H3>
          <Code lang="text">{`SPECS/
├── SEED.md                          ← architectural DNA (commit)
├── active/
│   └── add-razorpay-payments/
│       ├── proposal.md              ← problem, solution, scope
│       ├── design.md                ← data model, API, constraints
│       └── tasks.md                 ← actionable checklist
└── archive/
    └── 2026-03-11-add-payments/     ← completed specs`}</Code>

          {/* ── skill ── */}
          <H2 id="skill">specflow skill</H2>
          <P>Skills.sh lifecycle — search, create, evolve, update installed skills.</P>

          <Cmd cmd="specflow skill --search &quot;react auth&quot;" desc="Search the skills.sh community registry for matching skills." />
          <Cmd cmd="specflow skill --list" desc="List all installed skills with source (registry/builtin/placeholder) and version." />
          <Cmd cmd="specflow skill --create <owner/name>" desc="Create a skill from your project patterns + tagged Obsidian notes. Uses AI if ANTHROPIC_API_KEY is set." />
          <Cmd cmd="specflow skill --evolve <owner/name>" desc="Merge new patterns into an existing skill file." />
          <Cmd cmd="specflow skill --update" desc="Update all installed skills to latest versions via skills.sh CLI." />
          <Cmd cmd="specflow add-skill <owner/name>" desc="Install a specific skill directly. Falls back: registry → builtin → placeholder." />

          <H3>Install priority</H3>
          <P>For each skill: <G>skills.sh registry</G> → <A>bundled builtin</A> → <M>placeholder file</M>. Manifest tracked at .skills/.manifest.json.</P>

          {/* ── sync ── */}
          <H2 id="sync">specflow sync</H2>
          <P>Bidirectional Obsidian sync. Pulls notes in, routes them by tag, pushes specs and SEED back to vault.</P>

          <Code>{`specflow sync                          # bidirectional (default)
specflow sync --one-way               # pull from vault only
specflow sync --discover              # auto-find Obsidian vaults on this machine
specflow sync --pin "Projects/App"    # pin a vault folder to always pull`}</Code>

          <H3>Tag routing</H3>
          <div style={{ border: "1px solid #141414", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
            {[
              { tags: "#spec, #decision, #architecture", dest: "OpenSpec — feeds spec proposals and SEED.md evolution", color: "#00e87a" },
              { tags: "#pattern, #skill, #best-practice, #convention", dest: "Skills.sh — feeds skill creation and evolution", color: "#f59e0b" },
              { tags: "#specflow, #hot, #bug, #workflow", dest: "Memory — MEMORY/INDEX.md (agent reads this)", color: "#60a5fa" },
            ].map((row) => (
              <div key={row.tags} style={{ borderBottom: "1px solid #141414", padding: "12px 16px", display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
                <code className="font-mono" style={{ color: row.color, fontSize: 12 }}>{row.tags}</code>
                <span className="font-mono" style={{ color: "#555", fontSize: 12 }}>{row.dest}</span>
              </div>
            ))}
          </div>

          <H3>Write-back (bidirectional)</H3>
          <P>After sync, specflow writes back to <code style={{color:"#888"}}>{'<vault>'}/specflow/</code>:</P>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            {[
              "Archived specs → specflow/specs/<slug>.md (tagged #specflow #archived)",
              "SEED.md snapshot → specflow/SEED.md (tagged #specflow #seed)",
              "Evolved skills → specflow/skills/<id>.md (tagged #specflow #skill)",
            ].map(item => (
              <li key={item} className="font-mono mb-1" style={{ color: "#555", fontSize: 12.5 }}><G>→</G> {item}</li>
            ))}
          </ul>

          {/* ── analyze ── */}
          <H2 id="analyze">specflow analyze</H2>
          <P>AI-analyze your actual code and generate project-specific skill files. Requires Anthropic API key.</P>
          <Code>{`specflow analyze                        # analyze all detected skills
specflow analyze --key sk-ant-...      # pass API key directly
specflow analyze --force               # regenerate even if files exist
specflow analyze --only stripe/node    # target specific skills`}</Code>
          <P>Uses <code style={{color:"#888"}}>claude-haiku-4-5</code> — fast and cheap. Set <code style={{color:"#888"}}>ANTHROPIC_API_KEY</code> in env to avoid passing --key every time.</P>

          {/* ── config ── */}
          <H2 id="config">Config file (.specflow.json)</H2>
          <P>Auto-created by <code style={{color:"#888"}}>specflow init</code>. Persists state between commands.</P>
          <Code lang="json">{`{
  "agent": "claude-code",
  "agents": ["claude-code", "cursor"],
  "agentRoot": "/absolute/path/to/monorepo/root",
  "stack": ["nextjs", "prisma", "clerk", "stripe"],
  "skills": ["vercel/nextjs", "prisma/best-practices", "stripe/stripe-node"],
  "obsidianPath": "/Users/you/obsidian/MyProject",
  "pinnedFolders": ["Projects/MyApp", "Architecture"],
  "lastSync": "2026-03-11T09:00:00.000Z",
  "activeSpec": null
}`}</Code>

          {/* ── gitignore ── */}
          <H2 id="gitignore">.gitignore</H2>
          <Code>{`# specflow — do not commit these
MEMORY/INDEX.md        # personal vault content
.specflow.json         # contains local paths (vault, agentRoot)
.skills/               # downloaded skills — regenerated on demand

# commit these
# AGENT_CONTEXT.md
# SPECS/
# .specflow/generation-spec.json`}</Code>

          {/* ── plugin ── */}
          <H2 id="plugin">Plugin API</H2>
          <P>Use specflow as a library in your own CLI tool or editor extension.</P>
          <Code lang="typescript">{`import { createSpecflowPlugin } from "@kousthubha/specflow/plugin";

const sf = await createSpecflowPlugin("/path/to/project");

// Optional: register your CLI's native AI for spec-driven generation
await sf.registerCliAI(cliAIInstance);

// Bootstrap
const result = await sf.detectAndSetup({
  agents: ["claude-code", "cursor"],
  obsidianPath: "/path/to/vault",
  useCliAI: true,  // use registered AI to generate context files
});
// result.stack  → ["nextjs", "prisma"]
// result.files  → ["CLAUDE.md", "SPECS/SEED.md", ...]
// result.method → "ai-driven" | "static"`}</Code>

          <H3>Detection only</H3>
          <Code lang="typescript">{`const info = await sf.detect();
// { stack: ["nextjs","prisma"], currentAgent: "cursor", availableAgents: [...] }`}</Code>

          <H3>OpenSpec lifecycle</H3>
          <Code lang="typescript">{`await sf.proposeSpec("add payments");
await sf.validateSpec("add-payments");
await sf.archiveSpec("add-payments");
const specs = await sf.listSpecs();    // [{ slug, progress }]
await sf.regenerateSeed();`}</Code>

          <H3>Skills lifecycle</H3>
          <Code lang="typescript">{`const results = await sf.searchSkills("react auth");
await sf.discoverSkills();           // auto-discover for detected stack
await sf.createSkill("team/patterns");
await sf.evolveSkill("team/patterns");
await sf.updateSkills();
const installed = await sf.listSkills();`}</Code>

          <H3>Obsidian</H3>
          <Code lang="typescript">{`await sf.syncBidirectional("/path/to/vault");
const specNotes  = await sf.getSpecNotes("/vault");   // #spec, #decision
const skillNotes = await sf.getSkillNotes("/vault");  // #pattern, #skill`}</Code>

          {/* ── obsidian setup ── */}
          <H2 id="obsidian">Obsidian setup</H2>
          <H3>Auto-discover vaults</H3>
          <P>specflow reads Obsidian's own config JSON to find your vaults:</P>
          <Code>{`specflow sync --discover
# Found vaults:
#   MyVault     /Users/sky/Documents/MyVault
#   WorkNotes   /Users/sky/obsidian/WorkNotes`}</Code>

          <H3>Connect manually</H3>
          <Code>{`specflow init --obsidian "/absolute/path/to/vault"
# vault root = folder containing .obsidian/ directory`}</Code>

          <H3>Vault path by OS</H3>
          <div style={{ border: "1px solid #141414", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
            {[
              ["Windows", "C:\\Users\\<you>\\Documents\\<VaultName>"],
              ["macOS", "/Users/<you>/Documents/<VaultName>"],
              ["Linux", "~/obsidian/<VaultName>"],
            ].map(([os, path]) => (
              <div key={os} style={{ borderBottom: "1px solid #141414", padding: "10px 16px", display: "grid", gridTemplateColumns: "100px 1fr", gap: 16 }}>
                <span className="font-mono" style={{ color: "#555", fontSize: 12 }}>{os}</span>
                <code className="font-mono" style={{ color: "#888", fontSize: 12 }}>{path}</code>
              </div>
            ))}
          </div>

          <H3>Tagging notes</H3>
          <P>Inline tag (anywhere in note body):</P>
          <Code lang="markdown">{`#specflow
#decision  your decision here`}</Code>
          <P>Front-matter tags:</P>
          <Code lang="yaml">{`---
tags: [specflow, decision, architecture]
---`}</Code>

          {/* ── generation-spec ── */}
          <H2 id="generation-spec">generation-spec.json</H2>
          <P>The stable source of truth for all context generation. Lives at <code style={{color:"#888"}}>.specflow/generation-spec.json</code> in your project — commit it.</P>
          <P>It defines: file schemas (required sections, token limits), validation rules, AI generation prompts, integration settings for OpenSpec/skills/Obsidian. Follows semantic versioning — switching AI models or CLI tools doesn't break your specs because the spec is the source of truth, not the model.</P>
          <Code>{`# Initialize generation-spec in your project
specflow init  # creates .specflow/generation-spec.json automatically`}</Code>
        </main>
      </div>
    </>
  );
}
