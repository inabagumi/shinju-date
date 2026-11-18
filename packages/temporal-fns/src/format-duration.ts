/**
 * Formats a Temporal.Duration to a readable format (e.g., 1:30:15 or 5:30)
 * @param duration - Temporal.Duration object
 * @returns Formatted duration string (H:MM:SS or M:SS)
 */
export function formatDuration(duration: Temporal.Duration): string {
  // Balance the units so that e.g. `PT90M` becomes 1:30:00 and days are
  // folded into hours (`P1DT2H3M4S` becomes 26:03:04)
  const balanced = duration.round({ largestUnit: "hours" });
  const hours = balanced.hours;
  const minutes = balanced.minutes;
  const seconds = balanced.seconds;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
