import { describe, expect, it } from "vitest";

import { buildInitFiles } from "../src/cli/templates.js";
import { buildNextSteps } from "../src/cli/messages.js";

describe("buildInitFiles", () => {
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

describe("buildNextSteps", () => {
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
    expect(output).toContain("Docs: https://github.com/vladzima/pullguard#readme");
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
