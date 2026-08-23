/**
 * Client-side media metadata stripping. Removes privacy-sensitive metadata
 * (EXIF/GPS, XMP, IPTC, comments) from images before any upload provider sees
 * the bytes — catbox and similar hosts preserve files 1:1, so phone photos
 * would otherwise leak GPS coordinates. Containers are rewritten losslessly;
 * pixel data is never re-encoded. On any parse anomaly the original file is
 * returned unchanged so an upload is never blocked.
 */

/** Files larger than this pass through untouched to avoid large in-memory copies. */
const MAX_PROCESSABLE_BYTES = 64 * 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** JPEG segments removed: APP1 (Exif and XMP), APP13 (IPTC/Photoshop), COM. */
const JPEG_DROPPED_MARKERS = new Set([0xe1, 0xed, 0xfe]);

/**
 * PNG ancillary chunks kept because they affect rendering (plus APNG frames).
 * Critical chunks are always kept; ancillary chunks not listed here (tEXt,
 * zTXt, iTXt, eXIf, tIME, and unknown ones) are dropped.
 */
const PNG_KEPT_ANCILLARY_CHUNKS = new Set(['tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'bKGD', 'pHYs', 'acTL', 'fcTL', 'fdAT']);

/** VP8X header flag bits announcing EXIF (0x08) and XMP (0x04) chunks. */
const WEBP_VP8X_METADATA_FLAGS = 0x0c;

/**
 * Returns a copy of the file with image metadata removed, or the original
 * file object unchanged when there is nothing to remove, the format is not
 * handled (GIF, video, unknown), the file is too large, or parsing fails.
 */
export async function stripMediaMetadata(file: File): Promise<File> {
  if (file.size > MAX_PROCESSABLE_BYTES) return file;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const stripped = stripBytes(bytes);
    if (stripped === null) return file;
    return new File([stripped], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

/** Detects the format by magic bytes (mime/extension are never trusted). Null means "keep original". */
function stripBytes(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> | null {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return stripJpeg(bytes);
  }
  if (bytes.length >= 8 && PNG_SIGNATURE.every((b, i) => bytes[i] === b)) {
    return stripPng(bytes);
  }
  if (bytes.length >= 16 && readFourCc(bytes, 0) === 'RIFF' && readFourCc(bytes, 8) === 'WEBP') {
    return stripWebp(bytes);
  }
  // GIF passes through deliberately (rewriting animations is risky and GIFs
  // carry no GPS-class metadata); video and unknown formats pass through too.
  return null;
}

function stripJpeg(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> | null {
  const len = bytes.length;
  const kept: Uint8Array<ArrayBuffer>[] = [bytes.subarray(0, 2)];
  let removedBytes = 0;
  let pos = 2;

  for (;;) {
    if (pos + 1 >= len || bytes[pos] !== 0xff) return null;
    // A marker may be preceded by any number of 0xff fill bytes.
    let markerPos = pos + 1;
    while (markerPos < len && bytes[markerPos] === 0xff) markerPos++;
    if (markerPos >= len) return null;
    const marker = bytes[markerPos];

    if (marker === 0xda) {
      // SOS: entropy-coded data follows and contains 0xff bytes that are not
      // segment markers, so copy verbatim to EOF instead of parsing. This
      // also preserves data deliberately appended after EOI.
      kept.push(bytes.subarray(pos, len));
      break;
    }
    // Standalone markers (TEM, RST, SOI, EOI) are not expected before SOS.
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) return null;

    if (markerPos + 2 >= len) return null;
    const segmentLength = (bytes[markerPos + 1] << 8) | bytes[markerPos + 2];
    if (segmentLength < 2) return null;
    const end = markerPos + 1 + segmentLength;
    if (end > len) return null;

    if (JPEG_DROPPED_MARKERS.has(marker)) {
      removedBytes += end - pos;
    } else {
      kept.push(bytes.subarray(pos, end));
    }
    pos = end;
  }

  if (removedBytes === 0) return null;
  return concat(kept);
}

function stripPng(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> | null {
  const len = bytes.length;
  const kept: Uint8Array<ArrayBuffer>[] = [bytes.subarray(0, 8)];
  let removedBytes = 0;
  let pos = 8;

  for (;;) {
    if (pos + 8 > len) return null; // ran out of bytes before IEND
    const dataLength = readU32be(bytes, pos);
    if (dataLength > 0x7fffffff) return null;
    const end = pos + 12 + dataLength; // length + type + data + CRC
    if (end > len) return null;
    const type = readFourCc(bytes, pos + 4);

    if (type === 'IEND') {
      // Keep IEND and any deliberately appended trailing data verbatim.
      kept.push(bytes.subarray(pos, len));
      break;
    }

    const isCritical = (bytes[pos + 4] & 0x20) === 0;
    if (isCritical || PNG_KEPT_ANCILLARY_CHUNKS.has(type)) {
      // Chunks are copied whole so their CRCs remain valid.
      kept.push(bytes.subarray(pos, end));
    } else {
      removedBytes += end - pos;
    }
    pos = end;
  }

  if (removedBytes === 0) return null;
  return concat(kept);
}

function stripWebp(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> | null {
  const len = bytes.length;
  const riffEnd = 8 + readU32le(bytes, 4);
  if (riffEnd < 12 || riffEnd > len) return null;

  const kept: Uint8Array<ArrayBuffer>[] = [bytes.subarray(0, 12)];
  let outLength = 12;
  let removedBytes = 0;
  let vp8xFlagsOffset = -1;
  let vp8xHasMetadataFlags = false;
  let pos = 12;

  while (pos < riffEnd) {
    if (pos + 8 > riffEnd) return null;
    const fourCc = readFourCc(bytes, pos);
    const chunkSize = readU32le(bytes, pos + 4);
    const end = pos + 8 + chunkSize + (chunkSize & 1); // chunks are padded to even sizes
    if (end > riffEnd) return null;

    if (fourCc === 'EXIF' || fourCc === 'XMP ') {
      removedBytes += end - pos;
    } else {
      if (fourCc === 'VP8X') {
        if (chunkSize < 10) return null;
        vp8xFlagsOffset = outLength + 8;
        vp8xHasMetadataFlags = (bytes[pos + 8] & WEBP_VP8X_METADATA_FLAGS) !== 0;
      }
      kept.push(bytes.subarray(pos, end));
      outLength += end - pos;
    }
    pos = end;
  }

  if (removedBytes === 0 && !vp8xHasMetadataFlags) return null;

  if (riffEnd < len) kept.push(bytes.subarray(riffEnd, len)); // keep appended trailing data
  const out = concat(kept);
  writeU32le(out, 4, outLength - 8);
  if (vp8xFlagsOffset >= 0) out[vp8xFlagsOffset] &= ~WEBP_VP8X_METADATA_FLAGS;
  return out;
}

function concat(parts: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function readFourCc(bytes: Uint8Array, pos: number): string {
  return String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
}

function readU32be(bytes: Uint8Array, pos: number): number {
  return ((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
}

function readU32le(bytes: Uint8Array, pos: number): number {
  return (bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)) >>> 0;
}

function writeU32le(bytes: Uint8Array, pos: number, value: number): void {
  bytes[pos] = value & 0xff;
  bytes[pos + 1] = (value >>> 8) & 0xff;
  bytes[pos + 2] = (value >>> 16) & 0xff;
  bytes[pos + 3] = (value >>> 24) & 0xff;
}
