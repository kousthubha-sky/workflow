/**
 * spec-runner.js
 * Implements the OpenSpec SDD cycle for agentflow.
 *
 * Cycle:
 *   agentflow spec "add dark mode"
 *     → creates SPECS/active/<slug>/proposal.md
 *                                  design.md
 *                                  tasks.md
 *   agentflow spec --apply <slug>
 *     → marks tasks complete (agent reads tasks.md)
 *   agentflow spec --archive <slug>
 *     → moves to SPECS/archive/, updates SEED.md if patterns found
 */

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";

const SPECS_DIR = "SPECS";
const ACTIVE_DIR = `${SPECS_DIR}/active`;
const ARCHIVE_DIR = `${SPECS_DIR}/archive`;
const SEED_FILE = `${SPECS_DIR}/SEED.md`;

/** Slugify a feature name for filesystem use */
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

/**
 * Propose a new spec for a feature.
 * @param {string} feature - Plain-text feature description
 */
export async function runSpec(feature) {
  const slug = slugify(feature);
  const specDir = path.join(process.cwd(), ACTIVE_DIR, slug);
  const spinner = ora(`Creating spec: ${chalk.cyan(slug)}`).start();

  await fs.mkdir(specDir, { recursive: true });

  // proposal.md — what & why
  await fs.writeFile(
    path.join(specDir, "proposal.md"),
    `# proposal: ${feature}
date: ${todayISO()}
status: draft

## problem
<!-- What problem does this solve? -->

## solution
<!-- High-level approach -->

## scope
<!-- What's in / out -->

## open-questions
<!-- Decisions to be made before implement -->
`,
    "utf8"
  );

  // design.md — how
  await fs.writeFile(
    path.join(specDir, "design.md"),
    `# design: ${feature}
date: ${todayISO()}

## data-model
<!-- Schema changes, new tables/fields -->

## api-surface
<!-- New endpoints, server actions, mutations -->

## components
<!-- UI components affected or added -->

## constraints
<!-- Non-negotiables from SEED.md that apply here -->

## error-states
<!-- What can go wrong, how it's handled -->
`,
    "utf8"
  );

  // tasks.md — checkable task list the agent executes
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
- [ ] Run \`agentflow spec --archive ${slug}\`
`,
    "utf8"
  );

  spinner.succeed(`Spec created at ${chalk.bold(ACTIVE_DIR + "/" + slug + "/")}`);
  console.log(chalk.dim("  proposal.md · design.md · tasks.md"));
  console.log(
    chalk.dim(`  When done: agentflow spec --archive ${slug}`)
  );
}

/**
 * Archive a completed spec — move to archive, optionally update SEED.md.
 * @param {string} slug
 */
export async function archiveSpec(slug, cwd = process.cwd()) {
  const activeDir = path.join(cwd, ACTIVE_DIR, slug);
  const archiveDir = path.join(cwd, ARCHIVE_DIR, `${todayISO()}-${slug}`);
  const spinner = ora(`Archiving spec: ${chalk.cyan(slug)}`).start();

  try {
    await fs.access(activeDir);
  } catch {
    spinner.fail(`No active spec found: ${slug}`);
    return;
  }

  await fs.mkdir(path.join(cwd, ARCHIVE_DIR), { recursive: true });

  // Copy files (rename moves across partitions on Windows too)
  const files = await fs.readdir(activeDir);
  await fs.mkdir(archiveDir, { recursive: true });
  for (const file of files) {
    await fs.copyFile(path.join(activeDir, file), path.join(archiveDir, file));
  }

  // Delete active dir
  await fs.rm(activeDir, { recursive: true, force: true });

  spinner.succeed(`Archived to ${chalk.bold(ARCHIVE_DIR + "/" + path.basename(archiveDir))}`);
}

/**
 * Ensure SPECS directory structure + SEED.md exist.
 * Called during init.
 * @param {string} cwd
 * @param {string[]} stack
 */
export async function initSpecs(cwd, stack) {
  await fs.mkdir(path.join(cwd, ACTIVE_DIR), { recursive: true });
  await fs.mkdir(path.join(cwd, ARCHIVE_DIR), { recursive: true });

  const seedPath = path.join(cwd, SEED_FILE);
  try {
    await fs.access(seedPath);
    // Already exists — don't overwrite
    return;
  } catch {}

  const stackLine = stack.join("|") || "unknown";

  await fs.writeFile(
    seedPath,
    `# seed
## stack
${stackLine}

## decisions
<!-- One line per architectural decision with rationale -->
<!-- e.g. auth:clerk · decided:YYYY-MM · reason:managed-sessions -->

## patterns
<!-- What the agent should always do in this codebase -->
<!-- e.g. server-actions > api-routes -->
<!-- e.g. zod at all boundaries -->
<!-- e.g. rls on all supabase tables -->

## anti-patterns
<!-- What the agent must never do -->
<!-- e.g. no client-side fetching -->
<!-- e.g. no any types -->
<!-- e.g. no inline styles -->

## references
<!-- Links, docs, internal ADRs -->
`,
    "utf8"
  );

  console.log(chalk.green(`✓`) + " Created SPECS/SEED.md — fill in your decisions + patterns");
}
