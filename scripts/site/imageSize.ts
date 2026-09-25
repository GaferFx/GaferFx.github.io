export type Dimensions = { width: number; height: number };

function u24le(buf: Uint8Array, offset: number): number {
    return buf[offset]! | (buf[offset + 1]! << 8) | (buf[offset + 2]! << 16);
}

function ascii(buf: Uint8Array, offset: number, length: number): string {
    return String.fromCharCode(...buf.subarray(offset, offset + length));
}

/** Размеры картинки по сырым байтам: PNG, JPEG, GIF, WebP. */
export function imageSize(buf: Uint8Array): Dimensions | null {
    if (buf.length < 10) return null;
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    // PNG: 8-байтовая сигнатура, дальше IHDR с шириной/высотой
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
        return { width: dv.getUint32(16), height: dv.getUint32(20) };

    // GIF: "GIF8", логический экран u16le
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46)
        return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) };

    // JPEG: идём по маркерам до SOF (FFC0–FFCF кроме DHT/DAC/RST-секций)
    if (buf[0] === 0xff && buf[1] === 0xd8) {
        let i = 2;
        while (i + 9 < buf.length) {
            if (buf[i] !== 0xff) {
                i++;
                continue;
            }
            const marker = buf[i + 1]!;
            if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
                return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
            i += 2 + dv.getUint16(i + 2);
        }
        return null;
    }

    // WebP: RIFF....WEBP + чанк VP8 / VP8L / VP8X
    if (buf.length >= 30 && ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP") {
        const fourcc = ascii(buf, 12, 4);
        if (fourcc === "VP8X")
            return { width: 1 + u24le(buf, 24), height: 1 + u24le(buf, 27) };
        if (fourcc === "VP8 ")
            return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
        if (fourcc === "VP8L" && buf[20] === 0x2f)
            return {
                width: 1 + (((buf[22]! & 0x3f) << 8) | buf[21]!),
                height: 1 + (((buf[24]! & 0x0f) << 10) | (buf[23]! << 2) | ((buf[22]! & 0xc0) >> 6)),
            };
    }

    return null;
}
