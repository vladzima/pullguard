# PR Checker

PR Checker is a free BYOK GitHub Action for open-source maintainers. It scores pull request review risk and can independently comment, label, or close a PR based on repository policy.

It does not try to prove a PR was AI-generated. It flags review-risk patterns that waste maintainer time: missing tests, broad unrelated changes, risky refactors, duplicated logic, weak PR descriptions, and suspiciously shallow fixes.

## Install

Create `.github/workflows/pr-checker.yml`:

```yaml
name: PR Checker

on:
  pull_request_target:
    types: [opened, synchronize, reopened]

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
          config: .github/pr-checker.yml
```

Create `.github/pr-checker.yml`:

```yaml
model:
  provider: openai
  name: gpt-4.1-mini

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

## Actions Are Independent

`comment`, `labels`, and `close` are separate choices. You can run observe-only by disabling all three, comment without labels, label without comments, or opt into automatic closing for very high-risk PRs.

Automatic closing is disabled by default because false positives are costly in public OSS.

## Security Note

The example uses `pull_request_target` so BYOK secrets are available for pull requests from forks. PR Checker reads pull request metadata and file patches through the GitHub API; it does not need to checkout or execute contributor code.

Do not add a checkout of the pull request head to this workflow unless you fully understand the security implications.

## Outputs

- `score`: review-risk score from `0` to `100`
- `labels`: comma-separated labels selected by policy
- `should-close`: whether the policy selected the close action
