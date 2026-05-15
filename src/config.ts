import { parse } from "yaml";
import { z } from "zod";

import type { ModelConfig, PolicyConfig } from "./types.js";

const defaultConfig: PolicyConfig = {
  model: {
    provider: "openai",
    name: "gpt-5.4-mini-2026-03-17"
  },
  trigger: {
    mode: "always",
    label: "run-pullguard",
    comment: "/pullguard",
    allowedCommentAuthorAssociations: ["OWNER", "MEMBER", "COLLABORATOR"]
  },
  analysis: {
    depth: "pr",
    maxFiles: 20,
    maxPatchCharsPerFile: 4000,
    maxBaseFileCharsPerFile: 6000,
    maxFindings: 4,
    maxReviewFirstFiles: 5
  },
  actions: {
    comment: {
      enabled: false
    },
    labels: {
      enabled: false,
      rules: []
    },
    close: {
      enabled: false,
      threshold: 90
    }
  }
};

const configSchema = z
  .object({
    model: z
      .object({
        provider: z.enum(["openai", "anthropic"]).default(defaultConfig.model.provider),
        name: z.string().min(1).default(defaultConfig.model.name)
      })
      .default(defaultConfig.model),
    trigger: z
      .object({
        mode: z.enum(["always", "label", "comment"]).default(defaultConfig.trigger.mode),
        label: z.string().min(1).default(defaultConfig.trigger.label),
        comment: z.string().min(1).default(defaultConfig.trigger.comment),
        allowedCommentAuthorAssociations: z
          .array(z.string().min(1))
          .default(defaultConfig.trigger.allowedCommentAuthorAssociations)
      })
      .default(defaultConfig.trigger),
    analysis: z
      .object({
        depth: z.enum(["pr", "codebase"]).default(defaultConfig.analysis.depth),
        maxFiles: z.number().int().min(1).max(100).default(defaultConfig.analysis.maxFiles),
        maxPatchCharsPerFile: z
          .number()
          .int()
          .min(200)
          .max(50000)
          .default(defaultConfig.analysis.maxPatchCharsPerFile),
        maxBaseFileCharsPerFile: z
          .number()
          .int()
          .min(200)
          .max(50000)
          .default(defaultConfig.analysis.maxBaseFileCharsPerFile),
        maxFindings: z.number().int().min(1).max(10).default(defaultConfig.analysis.maxFindings),
        maxReviewFirstFiles: z
          .number()
          .int()
          .min(1)
          .max(10)
          .default(defaultConfig.analysis.maxReviewFirstFiles)
      })
      .default(defaultConfig.analysis),
    actions: z
      .object({
        comment: z
          .object({
            enabled: z.boolean().default(defaultConfig.actions.comment.enabled)
          })
          .default(defaultConfig.actions.comment),
        labels: z
          .object({
            enabled: z.boolean().default(defaultConfig.actions.labels.enabled),
            rules: z
              .array(
                z.object({
                  threshold: z.number().min(0).max(100),
                  label: z.string().min(1)
                })
              )
              .default(defaultConfig.actions.labels.rules)
          })
          .default(defaultConfig.actions.labels),
        close: z
          .object({
            enabled: z.boolean().default(defaultConfig.actions.close.enabled),
            threshold: z.number().min(0).max(100).default(defaultConfig.actions.close.threshold)
          })
          .default(defaultConfig.actions.close)
      })
      .default(defaultConfig.actions)
  })
  .default(defaultConfig);

export function parsePolicyConfig(contents: string): PolicyConfig {
  const parsed = contents.trim().length > 0 ? parse(contents) : {};
  return configSchema.parse(parsed);
}

export function mergeModelOverride(
  config: PolicyConfig,
  modelName?: string,
  provider?: ModelConfig["provider"]
): PolicyConfig {
  if (!modelName && !provider) {
    return config;
  }

  return {
    ...config,
    model: {
      ...config.model,
      provider: provider ?? config.model.provider,
      name: modelName ?? config.model.name
    }
  };
}
