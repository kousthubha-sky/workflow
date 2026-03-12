/**
 * test-detect.js
 * Quick smoke test for detect-stack.js
 * Run: node test-detect.js
 *
 * Tests against a simulated package.json in a temp dir,
 * then tests the real workflow/ package.json (should return empty).
 */

import { detectStack } from "./src/detect-stack.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import chalk from "chalk";

const pass = (msg) => console.log(chalk.green("✓ PASS") + "  " + msg);
const fail = (msg, got, want) =>
  console.log(chalk.red("✗ FAIL") + `  ${msg}\n       got:  ${JSON.stringify(got)}\n       want: ${JSON.stringify(want)}`);

async function withTempProject(deps, fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "persistent-test-"));
  await fs.writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ dependencies: deps, devDependencies: {} })
  );
  try {
    return await fn(tmpDir);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function run() {
  console.log(chalk.bold("\npersistent · detect-stack smoke tests\n"));

  // ── Test 1: Next.js + Supabase + Stripe ────────────────────────────────
  await withTempProject(
    { next: "14.0.0", "@supabase/supabase-js": "2.0.0", stripe: "14.0.0", tailwindcss: "3.0.0" },
    async (dir) => {
      const { keys } = await detectStack(dir);
      const want = ["nextjs", "supabase", "stripe", "tailwind"];
      const ok = want.every((k) => keys.includes(k));
      ok ? pass("next + supabase + stripe + tailwind") : fail("next + supabase + stripe + tailwind", keys, want);
    }
  );

  // ── Test 2: "next" should NOT match "next-auth" ────────────────────────
  await withTempProject(
    { "next-auth": "4.0.0" },
    async (dir) => {
      const { keys } = await detectStack(dir);
      const hasNext = keys.includes("nextjs");
      const hasNextAuth = keys.includes("nextauth");
      !hasNext ? pass('"next-auth" does not trigger "nextjs"') : fail('"next-auth" must not trigger "nextjs"', keys, []);
      hasNextAuth ? pass('"next-auth" triggers "nextauth"') : fail('"next-auth" should trigger "nextauth"', keys, ["nextauth"]);
    }
  );

  // ── Test 3: @clerk/* prefix matching ──────────────────────────────────
  await withTempProject(
    { "@clerk/nextjs": "4.0.0" },
    async (dir) => {
      const { keys } = await detectStack(dir);
      keys.includes("clerk") ? pass("@clerk/nextjs → clerk") : fail("@clerk/nextjs → clerk", keys, ["clerk"]);
    }
  );

  // ── Test 4: shadcn heuristic (radix + tailwind) ────────────────────────
  await withTempProject(
    { "@radix-ui/react-dialog": "1.0.0", tailwindcss: "3.0.0" },
    async (dir) => {
      const { keys } = await detectStack(dir);
      keys.includes("shadcn") ? pass("radix + tailwind → shadcn") : fail("radix + tailwind → shadcn", keys, ["shadcn"]);
    }
  );

  // ── Test 5: workflow/ own package.json → empty stack ──────────────────
  {
    const { keys } = await detectStack(process.cwd());
    keys.length === 0
      ? pass("persistent own package.json → no stack (correct)")
      : fail("persistent own package.json should return empty stack", keys, []);
  }

  // ── Test 6: tRPC detection ─────────────────────────────────────────────
  await withTempProject(
    { "@trpc/server": "11.0.0", "@trpc/client": "11.0.0", zod: "3.0.0" },
    async (dir) => {
      const { keys } = await detectStack(dir);
      const ok = keys.includes("trpc") && keys.includes("zod");
      ok ? pass("@trpc/server + zod → trpc + zod") : fail("@trpc + zod", keys, ["trpc", "zod"]);
    }
  );

  // ── Test 7: Vercel AI SDK ──────────────────────────────────────────────
  await withTempProject(
    { ai: "3.0.0", "@anthropic-ai/sdk": "0.20.0" },
    async (dir) => {
      const { keys } = await detectStack(dir);
      const ok = keys.includes("vercel-ai-sdk") && keys.includes("anthropic-sdk");
      ok ? pass("ai + @anthropic-ai/sdk → vercel-ai-sdk + anthropic-sdk") : fail("ai + anthropic", keys, ["vercel-ai-sdk", "anthropic-sdk"]);
    }
  );

  console.log(chalk.bold("\nDone.\n"));
}

run().catch(console.error);
