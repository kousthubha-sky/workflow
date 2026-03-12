# Persistent

Universal AI workflow bootstrap with persistent context. One command. Any stack. Any agent.

```bash
npx persistent init
```

Detects your stack → maps skills → writes 3 context-dense MD files → patches your agent's context file.

Powered by the **three-tool trinity**: [OpenSpec](https://openspec.dev) for specs, [Skills.sh](https://skills.sh) for skills, and [Obsidian](https://obsidian.md) as the bidirectional context layer.

**New in 0.2.5**: `/persistent-*` slash commands, bidirectional Obsidian sync with tag routing, project-specific AI code analysis, and agent auto-detection.

---

## What it does

| Layer | Tool | File written |
|---|---|---|
| Context | persistent | `AGENT_CONTEXT.md` |
| SDD | OpenSpec | `SPECS/SEED.md` + `SPECS/active/` |
| Memory | Obsidian | `MEMORY/INDEX.md` |
| Agent hook | auto-detect | `CLAUDE.md` / `agents.md` / `.windsurfrules` / etc. |
| Skills | skills.sh | `.skills/` |

---

## Install

```bash
# One-time global
npm install -g @kousthubha/persistent

# Or just run without installing
npx persistent init
```

---

## Quick Start

```bash
# 1. Bootstrap your project
persistent init

# 2. Connect your Obsidian vault
persistent init --obsidian "/path/to/vault"

# 3. Propose a feature spec
persistent spec "add stripe payments"

# 4. Your AI agent now reads CLAUDE.md / SPECS/ / MEMORY/ for full context
```

---

## Commands

### `init` — Full project bootstrap

```bash
persistent init [--agent <id>] [--obsidian <path>] [--dry-run]
```

Detects stack, pulls skills from skills.sh, writes MD files, patches agent context. Run once per project — or re-run to regenerate after stack changes.

| Flag | Purpose |
|---|---|
| `--agent <id>` | Force a specific agent (claude-code, cursor, copilot, windsurf, aider, opencode, continue) |
| `--obsidian <path>` | Path to your Obsidian vault for memory sync |
| `--dry-run` | Preview what would be generated, without writing |

### `spec` — OpenSpec lifecycle

Manage feature specs from proposal through archival using [openspec.dev](https://openspec.dev).

```bash
persistent spec "add payments"          # Propose a new spec
persistent spec --validate add-payments # Validate against SEED + generation-spec
persistent spec --archive add-payments  # Archive + extract patterns → evolve SEED
persistent spec --list                  # Show all active specs
persistent spec --seed                  # Regenerate SEED.md from archived patterns
```

**Workflow:**
1. `persistent spec "add payments"` → creates `SPECS/active/add-payments/`
2. AI agent reads the spec, implements it
3. `persistent spec --validate add-payments` → checks spec is complete + SEED-compliant
4. `persistent spec --archive add-payments` → moves to `SPECS/archive/`, extracts patterns, evolves SEED.md

### `skill` — Skills.sh lifecycle

Discover, install, create, and evolve skills via [skills.sh](https://skills.sh).

```bash
persistent skill --search "react auth"  # Search the skills.sh registry
persistent skill --list                 # List installed skills
persistent skill --create my-patterns   # Create a skill from project + Obsidian patterns
persistent skill --evolve my-patterns   # Evolve a skill with new patterns
persistent skill --update               # Update all installed skills
```

```bash
persistent add-skill supabase/rls-patterns  # Install a specific skill directly
```

### `sync` — Obsidian bidirectional sync

```bash
persistent sync                         # Bidirectional: vault ↔ project
persistent sync --one-way               # Pull-only (legacy)
persistent sync --discover              # Auto-discover Obsidian vaults
persistent sync --pin "Projects/MyApp"  # Pin a vault folder to always pull
```

Sync routes Obsidian notes by tag:

| Tag | Routed to |
|---|---|
| `#spec`, `#decision`, `#architecture` | OpenSpec (feeds spec proposals + SEED) |
| `#pattern`, `#skill`, `#best-practice` | Skills.sh (feeds skill creation) |
| `#persistent`, `#hot`, `#bug`, `#workflow` | Memory (MEMORY/INDEX.md) |

After sync, completed specs and evolved skills are **written back** to your vault as markdown notes.

### `analyze` — Deep AI code analysis

```bash
persistent analyze [--key <anthropic-key>] [--force] [--only <skills>]
persistent analyze --only nextjs,prisma  # target specific dependencies
```

Deep-dives into your codebase (not just package.json) using Anthropic's API to generate **project-specific** skill files. Traces actual imports, patterns, configuration, custom abstractions. Requires `ANTHROPIC_API_KEY` environment variable or `--key` flag.

**What it generates:**
- How THIS project uses each dependency (with code examples)
- Custom patterns and abstractions built on top of libraries
- Project-specific gotchas and configuration choices
- Naming conventions and error handling patterns

**Use case:** After initial `persistent init`, run `analyze` to generate truly tailored skills that reflect your project's architecture.

### `update` — Re-patch agent file

```bash
persistent update [--agent <id>]
```

Re-generates the agent context file from current config. Run after manual config changes or after adding a new agent.

---

## Slash Commands (Claude Code & OpenCode)

After `persistent init`, slash commands appear in Claude Code and OpenCode editors.

| Command | What it does |
|---|---|
| `/persistent-init` | AI reads codebase → updates agent context + SPECS/SEED.md + .skills/ |
| `/persistent-spec` | AI generates or validates specs via OpenSpec lifecycle |
| `/persistent-skill` | AI analyzes patterns → creates/evolves project-specific skills |
| `/persistent-sync` | AI routes Obsidian notes by tag (#spec → OpenSpec, #pattern → skills, etc.) |
| `/persistent-analyze` | AI deep-dives code → generates detailed skill files |

These are written to:
- Claude Code: `.claude/commands/persistent-*.md`
- OpenCode: `.opencode/commands/persistent-*.md`

---

## Supported agents

`persistent init` prompts you to select which agents you use — select multiple if needed.

| Agent | File patched | Auto-detected |
|---|---|---|
| Claude Code | `CLAUDE.md` | ✓ |
| GitHub Copilot | `.github/copilot-instructions.md` | ✓ |
| Cursor | `.cursor/rules/persistent.mdc` | ✓ |
| Windsurf (Codeium) | `.windsurfrules` | ✓ |
| OpenCode | `agents.md` | ✓ |
| Continue.dev | `.continue/context.md` | ✓ |
| Aider | `.aider/context.md` | ✓ |
| Generic | `AGENT_CONTEXT.md` | fallback |

Agent is auto-detected from your project. The init prompt pre-selects the detected one — add others as needed.

---

## The 3 files

### `AGENT_CONTEXT.md`
Context-dense agent brief. Auto-injected into your agent's context file.
Low token count, high information density. No prose.

### `SPECS/SEED.md`
Your architectural decisions and coding patterns.
Fill this in. Your agent reads it before every task.
Updated automatically when specs are archived (pattern extraction → SEED evolution).

### `MEMORY/INDEX.md`
Hot notes pulled from your Obsidian vault.
Re-sync any time with `persistent sync`.

---

## Plugin API

Use persistent as a library inside your own CLI tool or editor extension.

```bash
npm install @kousthubha/persistent
```

```javascript
import { createPersistentPlugin } from "@kousthubha/persistent/plugin";

const pst = await createPersistentPlugin("/path/to/project");

// Optional: register CLI's native AI for spec-driven generation
await sf.registerCliAI(cliAIInstance);

// Full bootstrap
const result = await sf.detectAndSetup({
  agents: ["cursor", "claude-code"],
  obsidianPath: "/path/to/vault",
  useCliAI: true,
});
// result.stack  → ["nextjs", "prisma", "clerk"]
// result.files  → ["CLAUDE.md", "SPECS/SEED.md", ...]
// result.method → "ai-driven"
```

### Detection

```javascript
const info = await sf.detect();
// info.stack          → ["nextjs", "prisma"]
// info.currentAgent   → "cursor"
// info.availableAgents → ["claude-code", "cursor", "copilot", "windsurf", ...]
```

### OpenSpec lifecycle

```javascript
await sf.proposeSpec("add payments", { obsidianPath: "/vault" });
await sf.validateSpec("add-payments");
await sf.archiveSpec("add-payments");
await sf.listSpecs();
await sf.regenerateSeed();
```

### Skills lifecycle

```javascript
const results = await sf.searchSkills("react auth");
await sf.discoverSkills();           // auto-discover for detected stack
await sf.createSkill("my-patterns"); // from project + Obsidian notes
await sf.evolveSkill("my-patterns"); // merge new patterns
await sf.updateSkills();             // update all installed
const installed = await sf.listSkills();
```

### Obsidian context layer

```javascript
await sf.syncBidirectional("/path/to/vault");
const specNotes  = await sf.getSpecNotes("/vault");   // #spec, #decision tagged
const skillNotes = await sf.getSkillNotes("/vault");  // #pattern, #skill tagged
```

---

## How the three-tool trinity works

```
┌─────────────────────────────────────────────────────────┐
│                     Obsidian Vault                       │
│  Notes tagged: #spec #decision #pattern #skill #hot     │
└──────────────────┬──────────────────┬───────────────────┘
                   │  bidirectional   │
        ┌──────────▼──────┐  ┌───────▼─────────┐
        │   OpenSpec.dev  │  │   Skills.sh     │
        │   Spec lifecycle│  │   Skill lifecycle│
        │   SEED.md ←→    │  │   .skills/ ←→   │
        └────────┬────────┘  └───────┬─────────┘
                 │                   │
        ┌────────▼───────────────────▼─────────┐
        │        generation-spec.json          │
        │   Source of truth for all generation  │
        └────────────────┬─────────────────────┘
                         │
                 ┌───────▼────────┐
                 │  AGENT_CONTEXT │
                 │  CLAUDE.md etc │
                 └────────────────┘
```

1. **Obsidian** holds your thinking — decisions, patterns, architecture notes
2. **OpenSpec** turns decisions into structured specs the AI follows
3. **Skills.sh** turns patterns into reusable skill packages
4. **generation-spec.json** is the stable schema — survives AI model changes and CLI tool switching
5. Your **agent** reads the generated files and works within your spec

---

## Stack detection

Reads `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`.
Maps deps → skill packages via `config/skills-map.json`.

Add custom mappings: edit `config/skills-map.json` in your persistent install,
or open a PR to add your stack.

---

## Config

`.persistent.json` in project root — persists between commands.

```json
{
  "agent": "claude-code",
  "agents": ["claude-code", "cursor"],
  "stack": ["nextjs", "supabase", "stripe"],
  "skills": ["vercel/nextjs-best-practices", "supabase/rls-patterns", "stripe/stripe-node"],
  "obsidianPath": "/Users/you/obsidian/MyProject",
  "pinnedFolders": ["Projects/MyApp"],
  "lastSync": "2026-03-11T09:00:00.000Z",
  "activeSpec": null
}
```

---

## Generation spec

The `.persistent/generation-spec.json` file is the **source of truth** for all context generation. It defines:

- **File schemas**: required sections, token limits, format rules for each generated file
- **Integrations**: OpenSpec lifecycle, Skills.sh lifecycle, Obsidian tag routing
- **Validation rules**: token compliance, required sections, cross-file consistency
- **AI instructions**: prompts and constraints for CLI AI when generating context
- **Stability guarantees**: spec-driven means switching AI models or CLI tools doesn't break anything

The spec follows semantic versioning. Your project pins a spec version; upgrades are explicit.

---

## .gitignore

```gitignore
MEMORY/INDEX.md    # personal vault content — do not commit
.persistent.json     # contains local paths (vault path, agentRoot) — optional to commit
.skills/           # downloaded skill files — regenerated on demand
```

Commit: `AGENT_CONTEXT.md`, `SPECS/SEED.md`, `SPECS/active/`, `SPECS/archive/`, `.persistent/generation-spec.json`

---

## Contributing

Skills map lives in `config/skills-map.json`.
To add a new stack/framework mapping, PR that file.
