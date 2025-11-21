import type { Strategy } from "../client/index.js";

export type DittoIntent = "answer" | "clarification" | "refusal" | "unknown";

export interface StructuredModelResult {
  model: string;
  raw: string;
  summary: string;
  intent: DittoIntent;
  confidence: number;
}

export interface MergedStructuredResult {
  summary: string;
  intent: DittoIntent;
  confidence: number;
  needsClarification: boolean;
  supportingModels: string[];
  responses: StructuredModelResult[];
}

const CLARIFICATION_KEYWORDS = [
  "clarify",
  "clarification",
  "could you provide",
  "can you provide",
  "please specify",
  "need more information",
  "i'm not sure what you're trying",
];

const REFUSAL_KEYWORDS = ["cannot", "can't", "sorry", "unable", "not able", "refuse", "not allowed"];

function classifyIntent(text: string): DittoIntent {
  const lower = text.toLowerCase();

  if (REFUSAL_KEYWORDS.some((kw) => lower.includes(kw))) {
    return "refusal";
  }

  if (
    CLARIFICATION_KEYWORDS.some((kw) => lower.includes(kw)) ||
    (lower.includes("?") && lower.includes("please"))
  ) {
    return "clarification";
  }

  if (lower.trim().length === 0) {
    return "unknown";
  }

  return "answer";
}

function summarize(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 280) {
    return trimmed;
  }
  const sentenceMatch = trimmed.match(/[^.!?]+[.!?]?/);
  if (sentenceMatch) {
    return sentenceMatch[0].trim();
  }
  return trimmed.slice(0, 280).trim() + "...";
}

function estimateConfidence(intent: DittoIntent, text: string): number {
  let base = intent === "answer" ? 0.7 : intent === "clarification" ? 0.55 : intent === "refusal" ? 0.45 : 0.4;
  if (text.length > 400) {
    base += 0.05;
  } else if (text.length < 120) {
    base -= 0.1;
  }
  return Math.min(0.95, Math.max(0.2, base));
}

export function parseModelResponse(model: string, raw: string): StructuredModelResult {
  const summary = summarize(raw);
  const intent = classifyIntent(raw);
  const confidence = estimateConfidence(intent, raw);

  return {
    model,
    raw,
    summary,
    intent,
    confidence,
  };
}

function priorityForIntent(intent: DittoIntent): number {
  switch (intent) {
    case "answer":
      return 3;
    case "clarification":
      return 2;
    case "refusal":
      return 1;
    default:
      return 0;
  }
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildConsensusSummary(summaries: string[]): string {
  if (summaries.length === 0) {
    return "";
  }
  const seen = new Set<string>();
  const orderedSentences: string[] = [];

  for (const summary of summaries) {
    const sentences = splitSentences(summary);
    for (const sentence of sentences) {
      const key = sentence.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        orderedSentences.push(sentence);
      }
    }
  }

  if (orderedSentences.length === 0) {
    return summaries[0];
  }

  return orderedSentences.slice(0, 5).join(" ");
}

export function mergeStructuredResponses(
  strategy: Strategy,
  responses: StructuredModelResult[]
): MergedStructuredResult {
  if (responses.length === 0) {
    return {
      summary: "",
      intent: "unknown",
      confidence: 0,
      needsClarification: false,
      supportingModels: [],
      responses: [],
    };
  }

  // Only consensus strategy implemented for now
  const intentScores = new Map<DittoIntent, number>();

  for (const response of responses) {
    intentScores.set(response.intent, (intentScores.get(response.intent) ?? 0) + response.confidence);
  }

  const winningIntent = Array.from(intentScores.entries())
    .sort((a, b) => {
      if (b[1] === a[1]) {
        return priorityForIntent(b[0]) - priorityForIntent(a[0]);
      }
      return b[1] - a[1];
    })[0]?.[0] ?? "answer";

  const winners = responses.filter((r) => r.intent === winningIntent);
  const sortedWinners = [...winners].sort((a, b) => b.confidence - a.confidence);

  const consensusSummary =
    buildConsensusSummary(sortedWinners.map((r) => r.summary)) || sortedWinners[0]?.summary || responses[0].summary;

  const finalConfidence =
    sortedWinners.reduce((acc, r) => acc + r.confidence, 0) / Math.max(sortedWinners.length, 1);

  return {
    summary: consensusSummary,
    intent: winningIntent,
    confidence: Number(finalConfidence.toFixed(3)),
    needsClarification: winningIntent === "clarification",
    supportingModels: sortedWinners.map((r) => r.model),
    responses,
  };
}

