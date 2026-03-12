You are running specflow analyze — deep AI code analysis for project-specific skill generation.

Unlike `/specflow-init` which does a broad bootstrap, analyze does a DEEP dive into specific areas of the codebase and generates highly detailed, project-specific skill files that integrate with **skills.sh** (skills.sh).

## What to do

1. **Read `.specflow.json`** to get the detected stack. If not initialized, suggest running `/specflow-init` first.

2. **Deep-scan the codebase** for each detected technology:
   - Read actual source files (not just package.json)
   - Trace how libraries are used: imports, configuration, patterns
   - Identify custom abstractions built on top of libraries
   - Find helper functions, utilities, and shared patterns
   - Note inconsistencies or potential improvements

3. **Generate project-specific skill files** in `.skills/`:

   For each major dependency, create or overwrite `.skills/<name>.md` with:

   **How THIS project uses it** (not generic docs)
   - Actual import patterns from the codebase
   - Configuration choices made and why they matter
   - Custom wrappers or abstractions
   - Code examples pulled directly from this project
   - If a skills.sh skill exists for this library (`npx skills search "<lib>"`), merge registry best practices with project-specific patterns

   **Patterns to follow**
   - Consistent patterns found across the codebase
   - Naming conventions specific to this library's usage
   - Error handling patterns
   - Testing patterns for this library

   **Pitfalls specific to this setup**
   - Version-specific gotchas for the installed version
   - Conflicts with other libraries in the stack
   - Common mistakes given this project's architecture

4. **Update the agent's context file** with a refreshed skills summary

5. **Report:**
   - Skills generated/updated (with byte counts)
   - Key patterns discovered
   - Potential issues or inconsistencies found
   - Suggestions for architectural improvements

$ARGUMENTS may contain:
- `--only <skills>` — Comma-separated list of specific areas to analyze (e.g., `--only nextjs,prisma`)
- `--force` — Regenerate ALL skills even if they exist
