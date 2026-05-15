import { describe, expect, it } from "vitest";

import { buildInitFiles } from "../src/cli/templates.js";
import {
  buildDryRunOutput,
  buildNextSteps,
  buildUninstallDryRunOutput,
  formatBanner
} from "../src/cli/messages.js";
import { getDefaultInitOptions } from "../src/cli/templates.js";

describe("buildInitFiles", () => {
  it("provides defaults for non-interactive init", () => {
    expect(getDefaultInitOptions()).toEqual({
      provider: "openai",
      trigger: "comment",
      depth: "pr",
      comment: true,
      labels: true,
      closeThreshold: undefined
    });
  });

  it("generates workflow and policy files for comment-triggered OpenAI setup", () => {
    const files = buildInitFiles({
      provider: "openai",
      trigger: "comment",
      depth: "pr",
      comment: true,
      labels: true,
      closeThreshold: undefined
    });

    expect(files.workflow).toContain("OPENAI_API_KEY");
    expect(files.workflow).toContain("issue_comment:");
    expect(files.policy).toContain("provider: openai");
    expect(files.policy).toContain("mode: comment");
    expect(files.policy).toContain("comment: /pullguard");
    expect(files.policy).toContain("enabled: true");
    expect(files.policy).not.toContain("threshold: undefined");
  });

  it("generates Anthropic workflow key instructions and close threshold policy", () => {
    const files = buildInitFiles({
      provider: "anthropic",
      trigger: "label",
      depth: "codebase",
      comment: false,
      labels: false,
      closeThreshold: 95
    });

    expect(files.workflow).toContain("ANTHROPIC_API_KEY");
    expect(files.policy).toContain("provider: anthropic");
    expect(files.policy).toContain("mode: label");
    expect(files.policy).toContain("depth: codebase");
    expect(files.policy).toContain("close:");
    expect(files.policy).toContain("threshold: 95");
  });
});

describe("buildDryRunOutput", () => {
  it("prints both files without implying they were written", () => {
    const output = buildDryRunOutput({
      workflow: "name: PullGuard\n",
      policy: "model:\n  provider: openai\n"
    }).join("\n");

    expect(output).toContain("Dry run");
    expect(output).toContain(".github/workflows/pullguard.yml");
    expect(output).toContain("name: PullGuard");
    expect(output).toContain(".github/pullguard.yml");
    expect(output).toContain("provider: openai");
    expect(output).toContain("No files were written.");
  });
});

describe("buildUninstallDryRunOutput", () => {
  it("lists generated files to remove", () => {
    const output = buildUninstallDryRunOutput().join("\n");

    expect(output).toContain("Would remove:");
    expect(output).toContain(".github/workflows/pullguard.yml");
    expect(output).toContain(".github/pullguard.yml");
    expect(output).toContain("No files were removed.");
  });
});

describe("buildNextSteps", () => {
  it("shows the docs link in the banner before setup details", () => {
    expect(formatBanner()).toContain("Docs: https://github.com/vladzima/pullguard#readme");
  });

  it("explains how to use label-triggered setup without browsing docs", () => {
    const output = buildNextSteps({
      provider: "openai",
      trigger: "label",
      depth: "codebase",
      comment: true,
      labels: true,
      closeThreshold: undefined
    }).join("\n");

    expect(output).toContain("OPENAI_API_KEY");
    expect(output).toContain("Apply the label `run-pullguard`");
    expect(output).toContain("Create these labels");
  });

  it("explains how to change or remove setup", () => {
    const output = buildNextSteps({
      provider: "openai",
      trigger: "comment",
      depth: "pr",
      comment: true,
      labels: true,
      closeThreshold: undefined
    }).join("\n");

    expect(output).toContain("Change setup:");
    expect(output).toContain("npx pullguard init");
    expect(output).toContain("Remove PullGuard:");
    expect(output).toContain("npx pullguard uninstall");
  });

  it("does not say files were created during dry-run guidance", () => {
    const output = buildNextSteps(
      {
        provider: "openai",
        trigger: "comment",
        depth: "pr",
        comment: true,
        labels: true,
        closeThreshold: undefined
      },
      false
    ).join("\n");

    expect(output).toContain("Would create:");
    expect(output).not.toContain("Created:");
  });

  it("explains the exact comment command for comment-triggered setup", () => {
    const output = buildNextSteps({
      provider: "anthropic",
      trigger: "comment",
      depth: "pr",
      comment: true,
      labels: false,
      closeThreshold: 95
    }).join("\n");

    expect(output).toContain("ANTHROPIC_API_KEY");
    expect(output).toContain("Comment `/pullguard`");
    expect(output).toContain("/pullguard --depth codebase --close 95");
  });
});
