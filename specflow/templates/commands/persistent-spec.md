You are running persistent spec — the OpenSpec lifecycle manager.

Your job is to create, validate, or archive structured feature specifications that persist across sessions. Use your own intelligence to write specs that are actually useful, not boilerplate.

This command integrates with **OpenSpec** (openspec.dev) — the spec-driven development framework. When available, use the OpenSpec CLI (`npx openspec`) for spec operations. Fall back to local generation if the CLI is not installed.

## Determine intent from $ARGUMENTS

### Proposing a new spec (e.g., `/persistent-spec add stripe payments`)

1. **Try OpenSpec CLI first:** Run `npx openspec propose "<feature>"` — if it works, it creates a standards-compliant spec. Then enhance it with the steps below.

2. **Read existing context:**
   - Read `SPECS/SEED.md` for established patterns and constraints
   - Read the agent's context file (CLAUDE.md, agents.md, etc.) for project architecture
   - Read any relevant `.skills/` files for library-specific guidance (installed via skills.sh)
   - If `MEMORY/INDEX.md` exists, check for related decisions or notes

2. **Create the spec directory:** `SPECS/active/<slug>/`

3. **Generate three files using YOUR reasoning:**

   **proposal.md** — What and why
   - Problem statement (what user need does this solve?)
   - Proposed solution (high-level approach)
   - Scope boundaries (what's in, what's explicitly out)
   - Open questions (things the developer needs to decide)
   - Impact analysis (what existing code this touches)

   **design.md** — How
   - Data model changes (new tables, fields, relationships)
   - API surface (new endpoints, modified endpoints)
   - Component architecture (new components, modified components)
   - Integration points (third-party services, existing systems)
   - Constraints from SEED.md that apply
   - Security and performance considerations

   **tasks.md** — Actionable checklist
   - Break the feature into implementable chunks
   - Order by dependency (what must be built first)
   - Each task should be completable in one session
   - Include verification steps for each task

4. **Present the spec** and ask if the developer wants to refine anything before starting implementation.

### Validating a spec (`--validate <slug>`)

1. **Try OpenSpec CLI:** Run `npx openspec validate "<slug>"` for standards-compliant validation
2. **Also validate locally** against:
   - `SPECS/SEED.md` patterns — does the design follow established patterns?
- Completeness — are all three files filled in?
- Task coverage — do tasks cover the full design?
- Report issues and suggest fixes.

### Archiving a spec (`--archive <slug>`)

1. **Try OpenSpec CLI:** Run `npx openspec archive "<slug>"` for standards-compliant archival
2. Move `SPECS/active/<slug>/` → `SPECS/archive/YYYY-MM-DD-<slug>/`
3. **Extract patterns** from the design.md — what reusable patterns emerged?
3. **Evolve SEED.md** — merge new patterns, update anti-patterns if any were discovered
4. Report what was learned and added to SEED.md

### Listing specs (`--list`)

Read `SPECS/active/` and show each spec with its progress (completed/total tasks from tasks.md).

### Regenerating SEED (`--seed`)

Read all `SPECS/archive/*/design.md` files. Extract patterns across all archived specs. Regenerate SEED.md from scratch with the accumulated wisdom.
