# PR Checker

PR Checker is a free BYOK GitHub Action for open-source maintainers. It scores pull request review risk and can independently comment, label, or close a PR based on repository policy.

It does not try to prove a PR was AI-generated. It flags review-risk patterns that waste maintainer time: missing tests, broad unrelated changes, risky refactors, duplicated logic, weak PR descriptions, and suspiciously shallow fixes.

## Install

Create `.github/workflows/pr-checker.yml`:

```yaml
name: PR Checker

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
  pr-checker:
    runs-on: ubuntu-latest
    steps:
      - uses: vladzima/pr-checker@v1
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          config: .github/pr-checker.yml
```

Create `.github/pr-checker.yml`:

```yaml
model:
  provider: openai
  name: gpt-5.4-mini-2026-03-17

trigger:
  mode: always
  label: run-pr-checker
  comment: /pr-check

analysis:
  depth: pr
  maxFiles: 20
  maxPatchCharsPerFile: 4000
  maxBaseFileCharsPerFile: 6000
  maxFindings: 4
  maxReviewFirstFiles: 5

actions:
  comment:
    enabled: true

  labels:
    enabled: true
    rules:
      - threshold: 60
        label: needs-human-review
      - threshold: 80
        label: high-risk-pr

  close:
    enabled: false
    threshold: 95
```

## Providers

PR Checker supports OpenAI and Anthropic BYOK.

Use OpenAI:

```yaml
model:
  provider: openai
  name: gpt-5.4-mini-2026-03-17
```

Use Anthropic:

```yaml
model:
  provider: anthropic
  name: claude-sonnet-4-20250514
```

The matching API key must be passed to the action. You may pass both keys in the workflow and choose the provider in `.github/pr-checker.yml`.

## Trigger Modes

`trigger.mode` controls when analysis runs:

- `always`: run on every configured PR event.
- `label`: run only when the configured label is applied.
- `comment`: run only when an allowed maintainer comments the configured phrase.

With the default config, the manual PR comment is:

```text
/pr-check
```

So a maintainer can trigger review by commenting `/pr-check` on the pull request.

Label-triggered review:

```yaml
trigger:
  mode: label
  label: run-pr-checker
```

With this config, a maintainer triggers review by applying the `run-pr-checker` label to the PR.

Comment-triggered review:

```yaml
trigger:
  mode: comment
  comment: /pr-check
  allowedCommentAuthorAssociations:
    - OWNER
    - MEMBER
    - COLLABORATOR
```

With this config, a maintainer triggers review by commenting `/pr-check` on the PR.

Comment triggers are restricted by `allowedCommentAuthorAssociations` so random commenters cannot spend the repository's BYOK credits. To use comment triggers, keep the `issue_comment` event in `.github/workflows/pr-checker.yml`. To use label triggers, keep `labeled` in the `pull_request_target` event types.

## Analysis Depth

`analysis.depth` controls token spend:

- `pr`: cheapest default. Sends PR metadata, file stats, and capped patches.
- `codebase`: more expensive. Also fetches capped base-branch contents for changed files so the model can compare the patch against existing code.

Both modes keep output compact through `maxFindings` and `maxReviewFirstFiles`.

## Actions Are Independent

`comment`, `labels`, and `close` are separate choices. You can run observe-only by disabling all three, comment without labels, label without comments, or opt into automatic closing for very high-risk PRs.

Automatic closing is disabled by default because false positives are costly in public OSS.

Post or update a PR comment:

```yaml
actions:
  comment:
    enabled: true
```

Apply labels when score thresholds are met:

```yaml
actions:
  labels:
    enabled: true
    rules:
      - threshold: 60
        label: needs-human-review
      - threshold: 80
        label: high-risk-pr
```

With this config, a PR with score `82` gets both `needs-human-review` and `high-risk-pr`.

Close very high-risk PRs:

```yaml
actions:
  close:
    enabled: true
    threshold: 95
```

With this config, PR Checker closes the PR only when the score is at least `95`.

Observe-only mode:

```yaml
actions:
  comment:
    enabled: false
  labels:
    enabled: false
  close:
    enabled: false
```

Observe-only mode still computes outputs for later workflow steps, but it does not modify the PR.

## Security Note

The example uses `pull_request_target` so BYOK secrets are available for pull requests from forks. PR Checker reads pull request metadata and file patches through the GitHub API; it does not need to checkout or execute contributor code.

Do not add a checkout of the pull request head to this workflow unless you fully understand the security implications.

## Outputs

- `score`: review-risk score from `0` to `100`
- `labels`: comma-separated labels selected by policy
- `should-close`: whether the policy selected the close action
- `skipped`: whether the configured trigger did not match
