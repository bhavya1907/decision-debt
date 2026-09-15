# Decision Debt

**Turn a repository's history into an actionable list of decisions worth revisiting.**

Decision Debt is a full-stack developer tool that scans a GitHub repository's commits, pull requests, and issues for signals of short-term fixes and potentially reversed decisions. Instead of treating history as an archive, it makes the trade-offs hidden in that history discoverable—so engineering teams can investigate old workarounds before they become permanent liabilities.

> Built as an opinionated MVP: deterministic heuristics first, explainable evidence always, and an AI layer only where it would add real value.

## Why it matters

Every mature codebase accumulates decisions that outlive their original context: a temporary compatibility shim, a tactical workaround, or two pull requests that appear to undo one another. These are rarely tracked in a single place, and manually reconstructing the story is expensive.

Decision Debt helps answer:

- Which “temporary” fixes are still in the codebase months later?
- Which merged changes may have been superseded by a later change?
- What GitHub evidence supports each lead?

It produces **investigation leads, not automated verdicts**. Every finding carries a confidence score and links back to the source commit or pull request so an engineer can make the final call.

## What it does

1. Connect a public GitHub repository by owner and name.
2. Ingest its commits, pull requests, and issues through the GitHub API.
3. Run explainable, rule-based detectors over normalized activity.
4. Store repositories, findings, evidence, and ingestion metadata in SQLite.
5. Present a dashboard with decision activity, search, and filters by category or status.

### Detection signals

| Signal | How it works | Output |
| --- | --- | --- |
| Lingering workaround | Finds commit messages containing phrases such as `workaround`, `temporary fix`, `hack`, or `TODO: remove`, then flags those older than 90 days. | `WORKAROUND` finding with age-adjusted confidence |
| Possible reversal | Compares titles of chronologically ordered merged pull requests and flags pairs with substantial word overlap. | `SUPERSEDED` finding with evidence for both pull requests |

## Architecture

```text
GitHub API
    │  commits · pull requests · issues
    ▼
Express API + Octokit
    │  normalize and ingest
    ▼
Decision heuristics ──────────► SQLite / Prisma
    │                                 │
    └─────────────────────────────────┘
                      findings + evidence
                                      │
                                      ▼
                       React dashboard (Vite)
```

### Tech stack

- **Frontend:** React 18, React Router, Vite, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, Octokit REST client
- **Data:** Prisma ORM with SQLite
- **Developer experience:** npm workspaces-by-convention and `concurrently` for one-command local startup

## Run locally

### Prerequisites

- Node.js 20+
- npm
- SQLite CLI (`sqlite3`), used to initialize the local database

### Setup

```bash
git clone <your-fork-or-repository-url>
cd decision-debt
npm install
npm run setup
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173). The API health check is available at [http://localhost:4000/health](http://localhost:4000/health).

`npm run setup` creates `backend/.env`, installs each application’s dependencies, generates Prisma Client, and initializes `backend/prisma/dev.db`.

### GitHub token (recommended)

Public repositories work without a token, but GitHub’s unauthenticated rate limits are low. Add a personal access token to `backend/.env` to raise the limit:

```env
GITHUB_TOKEN="github_personal_access_token"
```

Keep the token local—`backend/.env` should never be committed. For this MVP, use repositories you are authorized to access and grant the narrowest practical token permissions.

## Using the app

1. Start the app and select **Connect a repo**.
2. Enter a GitHub owner and repository name, for example `facebook` / `react`.
3. Select **Connect & analyze**.
4. Review the dashboard’s activity chart and decision list.
5. Filter by status, category, or keywords; use the linked evidence as the starting point for a human review.

## API at a glance

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health check |
| `POST` | `/api/repos` | Register a repository with `{ owner, name }` |
| `POST` | `/api/repos/:id/ingest` | Fetch activity and create candidate findings |
| `GET` | `/api/repos/:id/activity` | Monthly finding counts for the dashboard |
| `GET` | `/api/decisions?repositoryId=...` | Search and filter findings |
| `GET` | `/api/decisions/:id` | Retrieve a finding with its evidence |

## Design decisions

**Explainability over opaque scoring.** The first version uses transparent heuristics and preserves source URLs, excerpts, authors, and timestamps for every finding. This keeps the tool auditable and useful without a model dependency.

**Human review stays in the loop.** Historical language is ambiguous. Confidence scores prioritize the queue; they do not claim that a decision is objectively stale or wrong.

**Local-first persistence.** SQLite makes the project easy to run and demo without provisioning cloud infrastructure, while Prisma keeps the data layer ready for a production database later.

## Current scope and next steps

This is a working MVP, intentionally optimized for clarity and local demonstration. Useful extensions include:

- Background jobs, progress reporting, retry behavior, and deduplication for large repositories
- Better semantic matching using embeddings, with reviewable explanations
- Code-level verification that a workaround still exists, rather than relying on commit-message age alone
- Decision detail and evidence views in the UI
- GitHub OAuth/App integration for private repositories and organization-safe access
- Tests, observability, pagination controls, and production deployment configuration

## Project structure

```text
decision-debt/
├── frontend/                 # React dashboard
│   └── src/pages/            # Connect-repository and dashboard views
├── backend/
│   ├── src/routes/           # Repository and decision API endpoints
│   ├── src/services/         # GitHub ingestion and detection heuristics
│   └── prisma/               # Schema and local SQLite initialization
└── package.json              # Root setup and concurrent dev scripts
```

## License

No license is currently declared. Add one before distributing or accepting external contributions.
