/**
 * Extract Cloudflare Workers AI model names from @cloudflare/workers-types
 * 
 * This file provides type-safe access to available Cloudflare AI models.
 * Models are extracted from the AiModels interface in @cloudflare/workers-types.
 */

import type { AiModels } from "@cloudflare/workers-types";

// Extract all model names as a union type
export type CloudflareModelName = keyof AiModels;

// Filter for text generation models only
// These are models that use BaseAiTextGeneration interface
export const TEXT_GENERATION_MODELS: CloudflareModelName[] = [
  // Meta Llama models
  "@cf/meta/llama-2-7b-chat-int8",
  "@cf/meta/llama-2-7b-chat-fp16",
  "@cf/meta/llama-3-8b-instruct",
  "@cf/meta/llama-3-8b-instruct-awq",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.1-8b-instruct-fp8",
  "@cf/meta/llama-3.1-8b-instruct-awq",
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/meta/llama-3.2-1b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  
  // Mistral models
  "@cf/mistral/mistral-7b-instruct-v0.1",
  "@cf/mistral/mistral-7b-instruct-v0.2-lora",
  "@hf/mistral/mistral-7b-instruct-v0.2",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  
  // Qwen models
  "@cf/qwen/qwen1.5-0.5b-chat",
  "@cf/qwen/qwen1.5-7b-chat-awq",
  "@cf/qwen/qwen1.5-14b-chat-awq",
  "@cf/qwen/qwen1.5-1.8b-chat",
  "@cf/qwen/qwen2.5-coder-32b-instruct",
  
  // DeepSeek models
  "@cf/deepseek-ai/deepseek-math-7b-instruct",
  "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
  
  // Microsoft models
  "@cf/microsoft/phi-2",
  
  // Google models
  "@cf/google/gemma-2b-it-lora",
  "@cf/google/gemma-7b-it-lora",
  "@cf/google/gemma-3-12b-it",
  
  // HuggingFace models
  "@hf/thebloke/llama-2-13b-chat-awq",
  "@hf/thebloke/mistral-7b-instruct-v0.1-awq",
  "@hf/thebloke/zephyr-7b-beta-awq",
  "@hf/thebloke/openhermes-2.5-mistral-7b-awq",
  "@hf/thebloke/neural-chat-7b-v3-1-awq",
  "@hf/thebloke/llamaguard-7b-awq",
  "@hf/thebloke/deepseek-coder-6.7b-base-awq",
  "@hf/thebloke/deepseek-coder-6.7b-instruct-awq",
  "@hf/nousresearch/hermes-2-pro-mistral-7b",
  "@hf/nexusflow/starling-lm-7b-beta",
  "@hf/google/gemma-7b-it",
  "@hf/meta-llama/meta-llama-3-8b-instruct",
  
  // Other models
  "@cf/openchat/openchat-3.5-0106",
  "@cf/tiiuae/falcon-7b-instruct",
  "@cf/thebloke/discolm-german-7b-v1-awq",
  "@cf/tinyllama/tinyllama-1.1b-chat-v1.0",
  "@cf/fblgit/una-cybertron-7b-v2-bf16",
  "@cf/defog/sqlcoder-7b-2",
] as const;

// Type-safe array of text generation model names
export type TextGenerationModel = typeof TEXT_GENERATION_MODELS[number];

// Helper to check if a model name is valid
export function isValidTextGenerationModel(
  model: string
): model is TextGenerationModel {
  return TEXT_GENERATION_MODELS.includes(model as TextGenerationModel);
}

// Get recommended models for common use cases
export const RECOMMENDED_MODELS = {
  fast: [
    "@cf/meta/llama-3.1-8b-instruct",
    "@cf/meta/llama-3.1-8b-instruct-fp8",
  ] as const,
  balanced: [
    "@cf/meta/llama-3.1-8b-instruct",
    "@cf/meta/llama-3.1-8b-instruct-fp8",
    "@cf/meta/llama-3.2-3b-instruct",
  ] as const,
  quality: [
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "@cf/meta/llama-4-scout-17b-16e-instruct",
  ] as const,
} as const;

