import { describe, expect, it } from "vitest";

import { buildReviewPrompt, buildSystemPrompt, riskResultSchema } from "../src/prompt.js";
import type { PullRequestContext } from "../src/types.js";

const pr: PullRequestContext = {
  owner: "acme",
  repo: "demo",
  number: 7,
  title: "Fix auth bug",
  body: "Fixes #1",
  author: "octo",
  baseRef: "main",
  headRef: "patch",
  files: [
    {
      filename: "src/auth.ts",
      status: "modified",
      additions: 10,
      deletions: 2,
      patch: "+".repeat(5000),
      baseContent: "export function validateSession() {}"
    }
  ]
};

describe("buildReviewPrompt", () => {
  it("does not ask the model for an unused suggested action", () => {
    expect(riskResultSchema.required).not.toContain("recommendedAction");
    expect(riskResultSchema.properties).not.toHaveProperty("recommendedAction");
  });

  it("calibrates small but sloppy diffs as review-risky", () => {
    const systemPrompt = buildSystemPrompt({
      depth: "pr",
      maxFiles: 10,
      maxPatchCharsPerFile: 100,
      maxBaseFileCharsPerFile: 1000,
      maxFindings: 4,
      maxReviewFirstFiles: 5
    });
    const reviewPrompt = buildReviewPrompt(pr, {
      depth: "pr",
      maxFiles: 10,
      maxPatchCharsPerFile: 100,
      maxBaseFileCharsPerFile: 1000,
      maxFindings: 4,
      maxReviewFirstFiles: 5
    });

    expect(systemPrompt).toContain("Small diffs are not automatically low risk");
    expect(systemPrompt).toContain("over-engineering");
    expect(reviewPrompt).toContain("50-75 review-risky");
    expect(reviewPrompt).toContain("tests only the happy path");
  });

  it("keeps PR-depth prompts compact and excludes base file contents", () => {
    const prompt = buildReviewPrompt(pr, {
      depth: "pr",
      maxFiles: 10,
      maxPatchCharsPerFile: 100,
      maxBaseFileCharsPerFile: 1000,
      maxFindings: 4,
      maxReviewFirstFiles: 5
    });

    expect(prompt).toContain("\"depth\": \"pr\"");
    expect(prompt).toContain("[truncated]");
    expect(prompt).not.toContain("baseContent");
  });

  it("includes capped base file contents for codebase-depth prompts", () => {
    const prompt = buildReviewPrompt(pr, {
      depth: "codebase",
      maxFiles: 10,
      maxPatchCharsPerFile: 100,
      maxBaseFileCharsPerFile: 12,
      maxFindings: 4,
      maxReviewFirstFiles: 5
    });

    expect(prompt).toContain("\"depth\": \"codebase\"");
    expect(prompt).toContain("\"baseContent\"");
    expect(prompt).toContain("[truncated]");
  });
});
