import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { type ProgramCategory } from "@/data/programs";
import ProgramCard from "@/components/ProgramCard";
import CategoryFilter from "@/components/CategoryFilter";
import { fetchPrograms } from "@/data/programs";

const API = "http://localhost:3001/api";

export default function FederalPage() {
  const [searchParams] = useSearchParams();
  const initialCat = (searchParams.get("category") as ProgramCategory) || "all";
  const [filter, setFilter] = useState<ProgramCategory | "all">(initialCat);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPrograms()
      .then((data) => {
        setPrograms(data.filter((p) => p.level === "federal"));
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? programs : programs.filter((p) => p.category === filter)),
    [programs, filter]
  );

  return (
    <div className="container py-12">
      <p className="text-sm text-muted-foreground mb-1">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link> / Federal Programs
      </p>
      <h1 className="font-serif text-3xl md:text-4xl mb-2">Federal Programs</h1>
      <p className="text-muted-foreground mb-8">
        Nationwide incentives available to residents across all states and territories.
      </p>

      <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-4 mb-8 text-sm text-muted-foreground">
        <strong className="text-foreground">Note:</strong> Federal programs may be administered through state agencies or local utilities. Check your state page for local implementation details.
      </div>

      <CategoryFilter active={filter} onChange={setFilter} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-full text-center text-muted-foreground py-10">Loading programs...</div>
        ) : error ? (
          <div className="col-span-full text-center text-muted-foreground py-10">Failed to load programs. Make sure the backend is running.</div>
        ) : filtered.length > 0 ? (
          filtered.map((p) => <ProgramCard key={p.id} program={p} />)
        ) : (
          <div className="col-span-full rounded-lg border bg-card p-10 text-center">
            <p className="text-muted-foreground mb-4">No programs match this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}