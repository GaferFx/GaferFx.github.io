#!/usr/bin/env bun
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { root, renderPage } from "./site";

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

  const bundledHtml = resolve(dist, "index.build.html");
  await Bun.write(resolve(dist, "index.html"), minifyHtml(await Bun.file(bundledHtml).text()));
  await rm(bundledHtml);

  for (const output of result.outputs) console.log(`  ${output.path.replace(`${root}/`, "")}`);
  console.log(`Built site → dist/`);
} catch (error) {
  await rm(genEntry, { force: true });
  console.error(`build: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
