import { useParams, Link } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { US_STATES, type ProgramCategory } from "@/data/programs";
import ProgramCard from "@/components/ProgramCard";
import CategoryFilter from "@/components/CategoryFilter";
import { fetchPrograms } from "@/data/programs";

const API = "http://localhost:3001/api";

export default function StatePage() {
  const { code } = useParams<{ code: string }>();
  const stateCode = code?.toUpperCase() ?? "";
  const stateName = US_STATES.find((s) => s.code === stateCode)?.name ?? stateCode;

  const [filter, setFilter] = useState<ProgramCategory | "all">("all");
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPrograms()
      .then((data) => {
        setPrograms(data.filter((p) => p.state.toLowerCase() === stateName.toLowerCase()));
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [stateName]);

  const filtered = useMemo(
    () => (filter === "all" ? programs : programs.filter((p) => p.category === filter)),
    [programs, filter]
  );

  return (
    <div className="container py-12">
      <p className="text-sm text-muted-foreground mb-1">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link> / {stateName}
      </p>
      <h1 className="font-serif text-3xl md:text-4xl mb-2">{stateName}</h1>
      <p className="text-muted-foreground mb-8">Browse statewide residential programs and official resources.</p>

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
            <p className="text-muted-foreground mb-4">
              {programs.length === 0
                ? "We haven't added programs for this state yet. Check back soon!"
                : "No programs match this category."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/federal" className="text-sm font-medium text-primary hover:underline">
                Browse Federal Programs →
              </Link>
              <Link to="/contact" className="text-sm font-medium text-primary hover:underline">
                Suggest a Program →
              </Link>
            </div>
          </div>
        )}
      </div>

      {programs.length > 0 && (
        <div className="mt-12 rounded-lg border bg-muted p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Not seeing what you need?{" "}
            <Link to="/federal" className="text-primary font-medium hover:underline">View Federal Programs</Link>
            {" or "}
            <Link to="/contact" className="text-primary font-medium hover:underline">Contact Us</Link>
          </p>
        </div>
      )}
    </div>
  );
}