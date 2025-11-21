import { DurableObject } from 'cloudflare:workers';
import { DittoJob, createDittoWorkerHandler } from "ditto-ai/server";

type Env = {
  MY_DO: DurableObjectNamespace<MyDO>;
  DITTO_JOB: DurableObjectNamespace<DittoJob>;
  AI: {
    run: (model: string, input: { prompt: string }) => Promise<{ response?: string }>;
  };
};

// Original MyDO from remote template
export class MyDO extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const key = url.pathname.slice(1); // Remove leading slash

      if (request.method === 'GET') {
        // Get a value from storage
        const value = await this.ctx.storage.get(key);
        return Response.json({
          key,
          value: value || null,
          id: this.ctx.id.toString()
        });
      }

      if (request.method === 'POST') {
        // Set a value in storage
        const body = await request.json() as { value: any };
        await this.ctx.storage.put(key, body.value);
        return Response.json({
          key,
          value: body.value,
          id: this.ctx.id.toString()
        });
      }

      if (request.method === 'DELETE') {
        // Delete a key from storage
        await this.ctx.storage.delete(key);
        return Response.json({
          key,
          deleted: true,
          id: this.ctx.id.toString()
        });
      }

      return new Response('Method not allowed', { status: 405 });

    } catch (error) {
      console.error('Durable Object error:', error);
      return new Response(
        JSON.stringify({ error: 'Storage temporarily unavailable' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

// Export DittoJob from package
export { DittoJob };

const dittoHandler = createDittoWorkerHandler();

// Worker entry point - routes requests to your Durable Objects
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      // Route /llm to Ditto handler
      if (pathname === "/llm") {
        return dittoHandler.fetch(request, env, ctx);
      }

      // Route /api/storage/{key} to MyDO (original remote template behavior)
      if (pathname.startsWith('/api/storage/')) {
        const key = pathname.replace('/api/storage/', '');

        if (!key || key.length > 50) {
          return new Response('Invalid key', { status: 400 });
        }

        // Create or get existing Durable Object instance
        const id = env.MY_DO.idFromName(key);
        const doInstance = env.MY_DO.get(id);

        // Forward request to Durable Object
        return await doInstance.fetch(request);
      }

      return new Response("Not found", { status: 404 });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};
