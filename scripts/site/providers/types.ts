export type ThumbnailSource = {
    /** URL превью: удалённый или уже локальный путь вида ./public/... */
    src: string;
    /** Кандидаты для размытого фона карточки (image-set) */
    srcSet?: [url: string, density: number][];
    /** Скачать в public/thumbnails вместо хотлинка — для CDN-ссылок с протухающими токенами */
    download?: boolean;
};

export type ResolvedVideo = {
    /** Стабильный идентификатор видео — используется как ключ кэша превью */
    id?: string;
    /** URL для iframe-плеера; "{host}" подставляется на клиенте (location.hostname) */
    embed?: string;
    /** Название из метаданных — фолбэк, если title не задан в projects.yml */
    title?: string;
    /** Реальный aspect-ratio видео из метаданных провайдера, "w / h" */
    aspectRatio?: string;
    thumbnail?: ThumbnailSource;
};

const COMMON_RATIOS = [
    [16, 9],
    [9, 16],
    [4, 3],
    [3, 4],
    [1, 1],
    [21, 9],
    [9, 21],
    [3, 2],
    [2, 3],
    [5, 4],
    [4, 5],
] as const;

/** "w / h" для CSS aspect-ratio; близкие значения приводятся к стандартным (16/9 и т.п.) */
export function ratio(width?: number, height?: number): string | undefined {
    if (!width || !height) return undefined;
    const r = width / height;
    for (const [w, h] of COMMON_RATIOS) {
        if (Math.abs(r - w / h) / (w / h) < 0.02) return `${w} / ${h}`;
    }
    return `${width} / ${height}`;
}

export interface Provider {
    name: string;
    /** [viewBox width, viewBox height, symbol id] — иконка бейджа из спрайта в index.html */
    logo: [number, number, string];
    match(host: string): boolean;
    resolve?(url: URL): Promise<ResolvedVideo | null> | ResolvedVideo | null;
}
