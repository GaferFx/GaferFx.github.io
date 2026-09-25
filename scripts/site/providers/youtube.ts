import { fetchJson } from "../net";
import { ratio, type Provider } from "./types";

type YoutubeOembed = {
    title?: string;
    width?: number;
    height?: number;
};

export const youtube: Provider = {
    name: "youtube",
    logo: [256, 180, "logos--youtube-icon"],
    match: (host) =>
        ["youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host) || host.endsWith(".youtube.com"),
    async resolve(url) {
        const segments = url.pathname.split("/").filter(Boolean);
        const id =
            url.searchParams.get("v") ??
            (url.hostname.replace(/^www\./, "") === "youtu.be"
                ? segments[0]
                : /^(?:embed|shorts|live|v)\/([\w-]+)$/.test(segments.join("/"))
                ? segments[1]
                : undefined);
        if (!id) return null;
        const base = `https://i.ytimg.com/vi/${id}`;
        // oembed отдаёт реальный aspect — в т.ч. вертикальный у Shorts
        const meta = await fetchJson<YoutubeOembed>(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
        );
        return {
            id,
            embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
            title: meta?.title,
            aspectRatio: ratio(meta?.width, meta?.height),
            thumbnail: {
                src: `${base}/hqdefault.jpg`,
                srcSet: [
                    [`${base}/maxresdefault.jpg`, 2],
                    [`${base}/sddefault.jpg`, 1.5],
                    [`${base}/hqdefault.jpg`, 1],
                ],
            },
        };
    },
};
