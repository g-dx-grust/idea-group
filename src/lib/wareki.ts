export function toWareki(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (year > 2019 || (year === 2019 && month >= 5)) {
    return `令和${year - 2018}年${month}月${day}日`;
  }

  if (year > 1989 || (year === 1989 && (month > 1 || day >= 8))) {
    return `平成${year - 1988}年${month}月${day}日`;
  }

  if (year > 1926 || (year === 1926 && month >= 12 && day >= 25)) {
    return `昭和${year - 1925}年${month}月${day}日`;
  }

  return `${year}年${month}月${day}日`;
}

export function toWarekiShort(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (year > 2019 || (year === 2019 && month >= 5)) return `R${year - 2018}`;
  if (year > 1989 || (year === 1989 && (month > 1 || day >= 8))) return `H${year - 1988}`;
  if (year > 1926 || (year === 1926 && month >= 12 && day >= 25)) return `S${year - 1925}`;
  return `${year}`;
}
