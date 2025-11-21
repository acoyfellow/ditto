import { query, command, getRequestEvent } from '$app/server';
import { callWorkerJSON } from '$lib/worker-client';
import type { MergedStructuredResult, DittoTimings } from "ditto-ai";

// Example query function (no auth required)
// TODO: Replace with your actual query functions
export const getHello = query('unchecked', async (): Promise<{ message: string; timestamp: string }> => {
  const platform = getRequestEvent().platform;

  try {
    // Example: Call your Durable Object
    return await callWorkerJSON<{ message: string; timestamp: string }>(platform, '/api/storage/hello');
  } catch (err) {
    console.error('Failed to get hello:', err);
    return {
      message: 'Hello from your remote app!',
      timestamp: new Date().toISOString()
    };
  }
});

// Example command function (requires authentication)
// TODO: Replace with your actual command functions
export const setMessage = command('unchecked', async (message: string): Promise<{ success: boolean; message: string }> => {
  const platform = getRequestEvent().platform;
  const event = getRequestEvent();

  // Check if user is authenticated
  if (!event.locals.session) {
    throw new Error('Please sign in to set messages');
  }

  try {
    // Example: Call your Durable Object with POST
    return await callWorkerJSON<{ success: boolean; message: string }>(
      platform,
      '/api/storage/message',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: message })
      }
    );
  } catch (err) {
    console.error('Failed to set message:', err);
    throw new Error('Unable to set message. Please try again.');
  }
});

// Ditto LLM orchestration
export const runDitto = query(
  "unchecked",
  async ({
    prompt,
    models,
    strategy,
  }: {
    prompt: string;
    models: string[];
    strategy?: "consensus" | "cooperative";
  }): Promise<{ result: string; responses?: Record<string, string>; structured?: MergedStructuredResult; timings?: DittoTimings }> => {
    const platform = getRequestEvent().platform;

    return await callWorkerJSON<{ result: string; responses?: Record<string, string>; structured?: MergedStructuredResult; timings?: DittoTimings }>(
      platform,
      "/llm",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, models, strategy }),
      }
    );
  }
);
