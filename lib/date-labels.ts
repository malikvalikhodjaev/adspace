const months = {
  ru: [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
  ],
  uz: [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ],
};

const russianDateMonths = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const weekdays = {
  ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  uz: ['ya', 'du', 'se', 'cho', 'pa', 'ju', 'sha'],
};

export function shortDayLabel(date: string, uz: boolean) {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')} · ${weekdays[uz ? 'uz' : 'ru'][weekday]}`;
}

export function monthLabel(month: string, uz: boolean) {
  const [year, number] = month.split('-').map(Number);
  return `${months[uz ? 'uz' : 'ru'][number - 1]} ${year}`;
}

export function longDateLabel(date: string, uz: boolean) {
  const [year, month, day] = date.split('-').map(Number);
  const name = months[uz ? 'uz' : 'ru'][month - 1];
  return uz ? `${day}-${name} ${year}` : `${day} ${russianDateMonths[month - 1]} ${year}`;
}
