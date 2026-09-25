import { mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cachedProbe } from "./cache";
import { root, thumbnailsDir } from "./config";
import { imageSize, type Dimensions } from "./imageSize";

const EXT_BY_MIME: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
};

export type LocalImage = { path: string; width?: number; height?: number };

function extensionOf(src: string, contentType: string | null): string {
    try {
        const fromPath = /\.(jpe?g|png|webp|gif|avif)$/i.exec(new URL(src).pathname)?.[0];
        if (fromPath) return fromPath;
    } catch {}
    return EXT_BY_MIME[contentType?.split(";")[0] ?? ""] ?? ".jpg";
}

function dimsOf(bytes: Uint8Array): { width?: number; height?: number } {
    return imageSize(bytes) ?? {};
}

async function cachedThumbnail(name: string): Promise<LocalImage | null> {
    const file = (await readdir(thumbnailsDir).catch(() => [] as string[])).find((f) => f.startsWith(`${name}.`));
    if (!file) return null;
    const bytes = new Uint8Array(await Bun.file(join(thumbnailsDir, file)).arrayBuffer());
    return { path: `./public/thumbnails/${file}`, ...dimsOf(bytes) };
}

/** Скачивает превью в public/thumbnails и возвращает путь + размеры; при ошибке — null. */
export async function downloadThumbnail(src: string, key: string): Promise<LocalImage | null> {
    const name = key.replace(/[^\w-]+/g, "_");
    try {
        const cached = await cachedThumbnail(name);
        if (cached) return cached;
        const res = await fetch(src, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) return null;
        const bytes = new Uint8Array(await res.arrayBuffer());
        const file = `${name}${extensionOf(src, res.headers.get("content-type"))}`;
        await mkdir(thumbnailsDir, { recursive: true });
        await Bun.write(join(thumbnailsDir, file), bytes);
        return { path: `./public/thumbnails/${file}`, ...dimsOf(bytes) };
    } catch {
        return null;
    }
}

/** Размеры пользовательской картинки: локальный путь из репо или remote URL. Кэш на диске. */
export function probeImage(src: string): Promise<Dimensions | null> {
    return cachedProbe(src, () => probe(src).catch(() => null));
}

async function probe(src: string): Promise<Dimensions | null> {
    if (/^https?:\/\//.test(src)) {
        const res = await fetch(src, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) return null;
        return imageSize(new Uint8Array(await res.arrayBuffer()));
    }
    const path = resolve(root, src.replace(/^\.?\/+/, ""));
    if (!path.startsWith(root)) return null;
    const file = Bun.file(path);
    if (!(await file.exists())) return null;
    return imageSize(new Uint8Array(await file.arrayBuffer()));
}
