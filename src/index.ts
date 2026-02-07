export interface Env {}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestUrl = new URL(request.url);
    const workerBaseUrl = `${requestUrl.protocol}//${requestUrl.host}${requestUrl.pathname}`;

    // 1. Handle CORS Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Range, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 2. Health Check
    if (requestUrl.pathname === "/health") {
      return new Response("OK", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // 3. Get and Validate Target URL
    let targetUrl = requestUrl.searchParams.get("url");

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url' query parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // --- SPECIAL HANDLER: Pixeldrain ---
    if (targetUrl.includes("pixeldrain.com/u/")) {
      targetUrl = targetUrl.replace("/u/", "/api/file/");
    }

    // 4. Prepare Headers for Upstream
    const headers = new Headers();
    const range = request.headers.get("Range");
    if (range) headers.set("Range", range);

    try {
      const targetUrlObj = new URL(targetUrl);
      headers.set("Referer", targetUrlObj.origin);
      headers.set("Origin", targetUrlObj.origin);
      headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        redirect: "follow",
      });

      const contentType = response.headers.get("Content-Type") || "";

      // 5. HLS (.m3u8) REWRITER
      if (
        contentType.includes("application/vnd.apple.mpegurl") ||
        contentType.includes("application/x-mpegURL") ||
        targetUrl.endsWith(".m3u8")
      ) {
        const text = await response.text();
        
        const newText = text.replace(/^(?!#).+$/gm, (line) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return "";
          const absoluteUrl = new URL(trimmedLine, targetUrl!).toString();
          return `${workerBaseUrl}?url=${encodeURIComponent(absoluteUrl)}`;
        });

        return new Response(newText, {
          status: response.status,
          headers: {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "*",
            "Cache-Control": "no-cache"
          }
        });
      }

      // 6. Standard Binary Stream
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Expose-Headers", "*");
      newHeaders.delete("X-Frame-Options");
      newHeaders.delete("Content-Security-Policy");
      newHeaders.delete("X-Content-Type-Options");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });

    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Stream Failed", details: e.message }), {
        status: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
