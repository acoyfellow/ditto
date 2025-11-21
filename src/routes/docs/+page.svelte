<script lang="ts">
  import Card from "$lib/components/Card.svelte";
  import BG from "$lib/components/BG.svelte";
  import Highlight from "svelte-highlight";
  import typescript from "svelte-highlight/languages/typescript";
  import bash from "svelte-highlight/languages/bash";

  interface Section {
    id: string;
    title: string;
    anchor: string;
  }

  const sections: Section[] = [
    { id: "install", title: "Installation", anchor: "#install" },
    { id: "api", title: "API Reference", anchor: "#api" },
    { id: "client", title: "Client API", anchor: "#client" },
    { id: "server", title: "Server Setup", anchor: "#server" },
    { id: "errors", title: "Error Handling", anchor: "#errors" },
    { id: "merging", title: "Merge Strategies", anchor: "#merging" },
    { id: "examples", title: "Examples", anchor: "#examples" },
  ];

  let activeSection = $state("install");
</script>

<svelte:head>
  <title>Ditto · Documentation</title>
</svelte:head>

<div class="min-h-screen bg-[#050505] text-white">
  <BG />

  <header class="border-b border-[#1f1f1f]">
    <div
      class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs font-mono uppercase tracking-[0.3em]"
    >
      <a href="/" class="text-[#f97316] hover:underline">← Back to Ditto</a>
      <span class="text-gray-400">Documentation</span>
    </div>
  </header>

  <main class="mx-auto max-w-6xl">
    <div class="grid gap-12 px-4 py-12 lg:grid-cols-[250px_1fr]">
      <!-- Sidebar -->
      <aside class="sticky top-12 h-fit space-y-2">
        {#each sections as section}
          <a
            href={section.anchor}
            class={activeSection === section.id
              ? "block rounded-lg px-3 py-2 text-sm transition bg-[#f97316]/10 text-[#f97316]"
              : "block rounded-lg px-3 py-2 text-sm transition text-gray-400 hover:text-white"}
            onclick={() => (activeSection = section.id)}
          >
            {section.title}
          </a>
        {/each}
      </aside>

      <!-- Content -->
      <div class="space-y-16">
        <!-- Installation -->
        <section id="install" class="scroll-mt-12 space-y-4">
          <div>
            <h1 class="text-4xl font-bold">Installation</h1>
            <p class="mt-2 text-gray-400">Get ditto-ai running in seconds.</p>
          </div>

          <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
            <h2 class="text-sm uppercase tracking-[0.3em] text-gray-500">
              via npm/bun
            </h2>
            <div class="mt-4 rounded-lg overflow-hidden">
              <Highlight language={bash} code={`bun add ditto-ai
npm install ditto-ai
pnpm add ditto-ai`} />
            </div>
          </div>

          <div class="space-y-4 rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
            <h2 class="text-sm uppercase tracking-[0.3em] text-gray-500">
              Requirements
            </h2>
            <ul class="space-y-2 text-sm text-gray-300">
              <li>
                <span class="font-semibold text-white">Node/Bun:</span> LTS or newer
              </li>
              <li>
                <span class="font-semibold text-white">TypeScript:</span> 5.0+
              </li>
              <li>
                <span class="font-semibold text-white">Effect:</span> ^3.0.0 (included)
              </li>
              <li>
                <span class="font-semibold text-white">Zod:</span> ^3.0.0 (optional)
              </li>
            </ul>
          </div>
        </section>

        <!-- API Reference -->
        <section id="api" class="scroll-mt-12 space-y-4">
          <div>
            <h1 class="text-4xl font-bold">API Reference</h1>
            <p class="mt-2 text-gray-400">Complete type definitions and exports.</p>
          </div>

          <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
            <h2 class="mb-4 text-lg font-semibold">Main Exports</h2>
            <div class="space-y-3 text-sm">
              <div>
                <p class="font-mono text-[#f97316]">dittoClient(options)</p>
                <p class="mt-1 text-gray-400">Creates a Ditto client instance.</p>
              </div>
              <div>
                <p class="font-mono text-[#f97316]">createDittoWorkerHandler(opts?)</p>
                <p class="mt-1 text-gray-400">Creates a Cloudflare Worker handler.</p>
              </div>
              <div>
                <p class="font-mono text-[#f97316]">DittoError</p>
                <p class="mt-1 text-gray-400">Error type thrown by ditto operations.</p>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
            <h2 class="mb-4 text-lg font-semibold">Types</h2>
            <div class="overflow-hidden rounded-lg">
              <Highlight language={typescript} code={`type Strategy = "consensus" | "cooperative";

interface DittoClientOptions {
  endpoint: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

interface DittoRequest<T> {
  prompt: string;
  models: string[];
  strategy?: Strategy;
  temperature?: number;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
}

interface DittoClientResponse<T> {
  result: T;
  responses?: Record<string, string>;
  structured?: MergedStructuredResult;
}

interface MergedStructuredResult {
  summary: string;
  intent: DittoIntent;
  confidence: number;
  needsClarification: boolean;
  supportingModels: string[];
  responses: StructuredModelResult[];
}

type DittoIntent = "answer" | "clarification" | "refusal" | "unknown";`} />
            </div>
          </div>
        </section>

        <!-- Client API -->
        <section id="client" class="scroll-mt-12 space-y-4">
          <div>
            <h1 class="text-4xl font-bold">Client API</h1>
            <p class="mt-2 text-gray-400">How to use ditto-ai from your application.</p>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Creating a Client</h2>
              <div class="overflow-hidden rounded-lg">
                <Highlight language={typescript} code={`import { dittoClient } from "ditto-ai";

const ditto = dittoClient({
  endpoint: "https://your-worker.workers.dev/llm",
  headers: {
    "Authorization": "Bearer token" // optional
  }
});`} />
              </div>
            </div>

            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Making Requests</h2>
              <div class="overflow-hidden rounded-lg">
                <Highlight language={typescript} code={`// Basic string merge
const response = await ditto({
  prompt: "What is 2+2?",
  models: [
    "@cf/meta/llama-3.1-8b-instruct",
    "@cf/mistral/mistral-7b-instruct"
  ],
  strategy: "consensus"
});

console.log(response.result);        // merged string
console.log(response.responses);     // individual model outputs
console.log(response.structured);    // intent, confidence, etc.`} />
              </div>
            </div>

            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">DittoClientResponse Structure</h2>
              <div class="space-y-3 text-sm text-gray-300">
                <div>
                  <p class="font-mono text-[#f97316]">result: string</p>
                  <p class="text-gray-400">The merged output from all models</p>
                </div>
                <div>
                  <p class="font-mono text-[#f97316]">responses?: Record&lt;string, string&gt;</p>
                  <p class="text-gray-400">
                    Each model's raw output: <span class="font-mono">{"@cf/meta/llama-3.1-8b-instruct"}</span> → response
                  </p>
                </div>
                <div>
                  <p class="font-mono text-[#f97316]">structured?: MergedStructuredResult</p>
                  <p class="text-gray-400">Analyzed merge: intent, confidence, supporting models</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Server Setup -->
        <section id="server" class="scroll-mt-12 space-y-4">
          <div>
            <h1 class="text-4xl font-bold">Server Setup</h1>
            <p class="mt-2 text-gray-400">
              Configure Ditto in your Cloudflare Worker.
            </p>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Worker Configuration</h2>
              <div class="overflow-hidden rounded-lg">
                <Highlight language={typescript} code={`// worker/index.ts
import { createDittoWorkerHandler, type DittoJobRequest } from "ditto-ai/server";
import { DittoJob } from "ditto-ai/server";

type Env = {
  DITTO_JOB: DurableObjectNamespace<DittoJob>;
  AI: Fetcher;
  MODEL_RUNNER?: Fetcher;
};

const dittoHandler = createDittoWorkerHandler({
  defaultStrategy: "consensus"
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    if (url.pathname === "/llm") {
      return dittoHandler.fetch(request, env, ctx);
    }
    
    return new Response("Not found", { status: 404 });
  }
};`} />
              </div>
            </div>

            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Wrangler Configuration</h2>
              <div class="overflow-hidden rounded-lg">
                <Highlight language={bash} code={`# wrangler.toml or wrangler.jsonc

# AI Binding (required)
[ai]
binding = "AI"

# Durable Object Binding (required)
[[durable_objects.bindings]]
name = "DITTO_JOB"
class_name = "DittoJob"

# Optional: Service Binding for model runner
[[services]]
binding = "MODEL_RUNNER"
service = "model-runner"
environment = "production"`} />
              </div>
            </div>

            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Environment Bindings</h2>
              <div class="space-y-3 text-sm text-gray-300">
                <div>
                  <p class="font-mono text-[#f97316]">env.AI</p>
                  <p class="text-gray-400">
                    Cloudflare AI binding. Must have <span class="font-mono">.run()</span> method.
                  </p>
                </div>
                <div>
                  <p class="font-mono text-[#f97316]">env.DITTO_JOB</p>
                  <p class="text-gray-400">
                    Durable Object namespace for per-request job orchestration.
                  </p>
                </div>
                <div>
                  <p class="font-mono text-[#f97316]">env.MODEL_RUNNER (optional)</p>
                  <p class="text-gray-400">
                    Service Binding for model execution layer (tries this before AI binding).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Error Handling -->
        <section id="errors" class="scroll-mt-12 space-y-4">
          <div>
            <h1 class="text-4xl font-bold">Error Handling</h1>
            <p class="mt-2 text-gray-400">
              Ditto throws typed errors with detailed context.
            </p>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">DittoError</h2>
              <div class="overflow-hidden rounded-lg">
                <Highlight language={typescript} code={`class DittoError extends Error {
  type: string;           // e.g. "BadRequest", "InternalError"
  message: string;        // Human-readable message
  status: number;         // HTTP status code
  details?: unknown;      // Additional context
}`} />
              </div>
            </div>

            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Error Types</h2>
              <div class="space-y-3 text-sm text-gray-300">
                <div class="rounded-lg bg-black/40 p-3">
                  <p class="font-mono text-[#f97316]">BadRequest (400)</p>
                  <p class="text-gray-400">Invalid prompt, models, or request format</p>
                </div>
                <div class="rounded-lg bg-black/40 p-3">
                  <p class="font-mono text-[#f97316]">InternalError (500)</p>
                  <p class="text-gray-400">Job execution failed, model unavailable, or system error</p>
                </div>
                <div class="rounded-lg bg-black/40 p-3">
                  <p class="font-mono text-[#f97316]">JobError</p>
                  <p class="text-gray-400">Specific error from Durable Object execution</p>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Error Handling Example</h2>
              <div class="overflow-hidden rounded-lg">
                <Highlight language={typescript} code={`import { dittoClient, DittoError } from "ditto-ai";

try {
  const response = await ditto({
    prompt: "What is 2+2?",
    models: ["@cf/meta/llama-3.1-8b-instruct"]
  });
} catch (error) {
  if (error instanceof DittoError) {
    console.error(\`Error: \${error.type} (\${error.status})\`);
    console.error(\`Message: \${error.message}\`);
    console.error(\`Details: \${JSON.stringify(error.details)}\`);
  } else {
    console.error("Unknown error:", error);
  }
}`} />
              </div>
            </div>
          </div>
        </section>

        <!-- Merge Strategies -->
        <section id="merging" class="scroll-mt-12 space-y-4">
          <div>
            <h1 class="text-4xl font-bold">Merge Strategies</h1>
            <p class="mt-2 text-gray-400">
              How Ditto combines multiple model outputs.
            </p>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Consensus (v1)</h2>
              <div class="space-y-3 text-sm text-gray-300">
                <p>
                  All models answer the same prompt. Responses are analyzed for intent and merged into a single output.
                </p>
                <div class="overflow-hidden rounded-lg">
                  <Highlight language={bash} code={`Flow:
1. Run all models in parallel
2. Classify each response: answer | clarification | refusal | unknown
3. Estimate confidence for each response
4. Find winning intent (majority vote weighted by confidence)
5. Merge summaries of winning responses`} />
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Structured Analysis</h2>
              <div class="space-y-3 text-sm text-gray-300">
                <p>Every response is analyzed and the merge result includes:</p>
                <div class="overflow-hidden rounded-lg">
                  <Highlight language={typescript} code={`summary: string;           // Merged output, max 5 sentences
intent: DittoIntent;       // What the merged response is doing
confidence: 0-1;           // How confident in this response
supportingModels: string[]; // Which models voted for winning intent`} />
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Cooperative (Planned)</h2>
              <p class="text-sm text-gray-300">
                Models share work via task graph. One model's output feeds into another's input for collaborative problem-solving.
              </p>
            </div>
          </div>
        </section>

        <!-- Examples -->
        <section id="examples" class="scroll-mt-12 space-y-4">
          <div>
            <h1 class="text-4xl font-bold">Examples</h1>
            <p class="mt-2 text-gray-400">
              Real-world patterns for common use cases.
            </p>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Email Summarization</h2>
              <div class="overflow-hidden rounded-lg">
                <Highlight language={typescript} code={`import { dittoClient } from "ditto-ai";

const ditto = dittoClient({
  endpoint: "https://my-worker.workers.dev/llm"
});

async function summarizeEmail(emailBody: string) {
  const response = await ditto({
    prompt: \`Summarize this email in 1-2 sentences:

\${emailBody}\`,
    models: [
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/mistral/mistral-7b-instruct"
    ],
    strategy: "consensus"
  });

  console.log("Summary:", response.result);
  console.log("Confidence:", response.structured?.confidence);
  console.log("Needs clarification:", response.structured?.needsClarification);
  
  return response.result;
}`} />
              </div>
            </div>

            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Content Moderation</h2>
              <div class="overflow-hidden rounded-lg">
                <Highlight language={typescript} code={`async function moderateContent(text: string) {
  const response = await ditto({
    prompt: \`Is this content harmful? Answer only: yes, no, or unclear.

Content: \${text}\`,
    models: [
      "@cf/meta/llama-3.1-70b-instruct",
      "@cf/mistral/mistral-7b-instruct",
      "@cf/qwen/qwen-2.5-14b-instruct"
    ],
    strategy: "consensus"
  });

  // Only block if consensus is confident
  if (response.result.toLowerCase().includes("yes") && 
      response.structured?.confidence > 0.75) {
    return { action: "block", confidence: response.structured.confidence };
  }

  return { action: "allow" };
}`} />
              </div>
            </div>

            <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6">
              <h2 class="mb-4 text-lg font-semibold">Data Extraction</h2>
              <div class="overflow-hidden rounded-lg">
                <Highlight language={typescript} code={`async function extractData(document: string) {
  const response = await ditto({
    prompt: \`Extract the company name from this document:

\${document}

Answer with ONLY the company name.\`,
    models: [
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/mistral/mistral-7b-instruct",
      "@cf/qwen/qwen-2.5-14b-instruct"
    ],
    strategy: "consensus"
  });

  // All supporting models agree = high confidence extraction
  return {
    company: response.result.trim(),
    agreementCount: response.structured?.supportingModels.length,
    confidence: response.structured?.confidence
  };
}`} />
              </div>
            </div>
          </div>
        </section>

        <section class="mt-20 rounded-2xl border border-[#1f1f1f] bg-black/40 p-8">
          <h2 class="text-2xl font-semibold">Questions?</h2>
          <p class="mt-2 text-gray-400">
            Check the
            <a href="https://github.com/ditto-run/ditto-ai/issues" target="_blank" rel="noreferrer" class="text-[#f97316] hover:underline">GitHub issues</a>
            or open a new one.
          </p>
        </section>
      </div>
    </div>
  </main>
</div>

