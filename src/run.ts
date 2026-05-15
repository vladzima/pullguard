import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFile } from "node:fs/promises";

import { decideActions } from "./actions.js";
import { analyzePullRequest } from "./analyze.js";
import { parsePolicyConfig, mergeModelOverride } from "./config.js";
import { applyDecision, getPullRequestContext } from "./github.js";
import { shouldRunForTrigger } from "./trigger.js";

export async function run(): Promise<void> {
  const token = core.getInput("github-token", { required: true });
  const openaiApiKey = core.getInput("openai-api-key");
  const anthropicApiKey = core.getInput("anthropic-api-key");
  const configPath = core.getInput("config") || ".github/pr-checker.yml";
  const modelOverride = core.getInput("model");
  const providerOverride = parseProviderInput(core.getInput("provider"));

  const config = mergeModelOverride(
    parsePolicyConfig(await readConfig(configPath)),
    modelOverride,
    providerOverride || undefined
  );
  const trigger = shouldRunForTrigger(
    {
      eventName: github.context.eventName,
      payload: github.context.payload as Record<string, unknown>
    },
    config.trigger
  );

  if (!trigger.shouldRun) {
    core.info(trigger.reason ?? "PR Checker trigger did not match.");
    core.setOutput("skipped", "true");
    return;
  }

  const octokit = github.getOctokit(token);
  const pr = await getPullRequestContext(octokit, config.analysis);
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

async function readConfig(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }

    throw error;
  }
}
