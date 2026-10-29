import { realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

const portValue = Number(process.env.PORT ?? 3000);
const port = Number.isInteger(portValue) && portValue >= 0 && portValue <= 65535
  ? portValue
  : 3000;
const defaultBaseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${port}`;
const baseUrl = (process.env.BASE_URL || defaultBaseUrl).replace(/\/+$/, "");
const publicRoot = process.env.PUBLIC_DIR ? resolve(process.env.PUBLIC_DIR) : null;
const links = new Map();
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function createCode() {
  let code = "";
  while (code.length < 6) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const byte of bytes) {
      if (byte < 248) code += alphabet[byte % alphabet.length];
      if (code.length === 6) break;
    }
  }
  return code;
}

function uniqueCode() {
  let code;
  do {
    code = createCode();
  } while (links.has(code));
  return code;
}

function isOutsideDirectory(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === ".."
    || pathFromRoot.startsWith(`..${sep}`)
    || isAbsolute(pathFromRoot);
}

async function staticResponse(pathname) {
  if (!publicRoot) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const candidate = resolve(publicRoot, `.${requestedPath}`);
  if (isOutsideDirectory(publicRoot, candidate)) return null;

  try {
    const [resolvedRoot, resolvedCandidate] = await Promise.all([
      realpath(publicRoot),
      realpath(candidate),
    ]);
    if (isOutsideDirectory(resolvedRoot, resolvedCandidate)) return null;
    if (!(await stat(resolvedCandidate)).isFile()) return null;

    return new Response(Bun.file(resolvedCandidate), {
      headers: {
        ...corsHeaders,
        "Content-Type": mimeTypes[extname(resolvedCandidate).toLowerCase()] ?? "application/octet-stream",
      },
    });
  } catch {
    return null;
  }
}

Bun.serve({
  port,
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/api/links") {
      if (request.method === "GET") {
        return jsonResponse([...links.values()]);
      }

      if (request.method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        if (typeof body?.url !== "string") {
          return jsonResponse({ error: "url must be an HTTP or HTTPS URL" }, 400);
        }

        let target;
        try {
          target = new URL(body.url.trim());
        } catch {
          return jsonResponse({ error: "url must be an HTTP or HTTPS URL" }, 400);
        }

        if (target.protocol !== "http:" && target.protocol !== "https:") {
          return jsonResponse({ error: "url must be an HTTP or HTTPS URL" }, 400);
        }

        const code = uniqueCode();
        const link = {
          code,
          url: target.href,
          shortUrl: `${baseUrl}/${code}`,
          hits: 0,
          createdAt: new Date().toISOString(),
        };
        links.set(code, link);
        return jsonResponse(link, 201);
      }

      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (request.method === "GET") {
      const fileResponse = await staticResponse(pathname);
      if (fileResponse) return fileResponse;

      const match = pathname.match(/^\/([^/]+)$/);
      if (match) {
        const link = links.get(match[1]);
        if (link) {
          link.hits += 1;
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, Location: link.url },
          });
        }
      }
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
});

console.log(`Snip backend listening on http://localhost:${port}`);
