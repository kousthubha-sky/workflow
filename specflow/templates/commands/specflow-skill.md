You are running specflow skill — the skills.sh lifecycle manager.

Skills are markdown files in `.skills/` that provide library-specific patterns, best practices, and code templates. They are read as context during every AI session — making you smarter about how THIS project uses its dependencies.

This command integrates with **skills.sh** — the AI skill registry. When available, use the skills.sh CLI (`npx skills`) for registry operations. Fall back to local generation if the CLI is not installed.

## Determine intent from $ARGUMENTS

### Search skills (`--search <query>`)

1. **Try skills.sh CLI:** Run `npx skills search "<query>"` for registry search
2. If CLI unavailable, check https://skills.sh manually or search the local `config/skills-map.json`
3. Also check if any detected stack dependencies have community skills
3. Present results with descriptions and relevance to this project
4. Suggest which ones would be most useful based on the project's actual code

### List installed skills (`--list` or no arguments)

1. **Try skills.sh CLI:** Run `npx skills list` for version-aware listing
2. Also read all `.skills/**/*.md` files and `.skills/.manifest.json`
3. Show each skill with source (skills.sh / builtin / project-generated), version, and a one-line summary

### Create a skill from project patterns (`--create <id>`)

1. **Analyze the codebase** for patterns related to the skill topic
2. **Read Obsidian notes** tagged #pattern or #skill if vault is configured
3. **Generate `.skills/<id>.md`** containing:
   - Patterns observed in this codebase (with actual code examples from the project)
   - Best practices for this specific usage pattern
   - Common mistakes to avoid (based on what you see)
   - Code templates that match the project's conventions
4. This skill now becomes persistent context for future sessions

### Evolve a skill (`--evolve <id>`)

1. Read the existing `.skills/<id>.md`
2. Re-scan the codebase for new patterns since the skill was created
3. Check archived specs for related patterns
4. Merge new insights into the skill file
5. Report what was added or updated

### Update all skills (`--update`)

1. **Try skills.sh CLI:** Run `npx skills update <id>` for each skill from the registry
2. For project-generated skills, re-scan the codebase and evolve them with new patterns
3. Read `.skills/.manifest.json` to determine which skills came from the registry vs local
4. Report what changed

### Install a specific skill (just a skill ID, e.g., `/specflow-skill supabase/rls-patterns`)

1. **Try skills.sh CLI:** Run `npx skills add <skill-id>` to install from registry
2. If CLI unavailable, fetch from https://skills.sh and save to `.skills/<owner>/<name>.md`
3. Update `.skills/.manifest.json` with source, version, install date
4. Read the installed skill and summarize what patterns and guidance it provides
5. Update the agent's context file to reference the new skill
