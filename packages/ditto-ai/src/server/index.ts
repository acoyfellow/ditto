import type { Strategy } from "../client/index.js";
import type { Schema } from "../schema.js";
export { DittoJob, type DittoJobEnv, type DittoJobResult } from "./job.js";

export interface DittoWorkerOptions {
  defaultStrategy?: Strategy;
}

export interface DittoJobRequest {
  prompt: string;
  models: string[];
  strategy?: Strategy;
  temperature?: number;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
  // Schema support planned for future release
  // schema?: any;
}

export interface DittoTimings {
  total: number;
  fanout: number;
  slowest: number;
  merge: number;
}

export interface DittoResponse<T> {
  result?: T;
  responses?: Record<string, string>; // Individual model responses: model name -> response
  structured?: unknown;
  timings?: DittoTimings;
  error?: {
    type: string;
    message: string;
    details?: unknown;
  };
}

function jsonError(type: string, message: string, status: number, details?: unknown): Response {
  const payload: DittoResponse<never> = {
    error: { type, message, details },
  };
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function notFoundError(): Response {
  return jsonError("NotFound", "Not found", 404);
}

async function runDittoJob(
  body: DittoJobRequest,
  env: any,
  ctx: ExecutionContext
): Promise<{ result: unknown; responses?: Record<string, string>; structured?: unknown; timings?: DittoTimings }> {
  const jobId = crypto.randomUUID();
  const doStub = env.DITTO_JOB.getByName(jobId);

  console.log(`[runDittoJob] Calling DO with jobId: ${jobId}`);
  const response = await doStub.fetch("http://do/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Ditto job failed (${response.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return { result: data.result, responses: data.responses, structured: data.structured, timings: data.timings };
}

export function createDittoWorkerHandler(opts: DittoWorkerOptions = {}) {
  const defaultStrategy = opts.defaultStrategy ?? "consensus";

  return {
    async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
      let body: DittoJobRequest;
      try {
        body = await request.json();
      } catch (err) {
        return jsonError("BadRequest", "Invalid JSON body", 400);
      }

      if (!body.prompt || typeof body.prompt !== "string") {
        return jsonError("BadRequest", "prompt is required and must be a string", 400);
      }

      if (!Array.isArray(body.models) || body.models.length === 0) {
        return jsonError("BadRequest", "models must be a non-empty array", 400);
      }

      const strategy: Strategy = body.strategy ?? defaultStrategy;

      try {
        const jobResult = await runDittoJob(body, env, ctx);
        const payload: DittoResponse<unknown> = {
          result: jobResult.result,
          responses: jobResult.responses,
          structured: jobResult.structured,
          timings: jobResult.timings
        };
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return jsonError("InternalError", err?.message ?? "Unknown error", 500);
      }
    },
  };
}

