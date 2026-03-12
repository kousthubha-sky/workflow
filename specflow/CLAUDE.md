# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Persistent is a universal AI workflow bootstrap tool that integrates three key systems:
- **OpenSpec** for structured specifications
- **Skills.sh** for reusable skill packages
- **Obsidian** as a bidirectional context layer

The tool detects your tech stack, maps to relevant skills, and generates context files that AI agents can use for development.

## Key Commands

### Development
```bash
# Run tests (stack detection)
node test-detect.js

# Build (not needed - ES modules)
# The package.json type: "module" enables ES modules

# Lint (not configured - add if needed)
```

### CLI Usage
```bash
# Initialize a new project
persistent init [--agent <id>] [--obsidian <path>] [--dry-run]

# Add a specific skill
persistent add-skill <skill-id>

# Search for skills
persistent skill --search <query>

# Sync with Obsidian vault
persistent sync [--pin <folder>] [--discover]

# Manage specs
persistent spec "feature name"              # Propose new spec
persistent spec --validate <slug>          # Validate against SEED
persistent spec --archive <slug>           # Archive + evolve SEED
```

## Architecture

### Core Modules

- **`src/detect-stack.js`** - Detects tech stack from package.json/pyproject.toml/go.mod/Cargo.toml
- **`src/init.js`** - Main initialization flow: detect stack → load skills → generate files
- **`src/agent-writer.js`** - Writes agent-specific context files (CLAUDE.md, agents.md, etc.)
- **`src/skills-loader.js`** - Manages skills from skills.sh registry
- **`src/spec-runner.js`** - OpenSpec lifecycle management
- **`src/obsidian-bridge.js`** - Bidirectional sync with Obsidian vaults
- **`src/analyzer.js`** - AI code analysis for skill generation

### Configuration Files

- **`config/skills-map.json`** - Maps dependencies to skill packages
- **`config/agent-map.json`** - Maps agent types to their context file names
- **`.persistent/generation-spec.json`** - Schema for all generated context files

### Generated Files Structure

When running `persistent init`, these files are created:

1. **`CLAUDE.md`** - Ultra-compressed context block for AI agents (300 tokens max)
2. **`SPECS/SEED.md`** - Architectural specification with patterns and constraints
3. **`MEMORY/INDEX.md`** - Synced from Obsidian vault
4. **`.skills/`** - Downloaded skill packages
5. **`.persistent.json`** - Local configuration (not committed)

## Stack Detection Logic

The detector uses sophisticated heuristics:

1. **Exact package matches**: "next" → "nextjs", "@supabase/supabase-js" → "supabase"
2. **Prefix matching**: "@clerk/*" → "clerk", "@radix-ui/*" → "radix"
3. **Combination detection**: "radix-ui" + "tailwindcss" → "shadcn"
4. **Version-aware**: Ignores the tool's own dependencies

## Skills Integration

Skills are pulled from skills.sh registry based on detected stack. Each skill contains:
- Patterns and best practices
- Code templates
- Validation rules

Skills are stored in `.skills/` and can be:
- Added manually: `persistent add-skill supabase/rls-patterns`
- Searched: `persistent skill --search "react auth"`
- Updated: `persistent skill --update`

## Agent Support

Automatically detects and configures:
- **Claude Code** → `CLAUDE.md`
- **Cursor** → `.cursor/rules/persistent.mdc`
- **GitHub Copilot** → `.github/copilot-instructions.md`
- **Windsurf** → `.windsurfrules`
- **Aider** → `.aider/context.md`
- **Continue.dev** → `.continue/context.md`
- **OpenCode** → `agents.md`

## Obsidian Integration

Bidirectional sync routes notes by tags:
- `#spec`, `#decision`, `#architecture` → OpenSpec specs
- `#pattern`, `#skill`, `#best-practice` → Skills.sh
- `#persistent`, `#hot`, `#bug`, `#workflow` → Memory layer

## Plugin API

The tool can be used as a library:

```javascript
import { createPersistentPlugin } from "@kousthubha/persistent/plugin";

const sf = await createPersistentPlugin("/path/to/project");
await sf.detectAndSetup({
  agents: ["cursor", "claude-code"],
  obsidianPath: "/path/to/vault"
});
```

## Important Notes

- The tool generates context files that AI agents read before working
- `.persistent.json` contains local paths and should not be committed
- `MEMORY/INDEX.md` contains personal vault content and should not be committed
- Skills are regenerated on demand from the registry
- The generation spec ensures compatibility across AI models and CLI tools