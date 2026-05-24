export type BoardFlagKind = 'pol' | 'pony';

export interface BoardFlagDefinition {
  kind: BoardFlagKind;
  code: string;
  label: string;
  spritePath: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

const POLITICAL_FLAG_WIDTH = 16;
const POLITICAL_FLAG_HEIGHT = 12;
const POLITICAL_FLAG_COLUMNS = 5;
const POLITICAL_FLAG_SPRITE_PATH = 'assets/icons/flags-2.png';

const PONY_FLAG_WIDTH = 16;
const PONY_FLAG_HEIGHT = 16;
const PONY_FLAG_COLUMNS = 9;
const PONY_FLAG_SPRITE_PATH = 'assets/icons/flags-pony.png';

const POLITICAL_FLAG_ENTRIES = [
  ['AC', 'Anarcho-Capitalist'],
  ['AN', 'Anarchist'],
  ['BL', 'Black Nationalist'],
  ['CF', 'Confederate'],
  ['CM', 'Communist'],
  ['CT', 'Catalonia'],
  ['DM', 'Democrat'],
  ['EU', 'European'],
  ['FC', 'Fascist'],
  ['GN', 'Gadsden'],
  ['GY', 'Gay'],
  ['JH', 'Jihadi'],
  ['KN', 'Kekistani'],
  ['MF', 'Muslim'],
  ['NB', 'National Bolshevik'],
  ['NT', 'NATO'],
  ['NZ', 'Nazi'],
  ['PC', 'Hippie'],
  ['PR', 'Pirate'],
  ['RE', 'Republican'],
  ['TM', 'Templar'],
  ['MZ', 'Task Force Z'],
  ['TR', 'Tree Hugger'],
  ['UN', 'United Nations'],
  ['WP', 'White Supremacist'],
] as const;

const PONY_FLAG_ENTRIES = [
  ['4CC', '4cc /mlp/'],
  ['ADA', 'Adagio Dazzle'],
  ['AN', 'Anon'],
  ['ANF', 'Anonfilly'],
  ['APB', 'Apple Bloom'],
  ['AJ', 'Applejack'],
  ['AB', 'Aria Blaze'],
  ['AU', 'Autumn Blaze'],
  ['BB', 'Bon Bon'],
  ['BM', 'Big Mac'],
  ['BP', 'Berry Punch'],
  ['BS', 'Babs Seed'],
  ['CL', 'Changeling'],
  ['CO', 'Coco Pommel'],
  ['CG', 'Cozy Glow'],
  ['CHE', 'Cheerilee'],
  ['CB', 'Cherry Berry'],
  ['DAY', 'Daybreaker'],
  ['DD', 'Daring Do'],
  ['DER', 'Derpy Hooves'],
  ['DT', 'Diamond Tiara'],
  ['DIS', 'Discord'],
  ['EQA', 'EqG Applejack'],
  ['EQF', 'EqG Fluttershy'],
  ['EQP', 'EqG Pinkie Pie'],
  ['EQR', 'EqG Rainbow Dash'],
  ['EQT', 'EqG Trixie'],
  ['EQI', 'EqG Twilight Sparkle'],
  ['EQS', 'EqG Sunset Shimmer'],
  ['ERA', 'EqG Rarity'],
  ['FAU', 'Fausticorn'],
  ['FLE', 'Fleur de lis'],
  ['FL', 'Fluttershy'],
  ['GI', 'Gilda'],
  ['HT', 'Hitch Trailblazer'],
  ['IZ', 'Izzy Moonbow'],
  ['LI', 'Limestone'],
  ['LT', 'Lord Tirek'],
  ['LY', 'Lyra Heartstrings'],
  ['MA', 'Marble'],
  ['MAU', 'Maud'],
  ['MIN', 'Minuette'],
  ['NI', 'Nightmare Moon'],
  ['NUR', 'Nurse Redheart'],
  ['OCT', 'Octavia'],
  ['PAR', 'Parasprite'],
  ['PC', 'Princess Cadance'],
  ['PCE', 'Princess Celestia'],
  ['PI', 'Pinkie Pie'],
  ['PLU', 'Princess Luna'],
  ['PM', 'Pinkamena'],
  ['PP', 'Pipp Petals'],
  ['QC', 'Queen Chrysalis'],
  ['RAR', 'Rarity'],
  ['RD', 'Rainbow Dash'],
  ['RLU', 'Roseluck'],
  ['S1L', 'S1 Luna'],
  ['SCO', 'Scootaloo'],
  ['SHI', 'Shining Armor'],
  ['SIL', 'Silver Spoon'],
  ['SON', 'Sonata Dusk'],
  ['SP', 'Spike'],
  ['SPI', 'Spitfire'],
  ['SS', 'Sunny Starscout'],
  ['STA', 'Star Dancer'],
  ['STL', 'Starlight Glimmer'],
  ['SPT', 'Sprout'],
  ['SUN', 'Sunburst'],
  ['SUS', 'Sunset Shimmer'],
  ['SWB', 'Sweetie Belle'],
  ['TFA', 'TFH Arizona'],
  ['TFO', 'TFH Oleander'],
  ['TFP', 'TFH Paprika'],
  ['TFS', 'TFH Shanty'],
  ['TFT', 'TFH Tianhuo'],
  ['TFV', 'TFH Velvet'],
  ['TP', 'TFH Pom'],
  ['TS', 'Tempest Shadow'],
  ['TWI', 'Twilight Sparkle'],
  ['TX', 'Trixie'],
  ['VS', 'Vinyl Scratch'],
  ['ZE', 'Zecora'],
  ['ZS', 'Zipp Storm'],
] as const;

const normalizeCode = (value: string | undefined) => value?.trim().toUpperCase();

const buildFlagDefinitions = (
  entries: readonly (readonly [string, string])[],
  kind: BoardFlagKind,
  spritePath: string,
  width: number,
  height: number,
  columns: number,
): ReadonlyMap<string, BoardFlagDefinition> =>
  new Map(
    entries.map(([code, label], index) => [
      code,
      {
        kind,
        code,
        label,
        spritePath,
        width,
        height,
        x: (index % columns) * width,
        y: Math.floor(index / columns) * height,
      },
    ]),
  );

const BOARD_FLAGS_BY_KIND: Record<BoardFlagKind, ReadonlyMap<string, BoardFlagDefinition>> = {
  pol: buildFlagDefinitions(POLITICAL_FLAG_ENTRIES, 'pol', POLITICAL_FLAG_SPRITE_PATH, POLITICAL_FLAG_WIDTH, POLITICAL_FLAG_HEIGHT, POLITICAL_FLAG_COLUMNS),
  pony: buildFlagDefinitions(PONY_FLAG_ENTRIES, 'pony', PONY_FLAG_SPRITE_PATH, PONY_FLAG_WIDTH, PONY_FLAG_HEIGHT, PONY_FLAG_COLUMNS),
};

export const normalizeBoardFlagKind = (value: string | undefined): BoardFlagKind | undefined => {
  const kind = value?.trim().toLowerCase();
  if (kind === 'pol' || kind === 'political' || kind === 'meme' || kind === 'memeflag' || kind === 'memeflags') {
    return 'pol';
  }
  if (kind === 'pony' || kind === 'mlp') {
    return 'pony';
  }
  return undefined;
};

export const getBoardFlagDefinition = (kindValue: string | undefined, codeValue: string | undefined): BoardFlagDefinition | undefined => {
  const kind = normalizeBoardFlagKind(kindValue);
  const code = normalizeCode(codeValue);
  if (!kind || !code) return undefined;
  return BOARD_FLAGS_BY_KIND[kind].get(code);
};

export const getBoardFlagDefinitions = (kindValue: string | undefined): BoardFlagDefinition[] => {
  const kind = normalizeBoardFlagKind(kindValue);
  return kind ? [...BOARD_FLAGS_BY_KIND[kind].values()] : [];
};
