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
  { id: "slash-commands", label: "Slash commands" },
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
          <Link href="/" className="font-mono font-bold text-sm" style={{ color: "#00e87a" }}>persistent</Link>
          <div className="flex items-center gap-5">
            <Link href="/" className="font-mono text-xs" style={{ color: "#444" }}>← home</Link>
            <a href="https://github.com/kousthubha-sky/workflow" target="_blank" rel="noopener noreferrer"
              className="font-mono text-xs px-3 py-1.5 rounded" style={{ border: "1px solid #1e1e1e", color: "#555" }}>
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* name change announcement */}
      <div className="max-w-6xl mx-auto px-6">
        <div style={{ background: "#1a1a0a", border: "1px solid #3d3a00", borderRadius: 8, padding: "14px 18px", marginTop: 16, marginBottom: 24 }}>
          <div className="font-mono font-bold" style={{ color: "#fbbf24", fontSize: 13, marginBottom: 4 }}>
            ⚠️ Notice: specflow → persistent
          </div>
          <p className="font-mono" style={{ color: "#666", fontSize: 12, lineHeight: 1.7, margin: 0 }}>
            spec-flow has been renamed to <B>persistent</B> due to naming conflicts. All commands now use <code style={{ color: "#00e87a" }}>persistent</code> instead of <code style={{ color: "#888" }}>specflow</code>. The npm package is now <code style={{ color: "#00e87a" }}>@kousthubha/persistent</code>.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-24 flex gap-12">
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
          <P>Everything you need to use persistent in your project.</P>

          {/* ── Install ── */}
          <H2 id="install">Installation</H2>
          <P>Run without installing (recommended for first use):</P>
          <Code>{`npx @kousthubha/persistent init`}</Code>
          <P>Or install globally:</P>
          <Code>{`npm install -g @kousthubha/persistent`}</Code>
          <P>Requires Node 18+. No API keys needed for core features — only <code style={{color:"#888"}}>analyze</code> uses Anthropic.</P>

          {/* ── init ── */}
          <H2 id="init">persistent init</H2>
          <P>Full project bootstrap. Run once from your project root.</P>
          <Code>{`persistent init [--agent <id>] [--obsidian <path>] [--dry-run]`}</Code>

          <P>What it does:</P>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            {[
              "Reads package.json / pyproject.toml / go.mod / Cargo.toml → detects stack",
              "Prompts multi-select: which agents do you use? (pre-selects detected one)",
              "Writes context directly into each agent's own file (CLAUDE.md, agents.md, etc.)",
              "Pulls skills from skills.sh for every detected dependency",
              "Optionally connects Obsidian vault",
              "Initializes SPECS/SEED.md via OpenSpec",
              "Creates /persistent-* slash commands for Claude Code and OpenCode",
              "Saves .persistent.json config",
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
          <H2 id="spec">persistent spec</H2>
          <P>Spec lifecycle — OpenSpec handles change files inside your agent, persistent owns SEED.md evolution.</P>

          {/* OpenSpec slash commands callout */}
          <div style={{ background: "#0d1117", border: "1px solid #1e3a5f", borderRadius: 6, padding: "14px 18px", marginBottom: 20 }}>
            <div className="font-mono font-bold" style={{ color: "#60a5fa", fontSize: 12, marginBottom: 8 }}>
              OpenSpec slash commands — run inside your agent, not in terminal
            </div>
            <div style={{ marginBottom: 8 }}>
              {[
                ['/opsx:new "feature name"', "Create a new change with id derived from feature name"],
                ["/opsx:ff", "Fast-forward: generate proposal.md, design.md, tasks.md in one shot"],
                ["/opsx:apply", "Implement all tasks in tasks.md sequentially"],
                ["/opsx:archive", "Archive completed change → openspec/changes/archive/"],
              ].map(([cmd, desc]) => (
                <div key={cmd} style={{ borderBottom: "1px solid #1e3a5f33", padding: "6px 0", display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
                  <code className="font-mono" style={{ color: "#60a5fa", fontSize: 11 }}>{cmd}</code>
                  <span className="font-mono" style={{ color: "#555", fontSize: 11 }}>{desc}</span>
                </div>
              ))}
            </div>
            <div className="font-mono" style={{ color: "#444", fontSize: 11 }}>
              Install: <code style={{ color: "#60a5fa" }}>npm install -g @fission-ai/openspec@latest</code>
              <span style={{ margin: "0 8px", color: "#333" }}>·</span>
              Docs: <a href="https://openspec.dev" target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa" }}>openspec.dev</a>
            </div>
          </div>

          <Cmd cmd={`persistent spec "add feature name"`} desc='Shows the /opsx slash commands to use inside your agent for this feature. OpenSpec CLI handles spec creation — not persistent.' />
          <Cmd cmd="persistent spec --list" desc="List active OpenSpec changes in openspec/changes/ with task completion progress." />
          <Cmd cmd="persistent spec --seed-evolve <id>" desc="After /opsx:archive in your agent, run this to extract patterns from the archived change's design.md and merge them into SPECS/SEED.md." />
          <Cmd cmd="persistent spec --seed" desc="Re-initialize SPECS/SEED.md if it doesn't exist or you want a clean slate." />
          <Cmd cmd="persistent spec --seed-clean" desc="Deduplicate and compress SPECS/SEED.md. Removes repeated pattern lines that accumulate after multiple seed-evolve runs." />

          <H3>File ownership</H3>
          <Code lang="text">{`# OpenSpec owns (created by /opsx:* commands inside your agent)
openspec/changes/<id>/
├── proposal.md              ← problem, solution, scope
├── design.md                ← data model, API, constraints
└── tasks.md                 ← actionable checklist
openspec/changes/archive/    ← after /opsx:archive

# persistent owns (commit these)
SPECS/
└── SEED.md                  ← architectural DNA, evolves via --seed-evolve`}</Code>

          {/* ── skill ── */}
          <H2 id="skill">persistent skill</H2>
          <P>Skills.sh lifecycle — search, create, evolve, update installed skills.</P>

          <Cmd cmd="persistent skill --search &quot;react auth&quot;" desc="Search the skills.sh community registry for matching skills." />
          <Cmd cmd="persistent skill --list" desc="List all installed skills with source (registry/builtin/placeholder) and version." />
          <Cmd cmd="persistent skill --create <owner/name>" desc="Create a skill from your project patterns + tagged Obsidian notes. Uses AI if ANTHROPIC_API_KEY is set." />
          <Cmd cmd="persistent skill --evolve <owner/name>" desc="Merge new patterns into an existing skill file." />
          <Cmd cmd="persistent skill --update" desc="Update all installed skills to latest versions via skills.sh CLI." />
          <Cmd cmd="persistent add-skill <owner/name>" desc="Install a specific skill directly. Falls back: registry → builtin → placeholder." />

          <H3>Install priority</H3>
          <P>For each skill: <G>skills.sh registry</G> → <A>bundled builtin</A> → <M>placeholder file</M>. Manifest tracked at .skills/.manifest.json.</P>

          {/* ── sync ── */}
          <H2 id="sync">persistent sync</H2>
          <P>Bidirectional Obsidian sync. Pulls notes in, routes them by tag, pushes specs and SEED back to vault.</P>

          <Code>{`persistent sync                          # bidirectional (default)
persistent sync --one-way               # pull from vault only
persistent sync --discover              # auto-find Obsidian vaults on this machine
persistent sync --pin "Projects/App"    # pin a vault folder to always pull`}</Code>

          <H3>Tag routing</H3>
          <div style={{ border: "1px solid #141414", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
            {[
              { tags: "#spec, #decision, #architecture", dest: "OpenSpec — feeds spec proposals and SEED.md evolution", color: "#00e87a" },
              { tags: "#pattern, #skill, #best-practice, #convention", dest: "Skills.sh — feeds skill creation and evolution", color: "#f59e0b" },
              { tags: "#persistent, #hot, #bug, #workflow", dest: "Memory — MEMORY/INDEX.md (agent reads this)", color: "#60a5fa" },
            ].map((row) => (
              <div key={row.tags} style={{ borderBottom: "1px solid #141414", padding: "12px 16px", display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
                <code className="font-mono" style={{ color: row.color, fontSize: 12 }}>{row.tags}</code>
                <span className="font-mono" style={{ color: "#555", fontSize: 12 }}>{row.dest}</span>
              </div>
            ))}
          </div>

          <H3>Write-back (bidirectional)</H3>
          <P>After sync, persistent writes back to <code style={{color:"#888"}}>{'<vault>'}/persistent/</code>:</P>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            {[
              "Archived specs → persistent/specs/<slug>.md (tagged #persistent #archived)",
              "SEED.md snapshot → persistent/SEED.md (tagged #persistent #seed)",
              "Evolved skills → persistent/skills/<id>.md (tagged #persistent #skill)",
            ].map(item => (
              <li key={item} className="font-mono mb-1" style={{ color: "#555", fontSize: 12.5 }}><G>→</G> {item}</li>
            ))}
          </ul>

          {/* ── analyze ── */}
          <H2 id="analyze">persistent analyze</H2>
          <P>AI deep-dive into your actual code. Generates <A>project-specific</A> skill files that reflect how YOUR project uses each library.</P>
          <Code>{`persistent analyze                        # analyze all detected skills
persistent analyze --key sk-ant-...      # pass API key directly
persistent analyze --force               # regenerate even if files exist
persistent analyze --only stripe/node    # target specific dependencies`}</Code>

          <H3>How it differs from init</H3>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            {[
              "init → broad bootstrap, 2-3 minutes total",
              "analyze → deep code tracing, 5-10 minutes per skill, much more detailed",
              "init → generic best practices",
              "analyze → your project's actual patterns and gotchas",
              "init → recommended first, regenerate rarely",
              "analyze → recommended after stack is mature, run on demand",
            ].map((item) => (
              <li key={item} className="font-mono mb-1" style={{ color: "#555", fontSize: 12.5, lineHeight: 1.8 }}>
                <G>→</G> {item}
              </li>
            ))}
          </ul>

          <H3>What analyze generates</H3>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            {[
              "How this project uses each dependency (not generic docs)",
              "Actual import patterns traced from source files",
              "Custom abstractions and wrappers built on top of libraries",
              "Project-specific configuration choices and why they matter",
              "Naming conventions and error handling patterns",
              "Version-specific gotchas for your installed versions",
              "Conflicts with other libraries in your stack",
              "Code examples pulled directly from your source",
              "Suggestions for architectural improvements",
            ].map((item) => (
              <li key={item} className="font-mono mb-1" style={{ color: "#555", fontSize: 12.5, lineHeight: 1.8 }}>
                <G>→</G> {item}
              </li>
            ))}
          </ul>

          <P>Uses <code style={{color:"#888"}}>claude-haiku-4-5</code> via Anthropic API — fast and cheap. Set <code style={{color:"#888"}}>ANTHROPIC_API_KEY</code> in env to avoid passing --key every time.</P>

          {/* ── slash commands ── */}
          <H2 id="slash-commands">Slash commands</H2>
          <P>For <G>Claude Code</G> and <G>OpenCode</G>, persistent init creates native slash commands. Type <code style={{color:"#888"}}>/persistent-</code> in the AI chat to see them.</P>
          <P>These are <A>AI-native</A> — the AI agent itself executes these commands by reading files and analyzing code. They appear as instant suggestions in the chat interface.</P>

          <div style={{ border: "1px solid #141414", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
            {[
              { cmd: "/persistent-init", desc: "AI reads package.json + codebase → generates CLAUDE.md context + SPECS/SEED.md + .skills/ from scratch (re-bootstrap)" },
              { cmd: "/persistent-spec", desc: "AI generates or validates specs via OpenSpec. Read SPECS/SEED.md + MEMORY/INDEX.md for context." },
              { cmd: "/persistent-skill", desc: "AI analyzes your actual code patterns → creates/evolves project-specific skills with examples from your source" },
              { cmd: "/persistent-sync", desc: "AI reads MEMORY/INDEX.md + Obsidian vault notes → routes by tag → updates SEED.md and skills" },
              { cmd: "/persistent-analyze", desc: "AI performs deep code analysis → generates detailed skill files with architecture insights and gotchas" },
            ].map(({ cmd, desc }) => (
              <div key={cmd} style={{ borderBottom: "1px solid #141414", padding: "12px 16px", display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
                <code className="font-mono font-semibold" style={{ color: "#00e87a", fontSize: 12 }}>{cmd}</code>
                <span className="font-mono" style={{ color: "#555", fontSize: 12 }}>{desc}</span>
              </div>
            ))}
          </div>

          <H3>Where commands are stored</H3>
          <P>After <code style={{color:"#888"}}>persistent init</code>, slash commands are written to:</P>
          <Code lang="text">{`.claude/commands/
├── persistent-init.md
├── persistent-spec.md
├── persistent-skill.md
├── persistent-sync.md
└── persistent-analyze.md

.opencode/commands/
└── (same files)

# Each .md file contains instructions for the AI to read and execute
# The AI reads these when you type /persistent-* in the chat`}</Code>

          <H3>How they work</H3>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            {[
              "You type /persistent-spec in Claude Code/OpenCode chat",
              "AI reads the markdown file for instructions",
              "AI reads your codebase, SPECS/SEED.md, MEMORY/INDEX.md per instructions",
              "AI generates context (specs, skills, config updates)",
              "AI writes files to your project",
              "Result: faster, more context-aware interactions with the AI",
            ].map((item) => (
              <li key={item} className="font-mono mb-1" style={{ color: "#555", fontSize: 12.5, lineHeight: 1.8 }}>
                <A>→</A> {item}
              </li>
            ))}
          </ul>

          <P>Supported agents: <G>Claude Code</G> (<code style={{color:"#888"}}>.claude/commands/</code>) and <G>OpenCode</G> (<code style={{color:"#888"}}>.opencode/commands/</code>). Other agents (Cursor, Copilot, etc.) use CLI commands directly from terminal.</P>

          {/* ── config ── */}
          <H2 id="config">Config file (.persistent.json)</H2>
          <P>Auto-created by <code style={{color:"#888"}}>persistent init</code>. Persists state between commands.</P>
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
          <Code>{`# persistent — do not commit these
MEMORY/INDEX.md        # personal vault content
.persistent.json         # contains local paths (vault, agentRoot)
.skills/               # downloaded skills — regenerated on demand

# commit these
# CLAUDE.md (or agents.md, .cursor/rules/, etc.)
# SPECS/
# .persistent/generation-spec.json`}</Code>

          {/* ── plugin ── */}
          <H2 id="plugin">Plugin API</H2>
          <P>Use persistent as a library in your own CLI tool or editor extension.</P>
          <Code lang="typescript">{`import { createPersistentPlugin } from "@kousthubha/persistent/plugin";

const sf = await createPersistentPlugin("/path/to/project");

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
          <P>persistent reads Obsidian's own config JSON to find your vaults:</P>
          <Code>{`persistent sync --discover
# Found vaults:
#   MyVault     /Users/sky/Documents/MyVault
#   WorkNotes   /Users/sky/obsidian/WorkNotes`}</Code>

          <H3>Connect manually</H3>
          <Code>{`persistent init --obsidian "/absolute/path/to/vault"
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
          <Code lang="markdown">{`#persistent
#decision  your decision here`}</Code>
          <P>Front-matter tags:</P>
          <Code lang="yaml">{`---
tags: [persistent, decision, architecture]
---`}</Code>

          {/* ── generation-spec ── */}
          <H2 id="generation-spec">generation-spec.json</H2>
          <P>The stable source of truth for all context generation. Lives at <code style={{color:"#888"}}>.persistent/generation-spec.json</code> in your project — commit it.</P>
          <P>It defines: file schemas (required sections, token limits), validation rules, AI generation prompts, integration settings for OpenSpec/skills/Obsidian. Follows semantic versioning — switching AI models or CLI tools doesn't break your specs because the spec is the source of truth, not the model.</P>
          <Code>{`# Initialize generation-spec in your project
persistent init  # creates .persistent/generation-spec.json automatically`}</Code>
        </main>
      </div>
    </>
  );
}