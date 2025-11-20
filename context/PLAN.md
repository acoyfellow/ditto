
# DITTO – Edge-Native Parallel LLM Orchestration on Cloudflare

> **Working title / package name:** `ditto`  
> **NPM package:** `ditto-ai`  
> **Core strategy in v1:** `strategy: "consensus"`  
> **Platform:** Cloudflare (Workers, Durable Objects, KV, D1, AI, AI Gateway, Worker Loaders, Containers/Sandbox later)  
> **Starter template:** [`remote`](https://remote.coey.dev/) via `bun create remote-app my-app`


---

## 1. Context – Who’s Building This & Why

**Builder:** Jordan Coeyman – solo founder / indie SaaS dev, deeply Cloudflare-pilled.  
- Actively building multiple SaaS products (e.g. **inbox.dog**, **Anytool**, etc.) on **Cloudflare Workers + Durable Objects**.  
- Publishes OSS “patterns” that show how to build **real products** on Workers (UserDO, JotDB, Blaze, remote, etc.).  
- Recently got the attention of Cloudflare employees via these patterns and is going through interviews for the **Workers Growth / ETI** org.

**Goal for this project:**  
Ship a small but **highly compelling, Cloudflare-native pattern** that:

1. **Wows Cloudflare engineers / X.com nerds** – clearly uses Workers, Durable Objects, and **Cloudflare AI** in a way that feels *inevitable*, not gimmicky.
2. Is **reusable** – exposed as an npm library, not just a demo.
3. **Directly useful** to Jordan’s products (especially **inbox.dog** and Anytool) as a primitive for multi-model calling.
4. Becomes one of the go-to examples for “how to do parallel LLM orchestration on Workers.”


---

## 2. What We’re Building – High-Level Concept

### 2.1 One-Sentence Pitch

> **Ditto is an edge-native LLM orchestration engine that runs multiple Cloudflare AI models in parallel, merges their outputs with a chosen strategy (starting with `consensus`), and returns a single, typed result – all powered by Workers, Durable Objects, and Effect.**

### 2.2 Why It Exists

Many teams want to:

- Call **multiple models** in parallel (for robustness, accuracy, or experimentation).  
- Combine their outputs into **one reliable answer** (strings or structured JSON).  
- Do this **close to the user** with low latency.  
- Avoid wiring each request manually into N different model APIs.  

Existing tools (like Parallel.ai) prove the value of multi-model runs, but:

- They are not **Cloudflare-native**.  
- They don’t naturally leverage **Durable Objects**, **Effect**, or **Cloudflare AI Gateway**.  
- They are platforms, not **small reusable primitives** you can drop into your own Worker.  

**Ditto** solves this for the Cloudflare ecosystem:

- Simple client API (one function).  
- Durable Object job orchestrator.  
- Effect-driven state machine for reliability and typed errors.  
- Cloudflare AI models only in v1 → **single API key, single platform, super clean setup**.  
- Open path to future providers (OpenRouter, containers, sandboxed models) without breaking the core design.


### 2.3 Who It’s For

- **Cloudflare developers** who want a simple way to run multiple models in parallel and merge their outputs.  
- **Jordan’s own SaaS apps** (e.g. inbox.dog, Anytool) that need robust, structured LLM output.  
- **Worker Growth / ETI / DevRel** folks who want patterns to reference in docs, blog posts, and talks.  


---

## 3. Core UX & API Design

### 3.1 Import & Client Creation

```ts
import { dittoClient, fromZod, fromEffectSchema } from "ditto-ai";

const ditto = dittoClient({
  endpoint: "https://your-worker.workers.dev/llm",
  apiKey: process.env.CLOUDFLARE_API_KEY, // optional, or inferred by Worker
});
```

- `endpoint` is the Worker route that fronts the Ditto Durable Object.  
- `apiKey` is **Cloudflare AI** key if used client-side (in Node, not from browser). In most use-cases, the client will be server-side (or an internal Worker calling another Worker).


### 3.2 Calling Ditto

```ts
const result = await ditto({
  prompt: "Summarize this email in 3 bullets.",
  strategy: "consensus",
  models: [
    "@cf/meta/llama-3.1-70b-instruct",
    "@cf/mistral/mistral-7b-instruct",
    "@cf/qwen/qwen-2.5-14b-instruct"
  ],
});
```

- **Default return type:** `string` (raw merged answer).  
- **Default strategy:** `"consensus"` (all models answer same task; we merge).  
- Future strategies: `"cooperative"`, `"cascade"`, etc.


### 3.3 Structured Output using Schemas

Ditto is schema-agnostic. It uses a tiny `Schema<T>` interface:

```ts
interface Schema<T> {
  parse: (input: unknown) => T;
}
```

Adapters:

```ts
export function fromZod<T>(schema: z.ZodType<T>): Schema<T>;
export function fromEffectSchema<T>(schema: any): Schema<T>; // placeholder type
```

Usage (Zod example):

```ts
import { z } from "zod";
import { dittoClient, fromZod } from "ditto-ai";

const EmailSummarySchema = fromZod(
  z.object({
    subject: z.string(),
    sentiment: z.enum(["positive", "neutral", "negative"]),
    actionItems: z.array(z.string())
  })
);

const ditto = dittoClient({ endpoint: "https://your-worker.workers.dev/llm" });

const summary = await ditto({
  prompt: "Summarize this email for CRM logging…",
  strategy: "consensus",
  models: [
    "@cf/meta/llama-3.1-70b-instruct",
    "@cf/mistral/mistral-7b-instruct"
  ],
  schema: EmailSummarySchema,
});
```

- If `schema` is provided → `summary` has inferred type `EmailSummary`.  
- Ditto will:
  - Try to parse each model’s output as JSON.  
  - Validate against schema.  
  - Retry prompts when outputs are invalid.  
  - Only feed **valid votes** into the merge step.  
  - Throw well-typed errors if no consensus can be formed.


### 3.4 Error Handling Story

Ditto uses Effect under the hood to model failures:

- `ModelTimeoutError`
- `ValidationError`
- `MergeError`
- `NoConsensusError`
- `UpstreamProviderError`

The Worker returns structured JSON errors; the `dittoClient` either throws typed errors or returns them in a discriminated union form (TBD).


---

## 4. Architecture Overview

### 4.1 High-Level Flow

1. **Client** calls `ditto()` with prompt, models, strategy, schema.  
2. **Worker route** (`POST /llm`) receives request, validates input.  
3. Worker instantiates a **Job Durable Object** (using a job ID or random token).  
4. Job DO runs an **Effect-based state machine**:

   ```
   INIT
   → FAN_OUT (call all models via Cloudflare AI)
   → COLLECT (wait with timeout + retries)
   → PARSE (apply schema.parse if provided)
   → MERGE (strategy-specific)
   → RETURN (send result back)
   ```

5. Worker serializes the result and returns `200` or error JSON.  
6. Client resolves the promise (`string` or structured JSON) or handles errors.


### 4.2 Why Durable Objects?

- Per-request **job state** lives in one DO instance.  
- All parallel calls, retries, and merge decisions are **co-located**.  
- Easy to inspect / debug a single job via logs.  
- Natural place to later introduce **cooperative strategies** (task queues, graphs, etc.).


### 4.3 Where Effect Fits

Inside the Job DO, each state transition is implemented as an Effect pipeline:

```ts
const jobEffect = Effect.gen(function* (_) {
  const config = yield* _(loadConfig());   // prompt, models, schema, strategy

  const rawResults = yield* _(
    fanOutCalls(config).pipe(
      Effect.timeoutFail(new ModelTimeoutError(), config.modelTimeoutMs),
      Effect.retry(Schedule.exponential(config.backoffMs).pipe(Schedule.recurs(config.maxRetries)))
    )
  );

  const parsedResults = yield* _(parseResults(rawResults, config.schema));
  const merged = yield* _(mergeResults(parsedResults, config.strategy));

  return merged;
});
```

- This gives deterministic flow, strong error handling, and clear typing.  
- Effect also makes it easier to add logging, metrics, and traces as layers.


### 4.4 Immediate Use-Case (inbox.dog)

Inbox.dog can replace single-model calls with Ditto:

```ts
const EmailSummarySchema = fromZod( /* ... */ );

export async function summarizeEmail(email: RawEmail) {
  return await ditto({
    prompt: buildEmailSummaryPrompt(email),
    strategy: "consensus",
    models: [
      "@cf/meta/llama-3.1-70b-instruct",
      "@cf/mistral/mistral-7b-instruct"
    ],
    schema: EmailSummarySchema,
  });
}
```

- Higher robustness.  
- Less hallucination.  
- Multiple models, single typed result.  
- Same primitive usable in Anytool and other projects.


---

## 5. Repo Layout & Integration with `remote`

### 5.1 Starting Point

We start from:

```bash
bun create remote-app ditto-demo
```

This gives us a monorepo-like structure with:

- SvelteKit app  
- Cloudflare Worker  
- Durable Object  
- KV, D1, Auth, Tailwind, Alchemy integration, etc.


### 5.2 Target Layout

We reshape into:

```txt
ditto-demo/
  package.json          # workspace root
  bun.lockb

  apps/
    web/                # SvelteKit app from remote starter
      src/
      worker/
      ...

  packages/
    ditto-ai/           # NPM library
      src/
        client/
          index.ts
        server/
          index.ts
          schema.ts
          strategies/
            consensus.ts
            cooperative.ts   # stub
          merge/
            string.ts
            json.ts
      package.json
      README.md

  README.md             # root readme (points to package + demo)
```

### 5.3 Root `package.json` (Workspace)

```jsonc
{
  "name": "ditto-demo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "bun --filter apps/web dev",
    "build": "bun --filter apps/web build",
    "deploy": "bun --filter apps/web deploy",
    "lint": "bun lint"
  }
}
```


---

## 6. Package: `packages/ditto-ai`

### 6.1 Export Surface

`packages/ditto-ai/src/index.ts`:

```ts
export * from "./client";
export * from "./server";
export * from "./schema";
```

### 6.2 Client

`packages/ditto-ai/src/client/index.ts` (skeleton):

```ts
import type { Schema } from "../schema";

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
  schema?: Schema<T>;
  metadata?: Record<string, any>;
  temperature?: number;
  maxRetries?: number;
}

export function dittoClient(options: DittoClientOptions) {
  const { endpoint, headers = {}, fetchImpl = fetch } = options;

  return async function ditto<T = string>(req: DittoRequest<T>): Promise<T> {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      // TODO: map structured error payload into typed errors
      const errorBody = await res.json().catch(() => undefined);
      throw new Error(
        `Ditto request failed with status ${res.status}: ${JSON.stringify(
          errorBody
        )}`
      );
    }

    const data = await res.json();

    // For now we assume server enforces schema; client is thin.
    return data.result as T;
  };
}
```


### 6.3 Schema Adapters

`packages/ditto-ai/src/schema.ts`:

```ts
export interface Schema<T> {
  parse: (input: unknown) => T;
}

// Zod adapter
export function fromZod<T>(schema: { parse: (i: unknown) => T }): Schema<T> {
  return {
    parse: (input) => schema.parse(input),
  };
}

// Effect.Schema adapter – placeholder; actual impl will depend on Effect version
export function fromEffectSchema<T>(schema: any): Schema<T> {
  return {
    parse: (input) => {
      // pseudo-code; in real code, we'd call Effect.Schema.decodeUnknown
      if (typeof schema.decode === "function") {
        const decoded = schema.decode(input);
        if (decoded._tag === "Left") {
          throw new Error("Invalid schema");
        }
        return decoded.right as T;
      }
      throw new Error("Unsupported Effect schema");
    },
  };
}
```


### 6.4 Server Integration Helper

`packages/ditto-ai/src/server/index.ts` (skeleton):

```ts
import type { Schema } from "../schema";
import type { DittoRequest, Strategy } from "../client";

export interface DittoWorkerOptions {
  // For v1: strategies config, logging, etc.
  defaultStrategy?: Strategy;
}

export interface DittoResponse<T> {
  result?: T;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
}

export function createDittoWorkerHandler(opts: DittoWorkerOptions = {}) {
  const defaultStrategy = opts.defaultStrategy ?? "consensus";

  return {
    async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
      if (new URL(request.url).pathname !== "/llm") {
        return new Response("Not found", { status: 404 });
      }

      let body: DittoRequest<unknown>;
      try {
        body = await request.json();
      } catch (err) {
        return jsonError("BadRequest", "Invalid JSON body", 400);
      }

      const strategy: Strategy = body.strategy ?? defaultStrategy;

      try {
        // Here we would locate the DittoJob Durable Object and delegate.
        // For now, we just call a placeholder function.
        const result = await runDittoJob(body, strategy, env, ctx);
        const payload: DittoResponse<unknown> = { result };
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

function jsonError(type: string, message: string, status: number): Response {
  const payload: DittoResponse<never> = {
    error: { type, message },
  };
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Placeholder for Durable Object job orchestration
async function runDittoJob(
  body: DittoRequest<unknown>,
  strategy: Strategy,
  env: any,
  ctx: ExecutionContext
): Promise<unknown> {
  // In real implementation, we'd:
  // - derive a jobId
  // - call env.DittoJobDO.get(jobId).fetch(...)
  // - DO runs Effect-based state machine and returns final result
  return `Ditto placeholder result for prompt: ${body.prompt}`;
}
```


---

## 7. Durable Object: DittoJob (Skeleton)

This will live in the Worker side (inside `apps/web/worker/` or a shared package). Pseudocode only, to be expanded later.

```ts
export class DittoJobDO {
  state: DurableObjectState;
  env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/run") {
      const body = await request.json();
      // body contains prompt, strategy, models, schemaName, etc.

      // TODO: run Effect-based state machine here
      // const result = await jobEffect.runPromise();
      const result = { placeholder: true };

      return new Response(JSON.stringify({ result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  }
}
```

Later, this DO will:

- Use Effect to orchestrate:
  - fan-out model calls (via Cloudflare AI)
  - retries / timeouts
  - parse using schema
  - merge using strategy
- Persist job state if necessary (KV/D1 or DO storage).


---

## 8. Merge Strategies (Consensus v1)

### 8.1 String Merge

Basic majority / similarity-based approach:

```ts
export function mergeStrings(outputs: string[]): string {
  if (outputs.length === 0) {
    throw new Error("No outputs to merge");
  }
  // V1: just pick the longest or first non-empty string.
  // Later: implement proper similarity-based majority.
  const nonEmpty = outputs.filter((s) => s.trim().length > 0);
  return nonEmpty[0] ?? outputs[0];
}
```

### 8.2 JSON Merge (Field-wise Majority)

```ts
export function mergeJson<T extends Record<string, any>>(outputs: T[]): T {
  if (outputs.length === 0) {
    throw new Error("No outputs to merge");
  }
  // Simple implementation: pick first for now.
  // Later: do per-key majority voting and/or arbitration.
  return outputs[0];
}
```

These functions live under `packages/ditto-ai/src/merge/`.


---

## 9. Demo App Plan (SvelteKit / remote)

### 9.1 Route

In `apps/web/src/routes/ditto-demo/+page.svelte`:

- Textarea for **prompt** input.  
- Multi-select for **models** (list from CF AI docs).  
- Toggle for **strategy** (only `"consensus"` enabled, `"cooperative"` greyed-out).  
- Optional toggle for **structured vs raw**:
  - Raw = string mode.  
  - Structured = uses a built-in sample schema (e.g. email summary).  
- A button: `Run Ditto`.  

### 9.2 UI Display

After running:

- Show **each model’s raw output** (card per model).  
- Then show **final merged output** (raw string or JSON pretty-print).  
- Tiny badge showing which strategy was used.  

This will make the parallel / consensus idea visually obvious and impressive.


---

## 10. README Draft (Package-Level)

For `packages/ditto-ai/README.md` (high-level sketch):

```md
# ditto-ai

Edge-native LLM orchestration for Cloudflare Workers.

- Run multiple Cloudflare AI models in parallel.
- Merge their outputs using configurable strategies.
- Return either a raw string or validated JSON (Zod / Effect.Schema).
- Powered by Workers, Durable Objects, and Effect.

## Install

\`\`ash
bun add ditto-ai
# or
npm install ditto-ai
\`\`
## Quickstart

\`\`	s
import { dittoClient, fromZod } from "ditto-ai";
import { z } from "zod";

const ditto = dittoClient({
  endpoint: "https://your-worker.workers.dev/llm",
});

const EmailSummarySchema = fromZod(
  z.object({
    subject: z.string(),
    sentiment: z.enum(["positive", "neutral", "negative"]),
    actionItems: z.array(z.string()),
  })
);

const summary = await ditto({
  prompt: "Summarize this email for CRM logging…",
  strategy: "consensus",
  models: [
    "@cf/meta/llama-3.1-70b-instruct",
    "@cf/mistral/mistral-7b-instruct"
  ],
  schema: EmailSummarySchema,
});
\`\`
## Strategies

- \`consensus\` – all models answer the same prompt; Ditto merges the results.
- \`cooperative\` – planned: models will share work via a Durable Object task graph.

## License

MIT (TBD)
```


---

## 11. X / Twitter Thread Draft (High-Level)

Working draft for later use:

> 1/ I’ve been building a ton of stuff on @Cloudflare Workers + Durable Objects.  
>  
> Today I’m shipping a new pattern: **Ditto**.  
>  
> Ditto runs multiple Cloudflare AI models in parallel at the edge, merges their outputs with a consensus strategy, and returns ONE typed result.  
>  
> No extra infra. Just Workers + DO + Effect.

> 2/ Why?  
>  
> Calling one model is fine.  
> But running *several* and merging them gives you:  
> - higher robustness  
> - fewer hallucinations  
> - better structured JSON  
> - an easy way to experiment with different models  
>  
> Ditto makes this a one-liner.

> 3/ Under the hood:  
> - Cloudflare Workers route \`/llm\`  
> - per-request DittoJob Durable Object  
> - Effect state machine: FAN_OUT → COLLECT → PARSE → MERGE  
> - strategies: \`consensus\` today, \`cooperative\` later  
> - supports raw string or typed JSON via Zod / Effect.Schema

> 4/ The best part: it’s a small npm package.  
>  
> \`bun add ditto-ai\`  
>  
> \`\`\`ts
> const ditto = dittoClient({ endpoint: "/llm" });
> const result = await ditto({
>   prompt: "Summarize this email…",
>   strategy: "consensus",
>   models: [
>     "@cf/meta/llama-3.1-70b-instruct",
>     "@cf/mistral/mistral-7b-instruct"
>   ],
> });
> \`\`\`

> 5/ I’ll drop the repo + demo once I finish tightening up the merge strategies and error handling, but the core pattern is live:  
>  
> **Workers + Durable Objects + Cloudflare AI + Effect = edge-native multi-model orchestration.**  
>  
> Name: **Ditto**.  
>  
> Use it in your own Workers… I’m wiring it into inbox.dog next.  
>  
> More soon ⚡️


---

## 12. Summary & Next Steps

- **You**: Jordan, Cloudflare-pilled indie dev, already known for high-signal DO/Workers patterns.  
- **This project**: `ditto` / `ditto-ai`, a Cloudflare AI–powered edge-native parallel LLM orchestration engine.  
- **V1 scope**:
  - Cloudflare AI only.  
  - Strategy: `"consensus"` only (with `"cooperative"` stubbed for future).  
  - String and schema-validated JSON output.  
  - npm package + demo app.  
- **Tech stack**:
  - Remote starter → Workers + DO + SvelteKit + Tailwind + Auth + KV + D1.  
  - Effect for internal orchestration.  
  - Durable Object per job.  
  - Cloudflare AI for models.  

This PLAN.md gives the next agent everything they need to:
- scaffold the repo from `remote`,
- drop `packages/ditto-ai` in,
- wire Worker + DO,
- build the demo route,
- and iterate on internals (merge strategies, Effect flows).
