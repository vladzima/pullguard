import * as github from "@actions/github";

import { formatRiskComment, getCommentMarker } from "./comment.js";
import type { ActionDecision, PullRequestContext, RiskResult } from "./types.js";

type Octokit = ReturnType<typeof github.getOctokit>;

export async function getPullRequestContext(octokit: Octokit): Promise<PullRequestContext> {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    throw new Error("This action must run on a pull_request event.");
  }

  const { owner, repo } = github.context.repo;
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullRequest.number,
    per_page: 100
  });

  return {
    owner,
    repo,
    number: pullRequest.number,
    title: pullRequest.title,
    body: pullRequest.body ?? "",
    author: pullRequest.user?.login ?? "unknown",
    baseRef: pullRequest.base.ref,
    headRef: pullRequest.head.ref,
    files: files.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch
    }))
  };
}

export async function applyDecision(params: {
  octokit: Octokit;
  pr: PullRequestContext;
  result: RiskResult;
  decision: ActionDecision;
}): Promise<void> {
  if (params.decision.shouldComment) {
    await upsertComment(params.octokit, params.pr, formatRiskComment(params.result));
  }

  if (params.decision.labelsToApply.length > 0) {
    await params.octokit.rest.issues.addLabels({
      owner: params.pr.owner,
      repo: params.pr.repo,
      issue_number: params.pr.number,
      labels: params.decision.labelsToApply
    });
  }

  if (params.decision.shouldClose) {
    await params.octokit.rest.pulls.update({
      owner: params.pr.owner,
      repo: params.pr.repo,
      pull_number: params.pr.number,
      state: "closed"
    });
  }
}

async function upsertComment(octokit: Octokit, pr: PullRequestContext, body: string): Promise<void> {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner: pr.owner,
    repo: pr.repo,
    issue_number: pr.number,
    per_page: 100
  });

  const existing = comments.find((comment) => comment.body?.includes(getCommentMarker()));

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner: pr.owner,
      repo: pr.repo,
      comment_id: existing.id,
      body
    });
    return;
  }

  await octokit.rest.issues.createComment({
    owner: pr.owner,
    repo: pr.repo,
    issue_number: pr.number,
    body
  });
}
