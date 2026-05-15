# PullGuard

PullGuard is a free BYOK GitHub Action for open-source maintainers. It scores pull request review risk and can independently comment, label, or close a PR based on repository policy.

It does not try to prove a PR was AI-generated. It flags review-risk patterns that waste maintainer time: missing tests, broad unrelated changes, risky refactors, duplicated logic, weak PR descriptions, and suspiciously shallow fixes.

## Install

Fastest path:

```bash
npx pullguard init
```

Preview without writing files:

```bash
npx pullguard init --dry-run
```

The CLI writes:

- `.github/workflows/pullguard.yml`
- `.github/pullguard.yml`

It also prints the exact next steps for your chosen setup: which GitHub secret to add, whether to apply `run-pullguard` or comment `/pullguard`, and which labels to create.

To change the setup later, either edit `.github/pullguard.yml` directly or rerun:

```bash
npx pullguard init
```

To remove PullGuard:

```bash
npx pullguard uninstall
```

That removes `.github/workflows/pullguard.yml` and `.github/pullguard.yml`. You can preview removal with:

```bash
npx pullguard uninstall --dry-run
```

Manual setup:

Create `.github/workflows/pullguard.yml`:

```yaml
name: PullGuard

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
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          config: .github/pullguard.yml
```

Create `.github/pullguard.yml`:

```yaml
model:
  provider: openai
  name: gpt-5.4-mini-2026-03-17

trigger:
  mode: always
  label: run-pullguard
  comment: /pullguard
  allowCommentOverrides: true
  allowedCommentAuthorAssociations:
    - OWNER
    - MEMBER
    - COLLABORATOR

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

## Add provider API key

PullGuard is BYOK. Add the selected provider key as a GitHub Actions secret:

1. Open your GitHub repository.
2. Go to `Settings -> Secrets and variables -> Actions`.
3. Click `New repository secret`.
4. Add one of:
   - `OPENAI_API_KEY` for OpenAI
   - `ANTHROPIC_API_KEY` for Anthropic
5. Paste the API key as the secret value.
6. Save the secret.

The workflow can include both keys; PullGuard uses the provider selected in `.github/pullguard.yml`.

## Providers

PullGuard supports OpenAI and Anthropic BYOK.

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

The matching API key must be passed to the action. You may pass both keys in the workflow and choose the provider in `.github/pullguard.yml`.

## Trigger modes

`trigger.mode` controls when analysis runs:

- `always`: run on every configured PR event.
- `label`: run only when the configured label is applied.
- `comment`: run only when an allowed maintainer comments the configured phrase.

With the default config, the manual PR comment is:

```text
/pullguard
```

So a maintainer can trigger review by commenting `/pullguard` on the pull request.

Label-triggered review:

```yaml
trigger:
  mode: label
  label: run-pullguard
```

With this config, a maintainer triggers review by applying the `run-pullguard` label to the PR.

Comment-triggered review:

```yaml
trigger:
  mode: comment
  comment: /pullguard
  allowedCommentAuthorAssociations:
    - OWNER
    - MEMBER
    - COLLABORATOR
```

With this config, a maintainer triggers review by commenting `/pullguard` on the PR.

Comment triggers are restricted by `allowedCommentAuthorAssociations` so random commenters cannot spend the repository's BYOK credits. To use comment triggers, keep the `issue_comment` event in `.github/workflows/pullguard.yml`. To use label triggers, keep `labeled` in the `pull_request_target` event types.

## Comment arguments

Trusted maintainers can override a single comment-triggered run:

```text
/pullguard --depth pr --comment --labels
/pullguard --depth codebase --close 95
/pullguard --provider anthropic --model claude-sonnet-4-20250514
```

Supported flags:

- `--depth pr|codebase`
- `--comment` / `--no-comment`
- `--labels` / `--no-labels`
- `--close <threshold>` / `--no-close`
- `--provider openai|anthropic`
- `--model <model-name>`

Comment overrides apply only to that run. Disable them with:

```yaml
trigger:
  allowCommentOverrides: false
```

## Analysis depth

`analysis.depth` controls token spend:

- `pr`: cheapest default. Sends PR metadata, file stats, and capped patches.
- `codebase`: more expensive. Also fetches capped base-branch contents for changed files so the model can compare the patch against existing code.

Both modes keep output compact through `maxFindings` and `maxReviewFirstFiles`.

## Actions are independent

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

With this config, PullGuard closes the PR only when the score is at least `95`.

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

## Security note

The example uses `pull_request_target` so BYOK secrets are available for pull requests from forks. PullGuard reads pull request metadata and file patches through the GitHub API; it does not need to checkout or execute contributor code.

Do not add a checkout of the pull request head to this workflow unless you fully understand the security implications.

## Outputs

- `score`: review-risk score from `0` to `100`
- `labels`: comma-separated labels selected by policy
- `should-close`: whether the policy selected the close action
- `skipped`: whether the configured trigger did not match

Example:

```yaml
steps:
  - id: pullguard
    uses: vladzima/pullguard@v1
    with:
      openai-api-key: ${{ secrets.OPENAI_API_KEY }}

  - if: ${{ steps.pullguard.outputs.skipped == 'false' }}
    run: echo "Risk score is ${{ steps.pullguard.outputs.score }}"

  - if: ${{ steps.pullguard.outputs['should-close'] == 'true' }}
    run: echo "PullGuard selected close action"
```

Use bracket syntax for `should-close` because the output name contains a hyphen.
If the configured trigger does not match, `skipped` is set to `true` and analysis does not run. If analysis starts and succeeds, `skipped` is set to `false`.

## Example policies

- `examples/always-comment.yml`: comment on every configured PR event.
- `examples/manual-comment-trigger.yml`: run only when a maintainer comments `/pullguard`.
- `examples/manual-label-trigger.yml`: run only when `run-pullguard` is applied.
- `examples/observe-only.yml`: compute outputs without modifying PRs.
- `examples/aggressive-close.yml`: codebase-aware analysis with close enabled at `95`.
