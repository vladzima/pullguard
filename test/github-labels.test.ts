import { describe, expect, it, vi } from "vitest";

import { ensureLabels } from "../src/github.js";

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
