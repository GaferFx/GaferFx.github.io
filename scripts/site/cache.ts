import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { root } from "./config";
import type { Dimensions } from "./imageSize";
import type { ResolvedVideo } from "./providers";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_MS = 60 * 1000; // для частичных результатов (без превью)
const cachePath = resolve(root, ".cache", "site.json");

type Entry<T> = { t: number; v: T };
type SiteCache = {
    videos: Record<string, Entry<ResolvedVideo>>;
    probes: Record<string, Entry<Dimensions | null>>;
};

let data: SiteCache | null = null;
let loading: Promise<SiteCache> | null = null;
let dirty = false;

// Параллельные resolve дергают load одновременно — единый promise,
// иначе каждый создавал бы свой объект и записи терялись.
function load(): Promise<SiteCache> {
    if (data) return Promise.resolve(data);
    loading ??= Bun.file(cachePath)
        .json()
        .then((parsed: Partial<SiteCache>) => {
            data = { videos: parsed.videos ?? {}, probes: parsed.probes ?? {} };
            return data;
        })
        .catch(() => {
            data = { videos: {}, probes: {} };
            return data;
        });
    return loading;
}

function fresh<T>(entry: Entry<T> | undefined): entry is Entry<T> {
    return !!entry && Date.now() - entry.t < TTL_MS;
}

// null-результаты не персистим: временные сбои API перезапрашиваются сразу.
// А записи без превью (флаки API) живут минуту и перезапрашиваются.
export async function cachedVideo(key: string, fn: () => Promise<ResolvedVideo | null>): Promise<ResolvedVideo | null> {
    const cache = await load();
    const hit = cache.videos[key];
    if (hit && Date.now() - hit.t < (hit.v.thumbnail ? TTL_MS : RETRY_MS)) return hit.v;
    const v = await fn();
    if (v) {
        cache.videos[key] = { t: Date.now(), v };
        dirty = true;
    }
    return v;
}

export async function cachedProbe(src: string, fn: () => Promise<Dimensions | null>): Promise<Dimensions | null> {
    const cache = await load();
    const hit = cache.probes[src];
    if (fresh(hit)) return hit.v;
    const v = await fn();
    cache.probes[src] = { t: Date.now(), v };
    dirty = true;
    return v;
}

export async function saveCache(): Promise<void> {
    if (!dirty || !data) return;
    await mkdir(dirname(cachePath), { recursive: true });
    await Bun.write(cachePath, JSON.stringify(data));
    dirty = false;
}
