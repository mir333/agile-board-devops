const PROXY_PORT = 3001;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Azure-Pat, X-Azure-Org",
    "Access-Control-Max-Age": "86400",
  };
}

const server = Bun.serve({
  port: PROXY_PORT,
  async fetch(req) {
    const origin = req.headers.get("Origin");
    const cors = corsHeaders(origin);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok" }, { headers: cors });
    }

    // Only proxy /api/devops/* paths
    if (!url.pathname.startsWith("/api/devops/")) {
      return Response.json({ error: "Not found" }, { status: 404, headers: cors });
    }

    // Extract Azure DevOps credentials from custom headers
    const pat = req.headers.get("X-Azure-Pat");
    const org = req.headers.get("X-Azure-Org");

    if (!pat || !org) {
      return Response.json(
        { error: "Missing X-Azure-Pat or X-Azure-Org headers" },
        { status: 400, headers: cors },
      );
    }

    // Build the Azure DevOps URL
    const azurePath = url.pathname.replace("/api/devops", "");
    const azureUrl = `${org}${azurePath}${url.search}`;

    try {
      const authHeader = `Basic ${btoa(`:${pat}`)}`;

      const azureResponse = await fetch(azureUrl, {
        method: req.method,
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: req.method === "POST" ? await req.text() : undefined,
      });

      const data = await azureResponse.text();

      return new Response(data, {
        status: azureResponse.status,
        headers: {
          ...cors,
          "Content-Type": azureResponse.headers.get("Content-Type") || "application/json",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown proxy error";
      return Response.json({ error: `Proxy error: ${message}` }, { status: 502, headers: cors });
    }
  },
});

console.log(`Azure DevOps proxy running on http://localhost:${PROXY_PORT}`);
