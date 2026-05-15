export type ModelConfig = {
  provider: "openai";
  name: string;
};

export type LabelRule = {
  threshold: number;
  label: string;
};

export type PolicyConfig = {
  model: ModelConfig;
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
};
