import * as github from "@actions/github";

import { formatRiskComment, getCommentMarker } from "./comment.js";
import type {
  ActionDecision,
  AnalysisConfig,
  PullRequestContext,
  PullRequestFile,
  RiskResult
} from "./types.js";

type Octokit = ReturnType<typeof github.getOctokit>;

export async function getPullRequestContext(
  octokit: Octokit,
  analysis: AnalysisConfig
): Promise<PullRequestContext> {
  const { owner, repo } = github.context.repo;
  const pullRequest = await resolvePullRequest(octokit, owner, repo);

  if (!pullRequest) {
    throw new Error("This action must run on a pull_request or issue_comment event for a PR.");
  }

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
    files: await withOptionalBaseContext(
      octokit,
      owner,
      repo,
      pullRequest.base.ref,
      files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch
      })),
      analysis
    )
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

async function resolvePullRequest(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<NonNullable<typeof github.context.payload.pull_request>> {
  const pullRequest = github.context.payload.pull_request;
  if (pullRequest) {
    return pullRequest;
  }

  const issue = github.context.payload.issue;
  if (!issue?.pull_request) {
    throw new Error("issue_comment event is not attached to a pull request.");
  }

  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: issue.number
  });

  return response.data as NonNullable<typeof github.context.payload.pull_request>;
}

async function withOptionalBaseContext(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
  files: PullRequestFile[],
  analysis: AnalysisConfig
): Promise<PullRequestFile[]> {
  if (analysis.depth !== "codebase") {
    return files;
  }

  const limited = files.slice(0, analysis.maxFiles);
  const enriched = await Promise.all(
    limited.map(async (file) => ({
      ...file,
      baseContent: await readBaseFile(octokit, owner, repo, ref, file.filename)
    }))
  );

  return [...enriched, ...files.slice(analysis.maxFiles)];
}

async function readBaseFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
  path: string
): Promise<string> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref
    });

    if (Array.isArray(response.data) || response.data.type !== "file") {
      return "";
    }

    if (!("content" in response.data) || response.data.encoding !== "base64") {
      return "";
    }

    return Buffer.from(response.data.content, "base64").toString("utf8");
  } catch {
    return "";
  }
}
