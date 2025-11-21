# ditto-ai

Edge-native LLM orchestration for Cloudflare Workers.

- Run multiple Cloudflare AI models in parallel at the edge.
- Durable Object orchestration for extreme durability and idempotency.
- Effect.all with unbounded concurrency for true parallelism.
- Merge their outputs with intelligent consensus.
- Return merged string + individual responses + structured analysis + timings.
- **Unlimited concurrency** – scale to 100+ concurrent models per request.

## Install

```bash
bun add ditto-ai
# or
npm install ditto-ai
```

## Quickstart

```ts
import { dittoClient } from "ditto-ai";

const ditto = dittoClient({
  endpoint: "https://your-worker.workers.dev/llm",
});

const response = await ditto({
  prompt: "Summarize this email for CRM logging…",
  strategy: "consensus",
  models: [
    "@cf/meta/llama-3.1-8b-instruct",
    "@cf/meta/llama-3.1-8b-instruct-fast"
  ],
});

// response.result → merged string result
// response.responses → { [modelName]: string }
// response.structured → { summary, intent, confidence, supportingModels, ... }
```

## Configuration

Ditto requires a Cloudflare Worker with the following bindings:

### Worker Setup

```ts
import { DittoJob, createDittoWorkerHandler } from "ditto-ai/server";

// Export DittoJob for Durable Object binding
export { DittoJob };

const handler = createDittoWorkerHandler();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handler.fetch(request, env, ctx);
  }
};
```

Your Worker must have:
- `env.AI` - Cloudflare AI binding (required)
- `env.DITTO_JOB` - Durable Object namespace for `DittoJob` (required)

### Wrangler Configuration

Configure bindings in your `wrangler.toml` or `wrangler.jsonc`:

```toml
# wrangler.toml

# AI binding (REQUIRED)
[[ai]]
binding = "AI"

# Durable Object binding (REQUIRED)
[[durable_objects.bindings]]
name = "DITTO_JOB"
class_name = "DittoJob"
```

Or in `wrangler.jsonc`:
```jsonc
{
  "ai": {
    "binding": "AI"
  },
  "durable_objects": {
    "bindings": [
      {
        "name": "DITTO_JOB",
        "class_name": "DittoJob"
      }
    ]
  }
}
```

**Using Alchemy?** Configure in your `alchemy.run.ts`:
```ts
import { Ai, DurableObjectNamespace } from "alchemy/cloudflare";
import { DittoJob } from "./worker/index.ts";

const DITTO_JOB = DurableObjectNamespace("ditto-job", {
  className: "DittoJob",
  scriptName: "your-worker",
});

bindings: {
  DITTO_JOB,
  AI: Ai(),
}
```

## Error Handling

Ditto throws typed `DittoError`:

```ts
import { DittoError } from "ditto-ai";

try {
  const response = await ditto({ 
    prompt: "...", 
    models: [...] 
  });
} catch (error) {
  if (error instanceof DittoError) {
    console.error(error.type);      // e.g. "BadRequest", "InternalError"
    console.error(error.message);   // Human-readable error message
    console.error(error.status);    // HTTP status code
    console.error(error.details);   // Additional context
  }
}
```

## Architecture

Ditto orchestrates parallel LLM calls using Durable Objects and Effect:

```
Client → Worker (/llm) → Durable Object Job
                           ↓
                    Effect.all({ concurrency: "unbounded" })
                           ↓
        ┌─────────────────┬──────────────────┬─────────────────┐
        ↓                 ↓                  ↓                 ↓
    AI.run()          AI.run()           AI.run()          AI.run()
  (llama-3.1)      (mistral-7b)        (qwen-14b)         (custom)
        ↓                 ↓                  ↓                 ↓
        └─────────────────┴──────────────────┴─────────────────┘
                           ↓
                   Consensus Merge
                           ↓
                    Response + Timings
```

**Durability**: Each job runs in a Durable Object with:
- Persistent job state for idempotency
- Per-model result tracking
- Automatic retry and timeout handling

**Concurrency**: Effect.all with unbounded concurrency enables true parallel execution. All model calls execute simultaneously at the edge.

## Strategies

- `consensus` – all models answer the same prompt; Ditto merges the results.
- `cooperative` – planned: models will share work via a Durable Object task graph.

## License

MIT

