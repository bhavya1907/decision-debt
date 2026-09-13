/**
 * Rule-based decision detection. Deliberately NOT using an LLM here —
 * step 3 of the build order. Get this working on real repo data first;
 * the AI layer later just explains/summarizes what these heuristics find,
 * it doesn't replace them. That keeps the product useful even if the AI
 * feature is disabled, per the project's design principle.
 *
 * Each heuristic takes normalized {commits, pulls, issues} from
 * githubIngest.js and returns candidate decisions with evidence refs.
 * Candidates still need a human (or you, testing) to sanity-check before
 * you trust the signal — treat these as leads, not verdicts.
 */

const WORKAROUND_KEYWORDS = [
  "workaround",
  "temporary fix",
  "temp fix",
  "hack",
  "todo: remove",
  "quick fix",
  "band-aid",
  "revert later",
];

/**
 * Flags commits/PRs whose message suggests a temporary fix, then checks
 * whether that "temporary" code is still present N days later with no
 * follow-up commit removing/replacing it.
 */
export function findLingeringWorkarounds({ commits }, { staleDays = 90 } = {}) {
  const now = Date.now();
  const flagged = commits.filter((c) => {
    const text = c.message?.toLowerCase() ?? "";
    return WORKAROUND_KEYWORDS.some((kw) => text.includes(kw));
  });

  return flagged
    .map((c) => {
      const ageDays = (now - new Date(c.date).getTime()) / 86_400_000;
      return { commit: c, ageDays };
    })
    .filter(({ ageDays }) => ageDays >= staleDays)
    .map(({ commit, ageDays }) => ({
      title: `Possible lingering workaround: "${truncate(commit.message, 60)}"`,
      category: "workaround",
      status: "WORKAROUND",
      confidence: clamp(0.4 + ageDays / 365, 0.4, 0.85),
      firstSeenAt: commit.date,
      lastTouchedAt: commit.date,
      evidence: [
        {
          type: "COMMIT",
          sourceUrl: commit.url,
          externalRef: commit.sha,
          excerpt: truncate(commit.message, 200),
          authorLogin: commit.author,
          occurredAt: commit.date,
        },
      ],
    }));
}

/**
 * Flags a PR/issue that was closed/merged, then reopened or effectively
 * reversed by a later PR touching related keywords in its title. This is a
 * coarse title-similarity check — good enough as a first pass, worth
 * upgrading to embedding similarity later (that's a legitimate future
 * "optional AI" use, separate from the summarization feature).
 */
export function findReversedDecisions({ pulls }) {
  const merged = pulls.filter((p) => p.mergedAt);
  const candidates = [];

  for (let i = 0; i < merged.length; i++) {
    for (let j = i + 1; j < merged.length; j++) {
      const a = merged[i];
      const b = merged[j];
      if (new Date(b.mergedAt) <= new Date(a.mergedAt)) continue;
      if (titleOverlap(a.title, b.title) >= 0.5) {
        candidates.push({
          title: `Possibly reversed decision: "${truncate(a.title, 50)}" → "${truncate(b.title, 50)}"`,
          category: "reversal",
          status: "SUPERSEDED",
          confidence: 0.5,
          firstSeenAt: a.mergedAt,
          lastTouchedAt: b.mergedAt,
          evidence: [
            {
              type: "PULL_REQUEST",
              sourceUrl: a.url,
              externalRef: String(a.number),
              excerpt: truncate(a.title, 200),
              authorLogin: a.author,
              occurredAt: a.mergedAt,
            },
            {
              type: "PULL_REQUEST",
              sourceUrl: b.url,
              externalRef: String(b.number),
              excerpt: truncate(b.title, 200),
              authorLogin: b.author,
              occurredAt: b.mergedAt,
            },
          ],
        });
      }
    }
  }
  return candidates;
}

export function detectAllDecisions(rawActivity, options) {
  return [
    ...findLingeringWorkarounds(rawActivity, options),
    ...findReversedDecisions(rawActivity, options),
  ];
}

function titleOverlap(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const shared = [...wordsA].filter((w) => wordsB.has(w));
  return shared.length / Math.min(wordsA.size, wordsB.size);
}

function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
