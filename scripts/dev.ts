#!/usr/bin/env bun
import { watch } from "node:fs";
import { join, resolve } from "node:path";
import { root, renderPage } from "./site/index";

const port = Number(process.env.PORT ?? 8000);
const genEntry = join(root, "index.gen.html");

async function regenerate() {
  let html: string;
  try {
    html = await renderPage();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    html = `<pre>Render failed: ${message}</pre>`;
  }
  // Запись gen-файла триггерит и dev-reload, и рестарт bun --watch —
  // пропускаем, если контент не изменился.
  const prev = await Bun.file(genEntry).text().catch(() => null);
  if (prev !== html) await Bun.write(genEntry, html);
}

await regenerate();

// index.html и projects.yml читаются через Bun.file — в графе модулей их нет,
// поэтому следим за ними сами. Остальное (src/, public/, сам gen-файл)
// отслеживает dev-сервер Bun: css — горячая замена, html/js/ассеты — reload.
let timer: Timer | null = null;
watch(root, (_event, filename) => {
  if (filename !== "index.html" && filename !== "projects.yml") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(regenerate, 80);
});

const server = Bun.serve({
  hostname: "0.0.0.0",
  port,
  development: true,
  routes: { "/": (await import("../index.gen.html")).default },
  async fetch(req) {
    const path = decodeURIComponent(new URL(req.url).pathname);
    const file = resolve(root, `.${path}`);
    if (!file.startsWith(root)) return new Response("Forbidden", { status: 403 });
    if (await Bun.file(file).exists()) return new Response(Bun.file(file));
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Dev server → http://localhost:${server.port} (Bun HMR)`);
