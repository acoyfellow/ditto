import { DurableObject } from 'cloudflare:workers';
import * as Effect from "effect/Effect";
import type { DittoJobRequest } from "./index.js";
import { mergeStrings } from "../merge/string.js";
import { mergeStructuredResponses, parseModelResponse } from "../merge/structured.js";

export interface DittoJobEnv {
  AI: {
    run: (model: string, input: { prompt: string }) => Promise<{ response?: string }>;
  };
}

export interface DittoJobResult {
  merged: string;
  responses: Record<string, string>;
  structured: ReturnType<typeof mergeStructuredResponses>;
  timings: {
    total: number;
    fanout: number;
    slowest: number;
    merge: number;
  };
}

export class DittoJob extends DurableObject<DittoJobEnv> {
  constructor(ctx: DurableObjectState, env: DittoJobEnv) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (request.method === "POST" && url.pathname === "/run") {
      try {
        const body = (await request.json()) as DittoJobRequest;
        const jobResult = await this.runJob(body);
        return new Response(JSON.stringify({
          result: jobResult.merged,
          responses: jobResult.responses,
          structured: jobResult.structured,
          timings: jobResult.timings
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error: any) {
        return new Response(
          JSON.stringify({
            error: {
              type: "JobError",
              message: error?.message || "Job execution failed",
            },
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response("Not found", { status: 404 });
  }

  private async runJob(
    config: DittoJobRequest
  ): Promise<DittoJobResult> {
    const startTime = performance.now();
    const self = this;

    const jobEffect = Effect.gen(function* (_) {
      // Start fanout
      const fanoutStart = performance.now();

      let modelResults: Array<{ model: string; response: string; duration: number }>;
      
      if (config.strategy === "cooperative") {
        // Cooperative: Sequential execution, each model sees previous outputs
        modelResults = [];
        const previousOutputs: string[] = [];
        
        for (const model of config.models) {
          const modelStart = performance.now();
          
          // Build prompt with original + previous outputs
          const cooperativePrompt = previousOutputs.length > 0
            ? `${config.prompt}\n\nPrevious responses:\n${previousOutputs.map((out, i) => `${i + 1}. ${out}`).join('\n')}\n\nBuild on these responses:`
            : config.prompt;
          
          const response = yield* _(
            Effect.tryPromise({
              try: async () => await self.callModel(model, cooperativePrompt),
              catch: (error) => new Error(`Model ${model} failed: ${error}`),
            })
          );
          
          const modelEnd = performance.now();
          modelResults.push({ model, response, duration: modelEnd - modelStart });
          previousOutputs.push(response);
        }
      } else {
        // Consensus: Parallel execution
        modelResults = yield* _(
          Effect.all(
            config.models.map((model) =>
              Effect.tryPromise({
                try: async () => {
                  const modelStart = performance.now();
                  const response = await self.callModel(model, config.prompt);
                  const modelEnd = performance.now();
                  return { model, response, duration: modelEnd - modelStart };
                },
                catch: (error) => new Error(`Model ${model} failed: ${error}`),
              })
            ),
            { concurrency: "unbounded" }
          )
        );
      }

      const fanoutEnd = performance.now();
      const fanoutTime = fanoutEnd - fanoutStart;
      const slowestModel = Math.max(...modelResults.map(r => r.duration || 0));

      // Build responses map
      const responses: Record<string, string> = {};
      const results: string[] = [];
      const structured = modelResults.map(({ model, response }) => {
        responses[model] = response;
        results.push(response);
        return parseModelResponse(model, response);
      });

      // Merge
      const mergeStart = performance.now();
      const mergeResult = mergeStructuredResponses(config.strategy ?? "consensus", structured);
      const merged = mergeResult.summary.trim() || mergeStrings(results);
      const mergeEnd = performance.now();
      const mergeTime = mergeEnd - mergeStart;

      const totalTime = performance.now() - startTime;

      return {
        merged,
        responses,
        structured: mergeResult,
        timings: {
          total: Math.round(totalTime * 100) / 100,
          fanout: Math.round(fanoutTime * 100) / 100,
          slowest: Math.round(slowestModel * 100) / 100,
          merge: Math.round(mergeTime * 100) / 100,
        },
      };
    });

    return Effect.runPromise(jobEffect);
  }

  private async callModel(model: string, prompt: string): Promise<string> {
    const env = this.env as DittoJobEnv;

    if (!env.AI) {
      throw new Error("AI binding not available");
    }

    try {
      const response = await env.AI.run(model, { prompt });
      if (!response?.response) {
        throw new Error(`Invalid response from model ${model}`);
      }
      return response.response;
    } catch (error) {
      throw new Error(`Model ${model} failed: ${error}`);
    }
  }
}

