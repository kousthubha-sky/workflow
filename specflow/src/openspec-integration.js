/**
 * openspec-integration.js
 * Deep integration with openspec.dev — the core spec-driven development engine.
 *
 * OpenSpec is not just a file template system — it's the lifecycle manager
 * for all specification-driven work. This module wraps the openspec CLI
 * and connects it with Obsidian context and the AI generation pipeline.
 *
 * Flow:
 *   Obsidian notes (#spec, #decision) → OpenSpec proposals
 *   OpenSpec validate → generation-spec compliance
 *   OpenSpec archive → SEED.md evolution
 *   SEED.md → AI context generation
 *
 * CLI dependency: `npx openspec` (optional — falls back to local engine)
 */

import { execSync, exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";

const SPECS_DIR = "SPECS";
const ACTIVE_DIR = `${SPECS_DIR}/active`;
const ARCHIVE_DIR = `${SPECS_DIR}/archive`;
const SEED_FILE = `${SPECS_DIR}/SEED.md`;

// ─── OpenSpec CLI Detection ─────────────────────────────────────────────────

let _openspecAvailable = null;

/**
 * Check if the openspec CLI is available.
 * Caches result for the session.
 * @returns {Promise<boolean>}
 */
export async function isOpenSpecAvailable() {
  if (_openspecAvailable !== null) return _openspecAvailable;
  try {
    execSync("npx --yes openspec --version", { stdio: "pipe", timeout: 15_000 });
    _openspecAvailable = true;
  } catch {
    _openspecAvailable = false;
  }
  return _openspecAvailable;
}

/**
 * Run an openspec CLI command.
 * @param {string} args - CLI arguments (e.g., "propose add-dark-mode")
 * @param {string} cwd - Working directory
 * @returns {Promise<{ ok: boolean, stdout: string, stderr: string }>}
 */
async function runOpenSpec(args, cwd) {
  try {
    const stdout = execSync(`npx --yes openspec ${args}`, {
      cwd,
      stdio: "pipe",
      timeout: 30_000,
      encoding: "utf8",
    });
    return { ok: true, stdout: stdout.trim(), stderr: "" };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? err.message,
    };
  }
}

// ─── Spec Lifecycle (OpenSpec-native) ───────────────────────────────────────

/**
 * Initialize OpenSpec in a project.
 * Sets up SPECS/ directory structure with openspec conventions.
 * @param {string} cwd - Project root
 * @param {Object} opts
 * @param {string[]} opts.stack - Detected stack keys
 * @param {Object} opts.obsidianContext - Context from Obsidian notes
 */
export async function initOpenSpec(cwd, opts = {}) {
  const spinner = ora("Initializing OpenSpec SDD structure...").start();
  const hasOpenSpec = await isOpenSpecAvailable();

  if (hasOpenSpec) {
    const result = await runOpenSpec("init", cwd);
    if (result.ok) {
      spinner.succeed("OpenSpec initialized via openspec CLI");
      // Enhance with persistent-specific seed content
      await enhanceSeedWithContext(cwd, opts);
      return { method: "openspec-cli", success: true };
    }
    spinner.text = "openspec init failed, using local engine...";
  }

  // Local fallback: create the directory structure
  await fs.mkdir(path.join(cwd, ACTIVE_DIR), { recursive: true });
  await fs.mkdir(path.join(cwd, ARCHIVE_DIR), { recursive: true });

  // Generate SEED.md with context awareness
  await generateSeedFromContext(cwd, opts);

  spinner.succeed("OpenSpec SDD structure initialized (local engine)");
  return { method: "local", success: true };
}

/**
 * Propose a new feature spec using OpenSpec lifecycle.
 * Integrates Obsidian notes tagged #spec as input context.
 *
 * @param {string} feature - Feature description
 * @param {string} cwd - Project root
 * @param {Object} opts
 * @param {Object[]} opts.obsidianNotes - Relevant Obsidian notes for context
 * @param {string[]} opts.stack - Detected stack
 * @param {Object} opts.cliAI - CLI's native AI instance (optional)
 */
export async function proposeSpec(feature, cwd, opts = {}) {
  const slug = slugify(feature);
  const specDir = path.join(cwd, ACTIVE_DIR, slug);
  const spinner = ora(`Proposing spec: ${chalk.cyan(slug)}`).start();

  const hasOpenSpec = await isOpenSpecAvailable();

  if (hasOpenSpec) {
    // Use openspec CLI for proposal creation
    const result = await runOpenSpec(`propose "${feature}"`, cwd);
    if (result.ok) {
      spinner.text = "Enhancing with project context...";
      // Enrich the CLI-generated proposal with Obsidian + stack context
      await enrichSpecWithContext(specDir, opts);
      spinner.succeed(`Spec proposed via openspec CLI: ${chalk.bold(slug)}`);
      return { method: "openspec-cli", slug, specDir };
    }
  }

  // Local engine: Create spec files with context awareness
  await fs.mkdir(specDir, { recursive: true });

  // Pull relevant Obsidian context
  const obsidianContext = await extractObsidianContext(opts.obsidianNotes, feature);
  const seedConstraints = await loadSeedConstraints(cwd);

  // Generate context-aware proposal
  if (opts.cliAI) {
    await generateAIProposal(feature, specDir, {
      cliAI: opts.cliAI,
      obsidianContext,
      seedConstraints,
      stack: opts.stack || [],
    });
  } else {
    await generateStaticProposal(feature, specDir, {
      obsidianContext,
      seedConstraints,
      stack: opts.stack || [],
    });
  }

  spinner.succeed(`Spec proposed: ${chalk.bold(ACTIVE_DIR + "/" + slug + "/")}`);
  console.log(chalk.dim("  proposal.md · design.md · tasks.md"));
  return { method: "local", slug, specDir };
}

/**
 * Validate a spec against generation-spec rules and SEED.md constraints.
 * Uses openspec validate if available, otherwise runs local checks.
 *
 * @param {string} slug - Spec slug
 * @param {string} cwd - Project root
 * @returns {Promise<{ valid: boolean, issues: string[], warnings: string[] }>}
 */
export async function validateSpec(slug, cwd) {
  const specDir = path.join(cwd, ACTIVE_DIR, slug);
  const spinner = ora(`Validating spec: ${chalk.cyan(slug)}`).start();
  const result = { valid: true, issues: [], warnings: [] };

  const hasOpenSpec = await isOpenSpecAvailable();

  if (hasOpenSpec) {
    const cliResult = await runOpenSpec(`validate "${slug}"`, cwd);
    if (cliResult.ok) {
      spinner.text = "OpenSpec validation passed, running persistent checks...";
      // Parse CLI output for any issues
      if (cliResult.stdout.includes("WARN")) {
        result.warnings.push(...extractWarnings(cliResult.stdout));
      }
    }
  }

  // Local validation: check structure, SEED.md compliance, generation-spec rules
  try {
    // 1. Check required files exist
    for (const file of ["proposal.md", "design.md", "tasks.md"]) {
      try {
        await fs.access(path.join(specDir, file));
      } catch {
        result.valid = false;
        result.issues.push(`Missing required file: ${file}`);
      }
    }

    // 2. Check proposal has filled sections
    const proposal = await safeReadFile(path.join(specDir, "proposal.md"));
    if (proposal) {
      const emptySections = findEmptySections(proposal);
      if (emptySections.length > 0) {
        result.warnings.push(`Proposal has unfilled sections: ${emptySections.join(", ")}`);
      }

      // 3. Check against SEED.md constraints
      const seed = await safeReadFile(path.join(cwd, SEED_FILE));
      if (seed) {
        const conflicts = checkSeedConflicts(proposal, seed);
        if (conflicts.length > 0) {
          result.warnings.push(...conflicts.map((c) => `SEED conflict: ${c}`));
        }
      }
    }

    // 4. Check design has architectural completeness
    const design = await safeReadFile(path.join(specDir, "design.md"));
    if (design) {
      const missingDesignSections = checkDesignCompleteness(design);
      if (missingDesignSections.length > 0) {
        result.warnings.push(
          `Design missing sections: ${missingDesignSections.join(", ")}`
        );
      }
    }

    // 5. Check tasks are actionable
    const tasks = await safeReadFile(path.join(specDir, "tasks.md"));
    if (tasks) {
      const taskCount = (tasks.match(/- \[ \]/g) || []).length;
      if (taskCount === 0) {
        result.warnings.push("Tasks file has no unchecked items");
      }
    }
  } catch (err) {
    result.issues.push(`Validation error: ${err.message}`);
  }

  if (result.issues.length > 0) result.valid = false;

  if (result.valid) {
    spinner.succeed(`Spec valid: ${chalk.green(slug)}`);
  } else {
    spinner.fail(`Spec has issues: ${chalk.red(slug)}`);
  }

  return result;
}

/**
 * Archive a spec and evolve SEED.md with learned patterns.
 * This is the key feedback loop: completed specs inform future development.
 *
 * @param {string} slug - Spec slug
 * @param {string} cwd - Project root
 * @param {Object} opts
 * @param {Object} opts.cliAI - CLI's native AI for pattern extraction
 * @param {Object[]} opts.obsidianNotes - Related Obsidian notes
 */
export async function archiveSpecWithEvolution(slug, cwd, opts = {}) {
  const activeDir = path.join(cwd, ACTIVE_DIR, slug);
  const archiveDir = path.join(
    cwd,
    ARCHIVE_DIR,
    `${todayISO()}-${slug}`
  );
  const spinner = ora(`Archiving + evolving: ${chalk.cyan(slug)}`).start();

  try {
    await fs.access(activeDir);
  } catch {
    spinner.fail(`No active spec: ${slug}`);
    return { success: false, error: "not-found" };
  }

  const hasOpenSpec = await isOpenSpecAvailable();

  // 1. Read all spec files for pattern extraction
  const specFiles = {};
  for (const file of ["proposal.md", "design.md", "tasks.md"]) {
    specFiles[file] = await safeReadFile(path.join(activeDir, file));
  }

  // 2. Archive via openspec CLI or locally
  if (hasOpenSpec) {
    const result = await runOpenSpec(`archive "${slug}"`, cwd);
    if (!result.ok) {
      // Fallback to local archiving
      await localArchive(activeDir, archiveDir);
    }
  } else {
    await localArchive(activeDir, archiveDir);
  }

  // 3. SEED.md Evolution — extract patterns from completed spec
  spinner.text = "Evolving SEED.md with learned patterns...";
  await evolveSeed(cwd, slug, specFiles, opts);

  // 4. If Obsidian notes were related, mark them as archived
  if (opts.obsidianNotes?.length) {
    spinner.text = "Updating Obsidian context...";
    // Return metadata for obsidian-bridge to sync back
  }

  spinner.succeed(`Archived: ${chalk.bold(path.basename(archiveDir))}`);
  return {
    success: true,
    archivePath: archiveDir,
    seedUpdated: true,
  };
}

/**
 * Generate/update SEED.md from all archived specs + Obsidian decisions.
 * SEED.md is the accumulated architectural knowledge — the project's DNA.
 *
 * @param {string} cwd - Project root
 * @param {Object} opts
 * @param {Object} opts.cliAI - CLI's native AI
 * @param {Object[]} opts.decisionNotes - Obsidian notes tagged #decision
 * @param {string[]} opts.stack - Detected stack
 */
export async function regenerateSeed(cwd, opts = {}) {
  const spinner = ora("Regenerating SEED.md from archived specs + decisions...").start();
  const hasOpenSpec = await isOpenSpecAvailable();

  // 1. Collect archived spec patterns
  const archivedPatterns = await collectArchivedPatterns(cwd);

  // 2. Collect Obsidian decision notes
  const decisions = opts.decisionNotes || [];

  // 3. Load current SEED.md (if exists)
  const currentSeed = await safeReadFile(path.join(cwd, SEED_FILE));

  // 4. Try openspec CLI for seed generation
  if (hasOpenSpec) {
    const result = await runOpenSpec("seed --regenerate", cwd);
    if (result.ok) {
      spinner.text = "Enhancing openspec seed with Obsidian context...";
      // Merge openspec-generated seed with Obsidian decisions
      await enhanceSeedWithDecisions(cwd, decisions);
      spinner.succeed("SEED.md regenerated via openspec + Obsidian context");
      return { method: "openspec-cli", success: true };
    }
  }

  // 5. Local generation with context
  const seedContent = buildSeedContent({
    archivedPatterns,
    decisions,
    currentSeed,
    stack: opts.stack || [],
  });

  await fs.mkdir(path.join(cwd, SPECS_DIR), { recursive: true });
  await fs.writeFile(path.join(cwd, SEED_FILE), seedContent, "utf8");

  spinner.succeed("SEED.md regenerated from archived patterns + decisions");
  return { method: "local", success: true };
}

/**
 * List all active specs with their validation status.
 * @param {string} cwd
 * @returns {Promise<Object[]>}
 */
export async function listActiveSpecs(cwd) {
  const activeDir = path.join(cwd, ACTIVE_DIR);
  try {
    const entries = await fs.readdir(activeDir, { withFileTypes: true });
    const specs = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const specDir = path.join(activeDir, entry.name);

      const hasProposal = await fileExists(path.join(specDir, "proposal.md"));
      const hasDesign = await fileExists(path.join(specDir, "design.md"));
      const hasTasks = await fileExists(path.join(specDir, "tasks.md"));

      // Count completed tasks
      const tasks = await safeReadFile(path.join(specDir, "tasks.md"));
      const totalTasks = (tasks?.match(/- \[[ x]\]/g) || []).length;
      const completedTasks = (tasks?.match(/- \[x\]/gi) || []).length;

      specs.push({
        slug: entry.name,
        files: { proposal: hasProposal, design: hasDesign, tasks: hasTasks },
        progress: totalTasks > 0
          ? `${completedTasks}/${totalTasks}`
          : "no tasks",
      });
    }

    return specs;
  } catch {
    return [];
  }
}

// ─── Obsidian ↔ OpenSpec Context Bridge ─────────────────────────────────────

/**
 * Extract relevant Obsidian context for a spec feature.
 * Filters notes by relevance to the feature keyword.
 */
function extractObsidianContext(notes, feature) {
  if (!notes || !notes.length) return { relevant: [], decisions: [] };

  const featureWords = feature.toLowerCase().split(/\s+/);

  const relevant = notes.filter((note) => {
    const content = (note.content || "").toLowerCase();
    return featureWords.some((w) => content.includes(w));
  });

  const decisions = notes.filter((note) => {
    const content = (note.content || "").toLowerCase();
    return (
      content.includes("#decision") ||
      content.includes("#architecture") ||
      content.includes("#pattern")
    );
  });

  return { relevant: relevant.slice(0, 5), decisions: decisions.slice(0, 5) };
}

/**
 * Load constraints from SEED.md for spec validation.
 */
async function loadSeedConstraints(cwd) {
  const seed = await safeReadFile(path.join(cwd, SEED_FILE));
  if (!seed) return { patterns: [], antiPatterns: [], constraints: [] };

  const patterns = [];
  const antiPatterns = [];
  const constraints = [];

  const lines = seed.split("\n");
  let currentSection = "";

  for (const line of lines) {
    if (line.startsWith("## ")) currentSection = line.toLowerCase();
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const item = line.slice(2).trim();
      if (currentSection.includes("pattern") && !currentSection.includes("anti")) {
        patterns.push(item);
      } else if (currentSection.includes("anti")) {
        antiPatterns.push(item);
      } else if (currentSection.includes("constraint") || currentSection.includes("rule")) {
        constraints.push(item);
      }
    }
  }

  return { patterns, antiPatterns, constraints };
}

// ─── SEED Evolution Engine ──────────────────────────────────────────────────

/**
 * Evolve SEED.md after archiving a spec.
 * Extracts new patterns/decisions and merges them into SEED.md.
 */
async function evolveSeed(cwd, slug, specFiles, opts = {}) {
  const seedPath = path.join(cwd, SEED_FILE);
  let currentSeed = (await safeReadFile(seedPath)) || buildEmptySeed();

  // Extract patterns from completed spec
  const newPatterns = extractPatternsFromSpec(specFiles);

  if (opts.cliAI) {
    // Use CLI AI to intelligently merge
    const prompt = `
You are updating a project's SEED.md (architectural knowledge base).

CURRENT SEED.md:
${currentSeed}

COMPLETED SPEC "${slug}":
Proposal: ${specFiles["proposal.md"] || "N/A"}
Design: ${specFiles["design.md"] || "N/A"}

TASK: Extract new patterns, decisions, constraints from this completed spec
and merge them into SEED.md. Keep SEED.md concise. Don't duplicate.
Output the complete updated SEED.md.
`;
    try {
      const response = await opts.cliAI.generate({
        prompt,
        maxTokens: 1500,
        temperature: 0,
      });
      await fs.writeFile(seedPath, response.text, "utf8");
      return;
    } catch {
      // Fall through to static merge
    }
  }

  // Static merge: append new patterns
  if (newPatterns.length > 0) {
    const patternsSection = `\n\n## Patterns from: ${slug} (${todayISO()})\n${newPatterns.map((p) => `- ${p}`).join("\n")}\n`;
    currentSeed += patternsSection;
    await fs.writeFile(seedPath, currentSeed, "utf8");
  }
}

/**
 * Collect patterns from all archived specs.
 */
async function collectArchivedPatterns(cwd) {
  const archiveDir = path.join(cwd, ARCHIVE_DIR);
  const patterns = [];

  try {
    const entries = await fs.readdir(archiveDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const design = await safeReadFile(
        path.join(archiveDir, entry.name, "design.md")
      );
      if (design) {
        patterns.push(...extractPatternsFromSpec({ "design.md": design }));
      }
    }
  } catch {
    // No archive yet
  }

  return patterns;
}

/**
 * Extract patterns from spec files.
 */
function extractPatternsFromSpec(specFiles) {
  const patterns = [];
  const design = specFiles["design.md"] || "";

  // Extract bullet points from key sections
  const lines = design.split("\n");
  let inPatternSection = false;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      const section = line.toLowerCase();
      inPatternSection =
        section.includes("pattern") ||
        section.includes("constraint") ||
        section.includes("decision") ||
        section.includes("component");
    }
    if (inPatternSection && (line.startsWith("- ") || line.startsWith("* "))) {
      patterns.push(line.slice(2).trim());
    }
  }

  return patterns;
}

// ─── AI-Driven Spec Generation ──────────────────────────────────────────────

async function generateAIProposal(feature, specDir, context) {
  const { cliAI, obsidianContext, seedConstraints, stack } = context;

  const obsidianSnippet =
    obsidianContext.relevant.length > 0
      ? obsidianContext.relevant
          .map((n) => `Note: ${n.rel || "untitled"}\n${(n.content || "").slice(0, 300)}`)
          .join("\n---\n")
      : "No relevant Obsidian notes.";

  const seedSnippet =
    seedConstraints.constraints.length > 0
      ? `Existing constraints:\n${seedConstraints.constraints.map((c) => `- ${c}`).join("\n")}`
      : "No SEED.md constraints yet.";

  const prompt = `
Generate OpenSpec SDD files for feature: "${feature}"

STACK: ${stack.join(", ")}

OBSIDIAN CONTEXT (related notes from user's vault):
${obsidianSnippet}

SEED CONSTRAINTS (must comply):
${seedSnippet}

Generate three files:

1. proposal.md — problem, solution, scope, open-questions
2. design.md — data-model, api-surface, components, constraints, error-states
3. tasks.md — actionable checklist

Make them specific to this stack and respect existing constraints.
Output each file clearly separated with === FILENAME === markers.
`;

  try {
    const response = await cliAI.generate({
      prompt,
      maxTokens: 2000,
      temperature: 0,
    });

    // Parse the AI response into separate files
    const files = parseMultiFileResponse(response.text, [
      "proposal.md",
      "design.md",
      "tasks.md",
    ]);

    for (const [filename, content] of Object.entries(files)) {
      await fs.writeFile(path.join(specDir, filename), content, "utf8");
    }
  } catch {
    // Fallback to static
    await generateStaticProposal(feature, specDir, context);
  }
}

async function generateStaticProposal(feature, specDir, context) {
  const { obsidianContext, seedConstraints, stack } = context;

  const constraintSection =
    seedConstraints.constraints.length > 0
      ? seedConstraints.constraints.map((c) => `- ${c}`).join("\n")
      : "<!-- No SEED.md constraints yet -->";

  const obsidianRef =
    obsidianContext.relevant.length > 0
      ? obsidianContext.relevant.map((n) => `- ${n.rel || "note"}`).join("\n")
      : "<!-- No related Obsidian notes -->";

  await fs.writeFile(
    path.join(specDir, "proposal.md"),
    `# proposal: ${feature}
date: ${todayISO()}
status: draft
stack: ${stack.join(", ")}

## problem
<!-- What problem does this solve? -->

## solution
<!-- High-level approach -->

## scope
<!-- What's in / out -->

## seed-constraints
${constraintSection}

## obsidian-context
${obsidianRef}

## open-questions
<!-- Decisions to be made before implement -->
`,
    "utf8"
  );

  await fs.writeFile(
    path.join(specDir, "design.md"),
    `# design: ${feature}
date: ${todayISO()}
stack: ${stack.join(", ")}

## data-model
<!-- Schema changes, new tables/fields -->

## api-surface
<!-- New endpoints, server actions, mutations -->

## components
<!-- UI components affected or added -->

## constraints
${constraintSection}

## error-states
<!-- What can go wrong, how it's handled -->
`,
    "utf8"
  );

  await fs.writeFile(
    path.join(specDir, "tasks.md"),
    `# tasks: ${feature}
date: ${todayISO()}
status: pending

## checklist
- [ ] Fill proposal.md problem + solution
- [ ] Fill design.md data-model + api-surface
- [ ] Implement feature per design.md
- [ ] Write tests (unit + integration)
- [ ] Update SEED.md if new patterns emerge
- [ ] Archive when complete
`,
    "utf8"
  );
}

// ─── SEED.md Building ───────────────────────────────────────────────────────

async function generateSeedFromContext(cwd, opts = {}) {
  const seedContent = buildSeedContent({
    archivedPatterns: [],
    decisions: opts.obsidianContext?.decisions || [],
    currentSeed: null,
    stack: opts.stack || [],
  });

  await fs.mkdir(path.join(cwd, SPECS_DIR), { recursive: true });
  await fs.writeFile(path.join(cwd, SEED_FILE), seedContent, "utf8");
}

async function enhanceSeedWithContext(cwd, opts = {}) {
  const seedPath = path.join(cwd, SEED_FILE);
  const current = await safeReadFile(seedPath);
  if (!current) {
    await generateSeedFromContext(cwd, opts);
    return;
  }

  // Append stack-specific context if not already present
  const stack = opts.stack || [];
  if (stack.length > 0) {
    const stackSection = `\n## Stack\n${stack.map((s) => `- ${s}`).join("\n")}\n`;
    if (!current.includes("## Stack")) {
      await fs.writeFile(seedPath, current + stackSection, "utf8");
    }
  }
}

async function enhanceSeedWithDecisions(cwd, decisions) {
  if (!decisions.length) return;

  const seedPath = path.join(cwd, SEED_FILE);
  const current = await safeReadFile(seedPath);
  if (!current) return;

  const decisionSection = `\n## Decisions (from Obsidian)\n${decisions
    .map((d) => `- ${d.rel || "note"}: ${(d.content || "").split("\n")[0].slice(0, 100)}`)
    .join("\n")}\n`;

  if (!current.includes("## Decisions (from Obsidian)")) {
    await fs.writeFile(seedPath, current + decisionSection, "utf8");
  }
}

function buildSeedContent({ archivedPatterns, decisions, currentSeed, stack }) {
  const parts = [
    `# SEED — Architectural DNA`,
    `> Generated by persistent + OpenSpec · ${todayISO()}`,
    `> This file evolves with every archived spec and Obsidian decision.`,
    "",
  ];

  if (stack.length > 0) {
    parts.push(`## Stack`, ...stack.map((s) => `- ${s}`), "");
  }

  parts.push(
    `## Patterns`,
    archivedPatterns.length > 0
      ? archivedPatterns.map((p) => `- ${p}`).join("\n")
      : "<!-- Patterns emerge as specs are completed and archived -->",
    ""
  );

  parts.push(
    `## Anti-Patterns`,
    "<!-- What NOT to do — learned from past mistakes -->",
    ""
  );

  parts.push(
    `## Decisions`,
    decisions.length > 0
      ? decisions
          .map((d) => `- ${d.rel || "decision"}: ${(d.content || "").split("\n")[0].slice(0, 100)}`)
          .join("\n")
      : "<!-- Key decisions — synced from Obsidian #decision notes -->",
    ""
  );

  parts.push(
    `## Constraints`,
    "<!-- Hard rules that all specs and implementations must follow -->",
    "",
    `## References`,
    "<!-- Links to relevant docs, ADRs, external specs -->",
    ""
  );

  return parts.join("\n");
}

function buildEmptySeed() {
  return buildSeedContent({
    archivedPatterns: [],
    decisions: [],
    currentSeed: null,
    stack: [],
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function safeReadFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function findEmptySections(markdown) {
  const sections = [];
  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      const title = lines[i].slice(3).trim();
      // Check if next non-empty line is a comment or another header
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (
        j >= lines.length ||
        lines[j].startsWith("## ") ||
        lines[j].trim().startsWith("<!--")
      ) {
        sections.push(title);
      }
    }
  }

  return sections;
}

function checkSeedConflicts(proposal, seed) {
  const conflicts = [];
  // Extract anti-patterns from SEED
  const lines = seed.split("\n");
  let inAntiPatterns = false;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      inAntiPatterns = line.toLowerCase().includes("anti");
    }
    if (inAntiPatterns && line.startsWith("- ")) {
      const antiPattern = line.slice(2).trim().toLowerCase();
      if (proposal.toLowerCase().includes(antiPattern.slice(0, 30))) {
        conflicts.push(`Proposal may conflict with anti-pattern: "${antiPattern}"`);
      }
    }
  }

  return conflicts;
}

function checkDesignCompleteness(design) {
  const required = ["data-model", "api-surface", "components", "constraints", "error-states"];
  const present = design
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => l.slice(3).trim().toLowerCase());

  return required.filter((r) => !present.some((p) => p.includes(r)));
}

function extractWarnings(stdout) {
  return stdout
    .split("\n")
    .filter((l) => l.includes("WARN"))
    .map((l) => l.replace(/.*WARN:?\s*/, "").trim());
}

function parseMultiFileResponse(text, expectedFiles) {
  const files = {};
  const sections = text.split(/===\s*(\S+\.md)\s*===/);

  // Try marker-based parsing first
  for (let i = 1; i < sections.length; i += 2) {
    const filename = sections[i].trim();
    const content = (sections[i + 1] || "").trim();
    if (expectedFiles.includes(filename)) {
      files[filename] = content;
    }
  }

  // If marker parsing failed, try header-based
  if (Object.keys(files).length < expectedFiles.length) {
    for (const expected of expectedFiles) {
      if (!files[expected]) {
        const headerMatch = text.match(
          new RegExp(`#\\s*${expected.replace(".md", "")}[:\\s]([\\s\\S]*?)(?=\\n#\\s*\\w+\\.md|$)`, "i")
        );
        if (headerMatch) {
          files[expected] = headerMatch[0].trim();
        }
      }
    }
  }

  // Fill any still-missing with empty templates
  for (const expected of expectedFiles) {
    if (!files[expected]) {
      files[expected] = `# ${expected.replace(".md", "")}\n\n<!-- AI generation incomplete — fill manually -->\n`;
    }
  }

  return files;
}

export { slugify, todayISO, safeReadFile, loadSeedConstraints };
