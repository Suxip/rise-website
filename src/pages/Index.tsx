import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowRight, ChevronRight } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { US_STATES, CATEGORIES } from "@/data/programs";

export default function Index() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      search.length > 0
        ? US_STATES.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
        : US_STATES,
    [search]
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelectState = (code: string) => {
    setShowDropdown(false);
    setSearch("");
    const stateName = US_STATES.find((s) => s.code === code)?.name ?? code;
    navigate(`/states?state=${encodeURIComponent(stateName)}`);
  };

  return (
    <>
      <section className="relative z-20 bg-background pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="container text-center">
          <p className="text-sm font-semibold tracking-wide text-primary mb-5">A little easier. A little more sustainable.</p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mx-auto max-w-5xl text-[clamp(3rem,6.8vw,6rem)] font-semibold leading-[1.04] tracking-[-0.055em]">
            A better home.<br />More within reach.
          </motion.h1>
          <p className="mx-auto mt-7 max-w-xl text-xl md:text-2xl leading-relaxed text-muted-foreground">
            Rebates, credits, and programs for your home.<br className="hidden sm:block" /> All in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-7">
            <button onClick={() => { setShowDropdown(true); dropdownRef.current?.querySelector('input')?.focus(); }}
              className="rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80">
              Choose your state
            </button>
            <button onClick={() => navigate('/federal')} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4">
              Browse federal programs <ChevronRight size={16} />
            </button>
          </div>
          <div className="relative mx-auto mt-9 max-w-md text-left" ref={dropdownRef}>
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={18} />
            <input type="text" aria-label="Search for your state or territory" value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)} onKeyDown={(e) => { if(e.key === 'Escape') setShowDropdown(false); if(e.key === 'Enter' && filtered.length === 1) handleSelectState(filtered[0].code); }}
              placeholder="Search your state or territory"
              className="w-full rounded-full border border-transparent bg-muted py-4 pl-12 pr-5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            {showDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-2xl border bg-background p-2 shadow-xl">
                {filtered.length > 0 ? filtered.map((state) => (
                  <button key={state.code} onClick={() => handleSelectState(state.code)} className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm hover:bg-muted">
                    {state.name}<ArrowRight size={14} className="text-muted-foreground" />
                  </button>
                )) : <p className="px-4 py-3 text-sm text-muted-foreground">No matching states found.</p>}
              </div>
            )}
          </div>
          <button onClick={() => navigate('/local')} className="mt-5 text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-4">
            Looking for local resources? Start here <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>
      <section className="container pb-20 md:pb-28" aria-label="Browse federal programs by category">
        <div className="grid gap-5 md:grid-cols-2 max-w-6xl mx-auto">
          {CATEGORIES.map((cat, index) => (
            <button key={cat.key} onClick={() => navigate(`/federal?category=${cat.key}`)}
              className={`group flex min-h-64 md:min-h-72 flex-col items-start rounded-[2rem] p-8 md:p-11 text-left transition-transform hover:-translate-y-1 ${index === 0 ? 'bg-[#1d1d1f] text-white' : 'bg-muted text-foreground'}`}>
              <span className={`mb-5 h-2 w-2 rounded-full ${{energy:'bg-energy',water:'bg-water',transportation:'bg-transport',recycling:'bg-recycle'}[cat.key]}`} aria-hidden="true" />
              <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.045em]">{cat.label}</h2>
              <p className={`mt-3 text-base ${index === 0 ? 'text-white/65' : 'text-muted-foreground'}`}>
                {{energy:'Heat pumps, solar, and efficiency upgrades.',water:'Water-saving fixtures and conservation.',transportation:'EVs, e-bikes, charging, and transit.',recycling:'A second life for appliances and electronics.'}[cat.key]}
              </p>
              <span className={`mt-7 inline-flex items-center gap-1 text-sm font-medium ${index === 0 ? 'text-[#83c6a4]' : 'text-primary'}`}>Browse {cat.label.toLowerCase()} <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
            </button>
          ))}
        </div>
      </section>
      <section className="bg-muted py-20 md:py-28">
        <div className="container max-w-3xl text-center">
          <p className="text-sm font-medium text-muted-foreground mb-4">Why RISE?</p>
          <h2 className="text-4xl md:text-5xl leading-tight mb-6">Good for your home.<br />Easier on your wallet.</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">Saving money shouldn't be complicated. RISE brings together residential incentives from across the country, so you can find what's available, understand who qualifies, and take the next step.</p>
          <button onClick={() => navigate('/about')} className="mt-7 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4">Get to know RISE <ChevronRight size={16} /></button>
        </div>
      </section>
    </>
  );
}
