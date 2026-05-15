import { describe, expect, it, vi } from "vitest";

import { applyWorkingComment, ensureLabels } from "../src/github.js";

describe("ensureLabels", () => {
  it("creates missing labels before they are applied", async () => {
    const octokit = {
      rest: {
        issues: {
          getLabel: vi.fn().mockRejectedValue({ status: 404 }),
          createLabel: vi.fn()
        }
      }
    };

    await ensureLabels(octokit as never, {
      owner: "acme",
      repo: "demo",
      labels: ["needs-human-review", "high-risk-pr"]
    });

    expect(octokit.rest.issues.createLabel).toHaveBeenCalledWith({
      owner: "acme",
      repo: "demo",
      name: "needs-human-review",
      color: "f9d0c4",
      description: "PullGuard review-risk label"
    });
    expect(octokit.rest.issues.createLabel).toHaveBeenCalledWith({
      owner: "acme",
      repo: "demo",
      name: "high-risk-pr",
      color: "d73a4a",
      description: "PullGuard review-risk label"
    });
  });

  it("does not recreate labels that already exist", async () => {
    const octokit = {
      rest: {
        issues: {
          getLabel: vi.fn().mockResolvedValue({}),
          createLabel: vi.fn()
        }
      }
    };

    await ensureLabels(octokit as never, {
      owner: "acme",
      repo: "demo",
      labels: ["needs-human-review"]
    });

    expect(octokit.rest.issues.createLabel).not.toHaveBeenCalled();
  });
});

describe("applyWorkingComment", () => {
  it("creates a PullGuard placeholder comment", async () => {
    const octokit = {
      paginate: vi.fn().mockResolvedValue([]),
      rest: {
        issues: {
          createComment: vi.fn()
        }
      }
    };

    await applyWorkingComment({
      octokit: octokit as never,
      pr: {
        owner: "acme",
        repo: "demo",
        number: 7
      } as never
    });

    expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: "acme",
      repo: "demo",
      issue_number: 7,
      body: expect.stringContaining("Reviewing this PR")
    });
  });
});
