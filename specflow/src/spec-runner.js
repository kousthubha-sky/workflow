/**
 * spec-runner.js
 * OpenSpec SDD cycle — delegates to openspec-integration.js for full lifecycle.
 *
 * Cycle:
 *   persistent spec "add dark mode"      → proposeSpec() via openspec CLI or local
 *   persistent spec --validate <slug>     → validateSpec()
 *   persistent spec --archive <slug>      → archiveSpecWithEvolution() + SEED update
 *   persistent spec --list                → listActiveSpecs()
 *   persistent spec --seed                → regenerateSeed()
 */

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import {
  initOpenSpec,
  proposeSpec,
  validateSpec as deepValidate,
  archiveSpecWithEvolution,
  regenerateSeed,
  listActiveSpecs,
} from "./openspec-integration.js";

const SPECS_DIR = "SPECS";
const ACTIVE_DIR = `${SPECS_DIR}/active`;
const ARCHIVE_DIR = `${SPECS_DIR}/archive`;
const SEED_FILE = `${SPECS_DIR}/SEED.md`;

/**
 * Propose a new spec for a feature.
 * Delegates to openspec-integration which tries openspec CLI first.
 * @param {string} feature - Plain-text feature description
 * @param {Object} opts
 * @param {Object} opts.cliAI - CLI's native AI instance (optional)
 * @param {string} opts.obsidianPath - Vault path for context (optional)
 */
export async function runSpec(feature, opts = {}) {
  const cwd = process.cwd();
  const result = await proposeSpec(feature, cwd, {
    cliAI: opts.cliAI || null,
    obsidianPath: opts.obsidianPath || null,
  });

  if (result.slug) {
    console.log(chalk.dim(`  Validate: persistent spec --validate ${result.slug}`));
    console.log(chalk.dim(`  Archive:  persistent spec --archive ${result.slug}`));
  }
}

/**
 * Validate a spec against generation-spec + SEED.md.
 * @param {string} slug
 */
export async function validateSpecCmd(slug) {
  const cwd = process.cwd();
  const result = await deepValidate(slug, cwd);

  if (result.valid) {
    console.log(chalk.green("✓") + ` Spec ${chalk.cyan(slug)} is valid`);
  } else {
    console.log(chalk.red("✗") + ` Spec ${chalk.cyan(slug)} has issues:`);
    for (const issue of result.issues) {
      console.log(chalk.dim(`  - ${issue}`));
    }
  }
  return result;
}

/**
 * Archive a completed spec with SEED evolution.
 * @param {string} slug
 */
export async function archiveSpec(slug, cwd = process.cwd()) {
  await archiveSpecWithEvolution(slug, cwd);
}

/**
 * List active specs with progress.
 */
export async function listSpecs() {
  const cwd = process.cwd();
  const specs = await listActiveSpecs(cwd);

  if (specs.length === 0) {
    console.log(chalk.dim("No active specs. Create one: persistent spec \"feature name\""));
    return;
  }

  console.log(chalk.bold("Active specs:\n"));
  for (const spec of specs) {
    const statusIcon = spec.progress === 100 ? "✓" : "◦";
    const color = spec.progress === 100 ? chalk.green : chalk.yellow;
    console.log(
      `  ${color(statusIcon)} ${chalk.cyan(spec.slug)} — ${spec.progress}% complete`
    );
    if (spec.files) {
      for (const f of spec.files) {
        console.log(chalk.dim(`    ${f}`));
      }
    }
  }
}

/**
 * Regenerate SEED.md from archived specs.
 */
export async function seedCmd(opts = {}) {
  const cwd = process.cwd();
  await regenerateSeed(cwd, { cliAI: opts.cliAI || null });
}

/**
 * Ensure SPECS directory structure + SEED.md exist.
 * Called during init — now delegates to openspec-integration.
 * @param {string} cwd
 * @param {string[]} stack
 */
export async function initSpecs(cwd, stack) {
  await initOpenSpec(cwd, { stack });
}
