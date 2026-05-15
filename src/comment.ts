import type { RiskFinding, RiskResult } from "./types.js";

const marker = "<!-- pullguard -->";

export function formatRiskComment(result: RiskResult): string {
  const findings = result.findings.length
    ? result.findings.map(formatFinding).join("\n")
    : "- No specific high-risk findings.";

  const reviewFirstFiles = result.reviewFirstFiles.length
    ? result.reviewFirstFiles.map((file) => `- \`${file}\``).join("\n")
    : "- No specific file priority.";

  return `${marker}
## PullGuard

**Risk: ${result.score}/100 - ${riskBand(result.score)}**

${result.summary}

**Main concerns**
${findings}

**Review first**
${reviewFirstFiles}

**Suggested action**
Audience: PR author.

${result.recommendedAction}
`;
}

export function getCommentMarker(): string {
  return marker;
}

function formatFinding(finding: RiskFinding): string {
  const location = finding.file ? ` \`${finding.file}\`` : "";
  return `- **${finding.severity} / ${finding.category}**${location}: ${finding.message}`;
}

function riskBand(score: number): "low" | "medium" | "high" {
  if (score >= 80) {
    return "high";
  }

  if (score >= 50) {
    return "medium";
  }

  return "low";
}
