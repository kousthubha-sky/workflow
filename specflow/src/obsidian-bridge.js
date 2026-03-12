/**
 * obsidian-bridge.js
 * Bidirectional Obsidian integration — the context layer binding specs + skills.
 *
 * Obsidian is the knowledge graph that connects everything:
 *   → Notes tagged #persistent → pulled into MEMORY/INDEX.md
 *   → Notes tagged #spec / #decision → fed into OpenSpec proposals + SEED.md
 *   → Notes tagged #pattern / #skill → fed into skills creation + evolution
 *   ← Completed specs → written back as Obsidian notes
 *   ← Skill summaries → written back as Obsidian notes
 *   ← SEED.md changes → written back to vault
 *
 * This is NOT a one-way sync anymore — it's a bidirectional context layer.
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
const MAX_TAGGED = 10;   // all #persistent notes (no cap — they're explicit)
const MAX_RECENT = 5;    // recent notes after tagged ones
const PREVIEW_LINES = 25; // lines per note preview

// Tag routing: which tags go where
const TAG_ROUTES = {
  spec:        "openspec",    // → OpenSpec proposals
  decision:    "openspec",    // → SEED.md decisions
  architecture:"openspec",    // → SEED.md architecture
  pattern:     "skills",      // → Skill creation/evolution
  skill:       "skills",      // → Skill creation
  "best-practice": "skills",  // → Skill patterns
  convention:  "skills",      // → Skill conventions
  persistent:  "memory",      // → MEMORY/INDEX.md
  hot:         "memory",      // → MEMORY/INDEX.md
  bug:         "memory",      // → MEMORY/INDEX.md
  workflow:    "memory",      // → MEMORY/INDEX.md
};

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
 * Check if a note has the #persistent tag — either inline or in front-matter.
 * @param {string} content
 * @returns {boolean}
 */
function isPersistentTagged(content) {
  // Inline tag anywhere in file
  if (content.includes("#persistent") || content.includes("#hot")) return true;

  // Front-matter tags array
  const fm = parseFrontMatter(content);
  const tags = Array.isArray(fm.tags) ? fm.tags : [];
  return tags.some((t) => t === "persistent" || t === "hot");
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
    spinner.fail("Run `persistent init --obsidian <path>` with the correct vault path.");
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

    if (isPersistentTagged(note.content)) {
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
tagged:#persistent=${tagged.length} pinned=${pinned.length}

## how-to-use
- Tag any note \`#persistent\` → always pulled into this index
- Add folders to pinnedFolders in .persistent.json → always pulled
- All other notes: top ${MAX_RECENT} most recently modified

## hot-notes
`;

  for (const note of hotNotes) {
    const fm = parseFrontMatter(note.content);
    const preview = buildPreview(note.content);
    const source = tagged.find((t) => t.file === note.file)
      ? "tagged:#persistent"
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
\`persistent sync\`                          → refresh this file from vault
\`persistent sync --pin "Projects/MyApp"\`  → add a folder to always-pull list
`;

  // Write output
  await fs.mkdir(path.join(cwd, MEMORY_DIR), { recursive: true });
  await fs.writeFile(path.join(cwd, MEMORY_INDEX), output, "utf8");

  spinner.succeed(
    `Memory synced · ${tagged.length} tagged · ${pinned.length} pinned · ${Math.min(recent.length, MAX_RECENT)} recent · → MEMORY/INDEX.md`
  );

  return true;
}

// ─── Routed Note Extraction (Tag-based routing) ────────────────────────────

/**
 * Extract notes routed to a specific destination based on tags.
 * This is the core of the bidirectional context layer.
 *
 * @param {string} vaultPath - Absolute path to vault root
 * @param {string} destination - "openspec" | "skills" | "memory"
 * @param {Object} opts
 * @param {string[]} opts.pinnedFolders - Additional folders to include
 * @returns {Promise<Object[]>} Array of { rel, content, tags, mtime }
 */
export async function extractRoutedNotes(vaultPath, destination, opts = {}) {
  const allFiles = await glob("**/*.md", {
    cwd: vaultPath,
    ignore: ["**/.obsidian/**", "**/node_modules/**", "**/.trash/**"],
    absolute: true,
  });

  const routed = [];
  const relevantTags = Object.entries(TAG_ROUTES)
    .filter(([, dest]) => dest === destination)
    .map(([tag]) => tag);

  for (const file of allFiles) {
    try {
      const content = await fs.readFile(file, "utf8");
      const stat = await fs.stat(file);
      const noteTags = extractTags(content);

      const hasRelevantTag = noteTags.some((t) =>
        relevantTags.includes(t.replace("#", ""))
      );

      if (hasRelevantTag) {
        routed.push({
          file,
          rel: path.relative(vaultPath, file).replace(/\\/g, "/"),
          content,
          tags: noteTags,
          mtime: stat.mtimeMs,
        });
      }
    } catch {
      // Skip unreadable files
    }
  }

  // Sort by recency
  routed.sort((a, b) => b.mtime - a.mtime);
  return routed;
}

/**
 * Get notes for OpenSpec integration.
 * Returns #spec, #decision, #architecture tagged notes.
 * @param {string} vaultPath
 * @returns {Promise<{ specNotes: Object[], decisionNotes: Object[] }>}
 */
export async function getOpenSpecNotes(vaultPath) {
  const notes = await extractRoutedNotes(vaultPath, "openspec");

  const specNotes = notes.filter((n) =>
    n.tags.some((t) => t === "#spec" || t === "spec")
  );
  const decisionNotes = notes.filter((n) =>
    n.tags.some((t) =>
      t === "#decision" || t === "decision" ||
      t === "#architecture" || t === "architecture"
    )
  );

  return { specNotes, decisionNotes };
}

/**
 * Get notes for skills.sh integration.
 * Returns #pattern, #skill, #best-practice, #convention tagged notes.
 * @param {string} vaultPath
 * @returns {Promise<Object[]>}
 */
export async function getSkillNotes(vaultPath) {
  return extractRoutedNotes(vaultPath, "skills");
}

// ─── Write-Back: Project → Obsidian ────────────────────────────────────────

/**
 * Write a completed spec summary back to Obsidian vault.
 * Creates a note in the vault's persistent folder.
 *
 * @param {string} vaultPath
 * @param {Object} specData
 * @param {string} specData.slug - Spec slug
 * @param {string} specData.proposal - Proposal content
 * @param {string} specData.design - Design content
 * @param {string} specData.archiveDate - ISO date
 */
export async function writeSpecToVault(vaultPath, specData) {
  const persistentDir = path.join(vaultPath, "persistent", "specs");
  await fs.mkdir(persistentDir, { recursive: true });

  const notePath = path.join(persistentDir, `${specData.slug}.md`);
  const content = `---
tags: [persistent, spec, archived]
date: ${specData.archiveDate || new Date().toISOString().slice(0, 10)}
status: archived
---

# ${specData.slug}

## Summary
${extractSummary(specData.proposal)}

## Key Decisions
${extractDecisions(specData.design)}

## Patterns Learned
${extractPatterns(specData.design)}

---
> Auto-synced from persistent spec archive
`;

  await fs.writeFile(notePath, content, "utf8");
}

/**
 * Write skill evolution summary back to Obsidian vault.
 *
 * @param {string} vaultPath
 * @param {Object} skillData
 * @param {string} skillData.id - Skill ID
 * @param {string} skillData.content - Skill file content
 * @param {string[]} skillData.newPatterns - Newly added patterns
 */
export async function writeSkillToVault(vaultPath, skillData) {
  const persistentDir = path.join(vaultPath, "persistent", "skills");
  await fs.mkdir(persistentDir, { recursive: true });

  const safeName = skillData.id.replace("/", "-");
  const notePath = path.join(persistentDir, `${safeName}.md`);
  const content = `---
tags: [persistent, skill, pattern]
date: ${new Date().toISOString().slice(0, 10)}
skill-id: ${skillData.id}
---

# Skill: ${skillData.id}

${skillData.content ? skillData.content.slice(0, 1000) : ""}

${
  skillData.newPatterns?.length
    ? `## Recent Changes\n${skillData.newPatterns.map((p) => `- ${p}`).join("\n")}`
    : ""
}

---
> Auto-synced from persistent skill
`;

  await fs.writeFile(notePath, content, "utf8");
}

/**
 * Write SEED.md changes back to Obsidian vault.
 *
 * @param {string} vaultPath
 * @param {string} seedContent - Current SEED.md content
 */
export async function writeSeedToVault(vaultPath, seedContent) {
  const persistentDir = path.join(vaultPath, "persistent");
  await fs.mkdir(persistentDir, { recursive: true });

  const notePath = path.join(persistentDir, "SEED.md");
  const content = `---
tags: [persistent, seed, architecture]
date: ${new Date().toISOString().slice(0, 10)}
---

${seedContent}

---
> Auto-synced from project SEED.md — do not edit directly
> Changes flow: project code → archived specs → SEED.md → this note
`;

  await fs.writeFile(notePath, content, "utf8");
}

/**
 * Full bidirectional sync.
 * 1. Pull: vault → MEMORY/INDEX.md (existing behavior)
 * 2. Route: tagged notes → OpenSpec / skills destinations
 * 3. Push: SEED.md + archived specs + skills → vault
 *
 * @param {string} vaultPath
 * @param {string} cwd
 * @param {Object} opts
 * @returns {Promise<Object>} Sync results with routed notes
 */
export async function bidirectionalSync(vaultPath, cwd, opts = {}) {
  const spinner = ora("Bidirectional Obsidian sync...").start();
  const results = {
    pulled: { tagged: 0, pinned: 0, recent: 0 },
    routed: { openspec: 0, skills: 0, memory: 0 },
    pushed: { specs: 0, skills: 0, seed: false },
    specNotes: [],
    decisionNotes: [],
    skillNotes: [],
  };

  // 1. Pull: Standard sync → MEMORY/INDEX.md
  spinner.text = "Pulling from vault → MEMORY/INDEX.md...";
  await syncObsidian(vaultPath, cwd, opts);

  // 2. Route: Extract tagged notes for each destination
  spinner.text = "Routing tagged notes...";

  const { specNotes, decisionNotes } = await getOpenSpecNotes(vaultPath);
  results.specNotes = specNotes;
  results.decisionNotes = decisionNotes;
  results.routed.openspec = specNotes.length + decisionNotes.length;

  const skillNotes = await getSkillNotes(vaultPath);
  results.skillNotes = skillNotes;
  results.routed.skills = skillNotes.length;

  // 3. Push: Write back to vault
  spinner.text = "Pushing project state → vault...";

  // Push SEED.md to vault
  try {
    const seedContent = await fs.readFile(path.join(cwd, "SPECS", "SEED.md"), "utf8");
    await writeSeedToVault(vaultPath, seedContent);
    results.pushed.seed = true;
  } catch {
    // No SEED.md yet
  }

  // Push archived specs to vault
  try {
    const archiveDir = path.join(cwd, "SPECS", "archive");
    const archives = await fs.readdir(archiveDir, { withFileTypes: true });
    for (const entry of archives) {
      if (!entry.isDirectory()) continue;
      const proposal = await safeRead(path.join(archiveDir, entry.name, "proposal.md"));
      const design = await safeRead(path.join(archiveDir, entry.name, "design.md"));
      if (proposal || design) {
        await writeSpecToVault(vaultPath, {
          slug: entry.name,
          proposal: proposal || "",
          design: design || "",
          archiveDate: entry.name.slice(0, 10),
        });
        results.pushed.specs++;
      }
    }
  } catch {
    // No archives yet
  }

  spinner.succeed(
    `Bidirectional sync complete · ` +
    `Routed: ${results.routed.openspec} spec, ${results.routed.skills} skill · ` +
    `Pushed: ${results.pushed.specs} specs, seed:${results.pushed.seed ? "✓" : "—"}`
  );

  return results;
}

// ─── Tag Extraction ─────────────────────────────────────────────────────────

/**
 * Extract all tags from a note (front-matter + inline).
 * @param {string} content
 * @returns {string[]}
 */
function extractTags(content) {
  const tags = new Set();

  // Front-matter tags
  const fm = parseFrontMatter(content);
  if (Array.isArray(fm.tags)) {
    for (const t of fm.tags) tags.add(t.replace("#", ""));
  }

  // Inline tags: #word (not inside code blocks)
  const inlineMatches = content.match(/#[a-zA-Z][\w-]*/g) || [];
  for (const tag of inlineMatches) {
    tags.add(tag.replace("#", ""));
  }

  return [...tags];
}

// ─── Write-back Helpers ─────────────────────────────────────────────────────

function extractSummary(proposal) {
  if (!proposal) return "No summary available.";
  const lines = proposal.split("\n");
  const solutionIdx = lines.findIndex((l) => l.startsWith("## solution"));
  if (solutionIdx === -1) return lines.slice(0, 5).join("\n");

  const endIdx = lines.findIndex((l, i) => i > solutionIdx && l.startsWith("## "));
  return lines
    .slice(solutionIdx + 1, endIdx > 0 ? endIdx : solutionIdx + 10)
    .filter((l) => l.trim() && !l.startsWith("<!--"))
    .join("\n")
    .trim() || "No summary filled.";
}

function extractDecisions(design) {
  if (!design) return "No decisions recorded.";
  const lines = design.split("\n");
  const decisions = [];

  let inConstraints = false;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      inConstraints = line.toLowerCase().includes("constraint") || line.toLowerCase().includes("decision");
    }
    if (inConstraints && line.startsWith("- ")) {
      decisions.push(line);
    }
  }

  return decisions.length > 0 ? decisions.join("\n") : "No decisions recorded.";
}

function extractPatterns(design) {
  if (!design) return "No patterns identified.";
  const lines = design.split("\n");
  const patterns = [];

  let inPatterns = false;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      inPatterns =
        line.toLowerCase().includes("pattern") ||
        line.toLowerCase().includes("component");
    }
    if (inPatterns && line.startsWith("- ")) {
      patterns.push(line);
    }
  }

  return patterns.length > 0 ? patterns.join("\n") : "No patterns identified.";
}

async function safeRead(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}
