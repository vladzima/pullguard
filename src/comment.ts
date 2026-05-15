import type { RiskFinding, RiskResult } from "./types.js";

const marker = "<!-- pr-checker -->";

export function formatRiskComment(result: RiskResult): string {
  const findings = result.findings.length
    ? result.findings.map(formatFinding).join("\n")
    : "- No specific high-risk findings were identified.";

  const reviewFirstFiles = result.reviewFirstFiles.length
    ? result.reviewFirstFiles.map((file) => `- \`${file}\``).join("\n")
    : "- No specific file priority suggested.";

  return `${marker}
## PR Checker

Review risk score: ${result.score}/100

${result.summary}

### Main concerns
${findings}

### Review first
${reviewFirstFiles}

### Suggested maintainer action
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
