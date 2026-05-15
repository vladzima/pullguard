#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { buildInitFiles } from "./templates.js";
import { buildNextSteps, color, formatBanner } from "./messages.js";
async function main() {
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
    console.log("");
    for (const line of buildNextSteps(options)) {
        console.log(line);
    }
}
async function promptForOptions() {
    const rl = createInterface({ input, output });
    try {
        console.log(formatBanner());
        console.log("");
        const provider = await choose(rl, "LLM provider", ["openai", "anthropic"], "openai", "Choose the provider whose API key you will add to GitHub Actions secrets.");
        const trigger = await choose(rl, "When should PullGuard run?", ["always", "label", "comment"], "comment", "`label` means apply `run-pullguard`; `comment` means comment `/pullguard`.");
        const depth = await choose(rl, "Analysis depth", ["pr", "codebase"], "pr", "`pr` is cheapest; `codebase` also sends capped base-file context.");
        const comment = await confirm(rl, "Post/update a PR comment with findings?", true);
        const labels = await confirm(rl, "Apply threshold labels like needs-human-review?", true);
        const close = await confirm(rl, "Allow automatic close for very high-risk PRs?", false);
        const closeThreshold = close ? await number(rl, "Close threshold", 95) : undefined;
        return { provider, trigger, depth, comment, labels, closeThreshold };
    }
    finally {
        rl.close();
    }
}
async function choose(rl, label, options, fallback, hint) {
    if (hint) {
        console.log(color(`  ${hint}`, "dim"));
    }
    const answer = await rl.question(`${label} (${options.join("/")}) [${fallback}]: `);
    const value = (answer.trim() || fallback);
    if (!options.includes(value)) {
        throw new Error(`${label} must be one of: ${options.join(", ")}`);
    }
    return value;
}
async function confirm(rl, label, fallback) {
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
async function number(rl, label, fallback) {
    const answer = await rl.question(`${label} [${fallback}]: `);
    const value = Number(answer.trim() || fallback);
    if (!Number.isInteger(value) || value < 0 || value > 100) {
        throw new Error(`${label} must be an integer from 0 to 100.`);
    }
    return value;
}
function printHelp() {
    console.log(`${formatBanner()}

Usage:
  npx pullguard init

The init command writes:
  .github/workflows/pullguard.yml
  .github/pullguard.yml

Docs:
  https://github.com/vladzima/pullguard#readme
`);
}
if (process.argv[1]?.endsWith("pullguard") || process.argv[1]?.endsWith("index.js")) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
export { buildNextSteps };
