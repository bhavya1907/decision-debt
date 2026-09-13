import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import ConnectRepo from "./pages/ConnectRepo.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-6 py-4">
        <nav className="mx-auto flex max-w-5xl items-center gap-6">
          <Link to="/" className="font-semibold">Decision Debt</Link>
          <Link to="/connect" className="text-sm text-slate-600 hover:text-slate-900">
            Connect a repo
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/connect" element={<ConnectRepo />} />
        </Routes>
      </main>
    </div>
  );
}
