const DAY_IN_SECONDS = 24 * 60 * 60;
const LAST_VISIT_STORAGE_KEY = '5chanLastVisitTimestamp';
const LAST_VISIT_TIME_FILTER_VALUE = 'last';
const TIME_FILTER_QUERY_PARAM = 't';
const FALLBACK_TIME_FILTER_NAME = '24h';
const WEEK_IN_SECONDS = 7 * DAY_IN_SECONDS;
const MONTH_IN_SECONDS = 30 * DAY_IN_SECONDS;
const YEAR_IN_SECONDS = 365 * DAY_IN_SECONDS;

declare global {
  interface Window {
    _5chanLastVisitTimeFilterSnapshot?: string;
  }
}

const presetTimeFilterSeconds: Record<string, number | undefined> = {
  '1h': 60 * 60,
  '12h': 12 * 60 * 60,
  '24h': DAY_IN_SECONDS,
  '48h': 2 * DAY_IN_SECONDS,
  '1w': WEEK_IN_SECONDS,
  '1m': MONTH_IN_SECONDS,
  '1y': YEAR_IN_SECONDS,
  all: undefined,
};

const timeFilterPresetNames = ['1h', '12h', '24h', '48h', '1w', '1m', '1y', 'all'] as const;
export { LAST_VISIT_STORAGE_KEY, TIME_FILTER_QUERY_PARAM };

const convertDynamicTimeFilterNameToSeconds = (timeFilterName: string): number | undefined => {
  const match = timeFilterName.match(/^(\d+)([hdwmy])$/);
  if (!match) {
    return undefined;
  }

  const [, rawValue, unit] = match;
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  switch (unit) {
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * DAY_IN_SECONDS;
    case 'w':
      return value * 7 * DAY_IN_SECONDS;
    case 'm':
      return value * MONTH_IN_SECONDS;
    case 'y':
      return value * YEAR_IN_SECONDS;
    default:
      return undefined;
  }
};

export const getTimeFilterSeconds = (timeFilterName: string | null | undefined): number | undefined => {
  if (!timeFilterName || timeFilterName === 'all') {
    return undefined;
  }

  if (timeFilterName in presetTimeFilterSeconds) {
    return presetTimeFilterSeconds[timeFilterName as keyof typeof presetTimeFilterSeconds];
  }

  return convertDynamicTimeFilterNameToSeconds(timeFilterName);
};

const isValidTimeFilterName = (timeFilterName: string | null | undefined): timeFilterName is string =>
  timeFilterName === 'all' || typeof getTimeFilterSeconds(timeFilterName) === 'number';

const readLastVisitTimestamp = (): number | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedValue = window.localStorage.getItem(LAST_VISIT_STORAGE_KEY);
  if (!storedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(storedValue, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export const touchLastVisitTimestamp = (timestamp = Date.now()) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LAST_VISIT_STORAGE_KEY, String(timestamp));
};

const getLastVisitTimeFilterName = (now = Date.now(), lastVisitTimestamp = readLastVisitTimestamp()): string => {
  if (lastVisitTimestamp === null) {
    return FALLBACK_TIME_FILTER_NAME;
  }

  const secondsSinceLastVisit = (now - lastVisitTimestamp) / 1000;

  if (secondsSinceLastVisit > 30 * DAY_IN_SECONDS) {
    return '1m';
  }
  if (secondsSinceLastVisit > 7 * DAY_IN_SECONDS) {
    return `${Math.ceil(secondsSinceLastVisit / (7 * DAY_IN_SECONDS))}w`;
  }
  if (secondsSinceLastVisit > DAY_IN_SECONDS) {
    return `${Math.ceil(secondsSinceLastVisit / DAY_IN_SECONDS)}d`;
  }

  return FALLBACK_TIME_FILTER_NAME;
};

export const getStableLastVisitTimeFilterName = (): string => {
  if (typeof window === 'undefined') {
    return getLastVisitTimeFilterName();
  }

  if (!window._5chanLastVisitTimeFilterSnapshot) {
    window._5chanLastVisitTimeFilterSnapshot = getLastVisitTimeFilterName();
  }

  return window._5chanLastVisitTimeFilterSnapshot;
};

export const clearStableLastVisitTimeFilterName = () => {
  if (typeof window === 'undefined') {
    return;
  }

  delete window._5chanLastVisitTimeFilterSnapshot;
};

const getExplicitTimeFilterValueFromSearch = (search: string): string | undefined => {
  const timeFilterValue = new URLSearchParams(search).get(TIME_FILTER_QUERY_PARAM);
  if (timeFilterValue === LAST_VISIT_TIME_FILTER_VALUE) {
    return timeFilterValue;
  }

  return isValidTimeFilterName(timeFilterValue) ? timeFilterValue : undefined;
};

export const getEffectiveTimeFilterName = (search: string, fallbackTimeFilterName = getStableLastVisitTimeFilterName()): string => {
  const explicitTimeFilterValue = getExplicitTimeFilterValueFromSearch(search);
  if (explicitTimeFilterValue === LAST_VISIT_TIME_FILTER_VALUE) {
    return fallbackTimeFilterName;
  }

  return explicitTimeFilterValue ?? fallbackTimeFilterName;
};

export const getSelectedTimeFilterValue = (search: string): string => getExplicitTimeFilterValueFromSearch(search) ?? LAST_VISIT_TIME_FILTER_VALUE;

export const getTimeFilterOptionValues = (lastVisitTimeFilterName: string): string[] => {
  const optionValues = [LAST_VISIT_TIME_FILTER_VALUE, ...timeFilterPresetNames];
  const seenLabels = new Set<string>();

  return optionValues.filter((value) => {
    const label = value === LAST_VISIT_TIME_FILTER_VALUE ? lastVisitTimeFilterName : value;
    if (seenLabels.has(label)) {
      return false;
    }

    seenLabels.add(label);
    return true;
  });
};

export const getTimeFilterOptionLabel = (value: string, lastVisitTimeFilterName: string): string =>
  value === LAST_VISIT_TIME_FILTER_VALUE ? lastVisitTimeFilterName : value;

export const getEffectiveTimeFilterSeconds = (search: string, fallbackTimeFilterName = getStableLastVisitTimeFilterName()): number | undefined => {
  const effectiveTimeFilterName = getEffectiveTimeFilterName(search, fallbackTimeFilterName);
  const effectiveTimeFilterSeconds = getTimeFilterSeconds(effectiveTimeFilterName);

  if (effectiveTimeFilterName === 'all') {
    return undefined;
  }

  return effectiveTimeFilterSeconds ?? presetTimeFilterSeconds[FALLBACK_TIME_FILTER_NAME];
};

export const getSearchWithTimeFilter = (
  search: string,
  timeFilterName: string | undefined,
  options?: {
    removeKeys?: string[];
  },
): string => {
  const params = new URLSearchParams(search);
  for (const key of options?.removeKeys || []) {
    params.delete(key);
  }

  if (timeFilterName) {
    params.set(TIME_FILTER_QUERY_PARAM, timeFilterName);
  } else {
    params.delete(TIME_FILTER_QUERY_PARAM);
  }

  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : '';
};

export type TimeFilterSuggestion =
  | {
      i18nKey: 'more_threads_last_week';
      timeFilterName: '1w';
    }
  | {
      i18nKey: 'more_threads_last_month';
      timeFilterName: '1m';
    }
  | {
      i18nKey: 'more_threads_last_year';
      timeFilterName: '1y';
    };

export const getTimeFilterSuggestion = (
  currentFeedLength: number,
  weeklyFeedLength: number,
  monthlyFeedLength: number,
  yearlyFeedLength: number,
  currentTimeFilterSeconds?: number,
): TimeFilterSuggestion | null => {
  if (typeof currentTimeFilterSeconds !== 'number') {
    return null;
  }

  if (currentTimeFilterSeconds < WEEK_IN_SECONDS && weeklyFeedLength > currentFeedLength) {
    return {
      i18nKey: 'more_threads_last_week',
      timeFilterName: '1w',
    };
  }

  if (currentTimeFilterSeconds < MONTH_IN_SECONDS && monthlyFeedLength > currentFeedLength) {
    return {
      i18nKey: 'more_threads_last_month',
      timeFilterName: '1m',
    };
  }

  if (currentTimeFilterSeconds < YEAR_IN_SECONDS && yearlyFeedLength > currentFeedLength) {
    return {
      i18nKey: 'more_threads_last_year',
      timeFilterName: '1y',
    };
  }

  return null;
};
