You are running specflow sync — the bidirectional Obsidian context layer.

Your job is to bridge the developer's thinking (in Obsidian) with the project's AI context (specflow files). You read notes, route them by tag, and write project state back to the vault.

This is the **Obsidian** leg of the three-tool trinity:
- Notes tagged `#spec`/`#decision` → feed into **OpenSpec** (openspec.dev) spec proposals + SEED.md
- Notes tagged `#pattern`/`#skill` → feed into **Skills.sh** (skills.sh) skill creation/evolution
- Notes tagged `#specflow`/`#hot`/`#bug` → feed into **Memory** (MEMORY/INDEX.md)

## Prerequisites

Check `.specflow.json` for `obsidianPath`. If not configured, ask the developer for their vault path and save it.

## Determine intent from $ARGUMENTS

### Default — Bidirectional sync

**Pull from vault → project:**

1. Read markdown files from the Obsidian vault (respect pinned folders from `.specflow.json`)
2. Route notes by their tags:

   | Tag | Route to | What to do |
   |---|---|---|
   | `#spec`, `#decision`, `#architecture` | **OpenSpec** | Extract decisions → feed into `npx openspec propose` or update SPECS/SEED.md directly |
   | `#pattern`, `#skill`, `#best-practice` | **Skills.sh** | Extract patterns → feed into `npx skills create` or evolve `.skills/` files directly |
   | `#specflow`, `#hot`, `#bug`, `#workflow` | **Memory** | Include in MEMORY/INDEX.md for immediate context |

3. Generate/update `MEMORY/INDEX.md` with the hot notes — things the AI should know right now

**Push from project → vault:**

4. Write a summary of current SEED.md state back to the vault as a markdown note
5. Write summaries of any completed/archived specs back to the vault
6. Write a skills inventory note back to the vault

**Report:**
- How many notes were pulled and where they were routed
- What was pushed back to the vault
- Current state of MEMORY/INDEX.md

### Discover vaults (`--discover`)

Scan common Obsidian vault locations on this machine. Present found vaults and let the developer choose one to connect.

### Pin a folder (`--pin <folder>`)

Add a vault folder to the always-pull list in `.specflow.json`. These folders are always included in sync regardless of tags.

### One-way sync (`--one-way`)

Pull from vault only. Do not write anything back. Useful for first-time setup.
