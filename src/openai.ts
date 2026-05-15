import type { PullRequestContext, RiskResult } from "./types.js";

const riskResultSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: {
      type: "integer",
      minimum: 0,
      maximum: 100
    },
    summary: {
      type: "string"
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: {
            type: "string"
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high"]
          },
          message: {
            type: "string"
          },
          file: {
            type: "string"
          }
        },
        required: ["category", "severity", "message", "file"]
      }
    },
    reviewFirstFiles: {
      type: "array",
      items: {
        type: "string"
      }
    },
    recommendedAction: {
      type: "string"
    }
  },
  required: ["score", "summary", "findings", "reviewFirstFiles", "recommendedAction"]
} as const;

export async function analyzePullRequest(params: {
  apiKey: string;
  model: string;
  pr: PullRequestContext;
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
          content:
            "You are a maintainer-focused PR quality reviewer. Assess review risk, not authorship. Do not accuse contributors of using AI. Ground every finding in the supplied PR metadata and diff summary."
        },
        {
          role: "user",
          content: buildPrompt(params.pr)
        }
      ],
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

function buildPrompt(pr: PullRequestContext): string {
  return JSON.stringify(
    {
      pullRequest: {
        title: pr.title,
        body: pr.body,
        author: pr.author,
        baseRef: pr.baseRef,
        headRef: pr.headRef
      },
      files: pr.files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: truncate(file.patch ?? "", 12000)
      }))
    },
    null,
    2
  );
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n[truncated]`;
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
