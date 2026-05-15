export type InitOptions = {
  provider: "openai" | "anthropic";
  trigger: "always" | "label" | "comment";
  depth: "pr" | "codebase";
  comment: boolean;
  labels: boolean;
  closeThreshold?: number;
};

export function buildInitFiles(options: InitOptions): {
  workflow: string;
  policy: string;
} {
  return {
    workflow: buildWorkflow(options),
    policy: buildPolicy(options)
  };
}

export function getDefaultInitOptions(): InitOptions {
  return {
    provider: "openai",
    trigger: "comment",
    depth: "codebase",
    comment: true,
    labels: true,
    closeThreshold: undefined
  };
}

function buildWorkflow(options: InitOptions): string {
  const keyInput =
    options.provider === "anthropic"
      ? "          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}"
      : "          openai-api-key: ${{ secrets.OPENAI_API_KEY }}";

  return `name: PullGuard

${buildWorkflowTrigger(options.trigger)}

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

function buildWorkflowTrigger(trigger: InitOptions["trigger"]): string {
  if (trigger === "comment") {
    return `on:
  issue_comment:
    types: [created]`;
  }

  if (trigger === "label") {
    return `on:
  pull_request_target:
    types: [labeled]`;
  }

  return `on:
  pull_request_target:
    types: [opened, synchronize, reopened]`;
}

function buildPolicy(options: InitOptions): string {
  const modelName =
    options.provider === "anthropic"
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
      - threshold: 50
        label: needs-human-review
      - threshold: 80
        label: high-risk-pr

  close:
    enabled: ${options.closeThreshold !== undefined}
    threshold: ${options.closeThreshold ?? 95}
`;
}
