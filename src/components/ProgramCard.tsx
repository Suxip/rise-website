import { useState } from "react";
import { ExternalLink, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Program, ProgramCategory } from "@/data/programs";
import { set } from "date-fns";

const CATEGORY_STYLES: Record<ProgramCategory, string> = {
  energy: "bg-energy/15 text-energy border-energy/30",
  water: "bg-water/15 text-water border-water/30",
  transportation: "bg-transport/15 text-transport border-transport/30",
  recycling: "bg-recycle/15 text-recycle border-recycle/30",
};

const CATEGORY_ICONS: Record<ProgramCategory, string> = {
  energy: "⚡",
  water: "💧",
  transportation: "🚗",
  recycling: "♻️",
};

export default function ProgramCard({ program }: { program: Program }) {
  const [hovered, setHovered] = useState(false);
  const [locked, setLocked] = useState(false);
  const expanded = hovered || locked ;

  const HandleClick = () => {
    if(locked){ //if already locked, unlock by click which de-expands
      setLocked(false);
      setHovered(false);
    } else{
      setLocked(true);
    }
  }

  return (
    <div
      className="group rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
      onMouseEnter={() => program.details && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => program.details && HandleClick()}>
    
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-serif text-lg text-card-foreground leading-snug">{program.name}</h3>
        <span
          className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[program.category]}`}
        >
          {CATEGORY_ICONS[program.category]} {program.category.charAt(0).toUpperCase() + program.category.slice(1)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{program.description}</p>

      <AnimatePresence>
        {expanded && program.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-md bg-muted p-3 mb-3 text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30">
              <p className="font-medium text-foreground text-xs uppercase tracking-wide mb-1">How to Access</p>
              {program.details}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <a
          href={program.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Visit Official Site <ExternalLink size={14} />
        </a>
        {program.details && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLocked(!locked);
            }}
            className="md:hidden inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Details <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
    </div>
  );
}
