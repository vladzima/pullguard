import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFile } from "node:fs/promises";

import { decideActions } from "./actions.js";
import { analyzePullRequest } from "./analyze.js";
import { applyCommentOverrides, parseCommentCommand } from "./comment-command.js";
import { parsePolicyConfig, mergeModelOverride } from "./config.js";
import { applyDecision, applyWorkingComment, getPullRequestContext } from "./github.js";
import { shouldRunForTrigger } from "./trigger.js";

export async function run(): Promise<void> {
  const token = core.getInput("github-token", { required: true });
  const openaiApiKey = core.getInput("openai-api-key");
  const anthropicApiKey = core.getInput("anthropic-api-key");
  const configPath = core.getInput("config") || ".github/pullguard.yml";
  const modelOverride = core.getInput("model");
  const providerOverride = parseProviderInput(core.getInput("provider"));

  const baseConfig = mergeModelOverride(
    parsePolicyConfig(await readConfig(configPath, token)),
    modelOverride,
    providerOverride || undefined
  );
  const trigger = shouldRunForTrigger(
    {
      eventName: github.context.eventName,
      payload: github.context.payload as Record<string, unknown>
    },
    baseConfig.trigger
  );

  if (!trigger.shouldRun) {
    core.info(trigger.reason ?? "PullGuard trigger did not match.");
    core.setOutput("skipped", "true");
    return;
  }

  const config = applyCommentOverrides(
    baseConfig,
    trigger.commentCommand ? parseCommentCommand(trigger.commentCommand) : undefined
  );
  const octokit = github.getOctokit(token);
  const pr = await getPullRequestContext(octokit, config.analysis);

  if (config.actions.comment.enabled) {
    await applyWorkingComment({ octokit, pr });
  }

  const result = await analyzePullRequest({
    apiKeys: {
      openai: openaiApiKey || undefined,
      anthropic: anthropicApiKey || undefined
    },
    model: config.model,
    pr,
    analysis: config.analysis
  });
  const decision = decideActions(result, config);

  core.setOutput("skipped", "false");
  core.setOutput("score", result.score.toString());
  core.setOutput("labels", decision.labelsToApply.join(","));
  core.setOutput("should-close", decision.shouldClose.toString());

  await applyDecision({
    octokit,
    pr,
    result,
    decision
  });
}

function parseProviderInput(value: string): "openai" | "anthropic" | undefined {
  if (!value) {
    return undefined;
  }

  if (value === "openai" || value === "anthropic") {
    return value;
  }

  throw new Error("provider must be either 'openai' or 'anthropic'.");
}

async function readConfig(path: string, token: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return await readRepositoryConfig(path, token);
    }

    throw error;
  }
}

async function readRepositoryConfig(path: string, token: string): Promise<string> {
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;

  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: getConfigRef(github.context.payload as Record<string, unknown>)
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

function getConfigRef(payload: Record<string, unknown>): string | undefined {
  return (
    getNestedString(payload, ["pull_request", "base", "ref"]) ??
    getNestedString(payload, ["repository", "default_branch"])
  );
}

function getNestedString(payload: Record<string, unknown>, path: string[]): string | undefined {
  let current: unknown = payload;

  for (const part of path) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}
