export function buildInitFiles(options) {
    return {
        workflow: buildWorkflow(options.provider),
        policy: buildPolicy(options)
    };
}
export function getDefaultInitOptions() {
    return {
        provider: "openai",
        trigger: "comment",
        depth: "pr",
        comment: true,
        labels: true,
        closeThreshold: undefined
    };
}
function buildWorkflow(provider) {
    const keyInput = provider === "anthropic"
        ? "          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}"
        : "          openai-api-key: ${{ secrets.OPENAI_API_KEY }}";
    return `name: PullGuard

on:
  pull_request_target:
    types: [opened, synchronize, reopened, labeled]
  issue_comment:
    types: [created]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  pullguard:
    runs-on: ubuntu-latest
    steps:
      - uses: vladzima/pullguard@v1
        with:
${keyInput}
          config: .github/pullguard.yml
`;
}
function buildPolicy(options) {
    const modelName = options.provider === "anthropic"
        ? "claude-sonnet-4-20250514"
        : "gpt-5.4-mini-2026-03-17";
    return `model:
  provider: ${options.provider}
  name: ${modelName}

trigger:
  mode: ${options.trigger}
  label: run-pullguard
  comment: /pullguard
  allowCommentOverrides: true
  allowedCommentAuthorAssociations:
    - OWNER
    - MEMBER
    - COLLABORATOR

analysis:
  depth: ${options.depth}
  maxFiles: 20
  maxPatchCharsPerFile: 4000
  maxBaseFileCharsPerFile: 6000
  maxFindings: 4
  maxReviewFirstFiles: 5

actions:
  comment:
    enabled: ${options.comment}

  labels:
    enabled: ${options.labels}
    rules:
      - threshold: 60
        label: needs-human-review
      - threshold: 80
        label: high-risk-pr

  close:
    enabled: ${options.closeThreshold !== undefined}
    threshold: ${options.closeThreshold ?? 95}
`;
}
