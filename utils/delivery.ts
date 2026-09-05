type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getDateParts(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getDateParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return wallClockAsUtc - date.getTime();
}

function zonedDateTimeToUtc(
  date: Pick<DateParts, "year" | "month" | "day">,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const wallClockAsUtc = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    hour,
    minute,
  );

  let result = new Date(
    wallClockAsUtc - getTimeZoneOffsetMs(new Date(wallClockAsUtc), timeZone),
  );
  result = new Date(wallClockAsUtc - getTimeZoneOffsetMs(result, timeZone));

  return result;
}

function addOneDay(
  date: Pick<DateParts, "year" | "month" | "day">,
): Pick<DateParts, "year" | "month" | "day"> {
  const nextDate = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));

  return {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate(),
  };
}

/** 指定タイムゾーンで次に到来する配信時刻をISO 8601形式で返す。 */
export function getNextDailyDeliveryStartTime(
  now: Date,
  timeZone: string,
  hour: number,
  minute: number,
): string {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new RangeError("hourまたはminuteが範囲外です。");
  }

  let localDate = getDateParts(now, timeZone);
  let next = zonedDateTimeToUtc(localDate, hour, minute, timeZone);

  if (next.getTime() <= now.getTime()) {
    localDate = { ...localDate, ...addOneDay(localDate) };
    next = zonedDateTimeToUtc(localDate, hour, minute, timeZone);
  }

  return next.toISOString();
}

/** 配列を指定件数ごとのバッチへ分割する。 */
export function chunkItems<T>(items: T[], batchSize: number): T[][] {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new RangeError("batchSizeは1以上の整数で指定してください。");
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    chunks.push(items.slice(index, index + batchSize));
  }

  return chunks;
}
