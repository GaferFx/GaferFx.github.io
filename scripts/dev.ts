#!/usr/bin/env bun
import { watch } from "node:fs";
import { join, resolve } from "node:path";
import { root, renderPage } from "./site";

const port = Number(process.env.PORT ?? 8000);
const reloadSnippet = `<script>new EventSource("/__livereload").onmessage=()=>location.reload()</script>`;
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();

function sse(): Response {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      clients.add(c);
      c.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel() {
      clients.delete(controller);
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

let timer: Timer | null = null;
function notifyReload() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    for (const client of clients) {
      try { client.enqueue(encoder.encode("data: reload\n\n")); } catch { clients.delete(client); }
    }
  }, 80);
}

setInterval(() => {
  for (const client of clients) {
    try { client.enqueue(encoder.encode(": ping\n\n")); } catch { clients.delete(client); }
  }
}, 15000);

watch(join(root, "src"), { recursive: true }, notifyReload);
watch(join(root, "public"), { recursive: true }, notifyReload);
watch(root, (_event, filename) => {
  if (filename === "index.html" || filename === "projects.yml") notifyReload();
});

const server = Bun.serve({
  port,
  async fetch(req) {
    const path = decodeURIComponent(new URL(req.url).pathname);
    if (path === "/__livereload") return sse();
    if (path === "/" || path === "/index.html") {
      try {
        const html = (await renderPage()).replace("</body>", `${reloadSnippet}</body>`);
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new Response(`<pre>Render failed: ${message}</pre>`, {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }
    const file = resolve(root, `.${path}`);
    if (!file.startsWith(root)) return new Response("Forbidden", { status: 403 });
    if (await Bun.file(file).exists()) return new Response(Bun.file(file));
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Dev server → http://localhost:${server.port} (live reload on)`);
