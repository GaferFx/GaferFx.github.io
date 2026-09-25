import { fetchJson } from "../net";
import type { Provider } from "./types";

type RutubeMeta = {
    title?: string;
    thumbnail_url?: string;
};

export const rutube: Provider = {
    name: "rutube",
    logo: [132, 132, "_--rutube"],
    match: (host) => host === "rutube.ru" || host.endsWith(".rutube.ru"),
    async resolve(url) {
        const m = /(?:video|shorts|play\/embed)\/([0-9a-f]{32})/.exec(url.pathname);
        const id = m?.[1];
        if (!id) return null;
        const meta = await fetchJson<RutubeMeta>(`https://rutube.ru/api/video/${id}/`);
        return {
            id,
            title: meta?.title,
            embed: `https://rutube.ru/play/embed/${id}/?autoplay=1`,
            thumbnail: meta?.thumbnail_url ? { src: meta.thumbnail_url, download: true } : undefined,
        };
    },
};
