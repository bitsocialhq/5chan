/**
 * Board code groups matching the classic imageboard bracket structure
 * Each group represents boards displayed together in brackets
 */
export const BOARD_CODE_GROUPS: string[][] = [
  // Group 1: [a / b / c / d / e / f / g / gif / h / hr / k / m / o / p / r / s / t / u / v / vg / vm / vmg / vr / vrpg / vst / w / wg]
  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'gif', 'h', 'hr', 'k', 'm', 'o', 'p', 'r', 's', 't', 'u', 'v', 'vg', 'vm', 'vmg', 'vr', 'vrpg', 'vst', 'w', 'wg'],
  // Group 2: [i / ic]
  ['i', 'ic'],
  // Group 3: [r9k / s5s / vip]
  ['r9k', 's5s', 'vip'],
  // Group 4: [cm / hm / lgbt / y]
  ['cm', 'hm', 'lgbt', 'y'],
  // Group 5: [3 / aco / adv / an / bant / biz / cgl / ck / co / diy / fa / fit / gd / hc / his / int / jp / lit / mlp / mu / n / news / out / po / pol / pw / q / qst / sci / soc / sp / tg / toy / trv / tv / vp / vt / wsg / wsr / x / xs]
  [
    '3',
    'aco',
    'adv',
    'an',
    'bant',
    'biz',
    'cgl',
    'ck',
    'co',
    'diy',
    'fa',
    'fit',
    'gd',
    'hc',
    'his',
    'int',
    'jp',
    'lit',
    'mlp',
    'mu',
    'n',
    'news',
    'out',
    'po',
    'pol',
    'pw',
    'q',
    'qst',
    'sci',
    'soc',
    'sp',
    'tg',
    'toy',
    'trv',
    'tv',
    'vp',
    'vt',
    'wsg',
    'wsr',
    'x',
    'xs',
  ],
];

/**
 * Get all board codes as a flat array
 */
export const getAllBoardCodes = (): string[] => {
  return BOARD_CODE_GROUPS.flat();
};
