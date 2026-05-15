import { analyzePullRequestWithAnthropic } from "./anthropic.js";
import { analyzePullRequest as analyzePullRequestWithOpenAI } from "./openai.js";
import type { AnalysisConfig, ModelConfig, PullRequestContext, RiskResult } from "./types.js";

export async function analyzePullRequest(params: {
  apiKeys: {
    openai?: string;
    anthropic?: string;
  };
  model: ModelConfig;
  pr: PullRequestContext;
  analysis: AnalysisConfig;
}): Promise<RiskResult> {
  if (params.model.provider === "openai") {
    if (!params.apiKeys.openai) {
      throw new Error("openai-api-key is required when model.provider is openai.");
    }

    return analyzePullRequestWithOpenAI({
      apiKey: params.apiKeys.openai,
      model: params.model.name,
      pr: params.pr,
      analysis: params.analysis
    });
  }

  if (!params.apiKeys.anthropic) {
    throw new Error("anthropic-api-key is required when model.provider is anthropic.");
  }

  return analyzePullRequestWithAnthropic({
    apiKey: params.apiKeys.anthropic,
    model: params.model.name,
    pr: params.pr,
    analysis: params.analysis
  });
}
