import type { DirectoryCommunity } from './utils/directory-list-utils';

export type FlashTagCode = 'hentai' | 'porn' | 'japanese' | 'anime' | 'game' | 'loop' | 'other';

export interface FlashTagOption {
  value: FlashTagCode;
  label: string;
  shortLabel: string;
  flair: {
    text: `flash:${FlashTagCode}`;
  };
}

export const FLASH_TAG_OPTIONS: FlashTagOption[] = [
  { value: 'hentai', label: 'Hentai', shortLabel: 'H', flair: { text: 'flash:hentai' } },
  { value: 'porn', label: 'Porn', shortLabel: 'P', flair: { text: 'flash:porn' } },
  { value: 'japanese', label: 'Japanese', shortLabel: 'J', flair: { text: 'flash:japanese' } },
  { value: 'anime', label: 'Anime', shortLabel: 'A', flair: { text: 'flash:anime' } },
  { value: 'game', label: 'Game', shortLabel: 'G', flair: { text: 'flash:game' } },
  { value: 'loop', label: 'Loop', shortLabel: 'L', flair: { text: 'flash:loop' } },
  { value: 'other', label: 'Other', shortLabel: '?', flair: { text: 'flash:other' } },
];

const FLASH_TAG_OPTIONS_BY_CODE = new Map(FLASH_TAG_OPTIONS.map((option) => [option.value, option]));

const getDirectoryCode = (directory: Pick<DirectoryCommunity, 'directoryCode' | 'title'> | undefined): string | undefined => {
  const directoryCode = directory?.directoryCode?.trim().toLowerCase();
  return directoryCode || directory?.title?.match(/^\/([^/]+)\//)?.[1]?.toLowerCase();
};

export const isFlashDirectoryCode = (directoryCode: string | undefined): boolean => directoryCode?.toLowerCase() === 'f';

export const isFlashDirectory = (directory: Pick<DirectoryCommunity, 'directoryCode' | 'title'> | undefined): boolean =>
  isFlashDirectoryCode(getDirectoryCode(directory));

export const getFlashTagOption = (value: string | undefined): FlashTagOption | undefined => FLASH_TAG_OPTIONS_BY_CODE.get(value as FlashTagCode);

export const getFlashTagPublishOptionsForDirectoryCode = (directoryCode: string | undefined, value: string | undefined) => {
  if (!isFlashDirectoryCode(directoryCode)) {
    return { flairs: undefined };
  }

  const option = getFlashTagOption(value);
  return { flairs: option ? [option.flair] : undefined };
};

export const getFlashTagOptionFromComment = (comment: unknown): FlashTagOption | undefined => {
  const flairs = comment && typeof comment === 'object' && Array.isArray((comment as { flairs?: unknown }).flairs) ? (comment as { flairs: unknown[] }).flairs : [];

  for (const flair of flairs) {
    if (!flair || typeof flair !== 'object') continue;
    const text = (flair as { text?: unknown }).text;
    if (typeof text !== 'string') continue;
    const match = text.match(/^flash:([a-z]+)$/);
    if (!match) continue;
    const option = FLASH_TAG_OPTIONS_BY_CODE.get(match[1] as FlashTagCode);
    if (option) return option;
  }

  return undefined;
};
