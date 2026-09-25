import { fetchJson } from "../net";
import { ratio, type Provider } from "./types";

type DailymotionOembed = {
    title?: string;
    thumbnail_url?: string;
    width?: number;
    height?: number;
};

export const dailymotion: Provider = {
    name: "dailymotion",
    logo: [24, 24, "simple-icons--dailymotion"],
    match: (host) => host === "dai.ly" || host === "dailymotion.com" || host.endsWith(".dailymotion.com"),
    async resolve(url) {
        const segments = url.pathname.split("/").filter(Boolean);
        const id =
            url.hostname.replace(/^www\./, "") === "dai.ly"
                ? segments[0]
                : segments.find((s) => /^x[0-9a-z]+$/i.test(s));
        if (!id) return null;
        const meta = await fetchJson<DailymotionOembed>(
            `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(`https://www.dailymotion.com/video/${id}`)}&format=json`,
        );
        return {
            id,
            title: meta?.title,
            embed: `https://www.dailymotion.com/embed/video/${id}?autoplay=1`,
            aspectRatio: ratio(meta?.width, meta?.height),
            thumbnail: {
                src: meta?.thumbnail_url ?? `https://www.dailymotion.com/thumbnail/video/${id}`,
                download: true,
            },
        };
    },
};
