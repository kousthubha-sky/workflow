/**
 * init.js
 * Orchestrates the full `persistent init` flow.
 *
 * Key change: agent selection is now a SINGLE-SELECT prompt.
 * Only generates context files for the agent user actually uses.
 * Keeps multi-agent support for backward compatibility (cfg.agents array).
 */

import path from "path";
import chalk from "chalk";
import prompts from "prompts";
import ora from "ora";
import { detectStack } from "./detect-stack.js";
import { resolveSkills, installSkills } from "./skills-loader.js";
import { detectAgent, detectAgentWithEnv, updateAgent, writeAgentContext, AGENT_FILE_MAP } from "./agent-writer.js";
import { runAgentSetup, printAgentInstructions, AGENTS } from "./agent-setup.js";
import { syncObsidian, discoverVaults } from "./obsidian-bridge.js";
import { initSpecs } from "./spec-runner.js";
import { writeConfig } from "./config.js";
import { supportsSlashCommands, COMMAND_NAMES } from "./command-writer.js";
import { extractProjectContext } from "./context-extractor.js";

const SKIP_SIGNALS     = new Set(["", "skip", "no", "n", "none", "later"]);
const DISCOVER_SIGNALS = new Set(["discover", "--discover", "persistent sync --discover", "sync --discover"]);

export async function init(opts = {}) {
  const cwd    = process.cwd();
  const dryRun = opts.dryRun ?? false;

  console.log("\n" + chalk.bold("persistent") + chalk.dim(" · universal AI workflow bootstrap\n"));

  // ── 1. Detect stack ────────────────────────────────────────────────────────
  const { keys: stack, raw: matchedDeps } = await detectStack(cwd);

  if (stack.length === 0) {
    console.log(chalk.yellow("⚠ No known stack detected."));
    console.log(chalk.dim("  Run from your project root (where package.json lives)."));
    console.log(chalk.dim("  Continuing with generic setup.\n"));
  } else {
    console.log(chalk.green("✓") + " Stack detected: " + chalk.cyan(stack.join(", ")));
  }

  // ── 2. Agent selection (single-select) ────────────────────────────────────
  // Auto-detect what's already present + check environment
  const detected = await detectAgentWithEnv(cwd);
  let selectedAgent;
  let agentRoot = detected.root;

  if (opts.agent) {
    // --agent flag: forced agent
    selectedAgent = opts.agent;
  } else if (detected.agent && detected.agent !== "generic") {
    // Already using an agent - use that one
    selectedAgent = detected.agent;
    console.log(chalk.green("✓") + ` Detected: ${AGENTS[selectedAgent]?.label ?? selectedAgent}`);
  } else if (dryRun) {
    selectedAgent = "claude-code";
  } else {
    // Prompt for single agent choice
    const agentChoices = [
      { title: "Claude Code",         value: "claude-code", description: "CLAUDE.md" },
      { title: "GitHub Copilot",      value: "copilot",     description: ".github/copilot-instructions.md" },
      { title: "Cursor",              value: "cursor",       description: ".cursor/rules/persistent.mdc" },
      { title: "Windsurf (Codeium)",  value: "windsurf",    description: ".windsurfrules" },
      { title: "OpenCode",            value: "opencode",    description: "agents.md" },
      { title: "Continue.dev",        value: "continue",    description: ".continue/context.md" },
      { title: "Aider",               value: "aider",       description: ".aider/context.md" },
    ];

    const { choice } = await prompts({
      type:    "select",
      name:    "choice",
      message: "Which AI agent/editor are you using?",
      choices: agentChoices,
      initial: 0,
      hint:    "persistent generates context only for your selected agent",
    });

    selectedAgent = choice ?? "claude-code";
  }

  // Show which file will be written
  const agentLabel = AGENTS[selectedAgent]?.label ?? selectedAgent;
  const agentFile = AGENT_FILE_MAP[selectedAgent] ?? "AGENT_CONTEXT.md";
  console.log(chalk.green("✓") + " Agent: " + chalk.cyan(agentLabel) + chalk.dim(` → ${agentFile}`));

  // ── 3. Resolve skills ──────────────────────────────────────────────────────
  const resolvedSkills = await resolveSkills(stack);
  if (resolvedSkills.length > 0) {
    console.log(chalk.green("✓") + " Skills resolved: " + chalk.dim(resolvedSkills.length + " packages"));
  } else {
    console.log(chalk.dim("  Skills: none mapped for this stack"));
  }

  // ── 4. Obsidian path ───────────────────────────────────────────────────────
  let obsidianPath  = opts.obsidian ?? null;
  let obsidianSynced = false;

  if (!obsidianPath && !dryRun) {
    const { vault } = await prompts({
      type:    "text",
      name:    "vault",
      message: "Obsidian vault path? (Enter to skip)",
      hint:    "or type 'discover' to auto-find your vaults",
    });

    const input = (vault ?? "").trim().toLowerCase();

    if (DISCOVER_SIGNALS.has(input)) {
      const vaults = await discoverVaults();
      if (!vaults.length) {
        console.log(chalk.yellow("  No vaults found. Provide path manually later."));
      } else {
        const { choice } = await prompts({
          type:    "select",
          name:    "choice",
          message: "Select your Obsidian vault:",
          choices: [
            ...vaults.map((v) => ({ title: v.name, value: v.path, description: v.path })),
            { title: "Skip for now", value: null },
          ],
        });
        if (choice) obsidianPath = choice;
      }
    } else if (!SKIP_SIGNALS.has(input)) {
      obsidianPath = vault.trim();
    }
  }

  if (obsidianPath) {
    console.log(chalk.green("✓") + " Obsidian vault: " + chalk.cyan(obsidianPath));
  } else if (!dryRun) {
    console.log(chalk.dim("  Obsidian: skipped — run `persistent sync --discover` later"));
  }

  // ── 5. Build config ────────────────────────────────────────────────────────
  const cfg = {
    agent:         selectedAgent,
    agents:        [selectedAgent],  // keep array for backward compat
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
    console.log(chalk.bold.yellow("\n[dry-run] Plan:\n"));
    console.log(chalk.bold("  Files that would be written:"));
    if (selectedAgent === "generic") {
      console.log(`    ${chalk.green("AGENT_CONTEXT.md")}       universal context`);
    }
    console.log(`    ${chalk.green("SPECS/SEED.md")}          decisions + patterns`);
    if (obsidianPath) console.log(`    ${chalk.green("MEMORY/INDEX.md")}        from Obsidian vault`);
    const file = AGENT_FILE_MAP[selectedAgent] ?? "AGENT_CONTEXT.md";
    if (file !== "AGENT_CONTEXT.md")
      console.log(`    ${chalk.green(file)}  ← ${selectedAgent}`);
    console.log(`    ${chalk.green(".skills/")}              one file per library`);
    console.log(`    ${chalk.green(".persistent.json")}       persisted config`);
    console.log(chalk.bold("\n  Config:"));
    console.log(chalk.dim(JSON.stringify(cfg, null, 4).split("\n").map((l) => "    " + l).join("\n")));
    console.log(chalk.bold.yellow("\n  Remove --dry-run to execute.\n"));
    return;
  }

  // ── 6. Install skills ─────────────────────────────────────────────────────
  const { installed, builtin, placeholder } = await installSkills(resolvedSkills, cwd);
  cfg.skills = resolvedSkills;

  // ── 7. Extract project context (the intelligence layer) ─────────────────
  const ctxSpinner = ora("Analyzing project...").start();
  const extractedContext = await extractProjectContext(cwd, stack);
  cfg.extractedContext = extractedContext;

  const ctxCount = (extractedContext.patterns?.length ?? 0)
    + (extractedContext.constraints?.length ?? 0)
    + (extractedContext.antiPatterns?.length ?? 0);
  if (ctxCount > 0) {
    ctxSpinner.succeed(
      `Project analyzed: ${extractedContext.patterns.length} patterns, ` +
      `${extractedContext.constraints.length} constraints, ` +
      `${extractedContext.antiPatterns.length} anti-patterns`
    );
  } else {
    ctxSpinner.succeed("Project analyzed (no code patterns detected yet)");
  }
  if (extractedContext.readme) {
    console.log(chalk.dim(`  Project: ${extractedContext.readme.slice(0, 80)}...`));
  }

  // ── 8. Write AGENT_CONTEXT.md only for generic (no agent detected) ────────
  // When a specific agent is selected, that agent's file has all the context
  if (selectedAgent === "generic") {
    await writeAgentContext(cfg, cwd);
  }

  // ── 9. Init SPECS/ ────────────────────────────────────────────────────────
  await initSpecs(cwd, stack, extractedContext);
  console.log(chalk.green("✓") + " SPECS/ initialized");

  // ── 10. Sync Obsidian ─────────────────────────────────────────────────────
  if (obsidianPath) {
    obsidianSynced = await syncObsidian(obsidianPath, cwd, { pinnedFolders: [] });
    if (obsidianSynced) cfg.lastSync = new Date().toISOString();
    else                cfg.obsidianPath = null;
  }

  // ── 11. Set up selected agent ────────────────────────────────────────────
  console.log("");
  const { block } = await import("./agent-writer.js").then(m => ({
    block: m.buildBlock(cfg)
  }));
  const { patchAgentFile } = await import("./agent-writer.js");
  const { relPath } = await patchAgentFile(selectedAgent, agentRoot, cfg);
  const displayPath = path.relative(cwd, path.join(agentRoot, relPath)) || relPath;
  console.log(chalk.green("✓") + ` Patched ${chalk.bold(displayPath)} [${chalk.cyan(selectedAgent)}]`);

  // Run any extra setup for this agent
  await runAgentSetup(selectedAgent, agentRoot, block);

  // ── 12. Save config ─────────────────────────────────────────────────────
  // Don't persist extractedContext in .persistent.json — it's regenerated each run
  const persistCfg = { ...cfg };
  delete persistCfg.extractedContext;
  await writeConfig(persistCfg);
  console.log(chalk.green("\n✓") + " Config saved to .persistent.json\n");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(chalk.bold("Done. Written:"));
  if (selectedAgent === "generic") {
    console.log(`  ${chalk.green("AGENT_CONTEXT.md")}     universal context`);
  }
  console.log(`  ${chalk.green("SPECS/SEED.md")}        ${ctxCount > 0 ? `${ctxCount} project-specific entries` : "fill in decisions + patterns"}`);
  if (obsidianSynced)
    console.log(`  ${chalk.green("MEMORY/INDEX.md")}      synced from Obsidian`);
  const file = AGENT_FILE_MAP[selectedAgent] ?? "AGENT_CONTEXT.md";
  if (file !== "AGENT_CONTEXT.md")
    console.log(`  ${chalk.green(file)}`);
  console.log(`  ${chalk.green(".skills/")}            ${installed.length} registry · ${builtin.length} builtin · ${placeholder.length} placeholder`);
  console.log(`  ${chalk.green(".persistent.json")}     persisted config`);

  // Show slash command summary for supported agents
  if (supportsSlashCommands(selectedAgent)) {
    console.log(`  ${chalk.green("slash commands")}      ${COMMAND_NAMES.length} commands for ${selectedAgent}`);
  }

  // Per-agent post-setup instructions
  printAgentInstructions(selectedAgent);

  console.log(chalk.bold("\nWorkflow:"));
  console.log(chalk.dim("  persistent spec \"<feature>\"  — propose a spec before coding"));
  console.log(chalk.dim("  persistent sync              — re-pull Obsidian vault"));
  console.log(chalk.dim("  persistent update            — re-run after stack or agent changes\n"));
}
