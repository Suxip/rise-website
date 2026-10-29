import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { US_STATES, CATEGORIES } from "@/data/programs";
import usMapOutline from "@/assets/us-map-outline.png";

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
      {/* Hero */}
      <section className="relative bg-background py-16 md:py-24 z-20">
        {/* US map watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src={usMapOutline}
            alt=""
            aria-hidden="true"
            className="w-[140%] max-w-none md:w-[120%] md:max-w-6xl opacity-[0.15]"
          />
        </div>

        <div className="container relative text-center">

          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-5 leading-[1.1]"
          >
            Find Residential <br className="hidden sm:block" /> Incentives and Rebates Today
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg max-w-2xl mx-auto mb-3 leading-relaxed md:text-base text-ring"
          >
            RISE makes it easy to find energy rebates, water incentives, transportation programs, and recycling initiatives in your state and nationwide.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            <button
              onClick={() => navigate("/local")}
              className="underline underline-offset-4 transition-colors active:scale-[0.97] text-[#245615] font-bold font-sans text-base"
            >
              Looking for local resources? Start here →
            </button>
          </motion.p>

          {/* Search / select state dropdown */}
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md mx-auto mt-8"
            ref={dropdownRef}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search for your state or territory..."
                className="w-full rounded-xl border bg-card py-3.5 pl-11 pr-4 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-xl border bg-card shadow-xl z-50">
                  {filtered.length > 0 ? (
                    filtered.map((s) => (
                      <button
                        key={s.code}
                        onClick={() => handleSelectState(s.code)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-card-foreground hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        <span>{s.name}</span>
                        <ArrowRight size={14} className="text-muted-foreground" />
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-3 text-sm text-muted-foreground">No matching states found.</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Browse Federal */}
      <section className="container py-16">
        <h2 className="font-serif text-2xl md:text-3xl text-center mb-10">Browse Federal Programs</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => navigate(`/federal?category=${cat.key}`)}
              className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-sm font-medium text-card-foreground">{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Why RISE */}
      <section className="bg-muted py-16">
        <div className="container max-w-3xl text-center">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">Why RISE?</h2>
          <p className="leading-relaxed text-ring">
            Saving money shouldn't be complicated. Right now, information about rebates and incentives is scattered across dozens of government websites and buried in technical language. RISE organizes information by state and category so you can quickly see what is available, whether you qualify, and how to apply, with no policy expertise required.
          </p>
        </div>
      </section>
    </>
  );
}
