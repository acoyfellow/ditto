import type { Schema } from "../schema.js";
import type { MergedStructuredResult } from "../merge/structured.js";

export type Strategy = "consensus" | "cooperative";

export interface DittoClientOptions {
  endpoint: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export interface DittoRequest<T> {
  prompt: string;
  strategy?: Strategy;
  models: string[];
  temperature?: number;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
  // Schema is handled server-side only for now
  // schema?: Schema<T>;
}

export class DittoError extends Error {
  constructor(
    public type: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "DittoError";
  }
}

export interface DittoClientResponse<T> {
  result: T;
  responses?: Record<string, string>; // Individual model responses: model name -> response
  structured?: MergedStructuredResult;
}

export function dittoClient(options: DittoClientOptions) {
  const { endpoint, headers = {}, fetchImpl = fetch } = options;

  return async function ditto<T = string>(req: DittoRequest<T>): Promise<DittoClientResponse<T>> {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({})) as { error?: { type?: string; message?: string; details?: unknown } };
      const error = errorBody?.error || {};
      throw new DittoError(
        error.type || "UnknownError",
        error.message || `Ditto request failed with status ${res.status}`,
        res.status,
        error.details
      );
    }

    const data = await res.json() as { result: T; responses?: Record<string, string>; structured?: MergedStructuredResult };
    return { result: data.result, responses: data.responses, structured: data.structured };
  };
}

