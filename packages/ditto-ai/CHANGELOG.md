# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-21

### Added
- Retry logic with exponential backoff using Effect Schedule
- Schema validation support - validate merged results with Zod or Effect schemas
- `maxRetries` option to control retry attempts per model call

## [0.0.1] - 2025-01-21

### Added
- Initial release: `ditto-ai` npm package
- Client API: `dittoClient()` for running parallel LLM calls
- Server setup: `createDittoWorkerHandler()` for Cloudflare Workers
- Consensus strategy: merge multiple model outputs into single result
- Cooperative strategy: sequential execution where models build on previous outputs
- Structured response parsing: intent classification, confidence scoring, clarification detection
- Error handling: typed `DittoError` with status codes and details
- Schema adapters: `fromZod()` and `fromEffectSchema()` for schema validation (integration in progress)
- Individual model response tracking and display
- Support for all Cloudflare AI text generation models

### Planned
- Request metadata and telemetry
- Additional model providers (OpenRouter, etc.)

