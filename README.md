# Ditto

Edge-native parallel LLM orchestration on Cloudflare Workers. Run multiple AI models in parallel, merge their outputs with consensus, and get back typed results.

Built on Cloudflare Durable Objects for extreme durability and idempotency. Each job orchestrates parallel model calls using Effect for true concurrency at the edge.

This repository contains:
- `packages/ditto-ai/` - npm package for LLM orchestration
- `src/` - SvelteKit demo & docs deployed to `ditto.coey.dev`

## Quick Start

### Install

```bash
bun add ditto-ai
npm install ditto-ai
```

### Use

```ts
import { dittoClient } from "ditto-ai";

const ditto = dittoClient({
  endpoint: "https://your-worker.workers.dev/llm",
});

const response = await ditto({
  prompt: "Summarize this email…",
  models: [
    "@cf/meta/llama-3.1-8b-instruct",
    "@cf/mistral/mistral-7b-instruct"
  ],
  strategy: "consensus",
});

console.log(response.result);      // merged output
console.log(response.structured);  // intent, confidence, supporting models
```

## Features

- **Parallel RPC orchestration** – Effect.all with unbounded concurrency for true parallelism
- **Durable Object orchestration** – per-job state management with idempotency
- **Unlimited concurrency** – scale to 100+ concurrent models per request
- **Consensus merging** – intelligent combination with confidence scoring
- **Structured analysis** – intent classification, hallucination detection
- **Performance timings** – track total, fanout, slowest model, and merge time
- **Type safety** – full TypeScript support
- **Individual responses** – inspect each model's output
- **Error handling** – typed `DittoError` with HTTP status codes

## Documentation

- **Full API Reference**: Visit `/docs` on the demo site
- **Package README**: See [packages/ditto-ai/README.md](./packages/ditto-ai/README.md)
- **Examples**: In [packages/ditto-ai/README.md](./packages/ditto-ai/README.md#examples)

## Development

```bash
# Install dependencies
bun install

# Run dev server
bun run dev

# Build package
bun run -f packages/ditto-ai build

# Build & deploy
bun run deploy
```

## Deployment

This project uses [Alchemy](https://alchemy.run) for Cloudflare deployment.

```bash
bun run deploy
```

The demo app is deployed to `ditto.coey.dev` (see `alchemy.run.ts`).

## License

MIT
