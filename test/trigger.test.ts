import { describe, expect, it } from "vitest";

import { shouldRunForTrigger } from "../src/trigger.js";

describe("shouldRunForTrigger", () => {
  it("does not treat every issue_comment as an always trigger", () => {
    const decision = shouldRunForTrigger(
      {
        eventName: "issue_comment",
        payload: {
          action: "created",
          issue: { pull_request: {} },
          comment: {
            body: "random comment",
            author_association: "COLLABORATOR"
          }
        }
      },
      {
        mode: "always",
        label: "run-pr-checker",
        comment: "/pr-check",
        allowedCommentAuthorAssociations: ["OWNER", "MEMBER", "COLLABORATOR"]
      }
    );

    expect(decision).toEqual({
      shouldRun: false,
      reason: "Comment events require trigger.mode: comment."
    });
  });

  it("allows explicit label trigger only when the configured label was applied", () => {
    const decision = shouldRunForTrigger(
      {
        eventName: "pull_request_target",
        payload: {
          action: "labeled",
          label: { name: "run-pr-checker" }
        }
      },
      {
        mode: "label",
        label: "run-pr-checker",
        comment: "/pr-check",
        allowedCommentAuthorAssociations: ["OWNER", "MEMBER", "COLLABORATOR"]
      }
    );

    expect(decision).toEqual({ shouldRun: true });
  });

  it("allows comment trigger only for configured phrase and trusted author association", () => {
    const decision = shouldRunForTrigger(
      {
        eventName: "issue_comment",
        payload: {
          action: "created",
          issue: { pull_request: {} },
          comment: {
            body: "please /pr-check this",
            author_association: "COLLABORATOR"
          }
        }
      },
      {
        mode: "comment",
        label: "run-pr-checker",
        comment: "/pr-check",
        allowedCommentAuthorAssociations: ["OWNER", "MEMBER", "COLLABORATOR"]
      }
    );

    expect(decision).toEqual({ shouldRun: true });
  });

  it("blocks comment trigger from untrusted users", () => {
    const decision = shouldRunForTrigger(
      {
        eventName: "issue_comment",
        payload: {
          action: "created",
          issue: { pull_request: {} },
          comment: {
            body: "/pr-check",
            author_association: "CONTRIBUTOR"
          }
        }
      },
      {
        mode: "comment",
        label: "run-pr-checker",
        comment: "/pr-check",
        allowedCommentAuthorAssociations: ["OWNER", "MEMBER", "COLLABORATOR"]
      }
    );

    expect(decision).toEqual({
      shouldRun: false,
      reason: "Comment author is not allowed to trigger PR Checker."
    });
  });
});
