import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /api/decisions?repositoryId=&search=&category=&status=&component=&from=&to=&page=&pageSize=
router.get("/", async (req, res) => {
  const {
    repositoryId,
    search,
    category,
    status,
    component,
    from,
    to,
    page = "1",
    pageSize = "25",
  } = req.query;

  if (!repositoryId) {
    return res.status(400).json({ error: "repositoryId is required" });
  }

  const where = {
    repositoryId,
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
    ...(component ? { component } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    ...(from || to
      ? {
          firstSeenAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const take = Math.min(Number(pageSize) || 25, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.decision.findMany({
      where,
      orderBy: { lastTouchedAt: "desc" },
      skip,
      take,
      include: { primaryOwner: true, _count: { select: { evidence: true } } },
    }),
    prisma.decision.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), pageSize: take });
});

// GET /api/decisions/:id  — full detail with evidence, for the evidence panel
router.get("/:id", async (req, res) => {
  const decision = await prisma.decision.findUnique({
    where: { id: req.params.id },
    include: {
      evidence: { orderBy: { occurredAt: "asc" } },
      primaryOwner: true,
      repository: true,
    },
  });

  if (!decision) return res.status(404).json({ error: "Decision not found" });
  res.json(decision);
});

export default router;
