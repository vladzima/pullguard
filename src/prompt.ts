import type { AnalysisConfig, PullRequestContext } from "./types.js";

export const riskResultSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          message: { type: "string" },
          file: { type: "string" }
        },
        required: ["category", "severity", "message", "file"]
      }
    },
    reviewFirstFiles: { type: "array", items: { type: "string" } },
    recommendedAction: { type: "string" }
  },
  required: ["score", "summary", "findings", "reviewFirstFiles", "recommendedAction"]
} as const;

export function buildSystemPrompt(config: AnalysisConfig): string {
  return [
    "You are PR Checker, a maintainer-focused PR quality reviewer.",
    "Assess review risk, not authorship. Never accuse contributors of using AI.",
    "Return only the required JSON object.",
    `Keep output short: at most ${config.maxFindings} findings, one sentence per finding, no filler.`,
    `Review-first files must contain at most ${config.maxReviewFirstFiles} paths.`,
    "Prefer concrete evidence from the supplied PR data over speculation."
  ].join(" ");
}

export function buildReviewPrompt(pr: PullRequestContext, config: AnalysisConfig): string {
  const files = pr.files.slice(0, config.maxFiles).map((file) => {
    const item: Record<string, string | number | undefined> = {
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: truncate(file.patch ?? "", config.maxPatchCharsPerFile)
    };

    if (config.depth === "codebase") {
      item.baseContent = truncate(file.baseContent ?? "", config.maxBaseFileCharsPerFile);
    }

    return item;
  });

  return JSON.stringify(
    {
      instructions: {
        depth: config.depth,
        scoring: "0 means no notable review risk; 100 means likely maintainer time sink or unsafe to merge.",
        categories:
          "missing_tests, unrelated_changes, risky_refactor, api_docs_mismatch, dependency_risk, duplicated_logic, weak_test, convention_mismatch, issue_mismatch",
        outputStyle: "hard structured JSON only; short bullet-ready strings"
      },
      pullRequest: {
        title: pr.title,
        body: truncate(pr.body, 2000),
        author: pr.author,
        baseRef: pr.baseRef,
        headRef: pr.headRef
      },
      limits: {
        maxFindings: config.maxFindings,
        maxReviewFirstFiles: config.maxReviewFirstFiles
      },
      files
    },
    null,
    2
  );
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n[truncated]`;
}
