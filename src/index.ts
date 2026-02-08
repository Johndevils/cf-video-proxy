interface Env {
  RATELIMIT_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const clientIP = request.headers.get("cf-connecting-ip") || "anonymous";

    // 1. Rate Limiting Logic (100 req/min)
    const limitKey = `rl:${clientIP}`;
    const currentUsage = parseInt(await env.RATELIMIT_KV.get(limitKey) || "0");
    
    if (currentUsage >= 100) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" }
      });
    }
    await env.RATELIMIT_KV.put(limitKey, (currentUsage + 1).toString(), { expirationTtl: 60 });

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 2. Validation Endpoint
    if (url.pathname === "/api/validate" && request.method === "POST") {
      try {
        const { url: targetUrl } = await request.json() as { url: string };
        const res = await fetch(targetUrl, { method: "HEAD" });
        return new Response(JSON.stringify({
          success: true,
          accessible: res.ok,
          contentType: res.headers.get("content-type"),
          contentLength: res.headers.get("content-length"),
          supportsRanges: res.headers.get("accept-ranges") === "bytes"
        }), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders });
      }
    }

    // 3. Proxy Endpoint
    if (url.pathname === "/api/proxy") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) return new Response("Missing URL", { status: 400 });

      // Security: Block private IPs (simplified check)
      if (targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1")) {
        return new Response("Forbidden", { status: 403 });
      }

      const range = request.headers.get("Range");
      const proxyResponse = await fetch(targetUrl, {
        headers: { ...(range && { Range: range }) }
      });

      const newResponse = new Response(proxyResponse.body, proxyResponse);
      Object.entries(corsHeaders).forEach(([k, v]) => newResponse.headers.set(k, v));
      return newResponse;
    }

    return new Response("Not Found", { status: 404 });
  }
};
