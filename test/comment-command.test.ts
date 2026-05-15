import { describe, expect, it } from "vitest";

import { applyCommentOverrides, parseCommentCommand } from "../src/comment-command.js";
import { parsePolicyConfig } from "../src/config.js";

describe("parseCommentCommand", () => {
  it("parses supported pullguard flags from a PR comment line", () => {
    expect(parseCommentCommand("/pullguard --close 95 --depth pr --no-labels")).toEqual({
      depth: "pr",
      labels: false,
      close: { enabled: true, threshold: 95 }
    });
  });

  it("supports provider, model, comment, labels, and close toggles", () => {
    expect(
      parseCommentCommand(
        "/pullguard --provider anthropic --model claude-sonnet-4-20250514 --comment --labels --no-close"
      )
    ).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      comment: true,
      labels: true,
      close: { enabled: false }
    });
  });

  it("rejects unsupported flags", () => {
    expect(() => parseCommentCommand("/pullguard --delete-branch")).toThrow(
      "Unsupported PullGuard flag: --delete-branch"
    );
  });
});

describe("applyCommentOverrides", () => {
  it("applies comment overrides for one run when enabled by config", () => {
    const config = parsePolicyConfig(`
trigger:
  allowCommentOverrides: true
actions:
  comment:
    enabled: false
  labels:
    enabled: true
  close:
    enabled: false
`);

    const overridden = applyCommentOverrides(
      config,
      parseCommentCommand("/pullguard --depth codebase --comment --no-labels --close 90")
    );

    expect(overridden.analysis.depth).toBe("codebase");
    expect(overridden.actions.comment.enabled).toBe(true);
    expect(overridden.actions.labels.enabled).toBe(false);
    expect(overridden.actions.close).toEqual({ enabled: true, threshold: 90 });
  });

  it("ignores overrides when disabled by config", () => {
    const config = parsePolicyConfig(`
trigger:
  allowCommentOverrides: false
analysis:
  depth: pr
`);

    const overridden = applyCommentOverrides(
      config,
      parseCommentCommand("/pullguard --depth codebase")
    );

    expect(overridden.analysis.depth).toBe("pr");
  });
});
