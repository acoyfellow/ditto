# Ditto

Edge-native parallel LLM orchestration on Cloudflare Workers.

This repository contains:
- `app/` - SvelteKit demo/docs app deployed to `ditto.coey.dev`
- `packages/ditto-ai/` - npm package for LLM orchestration

## Development

```bash
# Install dependencies
bun install

# Run dev server
bun run dev

# Build
bun run build

# Deploy (via Alchemy)
bun run deploy
```

## Package: ditto-ai

See [packages/ditto-ai/README.md](./packages/ditto-ai/README.md) for full documentation.

Quick install:
```bash
bun add ditto-ai
```

## Deployment

This project uses [Alchemy](https://alchemy.run) for Cloudflare deployment.

Deploy with:
```bash
bun run deploy
```

The app will be deployed to `ditto.coey.dev` (configured in `alchemy.run.ts`).

## License

MIT
