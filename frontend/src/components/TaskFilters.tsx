import { useSearchParams } from "react-router-dom";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Filters are read from and written to the URL's query string, so a filtered view is
// always a shareable/bookmarkable link — no filter state lives only in React memory.
export default function TaskFilters() {
  const [params, setParams] = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <div className="task-filters">
      <select value={params.get("status") ?? ""} onChange={(e) => update("status", e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s.replace("_", " ")}</option>
        ))}
      </select>
      <select value={params.get("priority") ?? ""} onChange={(e) => update("priority", e.target.value)}>
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <label>
        Due after
        <input type="date" value={params.get("dueAfter") ?? ""} onChange={(e) => update("dueAfter", e.target.value)} />
      </label>
      <label>
        Due before
        <input type="date" value={params.get("dueBefore") ?? ""} onChange={(e) => update("dueBefore", e.target.value)} />
      </label>
    </div>
  );
}
