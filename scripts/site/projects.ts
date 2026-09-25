import { projectsPath } from "./config";
import { detectProvider } from "./providers";

type RawProject = {
    url?: unknown;
    image?: unknown;
    title?: unknown;
    provider?: unknown;
    thumbnail?: unknown;
    embed?: unknown;
    hidden?: unknown;
    "aspect-ratio"?: unknown;
};

export type Project = {
    url: string;
    image: string;
    title: string;
    provider: string;
    thumbnail: string;
    embed: boolean;
    hidden: boolean;
    /** Ручной override; без него ratio вычисляется из метаданных/картинки */
    aspectRatio?: string;
};

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
        if (!url && !image) throw new Error(`Project #${index + 1} must contain url or image`);
        // Без url название неоткуда подтянуть — оно обязательно.
        if (!url && !title) throw new Error(`Project #${index + 1} must contain title`);
        if (url) {
            try {
                new URL(url);
            } catch {
                throw new Error(`Project #${index + 1} has an invalid URL: ${url}`);
            }
        }
        return {
            url,
            image,
            title,
            provider: String(value.provider ?? (url ? detectProvider(url) : "image")).trim().toLowerCase(),
            thumbnail: String(value.thumbnail ?? "").trim(),
            embed: asBoolean(value.embed, Boolean(url)),
            hidden: asBoolean(value.hidden, false),
            aspectRatio: value["aspect-ratio"] == null ? undefined : String(value["aspect-ratio"]),
        };
    });
}

export async function loadProjects(): Promise<Project[]> {
    const yaml = await Bun.file(projectsPath).text();
    return normalize(Bun.YAML.parse(yaml));
}
