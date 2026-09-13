const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  connectRepo: (owner, name) =>
    request("/repos", { method: "POST", body: JSON.stringify({ owner, name }) }),
  ingest: (repoId) => request(`/repos/${repoId}/ingest`, { method: "POST" }),
  activity: (repoId) => request(`/repos/${repoId}/activity`),
  listDecisions: (params) => request(`/decisions?${new URLSearchParams(params)}`),
  getDecision: (id) => request(`/decisions/${id}`),
};
