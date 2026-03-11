#!/usr/bin/env node
import { program } from "commander";
import { init } from "../src/init.js";
import { syncObsidian, discoverVaults } from "../src/obsidian-bridge.js";
import { updateAgent } from "../src/agent-writer.js";
import { addSkill } from "../src/skills-loader.js";
import { runSpec, archiveSpec } from "../src/spec-runner.js";
import { readConfig, writeConfig } from "../src/config.js";
import chalk from "chalk";

program
  .name("agentflow")
  .description("Universal AI workflow bootstrap")
  .version("0.1.0");

// ── init ──────────────────────────────────────────────────────────────────
program
  .command("init")
  .description("Full setup: detect stack → pull skills → write MD files → patch agent")
  .option("--agent <n>", "Force agent (claude|opencode|copilot|cursor|aider)")
  .option("--obsidian <path>", "Absolute path to Obsidian vault")
  .option("--dry-run", "Preview without writing")
  .action(async (opts) => {
    await init(opts);
  });

// ── analyze ───────────────────────────────────────────────────────────────
program
  .command("analyze")
  .description("AI-analyze your code → generate project-specific skill files in .skills/")
  .option("--key <key>", "Anthropic API key (or set ANTHROPIC_API_KEY env var)")
  .option("--force", "Regenerate skills even if they already exist")
  .option("--only <skills>", "Comma-separated skill ids to regenerate")
  .action(async (opts) => {
    // Lazy import — only pulls in @anthropic-ai/sdk when this command runs
    const { analyzeAndGenerateSkills } = await import("../src/analyzer.js").catch(() => {
      console.error(chalk.red("analyzer not available"));
      process.exit(1);
    });

    const cfg = await readConfig();
    if (!cfg.stack?.length) {
      console.error(chalk.red("No stack config found. Run: agentflow init first."));
      process.exit(1);
    }

    const { resolveSkills } = await import("../src/skills-loader.js");
    const { default: skillsMap } = await import("../config/skills-map.json", { with: { type: "json" } });

    const allSkillIds = await resolveSkills(cfg.stack);
    const skillToStack = {};
    for (const [stackKey, ids] of Object.entries(skillsMap)) {
      for (const id of ids) skillToStack[id] = stackKey;
    }

    let targets = allSkillIds;
    if (opts.only) {
      const only = new Set(opts.only.split(",").map((s) => s.trim()));
      targets = allSkillIds.filter((id) => only.has(id));
      if (!targets.length) {
        console.error(chalk.red(`None of the specified skills found: ${opts.only}`));
        process.exit(1);
      }
    }

    const stackKeys = targets.map((id) => skillToStack[id] ?? id.split("/")[0]);
    await analyzeAndGenerateSkills(targets, stackKeys, process.cwd(), {
      apiKey: opts.key,
      force:  opts.force ?? false,
    });
  });

// ── update ────────────────────────────────────────────────────────────────
program
  .command("update")
  .description("Re-patch agent file from current config")
  .option("--agent <n>", "Target agent override")
  .action(async (opts) => {
    const cfg = await readConfig();
    await updateAgent(cfg, opts.agent);
  });

// ── sync ──────────────────────────────────────────────────────────────────
program
  .command("sync")
  .description("Pull Obsidian vault → MEMORY/INDEX.md")
  .option("--pin <folder>", "Add a vault folder to always-pull list")
  .option("--discover", "Auto-discover Obsidian vaults on this machine")
  .action(async (opts) => {
    if (opts.discover) {
      const vaults = await discoverVaults();
      if (!vaults.length) {
        console.log(chalk.yellow("No Obsidian vaults found automatically."));
        console.log(chalk.dim("Provide path manually: agentflow init --obsidian <path>"));
      } else {
        console.log(chalk.bold("Found vaults:"));
        for (const v of vaults)
          console.log("  " + chalk.green(v.name) + "  " + chalk.dim(v.path));
        console.log(chalk.dim("\nUse: agentflow init --obsidian <path>"));
      }
      return;
    }

    const cfg = await readConfig();
    if (!cfg.obsidianPath) {
      console.error(chalk.red("No vault configured."));
      console.log(chalk.dim("Run: agentflow init --obsidian <path>  or  agentflow sync --discover"));
      process.exit(1);
    }

    if (opts.pin) {
      const pins = cfg.pinnedFolders ?? [];
      if (!pins.includes(opts.pin)) {
        pins.push(opts.pin);
        cfg.pinnedFolders = pins;
        await writeConfig(cfg);
        console.log(chalk.green("✓") + ` Pinned folder: ${chalk.cyan(opts.pin)}`);
      }
    }

    const synced = await syncObsidian(cfg.obsidianPath, process.cwd(), {
      pinnedFolders: cfg.pinnedFolders ?? [],
    });
    if (synced) {
      cfg.lastSync = new Date().toISOString();
      await writeConfig(cfg);
    }
  });

// ── spec ──────────────────────────────────────────────────────────────────
program
  .command("spec [feature]")
  .description('Propose a feature spec: agentflow spec "add payments"')
  .option("--archive <slug>", "Archive a completed spec by slug")
  .action(async (feature, opts) => {
    if (opts.archive)  await archiveSpec(opts.archive);
    else if (feature)  await runSpec(feature);
    else               console.error(chalk.red('Usage: agentflow spec "<feature>"  |  agentflow spec --archive <slug>'));
  });

// ── add-skill ─────────────────────────────────────────────────────────────
program
  .command("add-skill <skill>")
  .description("Install a skill and update AGENT_CONTEXT.md")
  .action(async (skill) => {
    const cfg = await readConfig();
    await addSkill(skill, process.cwd(), cfg);
  });

program.parse();
