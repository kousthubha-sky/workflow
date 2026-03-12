/**
 * openspec-integration.js
 *
 * Thin wrapper around the real OpenSpec CLI (@fission-ai/openspec).
 * persistent does NOT re-implement spec creation — OpenSpec owns that.
 *
 * What THIS module does:
 *   1. Check/install OpenSpec if missing
 *   2. Run `openspec init` / `openspec update` in the project
 *   3. Build SEED.md (persistent-specific: accumulated architectural DNA)
 *   4. Route Obsidian context into the agent's context window BEFORE
 *      the user runs OpenSpec slash commands (/opsx:new, /opsx:ff, etc.)
 *
 * OpenSpec structure (owned by openspec, not us):
 *   openspec/specs/<feature>/spec.md      ← living requirements
 *   openspec/changes/<id>/proposal.md     ← proposed change
 *   openspec/changes/<id>/design.md       ← technical decisions
 *   openspec/changes/<id>/tasks.md        ← implementation checklist
 *   openspec/changes/<id>/specs/          ← spec deltas
 *
 * OpenSpec slash commands (run inside your agent, not here):
 *   /opsx:new <feature>    — create a change
 *   /opsx:ff               — fast-forward: generate proposal + design + tasks
 *   /opsx:apply            — implement tasks
 *   /opsx:archive          — archive completed change
 *   /opsx:onboard          — first-time setup walkthrough
 *
 * SEED.md (persistent-specific, complements OpenSpec):
 *   SPECS/SEED.md          — architectural DNA that evolves with each archive
 */

import { execSync, spawnSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";

const SEED_FILE = path.join("SPECS", "SEED.md");
const SPECS_DIR = "SPECS";

// ─── OpenSpec CLI Detection + Install ───────────────────────────────────────

/**
 * Check if openspec is available globally.
 * @returns {{ available: boolean, version: string|null }}
 */
export async function checkOpenSpec() {
  try {
    const out = execSync("openspec --version", { stdio: "pipe", timeout: 8_000, encoding: "utf8" });
    return { available: true, version: out.trim() };
  } catch {
    return { available: false, version: null };
  }
}

/**
 * Run an openspec CLI command in the project.
 * @param {string[]} args  - e.g. ["init"] or ["update"]
 * @param {string}   cwd   - project root
 */
function runOpenSpec(args, cwd) {
  const result = spawnSync("openspec", args, {
    cwd,
    stdio: "inherit",   // stream output live to user
    timeout: 60_000,
    shell: process.platform === "win32",
  });
  return { ok: result.status === 0, status: result.status };
}

// ─── Init ───────────────────────────────────────────────────────────────────

/**
 * Initialize OpenSpec in the project + set up SEED.md.
 * Called during `persistent init`.
 *
 * @param {string}   cwd
 * @param {Object}   opts
 * @param {string[]} opts.stack         - Detected stack keys
 * @param {Object[]} opts.decisionNotes - Obsidian #decision notes to seed SEED.md
 */
export async function initOpenSpec(cwd, opts = {}) {
  const { available, version } = await checkOpenSpec();

  if (!available) {
    console.log(chalk.yellow("\n⚠  OpenSpec not found globally."));
    console.log(chalk.dim("  Install: ") + chalk.cyan("npm install -g @fission-ai/openspec@latest"));
    console.log(chalk.dim("  Then re-run: ") + chalk.cyan("persistent init\n"));
    console.log(chalk.dim("  Skipping OpenSpec setup — continuing with SEED.md only.\n"));
  } else {
    console.log(chalk.green("✓") + ` OpenSpec ${chalk.dim(version)}`);
    const spinner = ora("Running openspec init...").start();

    // Check if openspec is already initialized (openspec/ dir exists)
    const alreadyInit = await fileExists(path.join(cwd, "openspec"));
    if (alreadyInit) {
      // Update instead of init to avoid overwriting existing structure
      const result = runOpenSpec(["update"], cwd);
      spinner.succeed(result.ok ? "openspec update done" : "openspec update had warnings (see above)");
    } else {
      const result = runOpenSpec(["init"], cwd);
      spinner.succeed(result.ok ? "openspec init done" : "openspec init had warnings (see above)");
    }
  }

  // Always set up SEED.md — this is persistent's own contribution
  await ensureSeed(cwd, opts);
}

/**
 * Update OpenSpec agent instructions in the project.
 * Called during `persistent update`.
 * @param {string} cwd
 */
export async function updateOpenSpec(cwd) {
  const { available } = await checkOpenSpec();
  if (!available) {
    console.log(chalk.dim("  OpenSpec not installed — skipping update."));
    console.log(chalk.dim("  Install: npm install -g @fission-ai/openspec@latest"));
    return;
  }

  const spinner = ora("Updating OpenSpec agent instructions...").start();
  const result = runOpenSpec(["update"], cwd);
  spinner.succeed(result.ok ? "openspec update done" : "openspec update had warnings");
}

// ─── SEED.md (persistent-specific) ──────────────────────────────────────────

/**
 * Ensure SEED.md exists. Creates it with Obsidian decisions if provided.
 * SEED.md is persistent's architectural DNA file — NOT part of OpenSpec.
 *
 * @param {string}   cwd
 * @param {Object}   opts
 * @param {string[]} opts.stack         - Detected stack keys
 * @param {Object[]} opts.decisionNotes - Obsidian #decision notes
 */
export async function ensureSeed(cwd, opts = {}) {
  const seedPath = path.join(cwd, SEED_FILE);
  await fs.mkdir(path.join(cwd, SPECS_DIR), { recursive: true });

  const exists = await fileExists(seedPath);
  if (exists) {
    // Already exists — merge in any new Obsidian decisions
    await mergeDecisionsIntoSeed(seedPath, opts.decisionNotes || []);
    return;
  }

  // Create fresh SEED.md
  const content = buildSeedTemplate(opts.stack || [], opts.decisionNotes || []);
  await fs.writeFile(seedPath, content, "utf8");
  console.log(chalk.green("✓") + " SPECS/SEED.md created");
}

/**
 * Merge Obsidian #decision notes into SEED.md without duplicating.
 * Called after every bidirectional sync.
 *
 * @param {string}   seedPath
 * @param {Object[]} decisionNotes - { rel: string, content: string }[]
 */
export async function mergeDecisionsIntoSeed(seedPath, decisionNotes) {
  if (!decisionNotes.length) return;

  const current = await fs.readFile(seedPath, "utf8").catch(() => "");

  const toAdd = decisionNotes.filter((note) => {
    // Don't add if first line of note already appears in SEED
    const firstLine = (note.content || "").split("\n").find((l) => l.trim())?.trim();
    return firstLine && !current.includes(firstLine);
  });

  if (!toAdd.length) return;

  const section = `\n## Decisions (from Obsidian — ${isoDate()})\n${toAdd
    .map((n) => {
      const title = (n.rel || "note").replace(/\.md$/, "");
      const firstLine = (n.content || "").split("\n").find((l) => l.trim())?.trim() || "";
      return `- **${title}**: ${firstLine.slice(0, 120)}`;
    })
    .join("\n")}\n`;

  await fs.appendFile(seedPath, section, "utf8");
  console.log(chalk.green("✓") + ` SEED.md updated with ${toAdd.length} Obsidian decisions`);
}

/**
 * Evolve SEED.md after an OpenSpec change is archived.
 * Reads the archived change folder and extracts patterns.
 *
 * @param {string} cwd
 * @param {string} changeId - e.g. "add-dark-mode" or "2025-01-23-add-dark-mode"
 */
export async function evolveSeedFromArchive(cwd, changeId) {
  const seedPath = path.join(cwd, SEED_FILE);

  // Read the archived change (OpenSpec puts it in openspec/changes/archive/<id>/)
  const archiveBase = path.join(cwd, "openspec", "changes", "archive");
  let changeDir = path.join(archiveBase, changeId);

  // If exact match not found, try prefix match
  if (!(await fileExists(changeDir))) {
    try {
      const entries = await fs.readdir(archiveBase, { withFileTypes: true });
      const match = entries.find((e) => e.isDirectory() && e.name.includes(changeId));
      if (match) changeDir = path.join(archiveBase, match.name);
    } catch {
      console.log(chalk.dim(`  No archive found for change: ${changeId}`));
      return;
    }
  }

  const design = await safeRead(path.join(changeDir, "design.md"));
  const proposal = await safeRead(path.join(changeDir, "proposal.md"));

  if (!design && !proposal) {
    console.log(chalk.dim(`  No design/proposal found in archive: ${changeId}`));
    return;
  }

  // Extract patterns from design decisions
  const patterns = extractPatternsFromDesign(design || "");

  if (!patterns.length) {
    console.log(chalk.dim(`  No extractable patterns in ${changeId}`));
    return;
  }

  const current = await safeRead(seedPath) || buildSeedTemplate([], []);
  const section = `\n## Patterns from: ${changeId} (${isoDate()})\n${patterns.map((p) => `- ${p}`).join("\n")}\n`;

  await fs.writeFile(seedPath, current + section, "utf8");
  console.log(chalk.green("✓") + ` SEED.md evolved from ${chalk.cyan(changeId)} (+${patterns.length} patterns)`);
}

/**
 * Clean/deduplicate SEED.md — merge repeated pattern sections.
 * Called by `persistent spec --seed-clean`.
 * @param {string} cwd
 */
export async function cleanSeed(cwd) {
  const seedPath = path.join(cwd, SEED_FILE);
  const content = await safeRead(seedPath);
  if (!content) {
    console.log(chalk.yellow("No SEED.md found."));
    return;
  }

  // Collect all pattern lines across sections, deduplicate
  const lines = content.split("\n");
  const seen = new Set();
  const deduped = [];
  let inPatternSection = false;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      inPatternSection = line.toLowerCase().includes("pattern");
      deduped.push(line);
      continue;
    }

    if (inPatternSection && line.startsWith("- ")) {
      const key = line.trim().toLowerCase();
      if (seen.has(key)) continue; // skip duplicate
      seen.add(key);
    }

    deduped.push(line);
  }

  // Remove empty "Patterns from:" sections
  const filtered = deduped.join("\n").replace(
    /\n## Patterns from: [^\n]+\n(?=\n## |\n*$)/g,
    "\n"
  );

  await fs.writeFile(seedPath, filtered.trim() + "\n", "utf8");
  const removed = lines.length - filtered.split("\n").length;
  console.log(chalk.green("✓") + ` SEED.md cleaned (${removed > 0 ? removed : 0} duplicate lines removed)`);
}

/**
 * List OpenSpec changes (active + archived).
 * @param {string} cwd
 */
export async function listActiveSpecs(cwd) {
  const changesDir = path.join(cwd, "openspec", "changes");
  const specs = [];

  try {
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "archive") continue;
      const changeDir = path.join(changesDir, entry.name);
      const tasks = await safeRead(path.join(changeDir, "tasks.md"));
      const total = (tasks?.match(/- \[[ x]\]/gi) || []).length;
      const done  = (tasks?.match(/- \[x\]/gi)    || []).length;

      specs.push({
        slug:     entry.name,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
        files:    total > 0 ? [`${done}/${total} tasks complete`] : ["no tasks yet"],
      });
    }
  } catch {
    // openspec/ not initialized yet
  }

  return specs;
}

/**
 * Print OpenSpec slash command reference for the user's agent.
 * This is how users actually interact with OpenSpec — not through persistent.
 *
 * @param {string} agentId
 */
export function printOpenSpecWorkflow(agentId) {
  console.log(chalk.bold("\nOpenSpec workflow (run inside your agent):"));
  console.log(chalk.dim('  /opsx:new "feature name"   — start a new change'));
  console.log(chalk.dim("  /opsx:ff                   — generate proposal + design + tasks"));
  console.log(chalk.dim("  /opsx:apply                — implement tasks"));
  console.log(chalk.dim("  /opsx:archive              — archive completed change → evolves SEED.md"));
  console.log(chalk.dim("  /opsx:onboard              — first-time walkthrough\n"));

  if (agentId === "cursor" || agentId === "windsurf") {
    console.log(chalk.dim("  Tip: OpenSpec slash commands are registered in your agent automatically.\n"));
  }
}

// ─── Context helpers for Obsidian → OpenSpec bridge ────────────────────────

/**
 * Format Obsidian spec/decision notes as a context block to prepend
 * to MEMORY/INDEX.md so the agent reads them before running /opsx:new.
 *
 * @param {Object[]} specNotes     - Obsidian notes tagged #spec
 * @param {Object[]} decisionNotes - Obsidian notes tagged #decision or #architecture
 * @returns {string}               - Markdown block to prepend
 */
export function buildObsidianContextBlock(specNotes, decisionNotes) {
  if (!specNotes.length && !decisionNotes.length) return "";

  const lines = ["## obsidian-context-for-openspec", ""];

  if (specNotes.length) {
    lines.push("### Pending spec ideas (from vault #spec tags)");
    for (const note of specNotes.slice(0, 5)) {
      const firstLine = (note.content || "").split("\n").find((l) => l.trim()) || note.rel;
      lines.push(`- ${note.rel}: ${firstLine.slice(0, 100)}`);
    }
    lines.push("");
  }

  if (decisionNotes.length) {
    lines.push("### Architectural decisions (from vault #decision tags)");
    for (const note of decisionNotes.slice(0, 5)) {
      const firstLine = (note.content || "").split("\n").find((l) => l.trim()) || note.rel;
      lines.push(`- ${note.rel}: ${firstLine.slice(0, 100)}`);
    }
    lines.push("");
  }

  lines.push(
    "> These come from your Obsidian vault. Reference them when running `/opsx:new`.",
    ""
  );

  return lines.join("\n");
}

// ─── SEED template ──────────────────────────────────────────────────────────

function buildSeedTemplate(stack, decisionNotes) {
  const stackSection = stack.length
    ? `## Stack\n${stack.map((s) => `- ${s}`).join("\n")}\n`
    : "";

  const decisionsSection = decisionNotes.length
    ? `## Decisions (from Obsidian)\n${decisionNotes
        .slice(0, 10)
        .map((n) => `- ${(n.rel || "note").replace(/\.md$/, "")}: ${(n.content || "").split("\n").find((l) => l.trim())?.slice(0, 120) || ""}`)
        .join("\n")}\n`
    : "";

  return `# SEED — Architectural DNA
> Maintained by persistent · evolves as OpenSpec changes are archived
> Read by your agent before every coding session

${stackSection}
## Patterns
<!-- Best practices learned from completed OpenSpec changes -->
<!-- Run: persistent spec --seed-evolve <change-id> to update -->

## Anti-Patterns
<!-- What NOT to do — learned from past mistakes -->

## Constraints
<!-- Hard rules all implementations must follow -->

${decisionsSection}
## References
<!-- Docs, ADRs, related OpenSpec specs -->

---
How this file evolves:
1. You complete + archive an OpenSpec change (/opsx:archive)
2. Run: persistent spec --seed-evolve <change-id>
3. Run: persistent sync  (merges Obsidian #decision notes)
4. Run: persistent spec --seed-clean  (deduplicate)
`;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function extractPatternsFromDesign(design) {
  const patterns = [];
  const lines = design.split("\n");
  let inSection = false;

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("### ")) {
      const lower = line.toLowerCase();
      inSection = lower.includes("pattern") || lower.includes("decision") || lower.includes("constraint");
    }
    if (inSection && (line.startsWith("- ") || line.startsWith("* "))) {
      const text = line.slice(2).trim();
      if (text.length > 10) patterns.push(text);
    }
  }

  return patterns;
}

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function safeRead(p) {
  try { return await fs.readFile(p, "utf8"); } catch { return null; }
}

// ─── Backward-compat exports (spec-runner.js calls these) ───────────────────

export { listActiveSpecs as listActiveSpecs };

/**
 * Backward-compatible: called from spec-runner.js's runSpec().
 * Now just prints OpenSpec workflow instructions since OpenSpec CLI owns spec creation.
 */
export async function proposeSpec(feature, cwd, opts = {}) {
  const { available } = await checkOpenSpec();

  if (!available) {
    console.log(chalk.red("✗ OpenSpec not installed."));
    console.log(chalk.dim("  Install: npm install -g @fission-ai/openspec@latest"));
    console.log(chalk.dim("  Then run openspec init in your project.\n"));
    return { slug: null };
  }

  // Feature slug for reference
  const slug = feature.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

  console.log(chalk.bold("\nOpenSpec is installed. To create this spec:"));
  console.log(chalk.cyan(`  /opsx:new "${feature}"`));
  console.log(chalk.dim("  Then: /opsx:ff  to generate proposal + design + tasks"));
  console.log(chalk.dim("  Then: /opsx:apply  to implement"));
  console.log(chalk.dim("  Then: /opsx:archive  to archive and evolve SEED.md\n"));

  // If Obsidian context exists, remind user
  const memoryPath = path.join(cwd, "MEMORY", "INDEX.md");
  const hasMemory = await fileExists(memoryPath);
  if (hasMemory) {
    console.log(chalk.dim("  Tip: Your agent will read MEMORY/INDEX.md for Obsidian context."));
    console.log(chalk.dim("  Run: persistent sync  to refresh Obsidian context first.\n"));
  }

  return { slug, method: "openspec-cli" };
}

export async function validateSpec(slug, cwd) {
  const { available } = await checkOpenSpec();
  if (!available) {
    return { valid: false, issues: ["OpenSpec not installed"], warnings: [] };
  }

  // OpenSpec handles its own validation through the agent slash commands
  console.log(chalk.dim(`  Validation for OpenSpec changes is done via your agent:`));
  console.log(chalk.dim(`  Review the spec files in openspec/changes/${slug}/`));
  return { valid: true, issues: [], warnings: [] };
}

export async function archiveSpecWithEvolution(slug, cwd, opts = {}) {
  const { available } = await checkOpenSpec();

  if (!available) {
    console.log(chalk.red("✗ OpenSpec not installed — cannot archive."));
    return { success: false };
  }

  console.log(chalk.dim("  Archive via your agent: /opsx:archive"));
  console.log(chalk.dim("  Then evolve SEED.md: persistent spec --seed-evolve " + slug));
  return { success: true };
}

export async function regenerateSeed(cwd, opts = {}) {
  await ensureSeed(cwd, opts);
}
