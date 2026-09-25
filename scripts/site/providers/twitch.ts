import type { Provider } from "./types";

// Twitch не отдаёт превью без API-токена — только эмбед.
// "{host}" в parent подставляется на клиенте (location.hostname).
export const twitch: Provider = {
    name: "twitch",
    logo: [2400, 2800, "thesvg-color--twitch"],
    match: (host) => host === "twitch.tv" || host.endsWith(".twitch.tv"),
    resolve(url) {
        const host = url.hostname.replace(/^www\./, "");
        const segments = url.pathname.split("/").filter(Boolean);
        if (host === "clips.twitch.tv" && segments[0]) {
            return {
                id: `clip-${segments[0]}`,
                embed: `https://clips.twitch.tv/embed?clip=${segments[0]}&parent={host}&autoplay=true`,
            };
        }
        const clipIndex = segments.indexOf("clip");
        if (clipIndex >= 0 && segments[clipIndex + 1]) {
            const slug = segments[clipIndex + 1];
            return {
                id: `clip-${slug}`,
                embed: `https://clips.twitch.tv/embed?clip=${slug}&parent={host}&autoplay=true`,
            };
        }
        const videoIndex = segments.indexOf("videos");
        const videoId = videoIndex >= 0 ? segments[videoIndex + 1] : segments[0] === "videos" ? segments[1] : undefined;
        if (videoId && /^\d+$/.test(videoId)) {
            return {
                id: videoId,
                embed: `https://player.twitch.tv/?video=${videoId}&parent={host}&autoplay=true`,
            };
        }
        return null;
    },
};
