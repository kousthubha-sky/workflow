/**
 * init.js
 * Orchestrates the full `agentflow init` flow.
 */

import path from "path";
import chalk from "chalk";
import prompts from "prompts";
import { detectStack } from "./detect-stack.js";
import { resolveSkills, installSkills } from "./skills-loader.js";
import { detectAgent, updateAgent, writeAgentContext, AGENT_FILE_MAP } from "./agent-writer.js";
import { syncObsidian, discoverVaults } from "./obsidian-bridge.js";
import { initSpecs } from "./spec-runner.js";
import { writeConfig } from "./config.js";

/** Strings the user might type that mean "skip" */
const SKIP_SIGNALS = new Set([
  "", "skip", "no", "n", "none", "later",
]);

/** Strings that mean "run discovery instead" */
const DISCOVER_SIGNALS = new Set([
  "discover", "--discover", "agentflow sync --discover", "sync --discover",
]);

export async function init(opts = {}) {
  const cwd    = process.cwd();
  const dryRun = opts.dryRun ?? false;

  console.log("\n" + chalk.bold("agentflow init") + chalk.dim(" · universal AI workflow bootstrap\n"));

  // ── 1. Detect stack ────────────────────────────────────────────────────────
  const { keys: stack, raw: matchedDeps } = await detectStack(cwd);

  if (stack.length === 0) {
    console.log(chalk.yellow("⚠ No known stack detected."));
    console.log(chalk.dim("  Run from your project root (where package.json lives)."));
    console.log(chalk.dim("  Continuing with generic setup.\n"));
  } else {
    console.log(chalk.green("✓") + " Stack detected: " + chalk.cyan(stack.join(", ")));
    if (dryRun) {
      const entries = Object.entries(matchedDeps).slice(0, 8);
      for (const [dep, key] of entries) console.log(chalk.dim(`    ${dep} → ${key}`));
      const overflow = Object.keys(matchedDeps).length - 8;
      if (overflow > 0) console.log(chalk.dim(`    ... and ${overflow} more`));
    }
  }

  // ── 2. Detect agent (walks up — monorepo aware) ────────────────────────────
  let agentId, agentRoot;
  if (opts.agent) {
    agentId   = opts.agent;
    agentRoot = cwd;
  } else {
    ({ agent: agentId, root: agentRoot } = await detectAgent(cwd));
  }

  const agentFile    = AGENT_FILE_MAP[agentId] ?? "AGENT_CONTEXT.md";
  const agentRelPath = path.relative(cwd, path.join(agentRoot, agentFile)) || agentFile;
  const agentRootLabel = agentRoot === cwd
    ? ""
    : chalk.dim(` (found at: ${path.relative(cwd, agentRoot) || agentRoot})`);
  console.log(chalk.green("✓") + ` Agent: ${chalk.cyan(agentId)} → ${agentRelPath}${agentRootLabel}`);

  // ── 3. Resolve skills ──────────────────────────────────────────────────────
  const resolvedSkills = await resolveSkills(stack);
  if (resolvedSkills.length > 0) {
    console.log(chalk.green("✓") + " Skills resolved:");
    for (const s of resolvedSkills) console.log(chalk.dim(`    ${s}`));
  } else {
    console.log(chalk.dim("  Skills: none mapped for this stack"));
  }

  // ── 4. Obsidian path ───────────────────────────────────────────────────────
  let obsidianPath = opts.obsidian ?? null;
  let obsidianSynced = false;

  if (!obsidianPath && !dryRun) {
    const { vault } = await prompts({
      type: "text",
      name: "vault",
      message: "Obsidian vault path? (Enter to skip)",
      hint: "e.g. C:/Users/sky/obsidian/MyVault  — or type 'discover' to auto-find",
    });

    const input = (vault ?? "").trim().toLowerCase();

    if (DISCOVER_SIGNALS.has(input)) {
      // User wants auto-discovery — run it inline
      console.log("");
      const vaults = await discoverVaults();
      if (vaults.length === 0) {
        console.log(chalk.yellow("  No vaults found automatically."));
        console.log(chalk.dim("  Provide path manually: agentflow init --obsidian <path>"));
      } else {
        console.log(chalk.bold("  Found vaults:"));
        vaults.forEach((v, i) =>
          console.log(`  ${chalk.cyan(i + 1 + ".")} ${chalk.bold(v.name)}  ${chalk.dim(v.path)}`)
        );
        const { choice } = await prompts({
          type: "number",
          name: "choice",
          message: "Select vault number (0 to skip)",
          min: 0,
          max: vaults.length,
          initial: 1,
        });
        if (choice && choice > 0) obsidianPath = vaults[choice - 1].path;
      }
    } else if (!SKIP_SIGNALS.has(input)) {
      // Treat as a literal path
      obsidianPath = vault.trim();
    }
  }

  if (obsidianPath) {
    console.log(chalk.green("✓") + " Obsidian vault: " + chalk.cyan(obsidianPath));
  } else if (!dryRun) {
    console.log(chalk.dim("  Obsidian: skipped — run `agentflow sync --discover` later"));
  }

  // ── 5. Build config ────────────────────────────────────────────────────────
  const cfg = {
    agent:         agentId,
    agentRoot:     agentRoot,
    stack,
    skills:        resolvedSkills,
    obsidianPath:  obsidianPath ?? null,
    pinnedFolders: [],
    lastSync:      null,
    activeSpec:    null,
  };

  // ── Dry-run: show plan and exit ────────────────────────────────────────────
  if (dryRun) {
    const isGeneric = agentId === "generic";
    console.log(chalk.bold.yellow("\n[dry-run] Plan:\n"));
    console.log(chalk.bold("  Files that would be written:"));
    console.log(`    ${chalk.green("AGENT_CONTEXT.md")}         universal context`);
    console.log(`    ${chalk.green("SPECS/SEED.md")}            fill in decisions + patterns`);
    if (obsidianPath) console.log(`    ${chalk.green("MEMORY/INDEX.md")}          synced from vault`);
    if (!isGeneric)   console.log(`    ${chalk.green(agentRelPath)}  ← agentflow block injected`);
    else              console.log(chalk.dim(`    (generic agent — AGENT_CONTEXT.md serves as both)`));
    console.log(`    ${chalk.green(".skills/")}                 one file per library`);
    console.log(`    ${chalk.green(".agentflow.json")}          persisted config`);
    console.log(chalk.bold("\n  Config that would be saved:"));
    console.log(chalk.dim(JSON.stringify(cfg, null, 4).split("\n").map((l) => "    " + l).join("\n")));
    if (resolvedSkills.length > 0) {
      console.log(chalk.bold("\n  Skills (registry → builtin → placeholder):"));
      for (const s of resolvedSkills) console.log(chalk.dim(`    ${s}`));
    }
    console.log(chalk.bold.yellow("\n  Remove --dry-run to execute.\n"));
    return;
  }

  // ── 6. Install skills ─────────────────────────────────────────────────────
  const { installed, builtin, placeholder } = await installSkills(resolvedSkills, cwd);
  cfg.skills = resolvedSkills;

  // ── 7. Write AGENT_CONTEXT.md ─────────────────────────────────────────────
  await writeAgentContext(cfg, cwd);

  // ── 8. Init SPECS/ ────────────────────────────────────────────────────────
  await initSpecs(cwd, stack);
  console.log(chalk.green("✓") + " SPECS/ initialized");

  // ── 9. Sync Obsidian (only if we have a valid path) ───────────────────────
  if (obsidianPath) {
    obsidianSynced = await syncObsidian(obsidianPath, cwd, { pinnedFolders: [] });
    if (obsidianSynced) cfg.lastSync = new Date().toISOString();
    else                cfg.obsidianPath = null; // path was bad — don't persist it
  }

  // ── 10. Patch agent file ───────────────────────────────────────────────────
  await updateAgent(cfg, agentId, { agentRoot });

  // ── 11. Save config ────────────────────────────────────────────────────────
  await writeConfig(cfg);
  console.log(chalk.green("✓") + " Config saved to .agentflow.json\n");

  // ── Summary ───────────────────────────────────────────────────────────────
  const isGeneric = agentId === "generic";
  console.log(chalk.bold("Done. Files written:"));
  console.log(`  ${chalk.green("AGENT_CONTEXT.md")}       universal context`);
  console.log(`  ${chalk.green("SPECS/SEED.md")}          fill in decisions + patterns`);
  if (obsidianSynced)
    console.log(`  ${chalk.green("MEMORY/INDEX.md")}        synced from Obsidian vault`);
  if (!isGeneric)
    console.log(`  ${chalk.green(agentRelPath)}   agentflow block injected`);
  console.log(`  ${chalk.green(".skills/")}              ${installed.length} registry · ${builtin.length} builtin · ${placeholder.length} placeholder`);
  console.log(`  ${chalk.green(".agentflow.json")}        persisted config\n`);

  console.log(chalk.bold("Next steps:"));
  console.log(chalk.dim("  1. Fill in SPECS/SEED.md — your decisions + anti-patterns"));
  console.log(chalk.dim(`  2. agentflow spec "<feature>" — before coding anything new`));
  if (!obsidianSynced)
    console.log(chalk.dim("  3. agentflow sync --discover — connect your Obsidian vault"));
  else
    console.log(chalk.dim("  3. agentflow sync — re-pull vault any time"));
  console.log(chalk.dim("  4. agentflow update — re-run after stack changes\n"));
}
