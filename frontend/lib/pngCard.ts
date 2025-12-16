import { inflate } from "pako";

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const targets = new Set(["chara_card_json", "chara_card", "character_card", "chara"]);

function readString(data: Uint8Array, start: number, end: number) {
  return new TextDecoder().decode(data.slice(start, end));
}

export async function extractPngJson(arrayBuffer: ArrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  for (let i = 0; i < pngSignature.length; i++) {
    if (data[i] !== pngSignature[i]) return null;
  }

  let offset = 8;
  while (offset < data.length) {
    const length =
      (data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3];
    const type = String.fromCharCode(
      data[offset + 4],
      data[offset + 5],
      data[offset + 6],
      data[offset + 7]
    );
    const chunkData = data.slice(offset + 8, offset + 8 + length);

    if (type === "tEXt") {
      const text = new TextDecoder().decode(chunkData);
      const sep = text.indexOf("\0");
      const key = sep >= 0 ? text.slice(0, sep) : "";
      const value = sep >= 0 ? text.slice(sep + 1) : text;
      if (targets.has(key)) return decodeValue(value);
    }

    if (type === "zTXt") {
      // keyword\0 compressionMethod byte then compressed text
      const sep = chunkData.indexOf(0);
      if (sep >= 0) {
        const key = readString(chunkData, 0, sep);
        const comp = chunkData[sep + 1];
        const compressed = chunkData.slice(sep + 2);
        if (targets.has(key)) {
          const out = inflate(compressed, { to: "string" }) as string;
          return decodeValue(out);
        }
      }
    }

    if (type === "iTXt") {
      // keyword\0 compressionFlag(1) compressionMethod(1) languageTag\0 translatedTag\0 text
      let idx = 0;
      while (idx < chunkData.length && chunkData[idx] !== 0) idx++;
      const key = readString(chunkData, 0, idx);
      const compressionFlag = chunkData[idx + 1];
      const compressionMethod = chunkData[idx + 2];
      let ptr = idx + 3;
      while (ptr < chunkData.length && chunkData[ptr] !== 0) ptr++;
      ptr += 1; // skip language tag
      while (ptr < chunkData.length && chunkData[ptr] !== 0) ptr++;
      ptr += 1; // skip translated keyword
      const textData = chunkData.slice(ptr);
      if (targets.has(key)) {
        if (compressionFlag === 1) {
          const out = inflate(textData, { to: "string" }) as string;
          return decodeValue(out);
        } else {
          return decodeValue(new TextDecoder().decode(textData));
        }
      }
    }

    offset += 12 + length; // length + type + data + crc
  }
  return null;
}

function decodeValue(value: string) {
  // Try direct JSON
  try {
    JSON.parse(value);
    return value;
  } catch {}

  // Try base64->string->JSON
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0)));
    JSON.parse(decoded);
    return decoded;
  } catch {}

  return value;
}
