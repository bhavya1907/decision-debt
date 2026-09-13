import { Octokit } from "@octokit/rest";
import { prisma } from "../lib/prisma.js";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

/**
 * Pulls commits, PRs and issues for a repo and stores raw activity.
 * Kept deliberately simple (no queue) for the MVP — call this from a route
 * and await it, or fire-and-forget with an IngestionJob row to track status.
 *
 * This does NOT create Decisions yet — see decisionHeuristics.js for that.
 * Ingestion's only job is: fetch raw GitHub data, normalize it, store it
 * somewhere queryable (here: attached as Evidence-shaped rows once a
 * Decision exists, or a separate RawActivity table if you add one later).
 */
export async function ingestRepository({ repositoryId, owner, name, since }) {
  const job = await prisma.ingestionJob.create({
    data: { repositoryId, status: "RUNNING", startedAt: new Date() },
  });

  try {
    const [commits, pulls, issues] = await Promise.all([
      fetchCommits(owner, name, since),
      fetchPullRequests(owner, name, since),
      fetchIssues(owner, name, since),
    ]);

    await prisma.repository.update({
      where: { id: repositoryId },
      data: { lastSyncedAt: new Date() },
    });

    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        stats: {
          commits: commits.length,
          pulls: pulls.length,
          issues: issues.length,
        },
      },
    });

    // Hand raw data back to the caller (e.g. a route) so it can run
    // decision-detection heuristics against it. Kept out of this function
    // so ingestion and detection stay independently testable.
    return { commits, pulls, issues };
  } catch (err) {
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), error: String(err) },
    });
    throw err;
  }
}

async function fetchCommits(owner, repo, since) {
  const commits = [];
  for await (const res of octokit.paginate.iterator(octokit.repos.listCommits, {
    owner,
    repo,
    since,
    per_page: 100,
  })) {
    commits.push(
      ...res.data.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.author?.login ?? c.commit.author?.name,
        date: c.commit.author?.date,
        url: c.html_url,
      }))
    );
  }
  return commits;
}

async function fetchPullRequests(owner, repo, since) {
  const pulls = [];
  for await (const res of octokit.paginate.iterator(octokit.pulls.list, {
    owner,
    repo,
    state: "all",
    per_page: 100,
  })) {
    pulls.push(
      ...res.data
        .filter((p) => !since || new Date(p.updated_at) >= new Date(since))
        .map((p) => ({
          number: p.number,
          title: p.title,
          body: p.body,
          author: p.user?.login,
          mergedAt: p.merged_at,
          updatedAt: p.updated_at,
          url: p.html_url,
        }))
    );
  }
  return pulls;
}

async function fetchIssues(owner, repo, since) {
  const issues = [];
  for await (const res of octokit.paginate.iterator(octokit.issues.listForRepo, {
    owner,
    repo,
    state: "all",
    since,
    per_page: 100,
  })) {
    issues.push(
      ...res.data
        .filter((i) => !i.pull_request) // exclude PRs, which the Issues API also returns
        .map((i) => ({
          number: i.number,
          title: i.title,
          body: i.body,
          author: i.user?.login,
          labels: i.labels?.map((l) => (typeof l === "string" ? l : l.name)),
          closedAt: i.closed_at,
          updatedAt: i.updated_at,
          url: i.html_url,
        }))
    );
  }
  return issues;
}
