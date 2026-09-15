import { Router } from "express";
import { Octokit } from "@octokit/rest";
import { prisma } from "../lib/prisma.js";
import { ingestRepository } from "../services/githubIngest.js";
import { detectAllDecisions } from "../services/decisionHeuristics.js";

const router = Router();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// POST /api/repos  { owner, name }
// Registers a repo and kicks off first ingestion.
router.post("/", async (req, res) => {
  const { owner, name } = req.body;
  if (!owner || !name) {
    return res.status(400).json({ error: "owner and name are required" });
  }

  try {
    const ghRepo = await octokit.repos.get({ owner, repo: name });

    const repository = await prisma.repository.upsert({
      where: { owner_name: { owner, name } },
      update: {},
      create: {
        owner,
        name,
        // SQLite has no native 64-bit integer column; keeping this as a string
        // also avoids JSON serialization issues with JavaScript BigInts.
        githubId: String(ghRepo.data.id),
        defaultBranch: ghRepo.data.default_branch,
      },
    });

    res.status(201).json(repository);
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch repo from GitHub", detail: String(err) });
  }
});

// POST /api/repos/:id/ingest
// Runs ingestion + heuristic decision detection synchronously.
// Fine for an MVP demo; swap for a background worker if repos get large.
router.post("/:id/ingest", async (req, res) => {
  const { id } = req.params;
  const repository = await prisma.repository.findUnique({ where: { id } });
  if (!repository) return res.status(404).json({ error: "Repository not found" });

  try {
    const raw = await ingestRepository({
      repositoryId: repository.id,
      owner: repository.owner,
      name: repository.name,
      since: repository.lastSyncedAt ?? undefined,
    });

    const candidates = detectAllDecisions(raw);

    const created = await Promise.all(
      candidates.map((c) =>
        prisma.decision.create({
          data: {
            repositoryId: repository.id,
            title: c.title,
            category: c.category,
            status: c.status,
            confidence: c.confidence,
            firstSeenAt: new Date(c.firstSeenAt),
            lastTouchedAt: new Date(c.lastTouchedAt),
            evidence: {
              create: c.evidence.map((e) => ({
                type: e.type,
                sourceUrl: e.sourceUrl,
                externalRef: e.externalRef,
                excerpt: e.excerpt,
                authorLogin: e.authorLogin,
                occurredAt: new Date(e.occurredAt),
              })),
            },
          },
        })
      )
    );

    res.json({ ingested: raw, decisionsCreated: created.length });
  } catch (err) {
    res.status(500).json({ error: "Ingestion failed", detail: String(err) });
  }
});

// GET /api/repos/:id/activity
// Lightweight aggregation for the dashboard chart.
router.get("/:id/activity", async (req, res) => {
  const { id } = req.params;
  const decisions = await prisma.decision.findMany({
    where: { repositoryId: id },
    select: { firstSeenAt: true, status: true },
  });

  const byMonth = {};
  for (const d of decisions) {
    const key = d.firstSeenAt.toISOString().slice(0, 7); // YYYY-MM
    byMonth[key] = byMonth[key] || { total: 0, byStatus: {} };
    byMonth[key].total += 1;
    byMonth[key].byStatus[d.status] = (byMonth[key].byStatus[d.status] || 0) + 1;
  }

  res.json(byMonth);
});

export default router;
