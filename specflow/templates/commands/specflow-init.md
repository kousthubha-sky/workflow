You are running specflow init — the universal AI workflow bootstrap.

Your job is to analyze this project and generate context directly into the agent's own context file (e.g., CLAUDE.md for Claude Code, agents.md for OpenCode, etc.). If the file already exists, **alter it in place** — do not overwrite, merge your context into it.

This command is powered by the **three-tool trinity**:
- **OpenSpec** (openspec.dev) — spec-driven development lifecycle
- **Skills.sh** (skills.sh) — dynamic skill packages for AI context
- **Obsidian** (obsidian.md) — bidirectional context layer (handled by `/specflow-sync`, not here)

## Step 1: Detect the stack

Read the project's dependency files (package.json, pyproject.toml, go.mod, Cargo.toml, etc.) and identify:
- Frameworks (Next.js, Django, Express, etc.)
- Databases (Prisma, Supabase, MongoDB, etc.)
- Auth providers (Clerk, NextAuth, etc.)
- UI libraries (Tailwind, shadcn, Radix, etc.)
- Payment systems (Stripe, Razorpay, etc.)
- Any other significant dependencies

## Step 2: Scan the codebase

Read the actual source files — routes, components, API endpoints, database schemas. Understand:
- Project architecture and directory structure
- Key patterns already in use (state management, data fetching, etc.)
- Coding conventions (naming, file organization, error handling)
- Existing tests and their patterns

## Step 3: Write to the agent's context file

**This is the core output.** Write or update the agent's own context file with a specflow context block:

- **If the file already exists** (e.g., CLAUDE.md is already written): Find and replace the `<!-- specflow:start -->` to `<!-- specflow:end -->` block. If no such block exists, prepend your context block to the file. **Never overwrite the developer's own content.**
- **If the file doesn't exist**: Create it with the specflow context block.

The context block should be ultra-compressed, high information density, under 300 tokens:
- Stack summary (one line)
- Architecture overview (directory map + key patterns)
- Active constraints and anti-patterns
- Key file locations (entry points, config, schemas)
- Skills reference (list installed .skills/ files)
- SDD cycle reminder: propose → apply → archive

## Step 4: Initialize SPECS/ structure via OpenSpec

1. **Try OpenSpec CLI first:** Run `npx openspec init` to set up the spec directory structure
2. **If OpenSpec CLI is not available**, create these directories manually:
   - `SPECS/active/` — for in-progress feature specs
   - `SPECS/archive/` — for completed specs (pattern extraction feeds SEED.md)
3. **Generate `SPECS/SEED.md`** — the project's architectural DNA, containing:
   - Patterns observed in the codebase (with examples)
   - Anti-patterns to avoid
   - Architecture decisions (documented or inferred)
   - Constraints (performance, security, compatibility)
4. If `.specflow/generation-spec.json` exists, validate compliance with its schema

## Step 5: Install skills via skills.sh

For each major dependency detected:

1. **Try skills.sh CLI:** Run `npx skills search "<dependency>"` → `npx skills add <skill-id>`
2. **If CLI unavailable**, create `.skills/<owner>/<name>.md` locally with project-specific patterns
3. **Enhance with AI analysis:** Read actual source files to see how the dependency is used
4. Skills are stored in `.skills/` and referenced from the agent context block

Skills registry: https://skills.sh

## Step 6: Save config

Write `.specflow.json` with detected stack, selected agents, installed skills, and timestamps.

## Step 7: Summary

Present what you generated:
- Stack detected
- Agent context file written/updated (which file, how many tokens)
- SPECS/ initialized
- Skills installed
- Suggested next steps: "Run `/specflow-spec` to propose your first feature spec"

$ARGUMENTS may contain: --agent <id> (force agent), --dry-run (preview only)

**Do NOT create** AGENT_CONTEXT.md or MEMORY/INDEX.md — the agent file itself is the context, and Obsidian sync is handled by `/specflow-sync`.
