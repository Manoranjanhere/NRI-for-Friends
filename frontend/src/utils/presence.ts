const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The server refreshes lastActiveAt at most every 5 minutes, so allow a little slack. */
export function isOnlineNow(lastActiveAt?: string | null): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < 10 * MINUTE;
}

export function lastSeenLabel(lastActiveAt?: string | null): string {
  if (!lastActiveAt) return '';
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  if (diff < 10 * MINUTE) return 'Online now';
  if (diff < HOUR) return `Active ${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `Active ${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `Active ${Math.floor(diff / DAY)}d ago`;
  return 'Active a while ago';
}

export function timeAgo(date?: string | null): string {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(date).toLocaleDateString();
}
