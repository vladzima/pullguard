export const docsUrl = "https://github.com/vladzima/pullguard#readme";
export function buildNextSteps(options, written = true) {
    const secretName = options.provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    const steps = [
        section("next steps"),
        "",
        written ? color("Created:", "green") : color("Would create:", "yellow"),
        `  ${path(".github/workflows/pullguard.yml")}`,
        `  ${path(".github/pullguard.yml")}`,
        "",
        `${color("1.", "dim")} ${color("Add your provider key in GitHub:", "blue")}`,
        `  ${color("Settings -> Secrets and variables -> Actions -> New repository secret", "dim")}`,
        `  Name: ${color(secretName, "cyan")}`,
        "  Value: your provider API key",
        ""
    ];
    if (options.trigger === "label") {
        steps.push(`${color("2.", "dim")} ${color("Run PullGuard:", "blue")}`, "  Apply the label `run-pullguard` to a pull request.", "");
    }
    else if (options.trigger === "comment") {
        steps.push(`${color("2.", "dim")} ${color("Run PullGuard:", "blue")}`, "  Default run: comment `/pullguard` on a pull request.", "  Advanced one-off options are documented in the README.", "");
    }
    else {
        steps.push(`${color("2.", "dim")} ${color("Run PullGuard:", "blue")}`, "  It runs on opened, synchronized, and reopened pull requests.", "");
    }
    if (options.labels) {
        steps.push(`${color("3.", "dim")} ${color("Labels:", "blue")}`, "  PullGuard creates missing risk labels automatically.", "");
    }
    steps.push(color("Change setup:", "blue"), "  Re-run `npx pullguard init` to regenerate these files, or edit `.github/pullguard.yml` directly.", "", color("Remove PullGuard:", "blue"), "  Run `npx pullguard uninstall`, or delete `.github/workflows/pullguard.yml` and `.github/pullguard.yml`.", "");
    return steps;
}
export function buildDryRunOutput(files) {
    return [
        section("dry run"),
        "",
        path(".github/workflows/pullguard.yml"),
        "```yaml",
        files.workflow.trimEnd(),
        "```",
        "",
        path(".github/pullguard.yml"),
        "```yaml",
        files.policy.trimEnd(),
        "```",
        "",
        color("No files were written.", "yellow")
    ];
}
export function buildUninstallDryRunOutput() {
    return [
        section("remove"),
        "",
        color("Would remove:", "yellow"),
        `  ${path(".github/workflows/pullguard.yml")}`,
        `  ${path(".github/pullguard.yml")}`,
        "",
        color("No files were removed.", "yellow")
    ];
}
export function formatBanner() {
    return [
        color("PullGuard", "magenta"),
        color("PR review-risk triage for maintainers", "bold"),
        color("Writes a GitHub Actions workflow and policy file.", "dim"),
        `${color("Docs:", "blue")} ${docsUrl}`
    ].join("\n");
}
export function section(value) {
    return color(value.toUpperCase(), "bold");
}
export function path(value) {
    return color(value, "cyan");
}
export function color(value, name) {
    if (!process.stdout.isTTY) {
        return value;
    }
    const codes = {
        blue: ["\u001b[34m", "\u001b[0m"],
        cyan: ["\u001b[36m", "\u001b[0m"],
        green: ["\u001b[32m", "\u001b[0m"],
        yellow: ["\u001b[33m", "\u001b[0m"],
        magenta: ["\u001b[35m", "\u001b[0m"],
        dim: ["\u001b[2m", "\u001b[0m"],
        bold: ["\u001b[1m", "\u001b[0m"]
    };
    const [start, end] = codes[name];
    return `${start}${value}${end}`;
}
