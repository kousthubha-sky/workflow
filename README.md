# agentflow

Universal AI workflow bootstrap. One command. Any stack. Any agent.

```bash
npx agentflow init
```

Detects your stack → maps skills → writes 3 context-dense MD files → patches your agent's context file.

---

## What it does

| Layer | Tool | File written |
|---|---|---|
| Context | agentflow | `AGENT_CONTEXT.md` |
| SDD | OpenSpec | `SPECS/SEED.md` + `SPECS/active/` |
| Memory | Obsidian | `MEMORY/INDEX.md` |
| Agent hook | auto-detect | `CLAUDE.md` / `agents.md` / `copilot-instructions.md` |
| Skills | skills.sh | `.skills/` |

---

## Install

```bash
# One-time global
npm install -g agentflow

# Or just run without installing
npx agentflow init
```

---

## Commands

```bash
agentflow init [--agent <id>] [--obsidian <path>] [--dry-run]
# Full setup. Detects stack, pulls skills, writes MD files, patches agent.

agentflow update [--agent <id>]
# Re-patch agent file with latest config (run after stack changes).

agentflow sync
# Pull latest Obsidian vault notes → MEMORY/INDEX.md.

agentflow spec "<feature>"
# Propose a new feature spec (creates SPECS/active/<slug>/).

agentflow add-skill <owner/skill>
# Install a skill manually and update AGENT_CONTEXT.md.
```

---

## Supported agents

| Agent | File patched |
|---|---|
| Claude Code | `CLAUDE.md` |
| OpenCode | `agents.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules/agentflow.mdc` |
| Aider | `.aider/context.md` |
| Generic | `AGENT_CONTEXT.md` |

Agent is auto-detected. Override with `--agent`.

---

## The 3 files

### AGENT_CONTEXT.md
Context-dense agent brief. Auto-injected into your agent's context file.
Low token count, high information density. No prose.

### SPECS/SEED.md
Your architectural decisions and coding patterns.
Fill this in. Your agent reads it before every task.

### MEMORY/INDEX.md
Hot notes pulled from your Obsidian vault.
Re-sync any time with `agentflow sync`.

---

## SDD cycle (OpenSpec)

```bash
agentflow spec "add payments"   # creates SPECS/active/add-payments/
# Agent reads proposal.md → design.md → tasks.md
# Agent implements
agentflow spec --archive add-payments  # moves to SPECS/archive/
```

---

## Stack detection

Reads `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`.
Maps deps → skill packages via `config/skills-map.json`.

Add custom mappings: edit `config/skills-map.json` in your agentflow install,
or open a PR to add your stack.

---

## Config

`.agentflow.json` in project root — persists between commands.

```json
{
  "agent": "claude-code",
  "stack": ["nextjs", "supabase", "stripe"],
  "skills": ["vercel/nextjs-best-practices", "supabase/rls-patterns", "stripe/stripe-node"],
  "obsidianPath": "/Users/you/obsidian/MyProject",
  "lastSync": "2025-03-11T09:00:00.000Z",
  "activeSpec": null
}
```

---

## Add to .gitignore

```
MEMORY/INDEX.md     # personal vault content, don't commit
.agentflow.json     # may contain local paths
.skills/            # downloaded skill files
```

Commit: `AGENT_CONTEXT.md`, `SPECS/SEED.md`, `SPECS/active/`, `SPECS/archive/`

---

## Contributing

Skills map lives in `config/skills-map.json`.
To add a new stack/framework mapping, PR that file.
