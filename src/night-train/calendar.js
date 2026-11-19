export function easterSunday(year) {
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100,
    d = Math.floor(b / 4),
    e = b % 4;
  const f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31),
    day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}
export function occasionForDate(date = new Date()) {
  const month = date.getMonth() + 1,
    day = date.getDate();
  if (month === 12 && day === 24) return "christmas_eve";
  if (month === 12 && [25, 26].includes(day)) return "christmas";
  if (month === 12 && day === 6) return "nicholas";
  if ((month === 12 && day === 31) || (month === 1 && day === 1))
    return "newyear";
  if (month === 10 && day === 31) return "halloween";
  if (month === 5 && day === 1) return "may";
  if (month === 5 && date.getDay() === 0 && day >= 8 && day <= 14)
    return "mothers";
  const easter = easterSunday(date.getFullYear());
  const days = Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), day) -
      Date.UTC(easter.getFullYear(), easter.getMonth(), easter.getDate())) /
      86400000,
  );
  if (days === 0 || days === 1) return "easter";
  if (days === 39) return "fathers";
  return "none";
}
