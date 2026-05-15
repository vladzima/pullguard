import type { ActionDecision, PolicyConfig, RiskResult } from "./types.js";

export function decideActions(result: RiskResult, config: PolicyConfig): ActionDecision {
  return {
    shouldComment: config.actions.comment.enabled,
    labelsToApply: config.actions.labels.enabled
      ? config.actions.labels.rules
          .filter((rule) => result.score >= rule.threshold)
          .map((rule) => rule.label)
      : [],
    shouldClose: config.actions.close.enabled && result.score >= config.actions.close.threshold
  };
}
