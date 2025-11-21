# ditto-ai

Edge-native LLM orchestration for Cloudflare Workers.

- Run multiple Cloudflare AI models in parallel at the edge.
- Merge their outputs with intelligent consensus.
- Return merged string + individual responses + structured analysis.
- Powered by Workers and Durable Objects.
- **Scales to unlimited concurrency** via Worker Loaders or Containers.

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

Ditto expects to be used from a Cloudflare Worker that has the Cloudflare AI binding configured (e.g. `env.AI`).

### Worker Setup

```ts
import { createDittoWorkerHandler } from "ditto-ai/server";

const handler = createDittoWorkerHandler();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handler.fetch(request, env, ctx);
  }
};
```

Your Worker must have:
- `env.AI` - Cloudflare AI binding
- `env.DITTO_JOB` - Durable Object namespace for `DittoJob`

### Environment Variables

No environment variables are required in userland. The Cloudflare AI binding must be configured in your `wrangler.toml` or `wrangler.jsonc`:

```toml
# wrangler.toml
[[ai]]
binding = "AI"
```

Or in `wrangler.jsonc`:
```jsonc
{
  "ai": {
    "binding": "AI"
  }
}
```

Note: If using Alchemy, you may need to add this manually to the generated wrangler config.

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

Ditto orchestrates parallel LLM calls across Cloudflare's edge:

```
Client → Worker (/llm) → Durable Object Job
                           ↓
                    Effect.all({ concurrency: "unbounded" })
                           ↓
        ┌─────────────────┬──────────────────┬─────────────────┐
        ↓                 ↓                  ↓                 ↓
    Model 1          Model 2            Model 3          Model N
 (llama-3.1)     (mistral-7b)       (qwen-14b)        (custom)
    (via AI)         (via AI)          (via AI)      (via Loaders)
        ↓                 ↓                  ↓                 ↓
        └─────────────────┴──────────────────┴─────────────────┘
                           ↓
                   Consensus Merge
                           ↓
                    Response + Metadata
```

**Concurrency**: Durable Objects handle unlimited parallel model calls within a single request.

**Scale**: For production, connect a `MODEL_RUNNER` service binding pointing to Worker Loaders or Containers. Ditto will automatically use this instead of the AI binding for true horizontal scaling.

## Strategies

- `consensus` – all models answer the same prompt; Ditto merges the results.
- `cooperative` – planned: models will share work via a Durable Object task graph.

## License

MIT

