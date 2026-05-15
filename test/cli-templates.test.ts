import { describe, expect, it } from "vitest";

import { buildInitFiles } from "../src/cli/templates.js";

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
