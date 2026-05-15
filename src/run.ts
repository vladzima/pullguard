import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFile } from "node:fs/promises";

import { decideActions } from "./actions.js";
import { parsePolicyConfig, mergeModelOverride } from "./config.js";
import { applyDecision, getPullRequestContext } from "./github.js";
import { analyzePullRequest } from "./openai.js";

export async function run(): Promise<void> {
  const token = core.getInput("github-token", { required: true });
  const apiKey = core.getInput("openai-api-key", { required: true });
  const configPath = core.getInput("config") || ".github/pr-checker.yml";
  const modelOverride = core.getInput("model");

  const config = mergeModelOverride(parsePolicyConfig(await readConfig(configPath)), modelOverride);
  const octokit = github.getOctokit(token);
  const pr = await getPullRequestContext(octokit);
  const result = await analyzePullRequest({
    apiKey,
    model: config.model.name,
    pr
  });
  const decision = decideActions(result, config);

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
