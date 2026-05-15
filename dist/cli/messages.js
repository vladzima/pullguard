export const docsUrl = "https://github.com/vladzima/pullguard#readme";
export function buildNextSteps(options, written = true) {
    const secretName = options.provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    const steps = [
        written ? "Created:" : "Would create:",
        "  .github/workflows/pullguard.yml",
        "  .github/pullguard.yml",
        "",
        "Add your provider key in GitHub:",
        "  Settings -> Secrets and variables -> Actions -> New repository secret",
        `  Name: ${secretName}`,
        "  Value: your provider API key",
        ""
    ];
    if (options.trigger === "label") {
        steps.push("Run PullGuard:", "  Apply the label `run-pullguard` to a pull request.", "");
    }
    else if (options.trigger === "comment") {
        steps.push("Run PullGuard:", "  Comment `/pullguard` on a pull request.", "  Examples:", "    /pullguard --depth pr --comment --labels", "    /pullguard --depth codebase --close 95", "");
    }
    else {
        steps.push("Run PullGuard:", "  It runs on opened, synchronized, and reopened pull requests.", "");
    }
    if (options.labels) {
        steps.push("Create these labels in GitHub if they do not exist yet:", "  needs-human-review", "  high-risk-pr", "");
    }
    return steps;
}
export function buildDryRunOutput(files) {
    return [
        "Dry run",
        "",
        ".github/workflows/pullguard.yml",
        "```yaml",
        files.workflow.trimEnd(),
        "```",
        "",
        ".github/pullguard.yml",
        "```yaml",
        files.policy.trimEnd(),
        "```",
        "",
        "No files were written."
    ];
}
export function formatBanner() {
    return [
        color("PullGuard", "cyan"),
        "PR review-risk triage for maintainers",
        "Writes a GitHub Actions workflow and policy file.",
        `Docs: ${docsUrl}`
    ].join("\n");
}
export function color(value, name) {
    if (!process.stdout.isTTY) {
        return value;
    }
    const codes = {
        cyan: ["\u001b[36m", "\u001b[0m"],
        green: ["\u001b[32m", "\u001b[0m"],
        dim: ["\u001b[2m", "\u001b[0m"],
        bold: ["\u001b[1m", "\u001b[0m"]
    };
    const [start, end] = codes[name];
    return `${start}${value}${end}`;
}
