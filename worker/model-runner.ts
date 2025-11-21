type Env = {
  AI: {
    run: (model: string, input: { prompt: string }) => Promise<{ response?: string }>;
  };
};

interface ModelRunRequest {
  model: string;
  prompt: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Only handle /run endpoint
    if (url.pathname !== "/run") {
      return jsonResponse(
        { error: { type: "NotFound", message: "Not found" } },
        404,
      );
    }

    if (request.method !== "POST") {
      return jsonResponse(
        { error: { type: "MethodNotAllowed", message: "Only POST is supported" } },
        405,
      );
    }

    let body: ModelRunRequest;
    try {
      const bodyText = await request.text();
      if (!bodyText) {
        return jsonResponse(
          { error: { type: "BadRequest", message: "Request body is required" } },
          400,
        );
      }
      body = JSON.parse(bodyText);
    } catch (error) {
      return jsonResponse(
        { error: { type: "BadRequest", message: "Invalid JSON body" } },
        400,
      );
    }

    if (!body || typeof body !== "object") {
      return jsonResponse(
        { error: { type: "BadRequest", message: "Invalid request body" } },
        400,
      );
    }

    if (!body.model || typeof body.model !== "string") {
      return jsonResponse(
        { error: { type: "BadRequest", message: "model is required" } },
        400,
      );
    }

    if (!body.prompt || typeof body.prompt !== "string") {
      return jsonResponse(
        { error: { type: "BadRequest", message: "prompt is required" } },
        400,
      );
    }

    try {
      const response = await env.AI.run(body.model, {
        prompt: body.prompt,
      });

      if (!response || !response.response) {
        throw new Error("Invalid response from Cloudflare AI");
      }

      return jsonResponse({ result: response.response });
    } catch (error: any) {
      return jsonResponse(
        {
          error: {
            type: "ModelError",
            message: error?.message ?? "Model execution failed",
          },
        },
        500,
      );
    }
  },
};

