#!/usr/bin/env node
import { program } from "commander";
import { init } from "../specflow/src/init.js";
import {
  syncObsidian,
  discoverVaults,
  bidirectionalSync,
} from "../specflow/src/obsidian-bridge.js";
import { updateAgent } from "../specflow/src/agent-writer.js";
import {
  addSkill,
  searchSkills,
  createSkillFromProject,
  evolveSkill,
  updateSkills,
  listInstalledSkills,
} from "../specflow/src/skills-loader.js";
import {
  runSpec,
  archiveSpec,
  validateSpecCmd,
  listSpecs,
  seedCmd,
} from "../specflow/src/spec-runner.js";
import { readConfig, writeConfig } from "../specflow/src/config.js";
import chalk from "chalk";

program
  .name("Specflow")
  .description("Universal AI workflow bootstrap — OpenSpec + Skills.sh + Obsidian")
  .version("0.2.0");

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
    const { analyzeAndGenerateSkills } = await import("../specflow/src/analyzer.js").catch(() => {
      console.error(chalk.red("analyzer not available"));
      process.exit(1);
    });

    const cfg = await readConfig();
    if (!cfg.stack?.length) {
      console.error(chalk.red("No stack config found. Run: Specflow init first."));
      process.exit(1);
    }

    const { resolveSkills } = await import("../specflow/src/skills-loader.js");
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
  .description("Bidirectional Obsidian sync: vault ↔ project (specs, skills, SEED)")
  .option("--pin <folder>", "Add a vault folder to always-pull list")
  .option("--discover", "Auto-discover Obsidian vaults on this machine")
  .option("--one-way", "Pull from vault only (legacy behavior)")
  .action(async (opts) => {
    if (opts.discover) {
      const vaults = await discoverVaults();
      if (!vaults.length) {
        console.log(chalk.yellow("No Obsidian vaults found automatically."));
        console.log(chalk.dim("Provide path manually: Specflow init --obsidian <path>"));
      } else {
        console.log(chalk.bold("Found vaults:"));
        for (const v of vaults)
          console.log("  " + chalk.green(v.name) + "  " + chalk.dim(v.path));
        console.log(chalk.dim("\nUse: Specflow init --obsidian <path>"));
      }
      return;
    }

    const cfg = await readConfig();
    if (!cfg.obsidianPath) {
      console.error(chalk.red("No vault configured."));
      console.log(chalk.dim("Run: Specflow init --obsidian <path>  or  Specflow sync --discover"));
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

    if (opts.oneWay) {
      // Legacy one-way sync
      const synced = await syncObsidian(cfg.obsidianPath, process.cwd(), {
        pinnedFolders: cfg.pinnedFolders ?? [],
      });
      if (synced) {
        cfg.lastSync = new Date().toISOString();
        await writeConfig(cfg);
      }
    } else {
      // Bidirectional sync (default)
      const result = await bidirectionalSync(cfg.obsidianPath, process.cwd(), {
        pinnedFolders: cfg.pinnedFolders ?? [],
      });
      cfg.lastSync = new Date().toISOString();
      await writeConfig(cfg);
    }
  });

// ── spec ──────────────────────────────────────────────────────────────────
program
  .command("spec [feature]")
  .description('OpenSpec lifecycle: propose, validate, archive, list, seed')
  .option("--archive <slug>", "Archive a completed spec by slug")
  .option("--validate <slug>", "Validate a spec against SEED + generation-spec")
  .option("--list", "List active specs with progress")
  .option("--seed", "Regenerate SEED.md from archived spec patterns")
  .action(async (feature, opts) => {
    if (opts.archive)       await archiveSpec(opts.archive);
    else if (opts.validate) await validateSpecCmd(opts.validate);
    else if (opts.list)     await listSpecs();
    else if (opts.seed)     await seedCmd();
    else if (feature)       await runSpec(feature);
    else {
      console.log(chalk.bold("OpenSpec commands:"));
      console.log(chalk.dim('  Specflow spec "feature name"  — propose a new spec'));
      console.log(chalk.dim("  Specflow spec --validate <slug>  — validate a spec"));
      console.log(chalk.dim("  Specflow spec --archive <slug>   — archive + evolve SEED"));
      console.log(chalk.dim("  Specflow spec --list             — list active specs"));
      console.log(chalk.dim("  Specflow spec --seed             — regenerate SEED.md"));
    }
  });

// ── add-skill ─────────────────────────────────────────────────────────────
program
  .command("add-skill <skill>")
  .description("Install a skill and update AGENT_CONTEXT.md")
  .action(async (skill) => {
    const cfg = await readConfig();
    await addSkill(skill, process.cwd(), cfg);
  });

// ── skill ─────────────────────────────────────────────────────────────────
program
  .command("skill")
  .description("Skills.sh lifecycle: search, create, evolve, update, list")
  .option("--search <query>", "Search skills.sh registry for skills")
  .option("--create <id>", "Create a skill from project patterns + Obsidian")
  .option("--evolve <id>", "Evolve an existing skill with new patterns")
  .option("--update", "Update all installed skills via skills.sh")
  .option("--list", "List installed skills with source/version info")
  .action(async (opts) => {
    const cwd = process.cwd();
    if (opts.search) {
      const results = await searchSkills(opts.search);
      if (results.length === 0) {
        console.log(chalk.dim("No skills found. Try a different query."));
      } else {
        console.log(chalk.bold(`Found ${results.length} skills:\n`));
        for (const s of results) {
          console.log(`  ${chalk.cyan(s.id)} — ${s.description || "no description"}`);
        }
      }
    } else if (opts.create) {
      await createSkillFromProject(opts.create, cwd);
    } else if (opts.evolve) {
      await evolveSkill(opts.evolve, cwd);
    } else if (opts.update) {
      await updateSkills(cwd);
    } else if (opts.list) {
      const installed = await listInstalledSkills(cwd);
      if (installed.length === 0) {
        console.log(chalk.dim("No skills installed. Run: Specflow add-skill <id>"));
      } else {
        console.log(chalk.bold(`${installed.length} installed skills:\n`));
        for (const s of installed) {
          console.log(
            `  ${chalk.cyan(s.id)} — ${s.source} ${chalk.dim(s.version || "")}`
          );
        }
      }
    } else {
      console.log(chalk.bold("Skills.sh commands:"));
      console.log(chalk.dim("  Specflow skill --search <query>  — search registry"));
      console.log(chalk.dim("  Specflow skill --create <id>     — create from project"));
      console.log(chalk.dim("  Specflow skill --evolve <id>     — evolve with new patterns"));
      console.log(chalk.dim("  Specflow skill --update          — update all installed"));
      console.log(chalk.dim("  Specflow skill --list            — list installed skills"));
    }
  });

program.parse();
