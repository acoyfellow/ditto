# ditto-ai

Edge-native LLM orchestration for Cloudflare Workers.

- Run multiple Cloudflare AI models in parallel.
- Merge their outputs using configurable strategies.
- Return raw string results (schema validation planned).
- Powered by Workers, Durable Objects, and Effect.

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

const summary = await ditto({
  prompt: "Summarize this email for CRM logging…",
  strategy: "consensus",
  models: [
    "@cf/meta/llama-3.1-8b-instruct",
    "@cf/meta/llama-3.1-8b-instruct-fast"
  ],
});
// Returns a string result. Schema validation is planned for a future release.
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

Ditto throws a single `DittoError` type:

```ts
import { DittoError } from "ditto-ai";

try {
  const result = await ditto({ prompt: "...", models: [...] });
} catch (error) {
  if (error instanceof DittoError) {
    console.error(error.type);    // Error type
    console.error(error.message);  // Error message
    console.error(error.status);   // HTTP status
    console.error(error.details);  // Additional details
  }
}
```

## Strategies

- `consensus` – all models answer the same prompt; Ditto merges the results.
- `cooperative` – planned: models will share work via a Durable Object task graph.

## License

MIT

