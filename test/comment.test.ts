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
      recommendedAction: "Request changes before deeper review."
    });

    expect(body).toContain("Review risk score: 88/100");
    expect(body).toContain("src/auth/session.ts");
    expect(body).toContain("Request changes before deeper review.");
    expect(body.toLowerCase()).not.toContain("ai-generated");
  });
});
