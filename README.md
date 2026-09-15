# Decision Debt

Decision Debt identifies potentially stale workarounds and reversed decisions in
a GitHub repository's history.

## Run locally

Requires Node.js 20+.

```sh
npm install
npm run setup
npm run dev
```

Open http://localhost:5173. The API is available at http://localhost:4000/health.

The app uses a local SQLite database at `backend/prisma/dev.db`, created automatically
by `npm run setup`. Add an optional `GITHUB_TOKEN` to the generated `backend/.env`
to raise GitHub API limits:

```sh
cp backend/.env.example backend/.env
```
