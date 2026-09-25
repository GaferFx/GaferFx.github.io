import { cachedVideo } from "./cache";
import type { Project } from "./projects";
import { getProvider, providerLogo, ratio } from "./providers";
import { downloadThumbnail, probeImage } from "./thumbnails";

export type ResolvedProject = {
    title: string;
    url: string;
    provider: string;
    isImage: boolean;
    /** URL для iframe-плеера; клик открывает модалку */
    embed: string | null;
    /** Финальный src превью ("" если нет) */
    image: string;
    /** CSS-значение для --project-bg ("" если нет) */
    background: string;
    aspectRatio: string;
};

function escapeHtml(value: unknown): string {
    return String(value).replace(
        /[&<>'"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]!,
    );
}

export async function resolveProject(project: Project): Promise<ResolvedProject | null> {
    if (project.hidden) return null;
    const provider = getProvider(project.provider);
    let video = null;
    if (project.url && provider?.resolve) {
        const resolve = provider.resolve;
        video = await cachedVideo(`${provider.name}|${project.url}`, () =>
            Promise.resolve(resolve(new URL(project.url))).catch(() => null),
        );
    }
    const embed = project.embed && video?.embed ? video.embed : null;

    // Приоритет превью: явный thumbnail > image > превью от провайдера
    const auto = video?.thumbnail;
    let image = project.thumbnail || project.image || auto?.src || "";
    const isAutoThumb = !!auto && image === auto.src;
    let background = "";
    if (auto?.srcSet?.length && isAutoThumb) {
        background = `image-set(${auto.srcSet.map(([u, d]) => `url('${u}') ${d}x`).join(", ")})`;
    } else if (image) {
        background = `url('${image}')`;
    }

    let downloaded: { width?: number; height?: number } | undefined;
    if (auto?.download && isAutoThumb) {
        const local = await downloadThumbnail(
            auto.src,
            `${project.provider}-${video?.id ?? Bun.hash(auto.src).toString(36)}`,
        );
        if (local) {
            image = local.path;
            background = `url('${local.path}')`;
            downloaded = local;
        }
    }

    // Приоритет ratio: ручной > метаданные провайдера > размеры скачанного превью
    // > размеры своей картинки. Remote-превью провайдеров не меряем:
    // у YouTube hqdefault всегда 480×360 с леттербоксингом.
    let aspectRatio = project.aspectRatio ?? video?.aspectRatio;
    if (!aspectRatio) {
        const dims = downloaded?.width ? downloaded : !isAutoThumb && image ? await probeImage(image) : null;
        aspectRatio ??= ratio(dims?.width, dims?.height);
    }

    // Фолбэки названия: метаданные провайдера → хост из url.
    // Без url title обязателен — проверяется в projects.ts.
    const title = project.title || video?.title || new URL(project.url).hostname.replace(/^www\./, "");

    return {
        title,
        url: project.url,
        provider: project.provider,
        isImage: project.provider === "image" || (!project.url && !!project.image),
        embed,
        image,
        background,
        aspectRatio: aspectRatio ?? "16 / 9",
    };
}

export function renderProject(project: ResolvedProject): string {
    const { title, url, provider, isImage, embed, image, background, aspectRatio } = project;
    const tag = embed ? "button" : url ? "a" : "div";
    const action = embed
        ? `type="button" data-embed="${escapeHtml(embed)}"`
        : url
        ? `href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"`
        : "";
    const style = `style="--project-img-ratio: ${aspectRatio}${background ? `; --project-bg: ${background}` : ""}"`;
    const attrs = [action, style].filter(Boolean).join(" ");
    const badge = isImage ? "" : `<span class="provider-badge" aria-hidden="true">${providerLogo(provider)}</span>`;
    const img = image
        ? `<img src="${escapeHtml(image)}" alt="${tag === "div" ? escapeHtml(title) : ""}" loading="lazy">`
        : "";
    const heading =
        tag === "div"
            ? `<h3 class="project-title">${escapeHtml(title)}</h3>`
            : `<span class="project-title" role="heading" aria-level="3">${escapeHtml(title)}</span>`;
    return `<${tag} class="project" ${attrs}><span class="project-media">${img}${badge}</span>${heading}</${tag}>`;
}
