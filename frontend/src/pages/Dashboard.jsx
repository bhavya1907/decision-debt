import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api.js";

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const repositoryId = searchParams.get("repositoryId");

  const [activity, setActivity] = useState(null);
  const [decisions, setDecisions] = useState(null);
  const [filters, setFilters] = useState({ status: "", category: "", search: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!repositoryId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.activity(repositoryId),
      api.listDecisions({ repositoryId, ...cleanFilters(filters) }),
    ])
      .then(([activityData, decisionsData]) => {
        setActivity(activityData);
        setDecisions(decisionsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [repositoryId, filters]);

  if (!repositoryId) {
    return (
      <p className="text-slate-600">
        No repository connected yet. Head to <span className="font-medium">Connect a repo</span> to get started.
      </p>
    );
  }

  const chartData = activity
    ? Object.entries(activity)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, total: v.total }))
    : [];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 text-lg font-semibold">Decision activity</h2>
        <div className="h-64 rounded border bg-white p-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" fill="#1e293b" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-slate-400">
              {loading ? "Loading…" : "No decision activity yet."}
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Decisions</h2>
          <FilterBar filters={filters} onChange={setFilters} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-slate-400">Loading…</p>}

        <ul className="divide-y rounded border bg-white">
          {decisions?.items?.length ? (
            decisions.items.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-slate-500">
                    {d.category} · {d._count.evidence} evidence item(s) · confidence{" "}
                    {(d.confidence * 100).toFixed(0)}%
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </li>
            ))
          ) : (
            !loading && <li className="px-4 py-6 text-center text-sm text-slate-400">No decisions found.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function FilterBar({ filters, onChange }) {
  return (
    <div className="flex gap-2">
      <input
        className="rounded border px-2 py-1 text-sm"
        placeholder="Search title…"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
      />
      <select
        className="rounded border px-2 py-1 text-sm"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
      >
        <option value="">All statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="STALE">Stale</option>
        <option value="SUPERSEDED">Superseded</option>
        <option value="WORKAROUND">Workaround</option>
      </select>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    ACTIVE: "bg-green-100 text-green-800",
    STALE: "bg-amber-100 text-amber-800",
    SUPERSEDED: "bg-slate-200 text-slate-700",
    WORKAROUND: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[status] || ""}`}>
      {status}
    </span>
  );
}

function cleanFilters(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
}
