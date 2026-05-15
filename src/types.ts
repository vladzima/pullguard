export type ModelConfig = {
  provider: "openai" | "anthropic";
  name: string;
};

export type TriggerMode = "always" | "label" | "comment";

export type TriggerConfig = {
  mode: TriggerMode;
  label: string;
  comment: string;
  allowedCommentAuthorAssociations: string[];
};

export type AnalysisDepth = "pr" | "codebase";

export type AnalysisConfig = {
  depth: AnalysisDepth;
  maxFiles: number;
  maxPatchCharsPerFile: number;
  maxBaseFileCharsPerFile: number;
  maxFindings: number;
  maxReviewFirstFiles: number;
};

export type LabelRule = {
  threshold: number;
  label: string;
};

export type PolicyConfig = {
  model: ModelConfig;
  trigger: TriggerConfig;
  analysis: AnalysisConfig;
  actions: {
    comment: {
      enabled: boolean;
    };
    labels: {
      enabled: boolean;
      rules: LabelRule[];
    };
    close: {
      enabled: boolean;
      threshold: number;
    };
  };
};

export type RiskSeverity = "low" | "medium" | "high";

export type RiskFinding = {
  category: string;
  severity: RiskSeverity;
  message: string;
  file?: string;
};

export type RiskResult = {
  score: number;
  summary: string;
  findings: RiskFinding[];
  reviewFirstFiles: string[];
  recommendedAction: string;
};

export type ActionDecision = {
  shouldComment: boolean;
  labelsToApply: string[];
  shouldClose: boolean;
};

export type PullRequestContext = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  author: string;
  baseRef: string;
  headRef: string;
  files: PullRequestFile[];
};

export type PullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
  baseContent?: string;
};
