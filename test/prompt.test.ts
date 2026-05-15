import { describe, expect, it } from "vitest";

import { buildReviewPrompt, buildSystemPrompt } from "../src/prompt.js";
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
  it("asks for author-facing suggested actions", () => {
    const prompt = buildSystemPrompt({
      depth: "pr",
      maxFiles: 10,
      maxPatchCharsPerFile: 100,
      maxBaseFileCharsPerFile: 1000,
      maxFindings: 4,
      maxReviewFirstFiles: 5
    });

    expect(prompt).toContain("suggestion for the PR author");
    expect(prompt).toContain("do not tell the maintainer");
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
