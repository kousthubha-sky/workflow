# Connecting Obsidian to specflow

## How it works

specflow reads your Obsidian vault directly from disk — no plugin needed.  
It picks the most relevant notes and writes them into `MEMORY/INDEX.md`,  
which your AI agent reads at the start of every session.

```
Obsidian vault (disk)
        ↓ specflow sync
MEMORY/INDEX.md   ← agent reads this
```

---

## Step 1 — Find your vault path

### Auto-discover (easiest)
```bash
specflow sync --discover
```
specflow reads Obsidian's own config to list all your vaults:
```
Found vaults:
  MyVault     /Users/sky/Documents/MyVault
  WorkNotes   /Users/sky/obsidian/WorkNotes
```

### Manual — find it yourself

| OS      | Typical location |
|---------|-----------------|
| Windows | `C:\Users\<you>\Documents\<VaultName>` |
| macOS   | `/Users/<you>/Documents/<VaultName>` or `~/obsidian/<VaultName>` |
| Linux   | `~/obsidian/<VaultName>` |

The vault root is the folder that contains `.obsidian/` (hidden folder).

---

## Step 2 — Connect it

```bash
specflow init --obsidian "C:/Users/sky/obsidian/MyVault"
```

Or if you already ran `specflow init`, edit `.specflow.json`:
```json
{
  "obsidianPath": "C:/Users/sky/obsidian/MyVault"
}
```
Then run:
```bash
specflow sync
```

---

## Step 3 — Tag notes to pin them

Any note tagged `#specflow` is **always** pulled into `MEMORY/INDEX.md`,  
regardless of how recently it was modified.

### How to tag in Obsidian

**Option A — inline tag** (anywhere in the note body):
```
#specflow
```

**Option B — front-matter** (top of file):
```yaml
---
tags: [specflow]
---
```

### What to tag

| Note | Why |
|------|-----|
| `Architecture.md` | Stack decisions, monorepo layout |
| `Decisions/payments.md` | Why you chose Stripe + Razorpay |
| `Decisions/auth.md` | Clerk vs NextAuth decision |
| `API/overview.md` | SDK design |
| `Session-current.md` | Active work-in-progress context |

---

## Step 4 — Pin entire folders (optional)

If a folder has many relevant notes, pin the whole folder:
```bash
specflow sync --pin "Projects/OneRouter"
specflow sync --pin "Architecture"
```

This persists to `.specflow.json`:
```json
{
  "pinnedFolders": ["Projects/OneRouter", "Architecture"]
}
```

All notes inside pinned folders are always pulled in.

---

## Syncing

```bash
specflow sync          # re-pull vault → MEMORY/INDEX.md
```

Run this:
- At the start of a new Claude Code session
- After writing important notes in Obsidian
- After a long break between sessions

### Auto-sync tip (optional)

Add to your shell profile to auto-sync on `cd` into any specflow project:
```bash
# ~/.zshrc or ~/.bashrc
function cd() {
  builtin cd "$@"
  if [ -f ".specflow.json" ]; then
    specflow sync 2>/dev/null &
  fi
}
```

---

## Priority order for notes

1. **Tagged `#specflow`** — always included, no limit
2. **Pinned folders** — always included
3. **Most recently modified** — top 5 of everything else

Each note contributes: path, source label, first 25 lines (front-matter stripped).

---

## .gitignore

`MEMORY/INDEX.md` contains your personal vault content — don't commit it.

```gitignore
MEMORY/INDEX.md
.specflow.json
```

---

## Troubleshooting

**"Vault not found"**  
→ Path must point to the vault root (the folder containing `.obsidian/`)  
→ Use absolute path. On Windows: `C:/Users/sky/obsidian/MyVault` (forward slashes work)

**Notes not showing up**  
→ Confirm `#specflow` is in the first 5 lines or in front-matter `tags: [specflow]`  
→ Re-run `specflow sync` after tagging

**Auto-discover not finding vaults**  
→ Snap/flatpak installs use a different config path — provide path manually
