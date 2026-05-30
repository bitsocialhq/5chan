/** File extensions that denote direct media URLs (images, videos, and Flash movies) */
const DIRECT_MEDIA_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.jpe',
  '.jfif',
  '.jif',
  '.png',
  '.apng',
  '.gif',
  '.webp',
  '.avif',
  '.webm',
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.gifv',
  '.swf',
] as const;

/** Returns true if the URL appears to point to a direct media file */
export function isDirectMediaUrl(url: string): boolean {
  try {
    const normalized = url.split('?')[0].split('#')[0].toLowerCase();
    return DIRECT_MEDIA_EXTENSIONS.some((ext) => normalized.endsWith(ext));
  } catch {
    return false;
  }
}
