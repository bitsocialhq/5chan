export const POST_OPTIONS_VALIDATION_DELAY_MS = 700;
const FORTUNE_DIRECTORY_CODES = new Set(['b', 's5s']);
const DICE_DIRECTORY_CODES = new Set(['qst', 'tg']);
const POST_OPTION_ROUTE_DIRECTORY_CODES = new Set([...FORTUNE_DIRECTORY_CODES, ...DICE_DIRECTORY_CODES]);
const MAX_DICE_COUNT = 25;

export interface FortuneEntry {
  color: string;
  text: string;
}

export interface DiceRoll {
  option: string;
  count: number;
  sides: number;
  rolls: number[];
  modifier: number;
  modifierText: string;
  total: number;
}

export interface PostOptionsValidationError {
  unsupportedOptions: string[];
  supportedDirectoryCodesByOption: Array<{ option: string; directoryCodes: string[] }>;
}

export const isPostOptionsValidationError = (error: unknown): error is PostOptionsValidationError => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const value = error as Partial<PostOptionsValidationError>;
  return Array.isArray(value.unsupportedOptions) && Array.isArray(value.supportedDirectoryCodesByOption);
};

interface PostOptionsDirectory {
  directoryCode?: string;
  title?: string;
}

interface PostOptionsStateRef<T> {
  current: T;
}

interface PostOptionsContentOptions {
  includeFortune?: boolean;
}

const getRouteDirectoryCode = (pathname: string | undefined): string | undefined => {
  const firstSegment = pathname?.split('/').filter(Boolean)[0];
  return firstSegment && POST_OPTION_ROUTE_DIRECTORY_CODES.has(firstSegment) ? firstSegment : undefined;
};

const FORTUNE_ENTRIES: readonly FortuneEntry[] = [
  { text: 'Bad Luck', color: '#7fec11' },
  { text: 'Average Luck', color: '#bac200' },
  { text: 'Good Luck', color: '#e7890c' },
  { text: 'Excellent Luck', color: '#fd4d32' },
  { text: 'Reply hazy, try again', color: '#f51c6a' },
  { text: 'Godly Luck', color: '#d302a7' },
  { text: 'Very Bad Luck', color: '#9d05da' },
  { text: 'Outlook good', color: '#6023f8' },
  { text: 'Better not tell you now', color: '#2a56fb' },
  { text: 'You will meet a dark handsome stranger', color: '#0893e1' },
  { text: 'ｷﾀ━━━━━━(ﾟ∀ﾟ)━━━━━━ !!!!', color: '#00cbb0' },
  { text: '（　´_ゝ`）ﾌｰﾝ ', color: '#16f174' },
  { text: 'Good news will come to you by mail', color: '#43fd3b' },
];

const parsePostOptions = (value: string): string[] => value.trim().split(/\s+/).filter(Boolean);

const parseDiceOption = (option: string): { count: number; sides: number; modifier: number; modifierText: string; option: string } | null => {
  const match = option.match(/^dice\+(\d+)d(\d+)(?:([+-])(\d+))?$/);
  if (!match) return null;

  const rawCount = Number(match[1]);
  const sides = Number(match[2]);
  if (!Number.isInteger(rawCount) || !Number.isInteger(sides) || rawCount < 1 || sides < 1) {
    return null;
  }

  const count = Math.min(MAX_DICE_COUNT, rawCount);
  const modifierValue = match[4] ? Number(match[4]) : 0;
  const modifier = match[3] === '-' ? -modifierValue : modifierValue;
  const modifierText = match[3] ? ` ${match[3]} ${modifierValue}` : '';

  return { count, sides, modifier, modifierText, option };
};

export const getPostOptionsDirectoryCode = (directory: PostOptionsDirectory | null | undefined, pathname?: string): string | undefined => {
  if (directory?.directoryCode) {
    return directory.directoryCode;
  }
  return directory?.title?.match(/^\/([^/]+)\//)?.[1] ?? getRouteDirectoryCode(pathname);
};

const isSupportedPostOption = (option: string, directoryCode: string | undefined): boolean => {
  if (option === 'nonoko') {
    return true;
  }

  if (option === 'fortune') {
    return isFortuneDirectoryCode(directoryCode);
  }

  return !!parseDiceOption(option) && !!directoryCode && DICE_DIRECTORY_CODES.has(directoryCode);
};

const getSupportedDirectoryCodes = (option: string): string[] => {
  if (option === 'fortune') {
    return [...FORTUNE_DIRECTORY_CODES];
  }

  return parseDiceOption(option) ? [...DICE_DIRECTORY_CODES] : [];
};

export const getPostOptionsValidationError = (value: string, directoryCode: string | undefined): PostOptionsValidationError | null => {
  let hasDiceOption = false;
  const unsupportedOptions: string[] = [];
  const supportedDirectoryCodesByOption: Array<{ option: string; directoryCodes: string[] }> = [];

  for (const option of parsePostOptions(value)) {
    const diceOption = parseDiceOption(option);
    if (diceOption && directoryCode && DICE_DIRECTORY_CODES.has(directoryCode)) {
      const isExtraDiceOption = hasDiceOption;
      hasDiceOption = true;
      if (isExtraDiceOption) {
        unsupportedOptions.push(option);
      }
      continue;
    }

    if (isSupportedPostOption(option, directoryCode)) {
      continue;
    }

    const optionDirectoryCodes = getSupportedDirectoryCodes(option);
    if (optionDirectoryCodes.length > 0) {
      unsupportedOptions.push(option);
      if (!supportedDirectoryCodesByOption.some((entry) => entry.option === option)) {
        supportedDirectoryCodesByOption.push({ option, directoryCodes: optionDirectoryCodes });
      }
    } else {
      unsupportedOptions.push(option);
    }
  }

  return unsupportedOptions.length > 0 ? { unsupportedOptions, supportedDirectoryCodesByOption } : null;
};

export const getUnsupportedPostOptionsMessage = (value: string, directoryCode: string | undefined): string | null => {
  const error = getPostOptionsValidationError(value, directoryCode);
  if (!error) {
    return null;
  }

  let message = `Unsupported options: ${error.unsupportedOptions.join(', ')}.`;

  for (const { option, directoryCodes } of error.supportedDirectoryCodesByOption) {
    message += ` Option "${option}" is supported on: ${directoryCodes.map((code) => `/${code}/`).join(', ')}.`;
  }

  return message;
};

export const hasNonokoOption = (value: string): boolean => parsePostOptions(value).includes('nonoko');

export const isFortuneDirectoryCode = (directoryCode: string | undefined): boolean => !!directoryCode && FORTUNE_DIRECTORY_CODES.has(directoryCode);

const NONOKO_PENDING_ACCOUNT_COMMENT_INDEX_STATE_KEY = 'nonokoPendingAccountCommentIndex';

type NonokoPendingRouteState = {
  [NONOKO_PENDING_ACCOUNT_COMMENT_INDEX_STATE_KEY]?: unknown;
  usr?: unknown;
};

const getNonokoPendingAccountCommentIndexFromRecord = (state: NonokoPendingRouteState): number | undefined => {
  const value = state[NONOKO_PENDING_ACCOUNT_COMMENT_INDEX_STATE_KEY];
  return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : undefined;
};

export const getNonokoPendingRouteState = (commentIndex: number) => ({
  [NONOKO_PENDING_ACCOUNT_COMMENT_INDEX_STATE_KEY]: commentIndex,
});

export const getNonokoPendingAccountCommentIndex = (state: unknown): number | undefined => {
  if (!state || typeof state !== 'object') return undefined;

  const directIndex = getNonokoPendingAccountCommentIndexFromRecord(state as NonokoPendingRouteState);
  if (directIndex !== undefined) return directIndex;

  const wrappedState = (state as NonokoPendingRouteState).usr;
  if (!wrappedState || typeof wrappedState !== 'object') return undefined;
  return getNonokoPendingAccountCommentIndexFromRecord(wrappedState as NonokoPendingRouteState);
};

const hasFortuneOption = (value: string, directoryCode: string | undefined): boolean =>
  isFortuneDirectoryCode(directoryCode) && parsePostOptions(value).includes('fortune');

const getDiceOption = (value: string, directoryCode: string | undefined): ReturnType<typeof parseDiceOption> => {
  if (!directoryCode || !DICE_DIRECTORY_CODES.has(directoryCode)) {
    return null;
  }

  for (const option of parsePostOptions(value)) {
    const diceOption = parseDiceOption(option);
    if (diceOption) {
      return diceOption;
    }
  }

  return null;
};

const getRandomFortuneEntry = (): FortuneEntry => FORTUNE_ENTRIES[Math.floor(Math.random() * FORTUNE_ENTRIES.length)] || FORTUNE_ENTRIES[0];

const getFortuneBbcode = ({ color, text }: FortuneEntry): string => `[fortune color=${color}]${text}[/fortune]`;

const appendFortuneToContent = (content: string, fortune: FortuneEntry): string => `${content}${getFortuneBbcode(fortune)}`;

const rollDice = (diceOption: NonNullable<ReturnType<typeof parseDiceOption>>, currentDiceRoll: DiceRoll | null): DiceRoll => {
  if (currentDiceRoll?.option === diceOption.option) {
    return currentDiceRoll;
  }

  const rolls = Array.from({ length: diceOption.count }, () => Math.floor(Math.random() * diceOption.sides) + 1);
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + diceOption.modifier;

  return {
    option: diceOption.option,
    count: diceOption.count,
    sides: diceOption.sides,
    rolls,
    modifier: diceOption.modifier,
    modifierText: diceOption.modifierText,
    total,
  };
};

const getDiceRollText = (diceRoll: DiceRoll): string => {
  const rolls = diceRoll.rolls.join(', ');
  const total = diceRoll.count > 1 || diceRoll.modifier !== 0 ? ` = ${diceRoll.total}` : '';
  return `Rolled ${rolls}${diceRoll.modifierText}${total} (${diceRoll.count}d${diceRoll.sides}${diceRoll.modifierText})`;
};

const getDiceRollMarkup = (diceRoll: DiceRoll): string => `<b>${getDiceRollText(diceRoll)}<br><br></b>`;

const prependDiceRollToContent = (content: string, diceRoll: DiceRoll): string => `${getDiceRollMarkup(diceRoll)}${content}`;

const getContentWithPostOptions = (
  content: string,
  options: string,
  currentFortuneEntry: FortuneEntry | null,
  currentDiceRoll: DiceRoll | null,
  directoryCode: string | undefined,
  contentOptions: PostOptionsContentOptions = {},
): { content: string; fortuneEntry: FortuneEntry | null; diceRoll: DiceRoll | null } => {
  const diceOption = getDiceOption(options, directoryCode);
  const diceRoll = diceOption ? rollDice(diceOption, currentDiceRoll) : null;
  let nextContent = diceRoll ? prependDiceRollToContent(content, diceRoll) : content;

  if (!hasFortuneOption(options, directoryCode)) {
    return { content: nextContent, fortuneEntry: null, diceRoll };
  }

  if (contentOptions.includeFortune === false) {
    return { content: nextContent, fortuneEntry: currentFortuneEntry, diceRoll };
  }

  const fortuneEntry = currentFortuneEntry || getRandomFortuneEntry();
  nextContent = appendFortuneToContent(nextContent, fortuneEntry);
  return { content: nextContent, fortuneEntry, diceRoll };
};

export const getContentWithPostOptionState = (
  content: string,
  options: string,
  fortuneEntryRef: PostOptionsStateRef<FortuneEntry | null>,
  diceRollRef: PostOptionsStateRef<DiceRoll | null>,
  directoryCode: string | undefined,
  contentOptions?: PostOptionsContentOptions,
): string => {
  const result = getContentWithPostOptions(content, options, fortuneEntryRef.current, diceRollRef.current, directoryCode, contentOptions);
  fortuneEntryRef.current = result.fortuneEntry;
  diceRollRef.current = result.diceRoll;
  return result.content;
};

const FORTUNE_BBCODE_PATTERN = '\\[fortune color=(#[0-9a-fA-F]{6})\\]([^\\r\\n]*?)\\[\\/fortune\\]';
const DICE_ROLL_MARKUP_PATTERN = '<b>(Rolled \\d+(?:, \\d+)*(?: [+-] \\d+)?(?: = -?\\d+)? \\(\\d+d\\d+(?: [+-] \\d+)?\\))<br><br><\\/b>';

export const createFortuneBbcodeRegex = (): RegExp => new RegExp(FORTUNE_BBCODE_PATTERN, 'g');
export const createDiceRollMarkupRegex = (): RegExp => new RegExp(DICE_ROLL_MARKUP_PATTERN, 'g');

export const getMatchingFortuneEntry = (color: string, text: string): FortuneEntry | undefined =>
  FORTUNE_ENTRIES.find((entry) => entry.color.toLowerCase() === color.toLowerCase() && entry.text === text);

export const stripGeneratedFortuneBbcode = (content: string): string =>
  content.replace(createFortuneBbcodeRegex(), (match, color: string, text: string) => (getMatchingFortuneEntry(color, text) ? '' : match));
