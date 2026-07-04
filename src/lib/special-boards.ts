export interface SpecialBoard {
  address: string;
  aliases?: string[];
  directoryCode: string;
  nsfw?: boolean;
  publicKey?: string;
  title: string;
}

export const TRASH_BOARD_PUBLIC_KEY = '12D3KooWREyT7yBV8tA8uSpps8vX7XS1YM4385ty2MmHFyR9GKmf';
export const TRASH_BOARD_ADDRESS = 'off-topic.bso';
export const TRASH_BOARD_CODE = 'trash';
export const TRASH_BOARD_TITLE = '/trash/ - Off-topic';

export const SPECIAL_BOARDS: SpecialBoard[] = [
  {
    address: TRASH_BOARD_ADDRESS,
    aliases: ['off-topic.eth'],
    directoryCode: TRASH_BOARD_CODE,
    nsfw: true,
    publicKey: TRASH_BOARD_PUBLIC_KEY,
    title: TRASH_BOARD_TITLE,
  },
];

const getSpecialBoardLookupAddresses = (board: SpecialBoard): string[] => [board.address, ...(board.publicKey ? [board.publicKey] : []), ...(board.aliases ?? [])];

export const getSpecialBoardByCode = (code: string | undefined): SpecialBoard | undefined =>
  code ? SPECIAL_BOARDS.find((board) => board.directoryCode === code) : undefined;

export const getSpecialBoardByAddress = (address: string | undefined): SpecialBoard | undefined =>
  address ? SPECIAL_BOARDS.find((board) => getSpecialBoardLookupAddresses(board).includes(address)) : undefined;

export const isSpecialBoardCode = (code: string | undefined): boolean => Boolean(getSpecialBoardByCode(code));

export const isSpecialBoardAddress = (address: string | undefined): boolean => Boolean(getSpecialBoardByAddress(address));
