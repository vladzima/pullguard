import type { AnalysisDepth, ModelConfig, PolicyConfig } from "./types.js";

export type CommentOverrides = {
  depth?: AnalysisDepth;
  provider?: ModelConfig["provider"];
  model?: string;
  comment?: boolean;
  labels?: boolean;
  close?: {
    enabled: boolean;
    threshold?: number;
  };
};

export function parseCommentCommand(command: string): CommentOverrides {
  const tokens = command.trim().split(/\s+/);
  if (tokens[0] !== "/pullguard") {
    throw new Error("PullGuard comment command must start with /pullguard.");
  }

  const overrides: CommentOverrides = {};

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === "--depth") {
      const value = readValue(tokens, index, token);
      if (value !== "pr" && value !== "codebase") {
        throw new Error("--depth must be either 'pr' or 'codebase'.");
      }
      overrides.depth = value;
      index += 1;
      continue;
    }

    if (token === "--provider") {
      const value = readValue(tokens, index, token);
      if (value !== "openai" && value !== "anthropic") {
        throw new Error("--provider must be either 'openai' or 'anthropic'.");
      }
      overrides.provider = value;
      index += 1;
      continue;
    }

    if (token === "--model") {
      overrides.model = readValue(tokens, index, token);
      index += 1;
      continue;
    }

    if (token === "--comment") {
      overrides.comment = true;
      continue;
    }

    if (token === "--no-comment") {
      overrides.comment = false;
      continue;
    }

    if (token === "--labels") {
      overrides.labels = true;
      continue;
    }

    if (token === "--no-labels") {
      overrides.labels = false;
      continue;
    }

    if (token === "--close") {
      const threshold = Number(readValue(tokens, index, token));
      if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
        throw new Error("--close threshold must be an integer from 0 to 100.");
      }
      overrides.close = { enabled: true, threshold };
      index += 1;
      continue;
    }

    if (token === "--no-close") {
      overrides.close = { enabled: false };
      continue;
    }

    throw new Error(`Unsupported PullGuard flag: ${token}`);
  }

  return overrides;
}

export function applyCommentOverrides(
  config: PolicyConfig,
  overrides?: CommentOverrides
): PolicyConfig {
  if (!overrides || !config.trigger.allowCommentOverrides) {
    return config;
  }

  return {
    ...config,
    model: {
      provider: overrides.provider ?? config.model.provider,
      name: overrides.model ?? config.model.name
    },
    analysis: {
      ...config.analysis,
      depth: overrides.depth ?? config.analysis.depth
    },
    actions: {
      comment: {
        ...config.actions.comment,
        enabled: overrides.comment ?? config.actions.comment.enabled
      },
      labels: {
        ...config.actions.labels,
        enabled: overrides.labels ?? config.actions.labels.enabled
      },
      close: {
        ...config.actions.close,
        enabled: overrides.close?.enabled ?? config.actions.close.enabled,
        threshold: overrides.close?.threshold ?? config.actions.close.threshold
      }
    }
  };
}

function readValue(tokens: string[], index: number, flag: string): string {
  const value = tokens[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}
