import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export default function ConnectRepo() {
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle"); // idle | connecting | ingesting | error
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("connecting");
    setError(null);
    try {
      const repo = await api.connectRepo(owner.trim(), name.trim());
      setStatus("ingesting");
      await api.ingest(repo.id);
      navigate(`/?repositoryId=${repo.id}`);
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Connect a GitHub repository</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Owner</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="e.g. facebook"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Repository name</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. react"
            required
          />
        </div>
        <button
          type="submit"
          disabled={status === "connecting" || status === "ingesting"}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {status === "connecting" && "Connecting…"}
          {status === "ingesting" && "Ingesting history — this can take a bit…"}
          {(status === "idle" || status === "error") && "Connect & analyze"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
