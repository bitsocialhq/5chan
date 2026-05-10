/**
 * Blotter utilities: sorting, preview slicing, date formatting, and entry guards.
 * Board preview count is fixed at 3 entries to preserve compact block height.
 */

type BlotterEntryKind = 'release' | 'manual';

export interface BlotterEntry {
  id: string;
  kind: BlotterEntryKind;
  timestamp: number;
  message: string;
  version?: string;
}

/** Number of entries shown in the board blotter preview block. */
export const BLOTTER_PREVIEW_COUNT = 3;

/**
 * Guards that an entry satisfies the BlotterEntry contract.
 * Returns false for invalid entries (missing id, kind, timestamp, or message;
 * kind=release without version).
 */
export function isBlotterEntry(entry: unknown): entry is BlotterEntry {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as Record<string, unknown>;
  if (typeof e.id !== 'string' || !e.id.trim()) return false;
  if (e.kind !== 'release' && e.kind !== 'manual') return false;
  const ts = e.timestamp;
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts < 0) return false;
  if (typeof e.message !== 'string' || !e.message.trim()) return false;
  if (e.kind === 'release' && (typeof e.version !== 'string' || !e.version.trim())) return false;
  return true;
}

/**
 * Filters and sorts entries by timestamp descending.
 * Invalid entries are skipped. Ensures stable descending order.
 */
export function sortBlotterEntries<T extends { timestamp: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Returns the first N entries for board preview.
 * Use BLOTTER_PREVIEW_COUNT (3) to preserve compact block height.
 */
export function getBlotterPreview<T>(entries: T[], count: number = BLOTTER_PREVIEW_COUNT): T[] {
  return entries.slice(0, count);
}

/**
 * Formats a unix timestamp (seconds) as MM/DD/YY.
 */
export function formatBlotterDate(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp < 0) return '';
  const date = new Date(timestamp * 1000);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}
