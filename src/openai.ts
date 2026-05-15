import { buildReviewPrompt, buildSystemPrompt, riskResultSchema } from "./prompt.js";
import type { AnalysisConfig, PullRequestContext, RiskResult } from "./types.js";

export async function analyzePullRequest(params: {
  apiKey: string;
  model: string;
  pr: PullRequestContext;
  analysis: AnalysisConfig;
}): Promise<RiskResult> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: params.model,
      input: [
        {
          role: "system",
          content: buildSystemPrompt(params.analysis)
        },
        {
          role: "user",
          content: buildReviewPrompt(params.pr, params.analysis)
        }
      ],
      max_output_tokens: 700,
      text: {
        format: {
          type: "json_schema",
          name: "pr_quality_risk",
          strict: true,
          schema: riskResultSchema
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed with ${response.status}: ${body}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  const outputText = extractOutputText(data);

  if (!outputText) {
    throw new Error("OpenAI response did not include output text.");
  }

  return JSON.parse(outputText) as RiskResult;
}

function extractOutputText(response: OpenAIResponse): string | undefined {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return undefined;
}

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};
