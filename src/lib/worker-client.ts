import { dev } from '$app/environment';

// Helper function to call your Durable Object via the worker
// In development: HTTP calls to localhost:1337
// In production: Service binding (no network latency)
async function callWorker(
  platform: App.Platform | undefined,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  if (dev) {
    // Development: HTTP call to local worker (port 1338 for main worker, 1337 is model-runner)
    return fetch(`http://localhost:1338${endpoint}`, options);
  }

  // Production: Service binding
  if (platform?.env?.WORKER) {
    const url = `http://worker${endpoint}`;
    const requestInit: RequestInit = {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      ...options,
    };
    return platform.env.WORKER.fetch(new Request(url, requestInit));
  }

  // Fallback: direct fetch (for browser)
  return fetch(endpoint, options);
}

export async function callWorkerJSON<T>(
  platform: App.Platform | undefined,
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await callWorker(platform, endpoint, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Service error');
      let errorMessage = `Service error (${response.status}): ${errorText}`;
      try {
        const errorBody = JSON.parse(errorText);
        errorMessage = errorBody.error?.message || errorMessage;
      } catch {
        // If JSON parsing fails, fall back to the raw error text
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Service temporarily unavailable. Please try again.');
    }
    throw error;
  }
}

