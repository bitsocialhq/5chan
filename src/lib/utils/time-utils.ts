import i18next from 'i18next';

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

const getDateTimeFormatter = (locale: string) => {
  const cachedFormatter = dateTimeFormatters.get(locale);
  if (cachedFormatter) return cachedFormatter;

  const formatter = new Intl.DateTimeFormat(locale, {
    hour12: false,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  dateTimeFormatters.set(locale, formatter);
  return formatter;
};

if (typeof i18next.on === 'function') {
  i18next.on('languageChanged', () => {
    dateTimeFormatters.clear();
  });
}

export const getFormattedDate = (commentTimestamp: number) => {
  if (commentTimestamp === undefined || isNaN(commentTimestamp)) {
    return '';
  }
  const locale = i18next.language || 'en';
  const string = getDateTimeFormatter(locale).format(new Date(commentTimestamp * 1000));
  if (locale.startsWith('ar')) {
    return string;
  }
  const items = string.split(/,* /);
  if (items.length === 3) {
    const itemIsNumber = [items[0][0].match(/[0-9]/), items[1][0].match(/[0-9]/)];
    if (itemIsNumber[0] && itemIsNumber[1]) {
      return `${items[0]}(${items[2]})${items[1]}`;
    }
    if (itemIsNumber[0] && !itemIsNumber[1]) {
      return `${items[0]}(${items[1]})${items[2]}`;
    }
    if (!itemIsNumber[0] && itemIsNumber[1]) {
      return `${items[1]}(${items[0]})${items[2]}`;
    }
  }
  return string;
};

export const getFormattedTimeAgo = (unixTimestamp: number): string => {
  const currentTime = Date.now() / 1000;
  const timeDifference = currentTime - unixTimestamp;
  const t = i18next.t;

  if (timeDifference < 120) {
    return t('time_1_minute_ago');
  }
  if (timeDifference < 3600) {
    return t('time_x_minutes_ago', { count: Math.floor(timeDifference / 60) });
  }
  if (timeDifference < 7200) {
    return t('time_1_hour_ago');
  }
  if (timeDifference < 86400) {
    return t('time_x_hours_ago', { count: Math.floor(timeDifference / 3600) });
  }
  if (timeDifference < 172800) {
    return t('time_1_day_ago');
  }
  if (timeDifference < 2592000) {
    return t('time_x_days_ago', { count: Math.floor(timeDifference / 86400) });
  }
  if (timeDifference < 5184000) {
    return t('time_1_month_ago');
  }
  if (timeDifference < 31104000) {
    return t('time_x_months_ago', { count: Math.floor(timeDifference / 2592000) });
  }
  if (timeDifference < 62208000) {
    return t('time_1_year_ago');
  }
  return t('time_x_years_ago', { count: Math.floor(timeDifference / 31104000) });
};

export const isChristmas = (): boolean => {
  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();
  return month === 11 && (day === 24 || day === 25);
};
