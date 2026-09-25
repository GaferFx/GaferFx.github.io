#!/usr/bin/env bun
import { readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { root, renderPage } from "./site/index";

const dist = resolve(root, "dist");
const genEntry = resolve(root, "index.build.html");

function minifyHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\n\s+/g, "\n")
    .trim() + "\n";
}

try {
  const html = await renderPage();
  await rm(dist, { recursive: true, force: true });
  await Bun.write(genEntry, html);

  const result = await Bun.build({
    entrypoints: [genEntry],
    outdir: dist,
    target: "browser",
    minify: true,
  });
  await rm(genEntry, { force: true });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }

  // Bun переписывает ссылки на ассеты в разметке, но не трогает url() в style-атрибутах —
  // подменяем public/... на файлы из dist, а недостающие докидываем туда сами.
  const distFiles = await readdir(dist);
  const rewriteAsset = async (rawPath: string): Promise<string> => {
    const rel = rawPath.replace(/^\.?\/+/, "");
    if (!rel.startsWith("public/")) return rawPath;
    const base = rel.split("/").pop() ?? rel;
    const dot = base.lastIndexOf(".");
    const hashed = distFiles.find(f => f.startsWith(`${base.slice(0, dot)}-`) && f.endsWith(base.slice(dot)));
    if (hashed) return `./${hashed}`;
    const source = resolve(root, rel);
    if (await Bun.file(source).exists()) {
    await Bun.write(resolve(dist, base), Bun.file(source));
    return `./${base}`;
    }
    return rawPath;
  };

  const bundledHtml = resolve(dist, "index.build.html");
  const bundled = await Bun.file(bundledHtml).text();
  const paths = new Set<string>();
  const addPath = (value: string | undefined) => { if (value) paths.add(value); };
  for (const m of bundled.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) addPath(m[2]);
  const rewritten = new Map<string, string>();
  for (const path of paths) rewritten.set(path, await rewriteAsset(path));

  const finalHtml = bundled
    .replace(/url\((['"]?)([^'")]+)\1\)/g, (_m, _q, url: string) => `url('${rewritten.get(url) ?? url}')`);
  await Bun.write(resolve(dist, "index.html"), minifyHtml(finalHtml));
  await rm(bundledHtml);

  for (const output of result.outputs) console.log(`  ${output.path.replace(`${root}/`, "")}`);
  console.log(`Built site → dist/`);
} catch (error) {
  await rm(genEntry, { force: true });
  if (error instanceof AggregateError) {
    for (const entry of error.errors) console.error(`  ${entry}`);
  } else {
    console.error(error instanceof Error ? error.stack : error);
  }
  process.exit(1);
}
