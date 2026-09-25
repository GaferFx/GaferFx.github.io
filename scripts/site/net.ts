export const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

export async function fetchText(url: string, init?: RequestInit): Promise<string | null> {
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": USER_AGENT },
            signal: AbortSignal.timeout(10000),
            ...init,
        });
        return res.ok ? await res.text() : null;
    } catch {
        return null;
    }
}

export async function fetchJson<T = unknown>(url: string): Promise<T | null> {
    const text = await fetchText(url);
    if (!text) return null;
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}
