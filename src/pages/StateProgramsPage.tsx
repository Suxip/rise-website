import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { type Program, type ProgramCategory } from "@/data/programs";
import { fetchPrograms } from "@/data/programs";
import ProgramCard from "@/components/ProgramCard";
import CategoryFilter from "@/components/CategoryFilter";
import StateTileMap from "@/components/StateTileMap";
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
  const stateParam = searchParams.get("state") || "";

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
    fetchPrograms()
      .then((data) => {
        const stateAndTerritory = data.filter((p) => p.level === "state" || p.level === "territory");

        setPrograms(stateAndTerritory);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const statePrograms = useMemo(
    () => programs.filter((p) => p.state?.toLowerCase() === selectedState.toLowerCase()),
    [programs, selectedState]
  );
  const filtered = useMemo(
    () => filter === "all" ? statePrograms : statePrograms.filter((p) => p.category === filter),
    [statePrograms, filter]
  );

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    const params = new URLSearchParams(searchParams);
    if (!value) {
      params.delete("state");
    } else {
      params.set("state", value);
    }
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="container py-12">
      <p className="text-base text-muted-foreground mb-1">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link> / State Programs
      </p>
      <section className="grid gap-10 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)] items-center py-8 md:py-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-5">Start with your state.</h1>
          <p className="text-base md:text-lg text-muted-foreground mb-7 max-w-md">Select a state on the map to find its rebates, incentives, and programs.</p>
          <label htmlFor="state-select" className="block text-base font-medium mb-2">Choose a state or territory</label>
          <Select value={selectedState} onValueChange={handleStateChange}>
            <SelectTrigger id="state-select" className="w-full max-w-sm bg-background">
              <SelectValue placeholder="Select a state or territory" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => <SelectItem key={state.code} value={state.name}>{state.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <StateTileMap selected={selectedState} onSelect={handleStateChange} />
      </section>

      <section aria-labelledby="state-results-heading" className="border-t pt-8">
        <div className="mb-6" aria-live="polite" aria-atomic="true">
          <h2 id="state-results-heading" className="text-2xl md:text-3xl mb-2">{selectedState ? `${selectedState} programs` : "Find programs near you"}</h2>
          <p className="text-base text-muted-foreground">{selectedState ? `${filtered.length} ${filtered.length === 1 ? "program" : "programs"}${filter === "all" ? "" : ` in ${filter}`}. Explore the details and official links below.` : "Choose a state or territory above to see its programs here."}</p>
        </div>
        {selectedState && <CategoryFilter active={filter} onChange={setFilter} />}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {!selectedState ? null : loading ? (
          <div className="col-span-full text-center text-muted-foreground py-10">Loading programs...</div>
        ) : error ? (
          <div className="col-span-full text-center text-muted-foreground py-10">Failed to load programs. Check your connection and try again.</div>
        ) : filtered.length > 0 ? (
          filtered.map((p) => <ProgramCard key={p.id} program={p} />)
        ) : (
          <div className="col-span-full rounded-lg border bg-card p-10 text-center">
            <p className="text-muted-foreground mb-4">
              {statePrograms.length === 0
                ? "No programs found for this selection. Check back soon!"
                : "No programs match this category."}
            </p>
            <Link to="/federal" className="text-base font-medium text-primary hover:underline">
              Browse Federal Programs →
            </Link>
          </div>
        )}
      </div>
      </section>
    </div>
  );
}