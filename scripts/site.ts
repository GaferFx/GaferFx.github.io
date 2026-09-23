import { resolve } from "node:path";

export const root = resolve(import.meta.dir, "..");
export const templatePath = resolve(root, "index.html");
export const projectsPath = resolve(root, "projects.yml");
export const MARKER = "<!--PROJECTS-->";
export const YEAR_MARKER = "{{BUILD_YEAR}}";

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

export async function loadProjects(): Promise<Project[]> {
  const yaml = await Bun.file(projectsPath).text();
  return normalize(Bun.YAML.parse(yaml));
}

const providerLogos: Record<string, string> = {
  youtube: '<svg viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg" focusable="false"><rect width="28" height="20" rx="5" fill="#FF0033"/><path d="M11 5.5 19 10l-8 4.5z" fill="#fff"/></svg>',
  vkvideo: "<strong>VK</strong>",
  vimeo: "<strong>V</strong>",
  rutube: "<strong>R</strong>",
  twitch: "<strong>Tw</strong>",
  dailymotion: "<strong>D</strong>",
  browser: '<span aria-hidden="true">↗</span>',
};

function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]!);
}

function providerIdFromUrl(url: string, provider: string): string {
  try {
    const parsed = new URL(url);
    if (provider === "youtube") return parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop() || "";
    if (["vimeo", "rutube", "dailymotion"].includes(provider)) return parsed.pathname.split("/").filter(Boolean).pop() || "";
    return "";
  } catch { return ""; }
}

const EMBED_PROVIDERS = new Set(["youtube", "vimeo", "rutube"]);

function renderProject(project: Project): string {
  if (project.hidden) return "";
  const provider = project.provider || (project.image ? "image" : "browser");
  const isImage = provider === "image" || (!project.url && project.image);
  const videoId = isImage ? "" : providerIdFromUrl(project.url, provider);
  const canEmbed = !isImage && project.embed && EMBED_PROVIDERS.has(provider) && !!videoId;
  const isLink = !canEmbed && !!project.url;
  const interactive = canEmbed || isLink;
  const providerLogo = providerLogos[provider] || providerLogos.browser;
  const youtubeImage = provider === "youtube" && videoId ? `https://i.ytimg.com/vi/${videoId}` : "";
  const image = project.thumbnail || (youtubeImage ? `${youtubeImage}/hqdefault.jpg` : "");
  const autoThumbnail = youtubeImage && image === `${youtubeImage}/hqdefault.jpg`;
  const background = !image
    ? ""
    : (autoThumbnail
        ? `image-set(url('${youtubeImage}/maxresdefault.jpg') 2x, url('${youtubeImage}/sddefault.jpg') 1.5x, url('${image}') 1x)`
        : `url('${image}')`);
  const title = escapeHtml(project.title);
  const tag = canEmbed ? "button" : (isLink ? "a" : "div");
  const attributes = (canEmbed
    ? `type="button" data-provider="${escapeHtml(provider)}" data-video-id="${escapeHtml(videoId)}"`
    : (isLink ? `href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer"` : "")) +
    (background ? ` style="--project-bg: ${background}"` : "");
  const badge = isImage ? "" : `<span class="provider-badge" aria-hidden="true">${providerLogo}</span>`;
  const heading = interactive
    ? `<span class="project-title" role="heading" aria-level="3">${title}</span>`
    : `<h3 class="project-title">${title}</h3>`;
  return `<${tag} class="project" ${attributes}><span class="project-media"><img src="${escapeHtml(image)}" alt="${interactive ? "" : title}" loading="lazy">${badge}</span>${heading}</${tag}>`;
}

export async function renderPage(): Promise<string> {
  const [template, projects] = await Promise.all([
    Bun.file(templatePath).text(),
    loadProjects(),
  ]);
  if (!template.includes(MARKER)) throw new Error(`index.html is missing the ${MARKER} marker`);
  return template
    .replace(MARKER, () => projects.map(renderProject).join("\n"))
    .replaceAll(YEAR_MARKER, String(new Date().getFullYear()));
}
