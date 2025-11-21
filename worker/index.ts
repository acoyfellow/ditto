import { DurableObject } from 'cloudflare:workers'
import * as Effect from "effect/Effect";
import { createDittoWorkerHandler, type DittoJobRequest } from "ditto-ai/server";
import { mergeStrings } from "ditto-ai/merge/string";
import { mergeStructuredResponses, parseModelResponse } from "ditto-ai/merge/structured";

type Env = {
  MY_DO: DurableObjectNamespace<MyDO>;
  DITTO_JOB: DurableObjectNamespace<DittoJob>;
  MODEL_RUNNER?: Fetcher;
  AI?: {
    run: (model: string, input: { prompt: string }) => Promise<{ response?: string }>;
  };
};

// Original MyDO from remote template
export class MyDO extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const key = url.pathname.slice(1); // Remove leading slash

      if (request.method === 'GET') {
        // Get a value from storage
        const value = await this.ctx.storage.get(key);
        return Response.json({
          key,
          value: value || null,
          id: this.ctx.id.toString()
        });
      }

      if (request.method === 'POST') {
        // Set a value in storage
        const body = await request.json() as { value: any };
        await this.ctx.storage.put(key, body.value);
        return Response.json({
          key,
          value: body.value,
          id: this.ctx.id.toString()
        });
      }

      if (request.method === 'DELETE') {
        // Delete a key from storage
        await this.ctx.storage.delete(key);
        return Response.json({
          key,
          deleted: true,
          id: this.ctx.id.toString()
        });
      }

      return new Response('Method not allowed', { status: 405 });

    } catch (error) {
      console.error('Durable Object error:', error);
      return new Response(
        JSON.stringify({ error: 'Storage temporarily unavailable' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

// DittoJob for LLM orchestration
export class DittoJob extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    console.log(`[DittoJob] Received request: ${request.method} ${url.pathname}`);

    if (request.method === "POST" && url.pathname === "/run") {
      try {
        const body = (await request.json()) as DittoJobRequest;
        const jobResult = await this.runJob(body);
        return new Response(JSON.stringify({
          result: jobResult.merged,
          responses: jobResult.responses,
          structured: jobResult.structured
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
  ): Promise<{
    merged: string;
    responses: Record<string, string>;
    structured: ReturnType<typeof mergeStructuredResponses>;
  }> {
    const self = this;
    const jobEffect = Effect.gen(function* (_) {
      // Store model names with their results
      const modelResults = yield* _(
        Effect.all(
          config.models.map((model) =>
            Effect.tryPromise({
              try: async () => {
                const response = await self.callModel(model, config.prompt);
                return { model, response };
              },
              catch: (error) => new Error(`Model ${model} failed: ${error}`),
            })
          ),
          { concurrency: "unbounded" }
        )
      );

      // Build responses map
      const responses: Record<string, string> = {};
      const results: string[] = [];
      const structured = modelResults.map(({ model, response }) => {
        responses[model] = response;
        results.push(response);
        return parseModelResponse(model, response);
      });

      const mergeResult = mergeStructuredResponses(config.strategy ?? "consensus", structured);
      const merged = mergeResult.summary.trim() || mergeStrings(results);

      return { merged, responses, structured: mergeResult };
    });

    return Effect.runPromise(jobEffect);
  }

  private async callModel(model: string, prompt: string): Promise<string> {
    const env = this.env as Env;

    // Try MODEL_RUNNER service binding first (production architecture)
    if (env.MODEL_RUNNER) {
      try {
        const requestBody = JSON.stringify({ model, prompt });
        const request = new Request("http://model-runner/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });

        const response = await env.MODEL_RUNNER.fetch(request);

        if (response.ok) {
          const data = (await response.json()) as { result?: string };
          if (data?.result) {
            return data.result;
          }
        } else {
          const errorText = await response.text();
          console.warn(`[ditto] MODEL_RUNNER failed (${response.status}): ${errorText}`);
        }
      } catch (error) {
        console.warn(`[ditto] MODEL_RUNNER error:`, error);
        // Fall through to direct AI binding
      }
    }

    // Fallback to direct AI binding
    if (!env.AI) {
      throw new Error("AI binding is not available");
    }

    const response = await env.AI.run(model, { prompt });
    if (!response || !response.response) {
      throw new Error(`Invalid response from model ${model}`);
    }

    return response.response as string;
  }
}

const dittoHandler = createDittoWorkerHandler();

// Worker entry point - routes requests to your Durable Objects
export default {
  async fetch(request: Request, env: Env) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      // Route /llm to Ditto handler
      if (pathname === "/llm") {
        return dittoHandler.fetch(request, env, {
          waitUntil: () => { },
          passThroughOnException: () => { },
        } as unknown as ExecutionContext);
      }

      // Route /api/storage/{key} to MyDO (original remote template behavior)
      if (pathname.startsWith('/api/storage/')) {
        const key = pathname.replace('/api/storage/', '');

        if (!key || key.length > 50) {
          return new Response('Invalid key', { status: 400 });
        }

        // Create or get existing Durable Object instance
        const id = env.MY_DO.idFromName(key);
        const doInstance = env.MY_DO.get(id);

        // Forward request to Durable Object
        return await doInstance.fetch(request);
      }

      return new Response("Not found", { status: 404 });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};
