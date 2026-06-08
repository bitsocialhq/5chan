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

// Order follows 4chan's board flag selector. Coordinates follow flags/pol/flags.2.css.
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
  ['MZ', 'Task Force Z'],
  ['TM', 'Templar'],
  ['TR', 'Tree Hugger'],
  ['UN', 'United Nations'],
  ['WP', 'White Supremacist'],
] as const;

const POLITICAL_FLAG_COORDINATES = {
  AC: [0, 0],
  AN: [16, 0],
  BL: [32, 0],
  CF: [48, 0],
  CM: [64, 0],
  CT: [0, 12],
  DM: [16, 12],
  EU: [32, 12],
  FC: [48, 12],
  GN: [64, 12],
  GY: [0, 24],
  JH: [16, 24],
  KN: [32, 24],
  MF: [48, 24],
  MZ: [64, 24],
  NB: [0, 36],
  NT: [16, 36],
  NZ: [32, 36],
  PC: [48, 36],
  PR: [64, 36],
  RE: [0, 48],
  TM: [16, 48],
  TR: [32, 48],
  UN: [48, 48],
  WP: [64, 48],
} as const satisfies Record<(typeof POLITICAL_FLAG_ENTRIES)[number][0], readonly [number, number]>;

// Order follows 4chan's board flag selector. Coordinates follow flags/mlp/flags.1.css.
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

const PONY_FLAG_COORDINATES = {
  '4CC': [0, 0],
  AB: [16, 0],
  ADA: [32, 0],
  AJ: [48, 0],
  AN: [64, 0],
  ANF: [80, 0],
  APB: [96, 0],
  AU: [112, 0],
  BB: [128, 0],
  BM: [0, 16],
  BP: [16, 16],
  BS: [32, 16],
  CB: [48, 16],
  CG: [64, 16],
  CHE: [80, 16],
  CL: [96, 16],
  CO: [112, 16],
  DAY: [128, 16],
  DD: [0, 32],
  DER: [16, 32],
  DIS: [32, 32],
  DT: [48, 32],
  EQA: [64, 32],
  EQF: [80, 32],
  EQI: [96, 32],
  EQP: [112, 32],
  EQR: [128, 32],
  EQS: [0, 48],
  EQT: [16, 48],
  ERA: [32, 48],
  FAU: [48, 48],
  FL: [64, 48],
  FLE: [80, 48],
  GI: [96, 48],
  HT: [112, 48],
  IZ: [128, 48],
  LI: [0, 64],
  LT: [16, 64],
  LY: [32, 64],
  MA: [48, 64],
  MAU: [64, 64],
  MIN: [80, 64],
  NI: [96, 64],
  NUR: [112, 64],
  OCT: [128, 64],
  PAR: [0, 80],
  PC: [16, 80],
  PCE: [32, 80],
  PI: [48, 80],
  PLU: [64, 80],
  PM: [80, 80],
  PP: [96, 80],
  QC: [112, 80],
  RAR: [128, 80],
  RD: [0, 96],
  RLU: [16, 96],
  S1L: [32, 96],
  SCO: [48, 96],
  SHI: [64, 96],
  SIL: [80, 96],
  SON: [96, 96],
  SP: [112, 96],
  SPI: [128, 96],
  SPT: [0, 112],
  SS: [16, 112],
  STA: [32, 112],
  STL: [48, 112],
  SUN: [64, 112],
  SUS: [80, 112],
  SWB: [96, 112],
  TFA: [112, 112],
  TFO: [128, 112],
  TFP: [0, 128],
  TFS: [16, 128],
  TFT: [32, 128],
  TFV: [48, 128],
  TP: [64, 128],
  TS: [80, 128],
  TWI: [96, 128],
  TX: [112, 128],
  VS: [128, 128],
  ZE: [0, 144],
  ZS: [16, 144],
} as const satisfies Record<(typeof PONY_FLAG_ENTRIES)[number][0], readonly [number, number]>;

const normalizeCode = (value: string | undefined) => value?.trim().toUpperCase();

const buildFlagDefinitions = (
  entries: readonly (readonly [string, string])[],
  kind: BoardFlagKind,
  spritePath: string,
  width: number,
  height: number,
  columns: number,
  coordinatesByCode?: Readonly<Record<string, readonly [number, number]>>,
): ReadonlyMap<string, BoardFlagDefinition> =>
  new Map(
    entries.map(([code, label], index) => {
      const [x, y] = coordinatesByCode?.[code] ?? [(index % columns) * width, Math.floor(index / columns) * height];
      return [
        code,
        {
          kind,
          code,
          label,
          spritePath,
          width,
          height,
          x,
          y,
        },
      ] as const;
    }),
  );

const BOARD_FLAGS_BY_KIND: Record<BoardFlagKind, ReadonlyMap<string, BoardFlagDefinition>> = {
  pol: buildFlagDefinitions(
    POLITICAL_FLAG_ENTRIES,
    'pol',
    POLITICAL_FLAG_SPRITE_PATH,
    POLITICAL_FLAG_WIDTH,
    POLITICAL_FLAG_HEIGHT,
    POLITICAL_FLAG_COLUMNS,
    POLITICAL_FLAG_COORDINATES,
  ),
  pony: buildFlagDefinitions(PONY_FLAG_ENTRIES, 'pony', PONY_FLAG_SPRITE_PATH, PONY_FLAG_WIDTH, PONY_FLAG_HEIGHT, PONY_FLAG_COLUMNS, PONY_FLAG_COORDINATES),
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
