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
// Pixeldrain /u/ links are HTML pages. We need the raw file API.
if (targetUrl.includes("pixeldrain.com/u/")) {
  targetUrl = targetUrl.replace("/u/", "/api/file/");
}
// -----------------------------------

// 4. Prepare Headers for Upstream
const headers = new Headers();
const range = request.headers.get("Range");
if (range) headers.set("Range", range);

// Header Spoofing (Crucial for FSL, AWS, and Signed CDNs)
try {
  const targetUrlObj = new URL(targetUrl);
  headers.set("Referer", targetUrlObj.origin);
  headers.set("Origin", targetUrlObj.origin);
  headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
} catch (e) {
  // If URL is invalid (e.g., relative path entered by user), fail gracefully
  return new Response(JSON.stringify({ error: "Invalid URL format" }), { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
}

try {
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: headers,
    redirect: "follow",
  });

  // 5. Detect Content Type
  const contentType = response.headers.get("Content-Type") || "";

  // --- ADVANCED: HLS (.m3u8) REWRITER ---
  // If the content is an HLS playlist, we must rewrite the internal links
  // so the browser asks the Proxy for the segments, not the original server directly.
  if (
    contentType.includes("application/vnd.apple.mpegurl") ||
    contentType.includes("application/x-mpegURL") ||
    targetUrl.endsWith(".m3u8")
  ) {
    const text = await response.text();
    
    // Rewrite logic: Find every URI line in the m3u8 and wrap it with our proxy
    const newText = text.replace(/^(?!#).+$/gm, (line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return "";

      // Resolve relative paths (e.g., "segment1.ts" -> "https://example.com/segment1.ts")
      const absoluteUrl = new URL(trimmedLine, targetUrl!).toString();
      
      // Return the proxied URL
      return `${workerBaseUrl}?url=${encodeURIComponent(absoluteUrl)}`;
    });

    return new Response(newText, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "*",
        "Cache-Control": "no-cache" // Playlists shouldn't be cached long
      }
    });
  }
  // ---------------------------------------

  // 6. Standard Binary Stream (MP4, MKV, Segments)
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Access-Control-Expose-Headers", "*");
  
  // Cleanup security headers to allow embedding
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
