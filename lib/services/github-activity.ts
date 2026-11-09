/**
 * Commit activity for the Commit template's graph: 20 weeks × 7 days of
 * contribution counts, oldest week first, Sunday first within a week.
 *
 * Real cards never show made-up activity: without a username, or until the
 * snapshot exists, the graph is hidden. Thumbnails and the style guide use
 * sampleActivity(), a fixed pattern.
 */
export type Activity = { weeks: number[][]; total: number; fetchedAt: string };

export const ACTIVITY_WEEKS = 20;

/**
 * TODO(backend): a scheduled Function (daily) fetches each card's public
 * contributions from the GitHub GraphQL API
 * (user(login).contributionsCollection.contributionCalendar, with a server-side
 * token) and stores the last 20 weeks in githubActivity/{username}
 * { weeks, total, fetchedAt }. The public card reads that cached snapshot with
 * the Admin SDK (like publicCards, never GitHub directly from the browser).
 * Until then there is no snapshot, so the graph stays hidden.
 */
export async function getGithubActivity(username: string | undefined): Promise<Activity | null> {
  if (!username?.trim()) return null;
  return null;
}

/** Deterministic sample pattern for previews only. Never shown on a real card. */
export function sampleActivity(seed = 7): Activity {
  let h = seed;
  const rnd = () => ((h = (h * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const weeks = Array.from({ length: ACTIVITY_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const weekend = d === 0 || d === 6;
      const busy = 0.35 + 0.5 * Math.sin((w / ACTIVITY_WEEKS) * Math.PI);
      const r = rnd();
      if (r > busy + (weekend ? -0.25 : 0.15)) return 0;
      return Math.round(r * (weekend ? 3 : 9)) + 1;
    }),
  );
  return { weeks, total: weeks.flat().reduce((a, b) => a + b, 0), fetchedAt: "2026-11-01T00:00:00+08:00" };
}
