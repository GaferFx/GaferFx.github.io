import { fetchJson } from "../net";
import { ratio, type Provider } from "./types";

type VimeoOembed = {
    title?: string;
    thumbnail_url?: string;
    width?: number;
    height?: number;
};

export const vimeo: Provider = {
    name: "vimeo",
    logo: [256, 223, "logos--vimeo-icon"],
    match: (host) => host === "vimeo.com" || host.endsWith(".vimeo.com"),
    async resolve(url) {
        const segments = url.pathname.split("/").filter(Boolean);
        const index = segments.findIndex((s) => /^\d+$/.test(s));
        if (index < 0) return null;
        const id = segments[index]!;
        // unlisted-видео: vimeo.com/{id}/{hash} — hash нужен и в embed
        const hash = segments[index + 1];
        const meta = await fetchJson<VimeoOembed>(
            `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}&width=1280`,
        );
        return {
            id,
            title: meta?.title,
            embed: `https://player.vimeo.com/video/${id}?autoplay=1${hash ? `&h=${hash}` : ""}`,
            aspectRatio: ratio(meta?.width, meta?.height),
            thumbnail: meta?.thumbnail_url ? { src: meta.thumbnail_url } : undefined,
        };
    },
};
