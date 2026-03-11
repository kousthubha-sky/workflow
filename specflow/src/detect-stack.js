/**
 * detect-stack.js
 * Reads package.json (and optionally pyproject.toml, Cargo.toml, go.mod)
 * and maps dependencies to stack keys used by skills-map.json.
 *
 * Matching rules (in priority order):
 *  1. Exact match:   dep === fragment
 *  2. Scoped match:  dep starts with fragment + "/" (catches @scope/pkg)
 *  3. Prefix match:  dep starts with fragment (e.g. "@clerk/")
 *
 * We deliberately avoid substring matching (dep.includes) to prevent
 * "next" matching "next-auth", "next-themes", "@next/font", etc.
 */

import fs from "fs/promises";
import path from "path";

/**
 * Each entry: [fragment, stackKey, matchMode]
 * matchMode: "exact" | "prefix" | "scope"
 *   exact  → dep === fragment
 *   prefix → dep.startsWith(fragment)
 *   scope  → dep === fragment OR dep.startsWith(fragment + "/")
 */
const DEP_MAP = [
  // ── Frontend frameworks ────────────────────────────────────────────────
  ["next", "nextjs", "exact"],          // "next" only, not "next-auth"
  ["nuxt", "nuxt", "exact"],
  ["@nuxtjs/", "nuxt", "prefix"],
  ["@sveltejs/kit", "sveltekit", "exact"],
  ["@remix-run/", "remix", "prefix"],
  ["astro", "astro", "exact"],
  ["vite", "vite", "exact"],
  ["react", "react", "exact"],
  ["vue", "vue", "exact"],
  ["svelte", "svelte", "exact"],
  ["@angular/core", "angular", "exact"],

  // ── Backend / runtime ──────────────────────────────────────────────────
  ["express", "express", "exact"],
  ["fastify", "fastify", "exact"],
  ["hono", "hono", "exact"],
  ["elysia", "elysia", "exact"],
  ["@nestjs/core", "nestjs", "exact"],

  // ── Database / ORM ─────────────────────────────────────────────────────
  ["prisma", "prisma", "exact"],
  ["@prisma/client", "prisma", "exact"],
  ["drizzle-orm", "drizzle", "exact"],
  ["@supabase/supabase-js", "supabase", "exact"],
  ["@supabase/ssr", "supabase", "exact"],
  ["mongoose", "mongoose", "exact"],
  ["typeorm", "typeorm", "exact"],
  ["kysely", "kysely", "exact"],

  // ── Auth ────────────────────────────────────────────────────────────────
  ["next-auth", "nextauth", "exact"],
  ["@auth/", "nextauth", "prefix"],       // Auth.js v5 scoped packages
  ["@clerk/", "clerk", "prefix"],         // catches @clerk/nextjs, @clerk/clerk-sdk-node
  ["lucia", "lucia", "exact"],
  ["better-auth", "better-auth", "exact"],

  // ── Payments ────────────────────────────────────────────────────────────
  ["stripe", "stripe", "exact"],
  ["razorpay", "razorpay", "exact"],
  ["@lemonsqueezy/lemonsqueezy.js", "lemonsqueezy", "exact"],

  // ── UI ──────────────────────────────────────────────────────────────────
  ["tailwindcss", "tailwind", "exact"],
  ["@radix-ui/", "radix", "prefix"],
  ["framer-motion", "framer-motion", "exact"],
  // shadcn isn't a real npm package — detect via @radix-ui presence + tailwind
  // We add a post-processing step for this below

  // ── Testing ─────────────────────────────────────────────────────────────
  ["vitest", "vitest", "exact"],
  ["jest", "jest", "exact"],
  ["@playwright/test", "playwright", "exact"],
  ["cypress", "cypress", "exact"],

  // ── Infra / cloud ────────────────────────────────────────────────────────
  ["@vercel/", "vercel", "prefix"],
  ["wrangler", "cloudflare-workers", "exact"],
  ["@cloudflare/workers-types", "cloudflare-workers", "exact"],
  ["@aws-sdk/", "aws", "prefix"],

  // ── State ────────────────────────────────────────────────────────────────
  ["zustand", "zustand", "exact"],
  ["jotai", "jotai", "exact"],
  ["@tanstack/react-query", "tanstack-query", "exact"],
  ["@tanstack/query-core", "tanstack-query", "exact"],
  ["@tanstack/react-router", "tanstack-router", "exact"],
  ["@tanstack/router", "tanstack-router", "prefix"],

  // ── Schema / validation ───────────────────────────────────────────────────
  ["zod", "zod", "exact"],
  ["valibot", "valibot", "exact"],
  ["yup", "yup", "exact"],

  // ── API layer ─────────────────────────────────────────────────────────────
  ["@trpc/server", "trpc", "exact"],
  ["@trpc/client", "trpc", "exact"],
  ["graphql", "graphql", "exact"],
  ["graphql-yoga", "graphql", "exact"],

  // ── AI SDKs ───────────────────────────────────────────────────────────────
  ["openai", "openai-sdk", "exact"],
  ["@anthropic-ai/sdk", "anthropic-sdk", "exact"],
  ["ai", "vercel-ai-sdk", "exact"],           // Vercel AI SDK

  // ── Misc ──────────────────────────────────────────────────────────────────
  ["typescript", "typescript", "exact"],
];

/**
 * Check if a dep name matches a fragment under the given match mode.
 * @param {string} dep
 * @param {string} fragment
 * @param {"exact"|"prefix"|"scope"} mode
 * @returns {boolean}
 */
function matches(dep, fragment, mode) {
  switch (mode) {
    case "exact":   return dep === fragment;
    case "prefix":  return dep.startsWith(fragment);
    case "scope":   return dep === fragment || dep.startsWith(fragment + "/");
    default:        return false;
  }
}

/**
 * Detect stack from a project directory.
 * @param {string} cwd - Project root
 * @returns {Promise<{ keys: string[], raw: Record<string,string> }>}
 *   keys = canonical stack key list
 *   raw  = dep name → matched key (for debug/dry-run display)
 */
export async function detectStack(cwd) {
  const stackKeys = new Set();
  const matchedDeps = {};

  // ── package.json ─────────────────────────────────────────────────────────
  const pkgPath = path.join(cwd, "package.json");
  try {
    const raw = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };

    for (const dep of Object.keys(allDeps)) {
      for (const [fragment, key, mode] of DEP_MAP) {
        if (matches(dep, fragment, mode)) {
          stackKeys.add(key);
          matchedDeps[dep] = key;
          break; // first match wins per dep
        }
      }
    }

    // shadcn heuristic: has both @radix-ui and tailwindcss
    if (stackKeys.has("radix") && stackKeys.has("tailwind")) {
      stackKeys.add("shadcn");
    }
  } catch {
    // no package.json — try other manifests
  }

  // ── pyproject.toml ────────────────────────────────────────────────────────
  try {
    const raw = await fs.readFile(path.join(cwd, "pyproject.toml"), "utf8");
    stackKeys.add("python");
    if (raw.includes("fastapi"))    stackKeys.add("fastapi");
    if (raw.includes("django"))     stackKeys.add("django");
    if (raw.includes("flask"))      stackKeys.add("flask");
    if (raw.includes("sqlalchemy")) stackKeys.add("sqlalchemy");
    if (raw.includes("pydantic"))   stackKeys.add("pydantic");
  } catch {}

  // ── requirements.txt ──────────────────────────────────────────────────────
  try {
    const req = await fs.readFile(path.join(cwd, "requirements.txt"), "utf8");
    stackKeys.add("python");
    if (req.includes("fastapi"))  stackKeys.add("fastapi");
    if (req.includes("django"))   stackKeys.add("django");
    if (req.includes("flask"))    stackKeys.add("flask");
  } catch {}

  // ── go.mod ────────────────────────────────────────────────────────────────
  try {
    await fs.access(path.join(cwd, "go.mod"));
    stackKeys.add("go");
  } catch {}

  // ── Cargo.toml ────────────────────────────────────────────────────────────
  try {
    await fs.access(path.join(cwd, "Cargo.toml"));
    stackKeys.add("rust");
  } catch {}

  // ── Dockerfile ────────────────────────────────────────────────────────────
  try {
    await fs.access(path.join(cwd, "Dockerfile"));
    stackKeys.add("docker");
  } catch {}

  return { keys: [...stackKeys], raw: matchedDeps };
}
