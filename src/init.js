/**
 * init.js
 * Orchestrates the full `specflow init` flow.
 *
 * Key change: agent selection is now a multi-select prompt at the START,
 * not auto-detected silently. Users pick which agents they use, and
 * specflow sets up each one properly.
 */

import path from "path";
import chalk from "chalk";
import prompts from "prompts";
import { detectStack } from "./detect-stack.js";
import { resolveSkills, installSkills } from "./skills-loader.js";
import { detectAgent, updateAgent, writeAgentContext, AGENT_FILE_MAP } from "./agent-writer.js";
import { runAgentSetup, printAgentInstructions, AGENTS } from "./agent-setup.js";
import { syncObsidian, discoverVaults } from "./obsidian-bridge.js";
import { initSpecs } from "./spec-runner.js";
import { writeConfig } from "./config.js";

const SKIP_SIGNALS     = new Set(["", "skip", "no", "n", "none", "later"]);
const DISCOVER_SIGNALS = new Set(["discover", "--discover", "specflow sync --discover", "sync --discover"]);

export async function init(opts = {}) {
  const cwd    = process.cwd();
  const dryRun = opts.dryRun ?? false;

  console.log("\n" + chalk.bold("specflow") + chalk.dim(" · universal AI workflow bootstrap\n"));

  // ── 1. Detect stack ────────────────────────────────────────────────────────
  const { keys: stack, raw: matchedDeps } = await detectStack(cwd);

  if (stack.length === 0) {
    console.log(chalk.yellow("⚠ No known stack detected."));
    console.log(chalk.dim("  Run from your project root (where package.json lives)."));
    console.log(chalk.dim("  Continuing with generic setup.\n"));
  } else {
    console.log(chalk.green("✓") + " Stack detected: " + chalk.cyan(stack.join(", ")));
  }

  // ── 2. Agent selection (multi-select) ─────────────────────────────────────
  // First auto-detect what's already present
  const { agent: detectedAgent, root: detectedRoot } = await detectAgent(cwd);

  let selectedAgents; // string[]
  let agentRoot = detectedRoot;

  if (opts.agent) {
    // --agent flag: single forced agent
    selectedAgents = [opts.agent];
  } else if (dryRun) {
    selectedAgents = detectedAgent !== "generic" ? [detectedAgent] : ["claude-code"];
  } else {
    // Build choices list — pre-check the detected one
    const agentChoices = [
      { title: "Claude Code",         value: "claude-code", description: "CLAUDE.md" },
      { title: "GitHub Copilot",      value: "copilot",     description: ".github/copilot-instructions.md" },
      { title: "Cursor",              value: "cursor",       description: ".cursor/rules/specflow.mdc" },
      { title: "Windsurf (Codeium)",  value: "windsurf",    description: ".windsurfrules" },
      { title: "OpenCode",            value: "opencode",    description: "agents.md" },
      { title: "Continue.dev",        value: "continue",    description: ".continue/context.md" },
      { title: "Aider",               value: "aider",       description: ".aider/context.md" },
    ];

    // Pre-select detected agent
    const preSelected = agentChoices
      .map((c, i) => ({ ...c, i }))
      .filter((c) => c.value === detectedAgent)
      .map((c) => c.i);

    console.log(
      detectedAgent !== "generic"
        ? chalk.dim(`  Auto-detected: ${AGENTS[detectedAgent]?.label ?? detectedAgent}\n`)
        : chalk.dim("  No agent detected in this directory.\n")
    );

    const { chosen } = await prompts({
      type:    "multiselect",
      name:    "chosen",
      message: "Which AI agents do you use? (space to select, enter to confirm)",
      choices: agentChoices,
      initial: preSelected,
      hint:    "Select all that apply — specflow sets up each one",
      instructions: false,
      min: 1,
    });

    if (!chosen?.length) {
      console.log(chalk.yellow("No agents selected — using generic fallback."));
      selectedAgents = ["generic"];
    } else {
      selectedAgents = chosen;
    }
  }

  // Show selected
  const agentLabels = selectedAgents.map((id) => AGENTS[id]?.label ?? id).join(", ");
  console.log(chalk.green("✓") + " Agents: " + chalk.cyan(agentLabels));

  // Show which files will be written per agent
  if (!dryRun) {
    for (const agentId of selectedAgents) {
      const file = AGENT_FILE_MAP[agentId] ?? "AGENT_CONTEXT.md";
      console.log(chalk.dim(`    ${agentId} → ${file}`));
    }
  }

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
    console.log(chalk.dim("  Obsidian: skipped — run `specflow sync --discover` later"));
  }

  // ── 5. Build config ────────────────────────────────────────────────────────
  const cfg = {
    agent:         selectedAgents[0],   // primary agent (backward compat)
    agents:        selectedAgents,      // all selected agents
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
    console.log(`    ${chalk.green("AGENT_CONTEXT.md")}       universal context`);
    console.log(`    ${chalk.green("SPECS/SEED.md")}          decisions + patterns`);
    if (obsidianPath) console.log(`    ${chalk.green("MEMORY/INDEX.md")}        from Obsidian vault`);
    for (const agentId of selectedAgents) {
      const file = AGENT_FILE_MAP[agentId] ?? "AGENT_CONTEXT.md";
      if (file !== "AGENT_CONTEXT.md")
        console.log(`    ${chalk.green(file)}  ← ${agentId}`);
    }
    console.log(`    ${chalk.green(".skills/")}              one file per library`);
    console.log(`    ${chalk.green(".specflow.json")}       persisted config`);
    console.log(chalk.bold("\n  Config:"));
    console.log(chalk.dim(JSON.stringify(cfg, null, 4).split("\n").map((l) => "    " + l).join("\n")));
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

  // ── 9. Sync Obsidian ──────────────────────────────────────────────────────
  if (obsidianPath) {
    obsidianSynced = await syncObsidian(obsidianPath, cwd, { pinnedFolders: [] });
    if (obsidianSynced) cfg.lastSync = new Date().toISOString();
    else                cfg.obsidianPath = null;
  }

  // ── 10. Set up each selected agent ────────────────────────────────────────
  console.log("");
  for (const agentId of selectedAgents) {
    const { block } = await import("./agent-writer.js").then(m => ({
      block: m.buildBlock(cfg)
    }));
    // Patch the agent's integration file
    const { patchAgentFile } = await import("./agent-writer.js");
    const { relPath } = await patchAgentFile(agentId, agentRoot, cfg);
    const displayPath = path.relative(cwd, path.join(agentRoot, relPath)) || relPath;
    console.log(chalk.green("✓") + ` Patched ${chalk.bold(displayPath)} [${chalk.cyan(agentId)}]`);

    // Run any extra setup for this agent
    await runAgentSetup(agentId, agentRoot, block);
  }

  // ── 11. Save config ────────────────────────────────────────────────────────
  await writeConfig(cfg);
  console.log(chalk.green("\n✓") + " Config saved to .specflow.json\n");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(chalk.bold("Done. Written:"));
  console.log(`  ${chalk.green("AGENT_CONTEXT.md")}     universal context`);
  console.log(`  ${chalk.green("SPECS/SEED.md")}        fill in decisions + patterns`);
  if (obsidianSynced)
    console.log(`  ${chalk.green("MEMORY/INDEX.md")}      synced from Obsidian`);
  for (const agentId of selectedAgents) {
    const file = AGENT_FILE_MAP[agentId] ?? "AGENT_CONTEXT.md";
    if (file !== "AGENT_CONTEXT.md")
      console.log(`  ${chalk.green(file)}`);
  }
  console.log(`  ${chalk.green(".skills/")}            ${installed.length} registry · ${builtin.length} builtin · ${placeholder.length} placeholder`);
  console.log(`  ${chalk.green(".specflow.json")}     persisted config`);

  // Per-agent post-setup instructions
  for (const agentId of selectedAgents) {
    printAgentInstructions(agentId);
  }

  console.log(chalk.bold("\nWorkflow:"));
  console.log(chalk.dim("  specflow spec \"<feature>\"  — propose a spec before coding"));
  console.log(chalk.dim("  specflow sync              — re-pull Obsidian vault"));
  console.log(chalk.dim("  specflow update            — re-run after stack or agent changes\n"));
}
