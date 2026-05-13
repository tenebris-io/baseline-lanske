export function parseTimestamp(ts: string): Date {
  return new Date(ts.endsWith('Z') ? ts : ts + 'Z');
}

export function formatMinutesAgo(timestamp: string): string {
  const diff = Math.floor((Date.now() - parseTimestamp(timestamp).getTime()) / 60000);
  if (diff < 1) return '< 1 minute ago';
  if (diff === 1) return '1 minute ago';
  if (diff < 60) return `${diff} minutes ago`;
  const hours = Math.floor(diff / 60);
  if (hours === 1) return '1 hour ago';
  return `${hours} hours ago`;
}

export function isStaleReading(timestamp: string, thresholdMinutes = 10): boolean {
  const diff = (Date.now() - parseTimestamp(timestamp).getTime()) / 60000;
  return diff > thresholdMinutes;
}

export function isNoSignal(timestamp: string, thresholdMinutes = 30): boolean {
  const diff = (Date.now() - parseTimestamp(timestamp).getTime()) / 60000;
  return diff > thresholdMinutes;
}

export function formatTime(timestamp: string): string {
  return parseTimestamp(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(timestamp: string): string {
  const d = parseTimestamp(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function hoursToLabel(hours: number): string {
  if (hours < 24) return `${hours}h`;
  return `${hours / 24}d`;
}
