/**
 * spec-runner.js
 * Thin dispatcher — delegates all OpenSpec work to openspec-integration.js.
 * OpenSpec CLI (@fission-ai/openspec) is the real spec engine.
 */

import chalk from "chalk";
import {
  proposeSpec,
  validateSpec,
  archiveSpecWithEvolution,
  regenerateSeed,
  listActiveSpecs,
  initOpenSpec,
  evolveSeedFromArchive,
  cleanSeed,
  ensureSeed,
} from "./openspec-integration.js";

export async function runSpec(feature, opts = {}) {
  const cwd = process.cwd();
  await proposeSpec(feature, cwd, opts);
}

export async function validateSpecCmd(id) {
  const cwd = process.cwd();
  return await validateSpec(id, cwd);
}

export async function archiveSpec(id, cwd = process.cwd()) {
  await archiveSpecWithEvolution(id, cwd);
}

export async function listSpecs() {
  const cwd = process.cwd();
  const specs = await listActiveSpecs(cwd);

  if (!specs.length) {
    console.log(chalk.dim("No active OpenSpec changes."));
    console.log(chalk.dim('  Start one: /opsx:new "feature name"  (inside your agent)'));
    return;
  }

  console.log(chalk.bold("Active OpenSpec changes:\n"));
  for (const spec of specs) {
    const icon = spec.progress === 100 ? chalk.green("✓") : chalk.yellow("◦");
    console.log(`  ${icon} ${chalk.cyan(spec.slug)} — ${spec.progress}% complete`);
    for (const f of spec.files || []) console.log(chalk.dim(`    ${f}`));
  }
}

export async function seedCmd(opts = {}) {
  const cwd = process.cwd();
  await ensureSeed(cwd, opts);
  console.log(chalk.green("✓") + " SPECS/SEED.md ready");
}

/** Evolve SEED.md from an archived OpenSpec change folder. */
export async function seedEvolveCmd(changeId) {
  const cwd = process.cwd();
  await evolveSeedFromArchive(cwd, changeId);
}

/** Deduplicate and compress SEED.md. */
export async function seedCleanCmd() {
  const cwd = process.cwd();
  await cleanSeed(cwd);
}

export async function initSpecs(cwd, stack) {
  await initOpenSpec(cwd, { stack });
}
