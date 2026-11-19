import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CATEGORIES, US_STATES } from "@/data/programs";
import {
  listAdminNames,
  listAllPrograms,
  markReviewed,
  setPublished,
  signOut,
  type AdminProgram,
  type CurrentAdmin,
} from "@/data/admin";
import ProgramForm from "@/components/admin/ProgramForm";

const PAGE_SIZE = 50;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const selectClass = "rounded-md border bg-background px-3 py-2 text-base";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Something went wrong. Try again.";
}

export default function AdminPage({ admin }: { admin: CurrentAdmin }) {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<AdminProgram[]>([]);
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "hidden">("all");
  const [reviewFilter, setReviewFilter] = useState<"all" | "never" | "reviewed">("all");
  const [shown, setShown] = useState(PAGE_SIZE);

  // undefined = form closed, null = adding a new program, otherwise editing that program
  const [editing, setEditing] = useState<AdminProgram | null | undefined>(undefined);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([listAllPrograms(), listAdminNames()])
      .then(([rows, names]) => {
        setPrograms(rows);
        setAdminNames(names);
      })
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  // Go back to the first page of results whenever the filters change.
  useEffect(() => setShown(PAGE_SIZE), [search, stateFilter, categoryFilter, statusFilter, reviewFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return programs.filter((p) => {
      if (stateFilter === "federal" ? p.level !== "federal" : stateFilter !== "all" && p.stateCode !== stateFilter) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (statusFilter === "published" && !p.isPublished) return false;
      if (statusFilter === "hidden" && p.isPublished) return false;
      if (reviewFilter === "never" && p.lastReviewed) return false;
      if (reviewFilter === "reviewed" && !p.lastReviewed) return false;
      if (q && !`${p.name} ${p.description} ${p.state} ${p.programType ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [programs, search, stateFilter, categoryFilter, statusFilter, reviewFilter]);

  const stats = useMemo(
    () => ({
      total: programs.length,
      published: programs.filter((p) => p.isPublished).length,
      hidden: programs.filter((p) => !p.isPublished).length,
      neverReviewed: programs.filter((p) => !p.lastReviewed).length,
    }),
    [programs]
  );

  const replaceProgram = (updated: AdminProgram) =>
    setPrograms((prev) => {
      const exists = prev.some((p) => p.id === updated.id);
      return exists ? prev.map((p) => (p.id === updated.id ? updated : p)) : [updated, ...prev];
    });

  const handleTogglePublished = async (p: AdminProgram) => {
    setBusyId(p.id);
    try {
      await setPublished(p.id, !p.isPublished);
      replaceProgram({ ...p, isPublished: !p.isPublished });
      toast.success(p.isPublished ? `Hid "${p.name}"` : `Published "${p.name}"`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkReviewed = async (p: AdminProgram) => {
    setBusyId(p.id);
    try {
      await markReviewed(p.id);
      replaceProgram({ ...p, lastReviewed: format(new Date(), "yyyy-MM-dd"), reviewedBy: admin.userId });
      toast.success(`Marked "${p.name}" as reviewed`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="container py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight mb-2">Program admin</h1>
          <p className="text-base text-muted-foreground">Logged in as {admin.displayName}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-base font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus size={18} /> Add program
          </button>
          <button onClick={handleSignOut} className="rounded-full border px-5 py-2 text-base hover:bg-muted">
            Sign out
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total programs", value: stats.total },
          { label: "Published", value: stats.published },
          { label: "Hidden", value: stats.hidden },
          { label: "Never reviewed", value: stats.neverReviewed },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-card p-5">
            <p className="text-base text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-semibold">{loading ? "–" : s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search name, description, state..."
          aria-label="Search programs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${selectClass} min-w-[240px] flex-1`}
        />
        <select aria-label="Filter by state" className={selectClass} value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="all">All states</option>
          <option value="federal">Federal</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
        <select aria-label="Filter by category" className={selectClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{capitalize(c.key)}</option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          className={selectClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">Published and hidden</option>
          <option value="published">Published only</option>
          <option value="hidden">Hidden only</option>
        </select>
        <select
          aria-label="Filter by review"
          className={selectClass}
          value={reviewFilter}
          onChange={(e) => setReviewFilter(e.target.value as typeof reviewFilter)}
        >
          <option value="all">Any review status</option>
          <option value="never">Never reviewed</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </div>

      <p className="mb-3 text-base text-muted-foreground" aria-live="polite">
        {loading ? "Loading programs..." : `${filtered.length} ${filtered.length === 1 ? "program" : "programs"}`}
      </p>

      {loadError ? (
        <p role="alert" className="rounded-2xl bg-card p-8 text-center text-destructive">
          Couldn't load programs: {loadError}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-card">
          <table className="w-full text-left text-base">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Program</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last reviewed</th>
                <th className="px-4 py-3 font-medium sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, shown).map((p) => (
                <tr key={p.id} className="border-b last:border-0 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      #{p.id}
                      {p.programType ? ` · ${p.programType}` : ""}
                      {p.source ? ` · ${p.source}` : ""}
                    </p>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Open link <ExternalLink size={12} />
                    </a>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{p.level === "federal" ? "Federal" : p.stateCode}</td>
                  <td className="px-4 py-3">{capitalize(p.category)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleTogglePublished(p)}
                      disabled={busyId === p.id}
                      title={p.isPublished ? "Click to hide from the public site" : "Click to publish"}
                      className={`rounded-full px-3 py-1 text-sm font-medium disabled:opacity-50 ${
                        p.isPublished ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.isPublished ? "Published" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.lastReviewed ? (
                      <>
                        <p>{p.lastReviewed}</p>
                        {p.reviewedBy && (
                          <p className="text-sm text-muted-foreground">by {adminNames[p.reviewedBy] ?? "unknown"}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <button onClick={() => setEditing(p)} className="text-base font-medium text-primary hover:underline">
                        Edit
                      </button>
                      <button
                        onClick={() => handleMarkReviewed(p)}
                        disabled={busyId === p.id}
                        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        Mark reviewed
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <p className="p-8 text-center text-muted-foreground">No programs match these filters.</p>
          )}
        </div>
      )}

      {filtered.length > shown && (
        <div className="mt-6 text-center">
          <button onClick={() => setShown((n) => n + PAGE_SIZE)} className="rounded-full border px-5 py-2 text-base hover:bg-muted">
            Show more ({filtered.length - shown} left)
          </button>
        </div>
      )}

      {editing !== undefined && (
        <ProgramForm
          program={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(saved) => {
            replaceProgram(saved);
            setEditing(undefined);
            toast.success(editing ? `Saved "${saved.name}"` : `Added "${saved.name}"`);
          }}
        />
      )}
    </div>
  );
}