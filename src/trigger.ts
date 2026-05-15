import type { TriggerConfig } from "./types.js";

export type TriggerContext = {
  eventName: string;
  payload: Record<string, unknown>;
};

export type TriggerDecision = {
  shouldRun: boolean;
  reason?: string;
  commentCommand?: string;
};

export function shouldRunForTrigger(
  context: TriggerContext,
  config: TriggerConfig
): TriggerDecision {
  if (config.mode === "always") {
    if (context.eventName === "issue_comment") {
      return {
        shouldRun: false,
        reason: "Comment events require trigger.mode: comment."
      };
    }

    return { shouldRun: true };
  }

  if (config.mode === "label") {
    const labelName = getNestedString(context.payload, ["label", "name"]);
    const isLabelEvent =
      context.eventName === "pull_request_target" || context.eventName === "pull_request";

    if (isLabelEvent && getNestedString(context.payload, ["action"]) === "labeled" && labelName === config.label) {
      return { shouldRun: true };
    }

    return { shouldRun: false, reason: `Waiting for label '${config.label}'.` };
  }

  if (context.eventName !== "issue_comment") {
    return { shouldRun: false, reason: `Waiting for comment '${config.comment}'.` };
  }

  if (!getNestedValue(context.payload, ["issue", "pull_request"])) {
    return { shouldRun: false, reason: "Comment is not on a pull request." };
  }

  const body = getNestedString(context.payload, ["comment", "body"]) ?? "";
  const commentCommand = findCommentCommand(body, config.comment);
  if (!commentCommand) {
    return { shouldRun: false, reason: `Waiting for comment '${config.comment}'.` };
  }

  const authorAssociation = getNestedString(context.payload, [
    "comment",
    "author_association"
  ]);

  if (
    !authorAssociation ||
    !config.allowedCommentAuthorAssociations.includes(authorAssociation)
  ) {
    return {
      shouldRun: false,
      reason: "Comment author is not allowed to trigger PullGuard."
    };
  }

  return { shouldRun: true, commentCommand };
}

function findCommentCommand(body: string, command: string): string | undefined {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line === command || line.startsWith(`${command} `));
}

function getNestedString(
  payload: Record<string, unknown>,
  path: string[]
): string | undefined {
  const value = getNestedValue(payload, path);
  return typeof value === "string" ? value : undefined;
}

function getNestedValue(payload: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = payload;

  for (const part of path) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}
