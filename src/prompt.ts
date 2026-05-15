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
    reviewFirstFiles: { type: "array", items: { type: "string" } }
  },
  required: ["score", "summary", "findings", "reviewFirstFiles"]
} as const;

export function buildSystemPrompt(config: AnalysisConfig): string {
  return [
    "You are PullGuard, a maintainer-focused PR quality reviewer.",
    "Assess review risk, not authorship. Never accuse contributors of using AI.",
    "Return only the required JSON object.",
    `Keep output short: at most ${config.maxFindings} findings, one sentence per finding, no filler.`,
    `Review-first files must contain at most ${config.maxReviewFirstFiles} paths.`,
    "Score calibration: 0-25 means clean, narrow, idiomatic, and meaningfully tested; 25-50 means minor review concerns; 50-75 means review-risky due to weak tests, scope mismatch, over-engineering, convention mismatch, or low-effort implementation; 75-100 means likely maintainer time sink or unsafe to merge.",
    "Small diffs are not automatically low risk: penalize simple changes that introduce generic abstraction without demonstrated reuse, excessive explanatory comments, unnecessary runtime work, behavior broader than the PR description, or happy-path-only tests.",
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
        scoring:
          "0-25 clean and well-tested; 25-50 minor concerns; 50-75 review-risky due to weak tests, scope mismatch, over-engineering, convention mismatch, or low-effort implementation; 75-100 likely maintainer time sink or unsafe to merge.",
        categories:
          "missing_tests, unrelated_changes, risky_refactor, api_docs_mismatch, dependency_risk, duplicated_logic, weak_test, convention_mismatch, issue_mismatch",
        riskSignals:
          "A small diff can be medium risk when it over-engineers a simple change, adds excessive comments, changes behavior beyond the PR description, adds unnecessary hot-path work, or tests only the happy path.",
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
