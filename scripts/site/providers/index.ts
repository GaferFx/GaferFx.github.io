import { dailymotion } from "./dailymotion";
import { rutube } from "./rutube";
import { twitch } from "./twitch";
import type { Provider } from "./types";
import { vimeo } from "./vimeo";
import { vkvideo } from "./vkvideo";
import { youtube } from "./youtube";

export { ratio } from "./types";
export type { Provider, ResolvedVideo, ThumbnailSource } from "./types";

export const providers: Provider[] = [youtube, vkvideo, vimeo, rutube, twitch, dailymotion];

const FALLBACK_LOGO: [number, number, string] = [24, 24, "akar-icons--globe"];

export function detectProvider(url: string): string {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return providers.find((p) => p.match(host))?.name ?? "browser";
}

export function getProvider(name: string): Provider | undefined {
    return providers.find((p) => p.name === name);
}

export function providerLogo(name: string): string {
    const [width, height, symbol] = getProvider(name)?.logo ?? FALLBACK_LOGO;
    const em = Math.round((width / height) * 100) / 100;
    return `<svg width="${em}em" height="1em" viewBox="0 0 ${width} ${height}"><use href="#${symbol}"/></svg>`;
}
