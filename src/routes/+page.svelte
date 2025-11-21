<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    TEXT_GENERATION_MODELS,
    type TextGenerationModel,
  } from "$lib/cloudflare-models";
  import { runDitto } from "./data.remote";
  import type { MergedStructuredResult, DittoTimings } from "ditto-ai";
  import Card from "$lib/components/Card.svelte";
  import BG from "$lib/components/BG.svelte";
  import Nav from "$lib/components/Nav.svelte";
  import Highlight from "svelte-highlight";
  import typescript from "svelte-highlight/languages/typescript";

  const installCommand = "bun add ditto-ai";
  const codeExample = `import { dittoClient } from "ditto-ai";

const ditto = dittoClient({
  endpoint: "/llm",
});

const result = await ditto({
  prompt: "Summarize this email...",
  strategy: "consensus",
  models: [
    "@cf/meta/llama-3.1-8b-instruct",
    "@cf/meta/mistral-7b"
  ],
});`;

  const features = [
    {
      accent: "II",
      title: "Parallel Execution",
      description:
        "Run multiple Cloudflare AI models simultaneously at the edge with low latency.",
    },
    {
      accent: "⊕",
      title: "Consensus Merging",
      description:
        "Blend every response into one reliable output with configurable merge rules.",
    },
    {
      accent: "◇",
      title: "Type-Safe Results",
      description:
        "Validate every payload with Effect.Schema or Zod so responses stay structured.",
    },
  ];

  const architectureModels = [
    { label: "Model 1", meta: "llama-3.1-70b" },
    { label: "Model 2", meta: "mistral-7b" },
    { label: "Model 3", meta: "qwen-2.5-14b" },
  ];

  const useCases = [
    {
      title: "Email Summarization",
      detail:
        "Extract structured action items with multiple models for accuracy.",
    },
    {
      title: "Content Moderation",
      detail: "Consensus reduces false positives before you block a user post.",
    },
    {
      title: "Data Extraction",
      detail: "Parse PDFs into validated JSON with auto retry on schema drift.",
    },
  ];

  const poweredBy = ["Workers", "Durable Objects", "Effect"];

  type CopyTarget = "install" | "snippet";
  let copied = $state<CopyTarget | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const demoModels = TEXT_GENERATION_MODELS.slice(0, 12);
  let prompt = $state("I just typed 123 — what should I do?");
  let selectedModels = $state<TextGenerationModel[]>([
    "@cf/meta/llama-3.1-8b-instruct",
    "@cf/meta/llama-3.1-8b-instruct-fp8",
  ]);
  let strategy = $state<"consensus" | "cooperative">("consensus");
  let isRunning = $state(false);
  let mergedResult = $state<string | null>(null);
  let modelResponses = $state<Record<string, string>>({});
  let structuredResult = $state<MergedStructuredResult | null>(null);
  let timings = $state<DittoTimings | null>(null);
  let runError = $state<string | null>(null);
  const strategyOptions = [
    { value: "consensus", label: "Consensus", disabled: false },
    { value: "cooperative", label: "Cooperative (soon)", disabled: true },
  ] as const;

  const formatPercent = (value: number | undefined) =>
    value === undefined ? "—" : `${Math.round(value * 100)}%`;

  async function copy(text: string, target: CopyTarget) {
    await navigator.clipboard.writeText(text);
    if (timer) {
      clearTimeout(timer);
    }
    copied = target;
    timer = setTimeout(() => {
      copied = null;
    }, 2000);
  }

  onDestroy(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });

  async function runDittoDemo() {
    if (!prompt.trim() || selectedModels.length === 0) {
      runError = "Add a prompt and at least one model.";
      return;
    }

    isRunning = true;
    runError = null;
    mergedResult = null;
    structuredResult = null;
    modelResponses = {};
    timings = null;

    try {
      const response = await runDitto({
        prompt,
        models: selectedModels,
        strategy,
      });

      mergedResult = response.result;
      modelResponses = response.responses || {};
      structuredResult = response.structured || null;
      timings = response.timings || null;
    } catch (err) {
      runError = (err as Error).message || "Run failed";
    } finally {
      isRunning = false;
    }
  }

  function toggleModel(model: TextGenerationModel, checked: boolean) {
    if (checked) {
      selectedModels = [...selectedModels, model];
    } else {
      selectedModels = selectedModels.filter((m) => m !== model);
    }
  }
</script>

<svelte:head>
  <title>Ditto · Parallel Models, One Result</title>
</svelte:head>

<div class="min-h-screen bg-[#050505] text-white">
  <BG />
  <Nav />

  <main class="mx-auto max-w-6xl space-y-16 px-4 py-12">
    <section
      class="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] rounded-3xl p-8 overflow-hidden"
    >
      <BG />
      <div class="relative z-10 space-y-8">
        <p class="text-xs uppercase tracking-[0.4em] text-[#f97316]">
          Edge-native LLM orchestration
        </p>
        <div>
          <p class="text-5xl font-semibold leading-tight">
            <span class="block">Parallel Models</span>
            <span class="block text-[#f97316]">One Result</span>
          </p>
          <p class="mt-6 text-lg text-gray-300">
            Run multiple Cloudflare AI models simultaneously. Merge every output
            with consensus so your responses stay typed, validated, and ready
            for production flows.
          </p>
        </div>

        <div
          class="flex flex-wrap items-center gap-4 rounded-2xl border border-[#1f1f1f] bg-black/40 px-5 py-4 font-mono text-sm text-gray-200"
        >
          <span class="text-xs uppercase tracking-[0.3em] text-gray-500"
            >Run</span
          >
          <span class="flex-1 text-base text-white">{installCommand}</span>
          <button
            class="rounded-full border border-[#f97316] px-4 py-1 text-xs uppercase tracking-wide text-[#f97316] transition hover:bg-[#f97316] hover:text-black"
            onclick={() => copy(installCommand, "install")}
          >
            {copied === "install" ? "copied" : "copy"}
          </button>
        </div>
      </div>

      <div
        class="relative z-10 rounded-2xl border border-[#1f1f1f] bg-black/60 shadow-2xl overflow-hidden"
      >
        <div
          class="flex items-center justify-between border-b border-[#1f1f1f] px-5 py-3 text-xs uppercase tracking-[0.4em] text-gray-400"
        >
          <span>ditto-example.ts</span>
          <button
            class="rounded-full border border-gray-600 px-3 py-1 text-[0.65rem] tracking-[0.2em] transition hover:border-white hover:text-white"
            onclick={() => copy(codeExample, "snippet")}
          >
            {copied === "snippet" ? "copied" : "copy"}
          </button>
        </div>
        <div class="p-6">
          <Highlight language={typescript} code={codeExample} />
        </div>
      </div>
    </section>

    <section
      class="rounded-2xl border border-[#1f1f1f] bg-black/30 p-8 shadow-2xl"
    >
      <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.4em] text-[#f97316]">
            Live Playground
          </p>
          <h3 class="mt-2 text-3xl font-semibold">Test Ditto right here</h3>
          <p class="mt-2 text-sm text-gray-400">
            Pick a couple of models, run them in parallel, and inspect the
            structured consensus payload.
          </p>
        </div>
      </div>

      <div class="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="space-y-6">
          <div>
            <label
              class="text-xs uppercase tracking-[0.3em] text-gray-500"
              for="prompt">Prompt</label
            >
            <textarea
              id="prompt"
              bind:value={prompt}
              rows="4"
              class="mt-2 w-full rounded-2xl border border-[#1f1f1f] bg-black/60 p-4 text-sm text-white placeholder:text-gray-500 focus:border-[#f97316] focus:outline-none"
              placeholder="Ask anything..."
            ></textarea>
          </div>

          <div>
            <label
              class="text-xs uppercase tracking-[0.3em] text-gray-500"
              for="models">Models</label
            >
            <div
              class="mt-2 space-y-2 max-h-48 overflow-y-auto rounded-2xl border border-[#1f1f1f] bg-black/40 p-3"
            >
              {#each demoModels as model}
                <label class="flex items-center gap-3 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model)}
                    onchange={(e) =>
                      toggleModel(model, e.currentTarget.checked)}
                    class="h-4 w-4 rounded border-gray-600 bg-black text-[#f97316] focus:ring-[#f97316]"
                  />
                  <span class="font-mono">{model}</span>
                </label>
              {/each}
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label
              class="text-xs uppercase tracking-[0.3em] text-gray-500"
              for="strategy">Strategy</label
            >
            <select
              id="strategy"
              bind:value={strategy}
              class="rounded-2xl border border-[#1f1f1f] bg-black/60 px-4 py-3 text-sm text-white focus:border-[#f97316] focus:outline-none"
            >
              {#each strategyOptions as option}
                <option value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              {/each}
            </select>
          </div>

          {#if runError}
            <div
              class="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200"
            >
              {runError}
            </div>
          {/if}

          <button
            class="w-full rounded-full bg-[#f97316] px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:bg-[#ff8d3e] disabled:cursor-not-allowed disabled:opacity-40"
            onclick={runDittoDemo}
            disabled={isRunning}
          >
            {isRunning ? "Running..." : "Run Ditto"}
          </button>
        </div>

        <div class="space-y-6">
          <div class="rounded-2xl border border-[#1f1f1f] bg-black/50 p-5">
            <h4 class="text-sm uppercase tracking-[0.3em] text-gray-500">
              Merged Result
            </h4>
            {#if mergedResult}
              <p class="mt-3 text-sm leading-relaxed text-gray-100">
                {mergedResult}
              </p>
            {:else if isRunning}
              <p class="mt-3 text-xs uppercase tracking-[0.4em] text-gray-500">
                Waiting for models...
              </p>
            {:else}
              <p class="mt-3 text-sm text-gray-500">
                Run Ditto to see the merged reply.
              </p>
            {/if}
          </div>

          <div class="rounded-2xl border border-[#1f1f1f] bg-black/50 p-5">
            <h4 class="text-sm uppercase tracking-[0.3em] text-gray-500">
              Structured Payload
            </h4>
            {#if structuredResult}
              <div class="mt-3 space-y-2 text-sm text-gray-200">
                <div
                  class="flex items-center justify-between border-b border-[#1f1f1f] pb-2"
                >
                  <span>Intent</span>
                  <span class="font-mono text-[#f97316]"
                    >{structuredResult.intent}</span
                  >
                </div>
                <div
                  class="flex items-center justify-between border-b border-[#1f1f1f] pb-2"
                >
                  <span>Confidence</span>
                  <span class="font-mono text-[#f97316]">
                    {formatPercent(structuredResult.confidence)}
                  </span>
                </div>
                <div
                  class="flex items-center justify-between border-b border-[#1f1f1f] pb-2"
                >
                  <span>Needs Clarification?</span>
                  <span class="font-mono text-[#f97316]">
                    {structuredResult.needsClarification ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-gray-500">
                    Supporting Models
                  </p>
                  <p class="mt-1 font-mono text-[0.8rem] text-gray-300">
                    {structuredResult.supportingModels.join(", ")}
                  </p>
                </div>
              </div>
            {:else}
              <p class="mt-3 text-sm text-gray-500">
                We’ll display intents, confidence, and clarification tags once a
                run completes.
              </p>
            {/if}
          </div>

          <div class="rounded-2xl border border-[#1f1f1f] bg-black/50 p-5">
            <h4 class="text-sm uppercase tracking-[0.3em] text-gray-500">
              Performance Timings
            </h4>
            {#if timings}
              <div class="mt-3 space-y-2 text-sm text-gray-200">
                <div
                  class="flex items-center justify-between border-b border-[#1f1f1f] pb-2"
                >
                  <span>Total Time</span>
                  <span class="font-mono text-[#f97316]">{timings.total}ms</span
                  >
                </div>
                <div
                  class="flex items-center justify-between border-b border-[#1f1f1f] pb-2"
                >
                  <span>Fanout</span>
                  <span class="font-mono text-[#f97316]"
                    >{timings.fanout}ms</span
                  >
                </div>
                <div
                  class="flex items-center justify-between border-b border-[#1f1f1f] pb-2"
                >
                  <span>Slowest Model</span>
                  <span class="font-mono text-[#f97316]"
                    >{timings.slowest}ms</span
                  >
                </div>
                <div class="flex items-center justify-between pb-2">
                  <span>Merge</span>
                  <span class="font-mono text-[#f97316] ml-auto"
                    >{timings.merge}ms</span
                  >
                </div>
              </div>
            {:else}
              <p class="mt-3 text-sm text-gray-500">
                Timing metrics will appear after a run completes.
              </p>
            {/if}
          </div>

          <div class="rounded-2xl border border-[#1f1f1f] bg-black/50 p-5">
            <h4 class="text-sm uppercase tracking-[0.3em] text-gray-500">
              Individual Model Responses
            </h4>
            {#if Object.keys(modelResponses).length > 0}
              <div class="mt-3 space-y-4">
                {#each Object.entries(modelResponses) as [model, response]}
                  <div
                    class="rounded-xl border border-[#1f1f1f] bg-black/60 p-4"
                  >
                    <p class="font-mono text-xs text-[#f97316]">{model}</p>
                    <p class="mt-2 text-sm leading-relaxed text-gray-100">
                      {response}
                    </p>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="mt-3 text-sm text-gray-500">
                Run Ditto to inspect each model’s answer.
              </p>
            {/if}
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-6 md:grid-cols-3">
      {#each features as feature}
        <div
          class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-6 shadow-lg transition hover:-translate-y-1 hover:border-[#f97316]"
        >
          <div class="text-2xl text-[#f97316]">{feature.accent}</div>
          <h3 class="mt-4 text-xl font-semibold">{feature.title}</h3>
          <p class="mt-2 text-sm text-gray-400">{feature.description}</p>
        </div>
      {/each}
    </section>

    <section class="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-8">
        <p class="text-xs uppercase tracking-[0.4em] text-gray-500">
          Architecture
        </p>
        <h3 class="mt-4 text-3xl font-semibold">
          Edge-Native Parallel Orchestration
        </h3>
        <p class="mt-4 text-sm text-gray-400">
          Send a request once. Ditto orchestrates parallel model calls on
          Cloudflare's edge, waits for all responses, and merges them with
          consensus.
        </p>

        <div class="mt-8 space-y-3">
          <div class="rounded-lg bg-black/60 p-4 text-sm">
            <p class="font-semibold text-[#f97316]">Durable Object</p>
            <p class="mt-1 text-xs text-gray-400">
              Per-request job orchestrator
            </p>
          </div>
          <div class="rounded-lg bg-black/60 p-4 text-sm">
            <p class="font-semibold text-[#f97316]">Parallel RPC Calls</p>
            <p class="mt-1 text-xs text-gray-400">
              All models invoked simultaneously
            </p>
          </div>
          <div class="rounded-lg bg-black/60 p-4 text-sm">
            <p class="font-semibold text-[#f97316]">Consensus Merge</p>
            <p class="mt-1 text-xs text-gray-400">
              Intent detection + confidence scoring
            </p>
          </div>
        </div>

        <div
          class="mt-8 rounded-xl border border-dashed border-[#f97316]/70 bg-[#f97316]/5 px-4 py-4 text-sm"
        >
          <p class="font-semibold text-[#f97316]">
            Worker Loaders (Closed Beta)
          </p>
          <p class="mt-2 text-xs text-gray-300">
            Each model call runs in its own <span class="font-mono">LOADER</span
            >
            isolate for true sandboxing.
            <a
              href="https://forms.gle/MoeDxE9wNiqdf8ri9"
              target="_blank"
              rel="noreferrer"
              class="text-[#f97316] hover:underline ml-1"
              >Sign up for beta access</a
            >.
          </p>
        </div>
      </div>

      <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-8">
        <p class="text-xs uppercase tracking-[0.4em] text-gray-500">
          Powered By
        </p>
        <ul class="mt-6 space-y-4">
          {#each poweredBy as item}
            <li
              class="flex items-center justify-between border border-transparent border-b border-b-[#1f1f1f] pb-4 last:border-b-0 last:pb-0"
            >
              <span class="text-lg font-semibold">{item}</span>
              <span class="text-xs uppercase tracking-[0.3em] text-gray-500"
                >edge</span
              >
            </li>
          {/each}
        </ul>

        <div class="mt-8 rounded-xl border border-[#1f1f1f] bg-black/50 p-6">
          <h4 class="text-sm uppercase tracking-[0.3em] text-gray-500">
            Consensus Modes
          </h4>
          <p class="mt-2 text-lg font-semibold text-white">
            Consensus · Cooperative
          </p>
          <p class="mt-3 text-sm text-gray-400">
            Start with strict consensus today. Flip to cooperative strategies
            once you need creative blends.
          </p>
        </div>
      </div>
    </section>

    <section class="grid gap-10 lg:grid-cols-2">
      <div class="rounded-2xl border border-[#1f1f1f] bg-black/40 p-8">
        <p class="text-xs uppercase tracking-[0.4em] text-gray-500">
          Use Cases
        </p>
        <div class="mt-6 space-y-6">
          {#each useCases as entry}
            <div>
              <h4 class="text-lg font-semibold text-white">{entry.title}</h4>
              <p class="mt-2 text-sm text-gray-400">{entry.detail}</p>
            </div>
          {/each}
        </div>
      </div>

      <Card>
        <div>
          <p class="text-xs uppercase tracking-[0.4em] text-[#f97316]">
            Ready to build?
          </p>
          <h3 class="mt-4 text-3xl font-semibold">
            Drop Ditto into your Worker and start orchestrating LLMs.
          </h3>
          <p class="mt-4 text-sm text-gray-300">
            Ship from the edge. Merge every response with proof you can log.
          </p>
        </div>
        <div class="mt-8 flex flex-wrap gap-4">
          <a
            href="/docs"
            class="rounded-full bg-white px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:bg-gray-100"
            >Read Docs</a
          >
          <a
            href="https://github.com/acoyfellow/ditto"
            target="_blank"
            rel="noreferrer"
            class="rounded-full border border-white px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white hover:text-black"
            >GitHub</a
          >
        </div>
      </Card>
    </section>
  </main>

  <footer class="border-t border-[#1f1f1f]">
    <div
      class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs uppercase tracking-[0.35em] text-gray-500"
    >
      <span>Ditto © 2025</span>
      <span
        >Built for the Cloudflare ecosystem by <a
          href="https://github.com/acoyfellow"
          target="_blank"
          rel="noreferrer"
          class="text-[#f97316] hover:underline">acoyfellow</a
        ></span
      >
    </div>
  </footer>
</div>
