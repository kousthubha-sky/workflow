# Specflow

Universal AI workflow bootstrap. One command. Any stack. Any agent.

```bash
npx specflow init
```

Detects your stack → maps skills → writes 3 context-dense MD files → patches your agent's context file.

Powered by the **three-tool trinity**: [OpenSpec](https://openspec.dev) for specs, [Skills.sh](https://skills.sh) for skills, and [Obsidian](https://obsidian.md) as the bidirectional context layer.

---

## What it does

| Layer | Tool | File written |
|---|---|---|
| Context | specflow | `AGENT_CONTEXT.md` |
| SDD | OpenSpec | `SPECS/SEED.md` + `SPECS/active/` |
| Memory | Obsidian | `MEMORY/INDEX.md` |
| Agent hook | auto-detect | `CLAUDE.md` / `agents.md` / `.windsurfrules` / etc. |
| Skills | skills.sh | `.skills/` |

---

## Install

```bash
# One-time global
npm install -g @kousthubha/specflow

# Or just run without installing
npx specflow init
```

---

## Quick Start

```bash
# 1. Bootstrap your project
specflow init

# 2. Connect your Obsidian vault
specflow init --obsidian "/path/to/vault"

# 3. Propose a feature spec
specflow spec "add stripe payments"

# 4. Your AI agent now reads CLAUDE.md / SPECS/ / MEMORY/ for full context
```

---

## Commands

### `init` — Full project bootstrap

```bash
specflow init [--agent <id>] [--obsidian <path>] [--dry-run]
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
specflow spec "add payments"          # Propose a new spec
specflow spec --validate add-payments # Validate against SEED + generation-spec
specflow spec --archive add-payments  # Archive + extract patterns → evolve SEED
specflow spec --list                  # Show all active specs
specflow spec --seed                  # Regenerate SEED.md from archived patterns
```

**Workflow:**
1. `specflow spec "add payments"` → creates `SPECS/active/add-payments/`
2. AI agent reads the spec, implements it
3. `specflow spec --validate add-payments` → checks spec is complete + SEED-compliant
4. `specflow spec --archive add-payments` → moves to `SPECS/archive/`, extracts patterns, evolves SEED.md

### `skill` — Skills.sh lifecycle

Discover, install, create, and evolve skills via [skills.sh](https://skills.sh).

```bash
specflow skill --search "react auth"  # Search the skills.sh registry
specflow skill --list                 # List installed skills
specflow skill --create my-patterns   # Create a skill from project + Obsidian patterns
specflow skill --evolve my-patterns   # Evolve a skill with new patterns
specflow skill --update               # Update all installed skills
```

```bash
specflow add-skill supabase/rls-patterns  # Install a specific skill directly
```

### `sync` — Obsidian bidirectional sync

```bash
specflow sync                         # Bidirectional: vault ↔ project
specflow sync --one-way               # Pull-only (legacy)
specflow sync --discover              # Auto-discover Obsidian vaults
specflow sync --pin "Projects/MyApp"  # Pin a vault folder to always pull
```

Sync routes Obsidian notes by tag:

| Tag | Routed to |
|---|---|
| `#spec`, `#decision`, `#architecture` | OpenSpec (feeds spec proposals + SEED) |
| `#pattern`, `#skill`, `#best-practice` | Skills.sh (feeds skill creation) |
| `#specflow`, `#hot`, `#bug`, `#workflow` | Memory (MEMORY/INDEX.md) |

After sync, completed specs and evolved skills are **written back** to your vault as markdown notes.

### `analyze` — AI code analysis

```bash
specflow analyze [--key <anthropic-key>] [--force] [--only <skills>]
```

Uses Anthropic's API to analyze your actual code and generate project-specific skill files. Requires an API key.

### `update` — Re-patch agent file

```bash
specflow update [--agent <id>]
```

Re-generates the agent context file from current config. Run after manual config changes or after adding a new agent.

---

## Supported agents

`specflow init` prompts you to select which agents you use — select multiple if needed.

| Agent | File patched | Auto-detected |
|---|---|---|
| Claude Code | `CLAUDE.md` | ✓ |
| GitHub Copilot | `.github/copilot-instructions.md` | ✓ |
| Cursor | `.cursor/rules/specflow.mdc` | ✓ |
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
Re-sync any time with `specflow sync`.

---

## Plugin API

Use specflow as a library inside your own CLI tool or editor extension.

```bash
npm install @kousthubha/specflow
```

```javascript
import { createSpecflowPlugin } from "@kousthubha/specflow/plugin";

const sf = await createSpecflowPlugin("/path/to/project");

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

Add custom mappings: edit `config/skills-map.json` in your specflow install,
or open a PR to add your stack.

---

## Config

`.specflow.json` in project root — persists between commands.

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

The `.specflow/generation-spec.json` file is the **source of truth** for all context generation. It defines:

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
.specflow.json     # contains local paths (vault path, agentRoot) — optional to commit
.skills/           # downloaded skill files — regenerated on demand
```

Commit: `AGENT_CONTEXT.md`, `SPECS/SEED.md`, `SPECS/active/`, `SPECS/archive/`, `.specflow/generation-spec.json`

---

## Contributing

Skills map lives in `config/skills-map.json`.
To add a new stack/framework mapping, PR that file.
