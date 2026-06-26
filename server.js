import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const ACCESS_CODE = process.env.ACCESS_CODE || "1462";
const PUBLIC_DIR = resolve(__dirname, "public");
const MANUSCRIPT_PATH = resolve(
  __dirname,
  "Freiburg Klara Faller",
  "MANUSCRIPT.md",
);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".ico", "image/x-icon"],
]);

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    ...headers,
  });
  res.end(body);
}

function sendJson(res, statusCode, payload) {
  send(res, statusCode, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
}

async function readRequestJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 4096) {
      throw new Error("Request body too large");
    }
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function extractHeadings(markdown) {
  return markdown
    .split("\n")
    .map((line, index) => {
      const match = /^(#{1,3})\s+(.+)$/.exec(line.trim());
      if (!match) return null;
      return {
        level: match[1].length,
        title: match[2],
        line: index + 1,
        id: match[2]
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      };
    })
    .filter(Boolean);
}

async function handleApi(req, res) {
  if (req.method !== "POST" || req.url !== "/api/manuscript") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  try {
    const body = await readRequestJson(req);
    if (String(body.code || "").trim() !== ACCESS_CODE) {
      sendJson(res, 401, { error: "Der Code ist nicht korrekt." });
      return;
    }

    const markdown = await readFile(MANUSCRIPT_PATH, "utf8");
    sendJson(res, 200, {
      title: "Tod zwischen Kräutern",
      subtitle: "Arbeitsfassung Romanmanuskript",
      markdown,
      headings: extractHeadings(markdown),
    });
  } catch (error) {
    sendJson(res, 500, {
      error: "Das Manuskript konnte nicht geladen werden.",
    });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const decodedPath = decodeURIComponent(requestedPath);
  const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  try {
    const body = await readFile(filePath);
    const type = contentTypes.get(extname(filePath)) || "application/octet-stream";
    send(res, 200, body, {
      "Content-Type": type,
      "Cache-Control": type.startsWith("text/html")
        ? "no-store"
        : "public, max-age=3600",
    });
  } catch {
    const indexHtml = await readFile(join(PUBLIC_DIR, "index.html"));
    send(res, 404, indexHtml, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
  }
}

const server = createServer((req, res) => {
  if ((req.url || "").startsWith("/api/")) {
    void handleApi(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method not allowed", {
      "Content-Type": "text/plain; charset=utf-8",
    });
    return;
  }

  void serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Manuskript-Webseite laeuft auf http://localhost:${PORT}`);
});
