import type { Policy, PolicyResult } from "../db/types";

export interface AgentActionInput {
  inputSummary: string;
  outputSummary: string;
  inputMetadata: Record<string, unknown>;
  outputMetadata: Record<string, unknown>;
  costUsd?: number | null;
}

export interface PolicyEvaluationResult {
  result: PolicyResult;
  matchedPolicyId?: string;
  reason?: string;
}

const PII_PATTERNS: RegExp[] = [
  /credit card/i,
  /\bssn\b/i,
  /password/i,
  /\bpii\b/i,
  /personal/i,
];

const ANOMALY_KEYWORDS = ["export", "download", "mass", "bulk"];

function getNumberConfig(config: Record<string, unknown>, key: string): number | null {
  const value = config[key];
  return typeof value === "number" ? value : null;
}

function getBooleanConfig(config: Record<string, unknown>, key: string): boolean {
  const value = config[key];
  return typeof value === "boolean" ? value : false;
}

function getStringArrayConfig(config: Record<string, unknown>, key: string): string[] {
  const value = config[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/**
 * Evaluates an agent action against a tenant's policies. Policies are
 * checked in order; the first triggered `blocked` rule wins. If no policy
 * blocks the action, the input summary is scanned for anomaly keywords and
 * the action is `flagged` if any are present. Otherwise the action is
 * `allowed`.
 */
export function evaluatePolicy(action: AgentActionInput, policies: Policy[]): PolicyEvaluationResult {
  for (const policy of policies) {
    switch (policy.rule_type) {
      case "cost_limit": {
        const maxCost = getNumberConfig(policy.rule_config, "max_cost");
        if (
          maxCost !== null &&
          action.costUsd !== undefined &&
          action.costUsd !== null &&
          action.costUsd > maxCost
        ) {
          return {
            result: "blocked",
            matchedPolicyId: policy.id,
            reason: `Action cost $${action.costUsd.toFixed(6)} exceeds policy limit of $${maxCost.toFixed(6)}`,
          };
        }
        break;
      }

      case "data_masking": {
        const blockPii = getBooleanConfig(policy.rule_config, "block_pii");
        if (blockPii) {
          const combined = `${action.inputSummary} ${action.outputSummary}`;
          const matchedPattern = PII_PATTERNS.find((pattern) => pattern.test(combined));
          if (matchedPattern) {
            return {
              result: "blocked",
              matchedPolicyId: policy.id,
              reason: `Detected sensitive data matching pattern "${matchedPattern.source}"`,
            };
          }
        }
        break;
      }

      case "domain_block": {
        const blockedDomains = getStringArrayConfig(policy.rule_config, "blocked_domains");
        const matchedDomain = blockedDomains.find((domain) =>
          action.outputSummary.toLowerCase().includes(domain.toLowerCase())
        );
        if (matchedDomain) {
          return {
            result: "blocked",
            matchedPolicyId: policy.id,
            reason: `Output references blocked domain "${matchedDomain}"`,
          };
        }
        break;
      }

      default:
        break;
    }
  }

  const lowerInput = action.inputSummary.toLowerCase();
  const matchedKeyword = ANOMALY_KEYWORDS.find((keyword) => lowerInput.includes(keyword));
  if (matchedKeyword) {
    return {
      result: "flagged",
      reason: `Input summary contains potentially sensitive operation keyword "${matchedKeyword}"`,
    };
  }

  return { result: "allowed" };
}
