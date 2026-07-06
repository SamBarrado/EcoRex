export function formatEnergyCountdown(resetAt: number, now: number = Date.now()): string {
  const remainingMs = Math.max(0, resetAt - now);
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
