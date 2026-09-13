import "dotenv/config";
import express from "express";
import cors from "cors";
import repositoriesRouter from "./routes/repositories.js";
import decisionsRouter from "./routes/decisions.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/repos", repositoriesRouter);
app.use("/api/decisions", decisionsRouter);

// Basic centralized error handler so uncaught route errors don't crash silently
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Decision Debt API listening on :${port}`));
