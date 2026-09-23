#!/usr/bin/env bun
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const source = resolve(root, "projects.yml");
const output = resolve(root, "projects.json");

type RawProject = {
  url?: unknown;
  image?: unknown;
  title?: unknown;
  provider?: unknown;
  thumbnail?: unknown;
  embed?: unknown;
  hidden?: unknown;
};

type Project = {
  url: string;
  image: string;
  title: string;
  provider: string;
  thumbnail: string;
  embed: boolean;
  hidden: boolean;
};

function detectProvider(url: string): string {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  if (["youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host) || host.endsWith(".youtube.com")) return "youtube";
  if (["vk.com", "vk.ru", "vkvideo.ru"].includes(host) || host.endsWith(".vk.com")) return "vkvideo";
  if (host === "vimeo.com" || host.endsWith(".vimeo.com")) return "vimeo";
  if (host === "rutube.ru" || host.endsWith(".rutube.ru")) return "rutube";
  if (host === "twitch.tv" || host.endsWith(".twitch.tv")) return "twitch";
  if (host === "dailymotion.com" || host.endsWith(".dailymotion.com")) return "dailymotion";
  return "browser";
}

function youtubeThumbnail(url: string): string {
  const parsed = new URL(url);
  const id = parsed.searchParams.get("v") || (parsed.hostname === "youtu.be" ? parsed.pathname.split("/").filter(Boolean)[0] : "");
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalize(records: unknown): Project[] {
  if (!Array.isArray(records)) throw new Error("projects.yml must contain a top-level list");
  return records.map((value: RawProject, index) => {
    if (!value || typeof value !== "object") throw new Error(`Project #${index + 1} must be an object`);
    const url = String(value.url ?? "").trim();
    const image = String(value.image ?? "").trim();
    const title = String(value.title ?? "").trim();
    if ((!url && !image) || !title) throw new Error(`Project #${index + 1} must contain title and either url or image`);
    if (url) {
      try { new URL(url); } catch { throw new Error(`Project #${index + 1} has an invalid URL: ${url}`); }
    }
    const provider = String(value.provider ?? (url ? detectProvider(url) : "image")).trim().toLowerCase();
    return {
      url,
      image,
      title,
      provider,
      thumbnail: String(value.thumbnail ?? (image || (provider === "youtube" ? youtubeThumbnail(url) : ""))),
      embed: asBoolean(value.embed, Boolean(url)),
      hidden: asBoolean(value.hidden, false),
    };
  });
}

try {
  const yaml = await Bun.file(source).text();
  const projects = normalize(Bun.YAML.parse(yaml));
  await mkdir(dirname(output), { recursive: true });
  await Bun.write(output, `${JSON.stringify(projects, null, 2)}\n`);
  console.log(`Built ${projects.length} projects → projects.json`);
} catch (error) {
  console.error(`build-projects: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
