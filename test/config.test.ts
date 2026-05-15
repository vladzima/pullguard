import { describe, expect, it } from "vitest";

import { parsePolicyConfig } from "../src/config.js";

describe("parsePolicyConfig", () => {
  it("keeps comment, labels, and close independently configurable", () => {
    const config = parsePolicyConfig(`
model:
  provider: openai
  name: gpt-4.1-mini
actions:
  comment:
    enabled: false
  labels:
    enabled: true
    rules:
      - threshold: 50
        label: needs-human-review
      - threshold: 80
        label: high-risk-pr
  close:
    enabled: true
    threshold: 95
`);

    expect(config.actions.comment.enabled).toBe(false);
    expect(config.actions.labels.enabled).toBe(true);
    expect(config.actions.labels.rules).toEqual([
      { threshold: 50, label: "needs-human-review" },
      { threshold: 80, label: "high-risk-pr" }
    ]);
    expect(config.actions.close).toEqual({ enabled: true, threshold: 95 });
    expect(config.model.provider).toBe("openai");
  });

  it("defaults to observe-only actions and the current OpenAI mini model", () => {
    const config = parsePolicyConfig("");

    expect(config.model).toEqual({
      provider: "openai",
      name: "gpt-5.4-mini-2026-03-17"
    });
    expect(config.actions.comment.enabled).toBe(false);
    expect(config.actions.labels.enabled).toBe(false);
    expect(config.actions.close.enabled).toBe(false);
    expect(config.trigger.mode).toBe("always");
    expect(config.analysis.depth).toBe("pr");
  });

  it("accepts Anthropic provider config and label/comment triggers", () => {
    const config = parsePolicyConfig(`
model:
  provider: anthropic
  name: claude-sonnet-4-20250514
trigger:
  mode: comment
  label: run-pullguard
  comment: /pullguard
analysis:
  depth: codebase
  maxFiles: 8
  maxPatchCharsPerFile: 2000
  maxBaseFileCharsPerFile: 3000
`);

    expect(config.model).toEqual({
      provider: "anthropic",
      name: "claude-sonnet-4-20250514"
    });
    expect(config.trigger).toEqual({
      mode: "comment",
      label: "run-pullguard",
      comment: "/pullguard",
      allowCommentOverrides: true,
      allowedCommentAuthorAssociations: ["OWNER", "MEMBER", "COLLABORATOR"]
    });
    expect(config.analysis).toEqual({
      depth: "codebase",
      maxFiles: 8,
      maxPatchCharsPerFile: 2000,
      maxBaseFileCharsPerFile: 3000,
      maxFindings: 4,
      maxReviewFirstFiles: 5
    });
  });
});
