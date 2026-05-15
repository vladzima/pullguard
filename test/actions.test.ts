import { describe, expect, it } from "vitest";

import { decideActions } from "../src/actions.js";
import { parsePolicyConfig } from "../src/config.js";
import type { RiskResult } from "../src/types.js";

const result: RiskResult = {
  score: 82,
  summary: "High review risk.",
  findings: [],
  reviewFirstFiles: []
};

describe("decideActions", () => {
  it("returns only enabled actions", () => {
    const actions = decideActions(
      result,
      parsePolicyConfig(`
actions:
  comment:
    enabled: true
  labels:
    enabled: false
    rules:
      - threshold: 50
        label: needs-human-review
  close:
    enabled: false
    threshold: 90
`)
    );

    expect(actions).toEqual({
      shouldComment: true,
      labelsToApply: [],
      shouldClose: false
    });
  });

  it("applies labels whose thresholds are met and closes only past close threshold", () => {
    const actions = decideActions(
      result,
      parsePolicyConfig(`
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
      - threshold: 90
        label: critical-risk-pr
  close:
    enabled: true
    threshold: 80
`)
    );

    expect(actions).toEqual({
      shouldComment: false,
      labelsToApply: ["needs-human-review", "high-risk-pr"],
      shouldClose: true
    });
  });
});
