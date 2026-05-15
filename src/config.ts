import { parse } from "yaml";
import { z } from "zod";

import type { PolicyConfig } from "./types.js";

const defaultConfig: PolicyConfig = {
  model: {
    provider: "openai",
    name: "gpt-4.1-mini"
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
        provider: z.literal("openai").default(defaultConfig.model.provider),
        name: z.string().min(1).default(defaultConfig.model.name)
      })
      .default(defaultConfig.model),
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

export function mergeModelOverride(config: PolicyConfig, modelName?: string): PolicyConfig {
  if (!modelName) {
    return config;
  }

  return {
    ...config,
    model: {
      ...config.model,
      name: modelName
    }
  };
}
