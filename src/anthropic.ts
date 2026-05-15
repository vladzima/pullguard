import { buildReviewPrompt, buildSystemPrompt } from "./prompt.js";
import type { AnalysisConfig, PullRequestContext, RiskResult } from "./types.js";

export async function analyzePullRequestWithAnthropic(params: {
  apiKey: string;
  model: string;
  pr: PullRequestContext;
  analysis: AnalysisConfig;
}): Promise<RiskResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 900,
      system: `${buildSystemPrompt(params.analysis)} Return valid JSON only. No markdown.`,
      messages: [
        {
          role: "user",
          content: buildReviewPrompt(params.pr, params.analysis)
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic request failed with ${response.status}: ${body}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic response did not include text content.");
  }

  return JSON.parse(stripJsonFence(text)) as RiskResult;
}

function stripJsonFence(value: string): string {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
}

type AnthropicResponse = {
  content: Array<{
    type: string;
    text: string;
  }>;
};
