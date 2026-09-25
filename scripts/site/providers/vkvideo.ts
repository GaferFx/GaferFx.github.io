import { fetchJson, USER_AGENT } from "../net";
import { ratio, type Provider, type ThumbnailSource } from "./types";

type VkVideoItem = {
    title?: string;
    width?: number;
    height?: number;
    image?: { url: string; width: number }[];
    first_frame?: { url: string; width: number }[];
};

// Вырезает JSON-массив/объект по маркеру, балансируя скобки с учётом строк.
function extractJson(page: string, marker: string): unknown {
    const start = page.indexOf(marker);
    if (start < 0) return undefined;
    let i = start + marker.length;
    while (page[i] === " " || page[i] === "\t" || page[i] === "\n") i++;
    if (page[i] !== "[" && page[i] !== "{") return undefined;
    const begin = i;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (; i < page.length; i++) {
        const c = page[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (c === "\\") escaped = true;
        else if (c === '"') inString = !inString;
        else if (!inString) {
            if (c === "[" || c === "{") depth++;
            else if (c === "]" || c === "}") {
                if (--depth === 0) {
                    try {
                        return JSON.parse(page.slice(begin, i + 1));
                    } catch {
                        return undefined;
                    }
                }
            }
        }
    }
    return undefined;
}

// Ответ video.get бывает зашит прямо в страницу: window.cur.apiPrefetchCache.
function itemFromPrefetch(page: string): VkVideoItem | undefined {
    const cache = extractJson(page, '"apiPrefetchCache":');
    if (!Array.isArray(cache)) return undefined;
    for (const entry of cache as { method?: string; response?: { items?: VkVideoItem[] } }[]) {
        if (entry?.method === "video.get") return entry.response?.items?.[0];
    }
    return undefined;
}

// У VK нет публичного oEmbed без токена, но embed-страница либо содержит ответ
// video.get в apiPrefetchCache, либо отдаёт анонимный webToken для вызова API.
// Страница флаки: часто шлёт 302 с set-cookie, а повторный запрос уже с кукой
// отдаёт shell. На autologin-редиректы не подписываемся — redirect:manual.
async function vkMeta(oid: string, id: string): Promise<VkVideoItem | undefined> {
    const embedUrl = `https://vkvideo.ru/video_ext.php?oid=${oid}&id=${id}`;
    let cookie = "";
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const res = await fetch(embedUrl, {
                headers: { "User-Agent": USER_AGENT, ...(cookie && { Cookie: cookie }) },
                redirect: "manual",
                signal: AbortSignal.timeout(10000),
            });
            const setCookies = res.headers.getSetCookie?.() ?? [];
            if (setCookies.length) cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
            if (!res.ok) continue;
            const page = await res.text();
            const prefetched = itemFromPrefetch(page);
            if (prefetched) return prefetched;
            const token = /"access_token":"(anonym\.[^"]+)"/.exec(page)?.[1];
            if (!token) continue;
            const data = await fetchJson<{ response?: { items?: VkVideoItem[] } }>(
                `https://api.vkvideo.ru/method/video.get?videos=${oid}_${id}&access_token=${token}&v=5.199`,
            );
            if (data) return data.response?.items?.[0];
        } catch {}
    }
    return undefined;
}

function vkThumbnail(item: VkVideoItem | undefined): ThumbnailSource | undefined {
    const frames = item?.image?.length ? item.image : item?.first_frame;
    const best = frames?.reduce((a, b) => (b.width > a.width ? b : a));
    return best ? { src: best.url, download: true } : undefined;
}

export const vkvideo: Provider = {
    name: "vkvideo",
    logo: [24, 24, "_--vk-video"],
    match: (host) =>
        ["vk.com", "vk.ru", "vkvideo.ru"].includes(host) || host.endsWith(".vk.com") || host.endsWith(".vkvideo.ru"),
    async resolve(url) {
        let oid: string | undefined;
        let id: string | undefined;
        if (url.pathname.includes("video_ext.php")) {
            oid = url.searchParams.get("oid") ?? undefined;
            id = url.searchParams.get("id") ?? undefined;
        } else {
            // video-19793516_456241533, clip-19793516_456241533, z=video… в параметре
            const m = /(?:video|clip)(-?\d+)_(\d+)/.exec(`${url.pathname} ${url.searchParams.get("z") ?? ""}`);
            oid = m?.[1];
            id = m?.[2];
        }
        if (!oid || !id) return null;
        const item = await vkMeta(oid, id);
        return {
            id: `${oid}_${id}`,
            title: item?.title,
            embed: `https://vkvideo.ru/video_ext.php?oid=${oid}&id=${id}&hd=2&autoplay=1`,
            aspectRatio: ratio(item?.width, item?.height),
            thumbnail: vkThumbnail(item),
        };
    },
};
