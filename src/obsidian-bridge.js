/**
 * obsidian-bridge.js
 * Connects an Obsidian vault to agentflow's memory layer.
 *
 * Priority order for selecting hot notes:
 *   1. Notes tagged #agentflow (always included)
 *   2. Notes inside pinned folders (e.g. "Projects/MyApp")
 *   3. Most recently modified notes
 *
 * Output: MEMORY/INDEX.md — compact, context-dense, low token.
 * Never commits to git (add to .gitignore — personal vault content).
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import chalk from "chalk";
import ora from "ora";
import { glob } from "glob";

const MEMORY_DIR = "MEMORY";
const MEMORY_INDEX = "MEMORY/INDEX.md";
const OBSIDIAN_CONFIG_DIR = ".obsidian";

// How many notes to pull into INDEX.md
const MAX_TAGGED = 10;   // all #agentflow notes (no cap — they're explicit)
const MAX_RECENT = 5;    // recent notes after tagged ones
const PREVIEW_LINES = 25; // lines per note preview

// ─── Vault Discovery ────────────────────────────────────────────────────────

/**
 * Try to find Obsidian vaults on this machine automatically.
 * Obsidian stores a list of known vaults in its config JSON.
 * @returns {Promise<{path: string, name: string}[]>}
 */
export async function discoverVaults() {
  const platform = process.platform;
  const home = os.homedir();

  // Obsidian's global config location per OS
  const obsidianConfigPaths = {
    win32: [
      path.join(os.homedir(), "AppData", "Roaming", "obsidian", "obsidian.json"),
    ],
    darwin: [
      path.join(home, "Library", "Application Support", "obsidian", "obsidian.json"),
    ],
    linux: [
      path.join(home, ".config", "obsidian", "obsidian.json"),
      path.join(home, "snap", "obsidian", "current", ".config", "obsidian", "obsidian.json"),
    ],
  };

  const candidates = obsidianConfigPaths[platform] ?? [];

  for (const cfgPath of candidates) {
    try {
      const raw = await fs.readFile(cfgPath, "utf8");
      const cfg = JSON.parse(raw);

      // obsidian.json has a "vaults" key: { [id]: { path, ts } }
      if (cfg.vaults) {
        return Object.values(cfg.vaults)
          .filter((v) => v.path)
          .map((v) => ({
            path: v.path,
            name: path.basename(v.path),
          }));
      }
    } catch {
      // Config not found at this path — try next
    }
  }

  return [];
}

// ─── Front-matter Parser ────────────────────────────────────────────────────

/**
 * Parse YAML front-matter from a markdown file.
 * Minimal implementation — no external dep needed.
 * @param {string} content
 * @returns {{ tags?: string[], aliases?: string[], [key: string]: any }}
 */
function parseFrontMatter(content) {
  if (!content.startsWith("---")) return {};
  const end = content.indexOf("\n---", 3);
  if (end === -1) return {};

  const fm = content.slice(4, end).trim();
  const result = {};

  for (const line of fm.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();

    // Handle YAML arrays: tags: [a, b] or tags: a, b
    if (val.startsWith("[") && val.endsWith("]")) {
      result[key] = val.slice(1, -1).split(",").map((s) => s.trim());
    } else {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Check if a note has the #agentflow tag — either inline or in front-matter.
 * @param {string} content
 * @returns {boolean}
 */
function isAgentflowTagged(content) {
  // Inline tag anywhere in file
  if (content.includes("#agentflow") || content.includes("#hot")) return true;

  // Front-matter tags array
  const fm = parseFrontMatter(content);
  const tags = Array.isArray(fm.tags) ? fm.tags : [];
  return tags.some((t) => t === "agentflow" || t === "hot");
}

// ─── Note Reader ────────────────────────────────────────────────────────────

/**
 * Build a compact preview of a note for INDEX.md.
 * Strips front-matter, keeps meaningful content, truncates.
 * @param {string} content
 * @param {number} maxLines
 * @returns {string}
 */
function buildPreview(content, maxLines = PREVIEW_LINES) {
  let lines = content.split("\n");

  // Skip front-matter block
  if (lines[0]?.trim() === "---") {
    const endFm = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
    if (endFm !== -1) lines = lines.slice(endFm + 1);
  }

  // Skip leading blank lines
  while (lines.length && lines[0].trim() === "") lines.shift();

  return lines.slice(0, maxLines).join("\n").trim();
}

// ─── Main Sync ──────────────────────────────────────────────────────────────

/**
 * Sync an Obsidian vault into MEMORY/INDEX.md.
 * @param {string} vaultPath - Absolute path to vault root
 * @param {string} cwd - Project root
 * @param {{ pinnedFolders?: string[] }} [opts]
 */
export async function syncObsidian(vaultPath, cwd, opts = {}) {
  const spinner = ora("Syncing Obsidian vault...").start();

  // Verify vault
  try {
    await fs.access(vaultPath);
  } catch {
    spinner.fail(`Vault not found: ${chalk.yellow(vaultPath)}`);
    spinner.fail("Run `agentflow init --obsidian <path>` with the correct vault path.");
    return false;
  }

  // Verify it's actually an Obsidian vault
  const isVault = await fs
    .access(path.join(vaultPath, OBSIDIAN_CONFIG_DIR))
    .then(() => true)
    .catch(() => false);

  if (!isVault) {
    spinner.warn(
      `${chalk.yellow(vaultPath)} doesn't have a .obsidian folder — may not be a vault root.`
    );
    // Continue anyway — user may have a flat vault
  }

  // Find all .md files (exclude .obsidian internals)
  const allFiles = await glob("**/*.md", {
    cwd: vaultPath,
    ignore: [
      "**/.obsidian/**",
      "**/node_modules/**",
      "**/.trash/**",
    ],
    absolute: true,
  });

  if (allFiles.length === 0) {
    spinner.warn("No markdown files found in vault.");
    return false;
  }

  spinner.text = `Found ${allFiles.length} notes, analyzing...`;

  // Read + stat all files
  const notes = await Promise.all(
    allFiles.map(async (file) => {
      try {
        const [content, stat] = await Promise.all([
          fs.readFile(file, "utf8"),
          fs.stat(file),
        ]);
        return { file, content, mtime: stat.mtimeMs };
      } catch {
        return null;
      }
    })
  ).then((r) => r.filter(Boolean));

  // Sort by recency
  notes.sort((a, b) => b.mtime - a.mtime);

  // Bucket into tagged vs recent
  const tagged = [];
  const pinned = [];
  const recent = [];

  const pinnedFolders = opts.pinnedFolders ?? [];

  for (const note of notes) {
    const rel = path.relative(vaultPath, note.file).replace(/\\/g, "/");

    if (isAgentflowTagged(note.content)) {
      tagged.push({ ...note, rel });
    } else if (pinnedFolders.some((folder) => rel.startsWith(folder))) {
      pinned.push({ ...note, rel });
    } else {
      recent.push({ ...note, rel });
    }
  }

  // Build hot note list: tagged (all) + pinned (all) + recent (up to MAX_RECENT)
  const hotNotes = [
    ...tagged.slice(0, MAX_TAGGED),
    ...pinned,
    ...recent.slice(0, MAX_RECENT),
  ];

  // Build MEMORY/INDEX.md
  const now = new Date().toISOString();

  let output = `# memory
## vault
path:${vaultPath}
last-sync:${now}
notes-total:${allFiles.length}
tagged:#agentflow=${tagged.length} pinned=${pinned.length}

## how-to-use
- Tag any note \`#agentflow\` → always pulled into this index
- Add folders to pinnedFolders in .agentflow.json → always pulled
- All other notes: top ${MAX_RECENT} most recently modified

## hot-notes
`;

  for (const note of hotNotes) {
    const fm = parseFrontMatter(note.content);
    const preview = buildPreview(note.content);
    const source = tagged.find((t) => t.file === note.file)
      ? "tagged:#agentflow"
      : pinned.find((p) => p.file === note.file)
      ? "pinned"
      : "recent";

    output += `\n### ${note.rel}
> source:${source} · modified:${new Date(note.mtime).toISOString().slice(0, 10)}
`;
    if (fm.aliases) output += `> aliases:${Array.isArray(fm.aliases) ? fm.aliases.join(",") : fm.aliases}\n`;

    output += `\`\`\`
${preview}
\`\`\`
`;
  }

  output += `
## cmds
\`agentflow sync\`                          → refresh this file from vault
\`agentflow sync --pin "Projects/MyApp"\`  → add a folder to always-pull list
`;

  // Write output
  await fs.mkdir(path.join(cwd, MEMORY_DIR), { recursive: true });
  await fs.writeFile(path.join(cwd, MEMORY_INDEX), output, "utf8");

  spinner.succeed(
    `Memory synced · ${tagged.length} tagged · ${pinned.length} pinned · ${Math.min(recent.length, MAX_RECENT)} recent · → MEMORY/INDEX.md`
  );

  return true;
}
