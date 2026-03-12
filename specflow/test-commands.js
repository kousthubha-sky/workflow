/**
 * test-commands.js
 * Smoke test for command-writer.js
 * Run: node test-commands.js
 *
 * Tests that slash command files are correctly written for supported agents.
 */

import { writeSlashCommands, writeAllSlashCommands, supportsSlashCommands, COMMAND_NAMES, COMMAND_DIRS } from "./src/command-writer.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import chalk from "chalk";

const pass = (msg) => console.log(chalk.green("✓ PASS") + "  " + msg);
const fail = (msg, got, want) =>
  console.log(chalk.red("✗ FAIL") + `  ${msg}\n       got:  ${JSON.stringify(got)}\n       want: ${JSON.stringify(want)}`);

async function withTempDir(fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "persistent-cmd-test-"));
  try {
    return await fn(tmpDir);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function run() {
  console.log(chalk.bold("\npersistent · command-writer smoke tests\n"));

  // ── Test 1: Claude Code slash commands ────────────────────────────────
  await withTempDir(async (dir) => {
    const result = await writeSlashCommands("claude-code", dir);
    const ok = result.written.length === COMMAND_NAMES.length;
    ok
      ? pass(`Claude Code: ${result.written.length}/${COMMAND_NAMES.length} commands written`)
      : fail("Claude Code commands", result.written.length, COMMAND_NAMES.length);

    // Verify files exist
    for (const cmd of COMMAND_NAMES) {
      const filePath = path.join(dir, ".claude", "commands", `${cmd}.md`);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        content.length > 0
          ? pass(`  ${cmd}.md exists and has content (${content.length} bytes)`)
          : fail(`  ${cmd}.md is empty`, 0, ">0");
      } catch {
        fail(`  ${cmd}.md not found`, "missing", filePath);
      }
    }
  });

  // ── Test 2: OpenCode slash commands ───────────────────────────────────
  await withTempDir(async (dir) => {
    const result = await writeSlashCommands("opencode", dir);
    const ok = result.written.length === COMMAND_NAMES.length;
    ok
      ? pass(`OpenCode: ${result.written.length}/${COMMAND_NAMES.length} commands written`)
      : fail("OpenCode commands", result.written.length, COMMAND_NAMES.length);

    // Verify directory
    const cmdDir = path.join(dir, ".opencode", "commands");
    try {
      const files = await fs.readdir(cmdDir);
      files.length === COMMAND_NAMES.length
        ? pass(`  .opencode/commands/ has ${files.length} files`)
        : fail("  file count", files.length, COMMAND_NAMES.length);
    } catch {
      fail("  .opencode/commands/ directory", "missing", cmdDir);
    }
  });

  // ── Test 3: Unsupported agent returns empty ───────────────────────────
  await withTempDir(async (dir) => {
    const result = await writeSlashCommands("cursor", dir);
    result.written.length === 0
      ? pass("Unsupported agent (cursor) returns empty written array")
      : fail("Cursor should not write commands", result.written.length, 0);
  });

  // ── Test 4: supportsSlashCommands helper ──────────────────────────────
  {
    const checks = [
      { agent: "claude-code", expected: true },
      { agent: "opencode", expected: true },
      { agent: "cursor", expected: false },
      { agent: "copilot", expected: false },
      { agent: "windsurf", expected: false },
    ];
    for (const { agent, expected } of checks) {
      const actual = supportsSlashCommands(agent);
      actual === expected
        ? pass(`supportsSlashCommands("${agent}") → ${actual}`)
        : fail(`supportsSlashCommands("${agent}")`, actual, expected);
    }
  }

  // ── Test 5: writeAllSlashCommands with mixed agents ───────────────────
  await withTempDir(async (dir) => {
    const { results } = await writeAllSlashCommands(
      ["claude-code", "cursor", "opencode"],
      dir
    );
    results.length === 2
      ? pass(`writeAllSlashCommands: ${results.length} agents got commands (claude-code + opencode)`)
      : fail("writeAllSlashCommands agent count", results.length, 2);
  });

  // ── Test 6: Idempotent — re-writing doesn't break ────────────────────
  await withTempDir(async (dir) => {
    await writeSlashCommands("claude-code", dir);
    const result = await writeSlashCommands("claude-code", dir);
    result.written.length === COMMAND_NAMES.length
      ? pass("Idempotent: re-writing commands succeeds")
      : fail("Idempotent re-write", result.written.length, COMMAND_NAMES.length);
  });

  console.log(chalk.bold("\nDone.\n"));
}

run().catch(console.error);
