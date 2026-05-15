#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { buildInitFiles, type InitOptions } from "./templates.js";

async function main(): Promise<void> {
  const command = process.argv[2];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command !== "init") {
    throw new Error(`Unknown command: ${command}`);
  }

  const options = await promptForOptions();
  const files = buildInitFiles(options);

  await mkdir(join(process.cwd(), ".github", "workflows"), { recursive: true });
  await writeFile(join(process.cwd(), ".github", "workflows", "pullguard.yml"), files.workflow);
  await writeFile(join(process.cwd(), ".github", "pullguard.yml"), files.policy);

  const secretName = options.provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
  console.log("\nCreated:");
  console.log("  .github/workflows/pullguard.yml");
  console.log("  .github/pullguard.yml");
  console.log("\nAdd your provider key in GitHub:");
  console.log(`  Settings -> Secrets and variables -> Actions -> New repository secret`);
  console.log(`  Name: ${secretName}`);
  console.log("  Value: your provider API key");
}

async function promptForOptions(): Promise<InitOptions> {
  const rl = createInterface({ input, output });

  try {
    const provider = await choose(rl, "Provider", ["openai", "anthropic"], "openai");
    const trigger = await choose(rl, "Trigger", ["always", "label", "comment"], "comment");
    const depth = await choose(rl, "Analysis depth", ["pr", "codebase"], "pr");
    const comment = await confirm(rl, "Post/update PR comment?", true);
    const labels = await confirm(rl, "Apply risk labels?", true);
    const close = await confirm(rl, "Allow automatic close?", false);
    const closeThreshold = close ? await number(rl, "Close threshold", 95) : undefined;

    return { provider, trigger, depth, comment, labels, closeThreshold };
  } finally {
    rl.close();
  }
}

async function choose<T extends string>(
  rl: ReturnType<typeof createInterface>,
  label: string,
  options: T[],
  fallback: T
): Promise<T> {
  const answer = await rl.question(`${label} (${options.join("/")}) [${fallback}]: `);
  const value = (answer.trim() || fallback) as T;
  if (!options.includes(value)) {
    throw new Error(`${label} must be one of: ${options.join(", ")}`);
  }
  return value;
}

async function confirm(
  rl: ReturnType<typeof createInterface>,
  label: string,
  fallback: boolean
): Promise<boolean> {
  const suffix = fallback ? "Y/n" : "y/N";
  const answer = (await rl.question(`${label} (${suffix}): `)).trim().toLowerCase();
  if (!answer) {
    return fallback;
  }
  if (answer === "y" || answer === "yes") {
    return true;
  }
  if (answer === "n" || answer === "no") {
    return false;
  }
  throw new Error(`${label} expects yes or no.`);
}

async function number(
  rl: ReturnType<typeof createInterface>,
  label: string,
  fallback: number
): Promise<number> {
  const answer = await rl.question(`${label} [${fallback}]: `);
  const value = Number(answer.trim() || fallback);
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be an integer from 0 to 100.`);
  }
  return value;
}

function printHelp(): void {
  console.log(`PullGuard

Usage:
  npx pullguard init

The init command writes:
  .github/workflows/pullguard.yml
  .github/pullguard.yml
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
