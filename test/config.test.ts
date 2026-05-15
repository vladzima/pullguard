import { describe, expect, it } from "vitest";

import { parsePolicyConfig } from "../src/config.js";

describe("parsePolicyConfig", () => {
  it("keeps comment, labels, and close independently configurable", () => {
    const config = parsePolicyConfig(`
model:
  provider: openai
  name: gpt-4.1-mini
actions:
  comment:
    enabled: false
  labels:
    enabled: true
    rules:
      - threshold: 50
        label: needs-human-review
      - threshold: 80
        label: high-risk-pr
  close:
    enabled: true
    threshold: 95
`);

    expect(config.actions.comment.enabled).toBe(false);
    expect(config.actions.labels.enabled).toBe(true);
    expect(config.actions.labels.rules).toEqual([
      { threshold: 50, label: "needs-human-review" },
      { threshold: 80, label: "high-risk-pr" }
    ]);
    expect(config.actions.close).toEqual({ enabled: true, threshold: 95 });
  });

  it("defaults to observe-only actions", () => {
    const config = parsePolicyConfig("");

    expect(config.actions.comment.enabled).toBe(false);
    expect(config.actions.labels.enabled).toBe(false);
    expect(config.actions.close.enabled).toBe(false);
  });
});
