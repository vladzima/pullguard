import { describe, expect, it } from "vitest";

import { formatRiskComment } from "../src/comment.js";

describe("formatRiskComment", () => {
  it("formats an evidence-first PR comment without AI accusation language", () => {
    const body = formatRiskComment({
      score: 88,
      summary: "This PR changes authentication behavior without matching tests.",
      findings: [
        {
          category: "missing_tests",
          severity: "high",
          message: "Authentication flow changed without a regression test.",
          file: "src/auth/session.ts"
        }
      ],
      reviewFirstFiles: ["src/auth/session.ts"],
      recommendedAction: "Add a regression test for the changed authentication flow."
    });

    expect(body).toContain("**Risk: 88/100 - high**");
    expect(body).toContain("**Main concerns**");
    expect(body).toContain("**Review first**");
    expect(body).toContain("**Suggested action**");
    expect(body).toContain("Audience: PR author.");
    expect(body).toContain("src/auth/session.ts");
    expect(body).toContain("Add a regression test for the changed authentication flow.");
    expect(body.toLowerCase()).not.toContain("ai-generated");
  });

  it("maps risk bands into the visible score line", () => {
    expect(
      formatRiskComment({
        score: 18,
        summary: "No major review-risk signals found.",
        findings: [],
        reviewFirstFiles: [],
        recommendedAction: "Review normally."
      })
    ).toContain("**Risk: 18/100 - low**");

    expect(
      formatRiskComment({
        score: 67,
        summary: "Some review-risk signals found.",
        findings: [],
        reviewFirstFiles: [],
        recommendedAction: "Review carefully."
      })
    ).toContain("**Risk: 67/100 - medium**");
  });
});
