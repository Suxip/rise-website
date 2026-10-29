import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { type ProgramCategory, type Program } from "@/data/programs";
import { fetchPrograms } from "@/data/programs";
import ProgramCard from "@/components/ProgramCard";
import CategoryFilter from "@/components/CategoryFilter";
import { US_STATES } from "@/data/programs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StateProgramsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = (searchParams.get("category") as ProgramCategory) || "all";
  const stateParam = searchParams.get("state") || "all";

  const [filter, setFilter] = useState<ProgramCategory | "all">(initialCat);
  const [selectedState, setSelectedState] = useState(stateParam);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Keep selectedState in sync with URL changes (e.g. from Home search).
  useEffect(() => {
    setSelectedState(stateParam);
  }, [stateParam]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    // The URL and dropdown use state names; the database is keyed by code.
    const stateCode = selectedState === "all"
      ? undefined
      : US_STATES.find((s) => s.name.toLowerCase() === selectedState.toLowerCase())?.code ?? selectedState;
    fetchPrograms({ levels: ["state", "territory"], stateCode })
      .then((data) => {
        setPrograms(data);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [selectedState]);

  const filtered = useMemo(
    () => (filter === "all" ? programs : programs.filter((p) => p.category === filter)),
    [programs, filter]
  );

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("state");
    } else {
      params.set("state", value);
    }
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="container py-12">
      <p className="text-sm text-muted-foreground mb-1">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link> / State Programs
      </p>
      <h1 className="font-serif text-3xl md:text-4xl mb-2">State Programs</h1>
      <p className="text-muted-foreground mb-8">
        Browse incentives available at the state level across the U.S.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Select value={selectedState} onValueChange={handleStateChange}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="All States & Territories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States & Territories</SelectItem>
          {US_STATES.map((s) => (
            <SelectItem key={s.code} value={s.name}>
              {s.name}
            </SelectItem>
          ))}
          </SelectContent>
        </Select>
      </div>

      <CategoryFilter active={filter} onChange={setFilter} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-full text-center text-muted-foreground py-10">Loading programs...</div>
        ) : error ? (
          <div className="col-span-full text-center text-muted-foreground py-10">Failed to load programs. Check your connection and try again.</div>
        ) : filtered.length > 0 ? (
          filtered.map((p) => <ProgramCard key={p.id} program={p} />)
        ) : (
          <div className="col-span-full rounded-lg border bg-card p-10 text-center">
            <p className="text-muted-foreground mb-4">
              {programs.length === 0
                ? "No programs found for this selection. Check back soon!"
                : "No programs match this category."}
            </p>
            <Link to="/federal" className="text-sm font-medium text-primary hover:underline">
              Browse Federal Programs →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}