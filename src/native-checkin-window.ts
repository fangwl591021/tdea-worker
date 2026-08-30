export type NativeCheckinAvailability = {
  canCheckIn: boolean;
  checkinOpensAt: string;
  checkinOpensAtText: string;
  checkinReminder: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function firstClean(...values: unknown[]) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

export function nativeCheckinStart(activity: Record<string, unknown>) {
  const explicit = firstClean(
    activity.checkinStartsAt,
    activity.eventStartsAt,
    activity.startsAt,
    activity.startAt,
    activity.startDateTime
  );
  if (explicit && /T\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(explicit)) {
    const parsed = Date.parse(explicit);
    if (Number.isFinite(parsed)) return { timestamp: parsed, hasTime: true };
  }

  const text = firstClean(explicit, activity.courseTime, activity.activityDate, activity.date);
  const dateMatch = text.match(/(20\d{2})\s*[\/\.\-年]\s*(\d{1,2})\s*[\/\.\-月]\s*(\d{1,2})(?:\s*日)?/);
  if (!dateMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const dateOnly = new Date(Date.UTC(year, month - 1, day));
  if (dateOnly.getUTCFullYear() !== year || dateOnly.getUTCMonth() !== month - 1 || dateOnly.getUTCDate() !== day) return null;

  const remaining = text.slice((dateMatch.index || 0) + dateMatch[0].length);
  const timeMatch = remaining.match(/(?:^|[^\d])([01]?\d|2[0-3])\s*[:：]\s*([0-5]\d)/);
  const hour = timeMatch ? Number(timeMatch[1]) : 0;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  return { timestamp: Date.UTC(year, month - 1, day, hour - 8, minute), hasTime: Boolean(timeMatch) };
}

function nativeCheckinTimeText(timestamp: number, hasTime: boolean) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {})
  }).format(new Date(timestamp));
}

export function nativeCheckinAvailability(activity: Record<string, unknown>, now = Date.now()): NativeCheckinAvailability {
  const start = nativeCheckinStart(activity);
  if (!start) return { canCheckIn: true, checkinOpensAt: "", checkinOpensAtText: "", checkinReminder: "" };
  const checkinOpensAt = new Date(start.timestamp).toISOString();
  const checkinOpensAtText = nativeCheckinTimeText(start.timestamp, start.hasTime);
  const canCheckIn = now >= start.timestamp;
  return {
    canCheckIn,
    checkinOpensAt,
    checkinOpensAtText,
    checkinReminder: canCheckIn ? "" : `活動尚未開始，可於 ${checkinOpensAtText} 後核銷。請於活動開始後重新整理本頁。`
  };
}
