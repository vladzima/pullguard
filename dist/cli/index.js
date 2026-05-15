#!/usr/bin/env node
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { buildInitFiles, getDefaultInitOptions } from "./templates.js";
import { buildDryRunOutput, buildNextSteps, buildUninstallDryRunOutput, color, formatBanner, section } from "./messages.js";
async function main() {
    const command = process.argv[2];
    const dryRun = process.argv.includes("--dry-run");
    const yes = process.argv.includes("--yes") || process.argv.includes("-y");
    if (!command || command === "--help" || command === "-h") {
        printHelp();
        return;
    }
    if (command === "uninstall") {
        await uninstall(dryRun);
        return;
    }
    if (command !== "init") {
        throw new Error(`Unknown command: ${command}`);
    }
    const options = yes ? getDefaultInitOptions() : await promptForOptions();
    const files = buildInitFiles(options);
    if (yes) {
        console.log(formatBanner());
        console.log("");
    }
    if (dryRun) {
        for (const line of buildDryRunOutput(files)) {
            console.log(line);
        }
    }
    else {
        await mkdir(join(process.cwd(), ".github", "workflows"), { recursive: true });
        await writeFile(join(process.cwd(), ".github", "workflows", "pullguard.yml"), files.workflow);
        await writeFile(join(process.cwd(), ".github", "pullguard.yml"), files.policy);
    }
    console.log("");
    for (const line of buildNextSteps(options, !dryRun)) {
        console.log(line);
    }
}
async function uninstall(dryRun) {
    if (dryRun) {
        console.log(formatBanner());
        console.log("");
        for (const line of buildUninstallDryRunOutput()) {
            console.log(line);
        }
        return;
    }
    await rm(join(process.cwd(), ".github", "workflows", "pullguard.yml"), { force: true });
    await rm(join(process.cwd(), ".github", "pullguard.yml"), { force: true });
    console.log(formatBanner());
    console.log("");
    console.log("Removed:");
    console.log("  .github/workflows/pullguard.yml");
    console.log("  .github/pullguard.yml");
}
async function promptForOptions() {
    const rl = createInterface({ input, output });
    try {
        console.log(formatBanner());
        console.log("");
        console.log(section("setup"));
        console.log("");
        const provider = await choose(rl, "LLM provider", ["openai", "anthropic"], "openai", "Choose the provider whose API key you will add to GitHub Actions secrets.");
        const trigger = await choose(rl, "When should PullGuard run?", ["always", "label", "comment"], "comment", "`label` means apply `run-pullguard`; `comment` means comment `/pullguard`.");
        const depth = await choose(rl, "Analysis depth", ["pr", "codebase"], "codebase", "`codebase` is the default; `pr` is cheaper and sends patches only.");
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
        console.log(`  ${color("Hint:", "blue")} ${color(hint, "dim")}`);
    }
    const answer = await rl.question(`${color("?", "cyan")} ${color(label, "bold")} ${color(`(${options.join("/")})`, "dim")} ${color(`[${fallback}]`, "green")}: `);
    const value = (answer.trim() || fallback);
    if (!options.includes(value)) {
        throw new Error(`${label} must be one of: ${options.join(", ")}`);
    }
    return value;
}
async function confirm(rl, label, fallback) {
    const suffix = fallback ? "Y/n" : "y/N";
    const answer = (await rl.question(`${color("?", "cyan")} ${color(label, "bold")} ${color(`(${suffix})`, "dim")}: `))
        .trim()
        .toLowerCase();
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
    const answer = await rl.question(`${color("?", "cyan")} ${color(label, "bold")} ${color(`[${fallback}]`, "green")}: `);
    const value = Number(answer.trim() || fallback);
    if (!Number.isInteger(value) || value < 0 || value > 100) {
        throw new Error(`${label} must be an integer from 0 to 100.`);
    }
    return value;
}
function printHelp() {
    console.log(`${formatBanner()}

${section("usage")}
  npx pullguard init
  npx pullguard init --dry-run
  npx pullguard init --yes --dry-run
  npx pullguard uninstall
  npx pullguard uninstall --dry-run

${section("files")}

The init command writes:
  .github/workflows/pullguard.yml
  .github/pullguard.yml

The uninstall command removes those two generated files.
`);
}
if (process.argv[1]?.endsWith("pullguard") || process.argv[1]?.endsWith("index.js")) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
export { buildNextSteps };
