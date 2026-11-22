export const TIME_ZONE = 'Asia/Jerusalem';

const timeFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hour12: false });
const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

export const formatTime = (d: Date) => timeFmt.format(d);
export const formatDate = (d: Date) => dateFmt.format(d);

export function greetingFor(d: Date): string {
  const h = Number(hourFmt.format(d)) % 24;
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 18) return 'Добрый день';
  if (h >= 18 && h < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

/** Текущая дата в Asia/Jerusalem как {year, month(1-12), day} */
export function todayParts(d: Date) {
  const [year, month, day] = partsFmt.format(d).split('-').map(Number);
  return { year, month, day };
}
