import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ExternalLink } from "lucide-react";
import type { Program, ProgramCategory } from "@/data/programs";

const DESCRIPTIONS: Record<ProgramCategory, string> = {
  energy: "Heat pumps, solar, and efficiency upgrades.",
  water: "Water-saving fixtures and conservation.",
  transportation: "EVs, e-bikes, charging, and transit.",
  recycling: "A second life for appliances and electronics.",
};
const DOTS: Record<ProgramCategory, string> = {
  energy: "bg-energy", water: "bg-water", transportation: "bg-transport", recycling: "bg-recycle",
};

export default function CategoryFlashcard({ category, label, dark, program }: {
  category: ProgramCategory; label: string; dark: boolean; program?: Program;
}) {
  const [flipped, setFlipped] = useState(false);
  const surface = dark ? "bg-[#1d1d1f] text-white" : "bg-muted text-foreground";
  const muted = dark ? "text-white/65" : "text-muted-foreground";
  const link = dark ? "text-[#83c6a4]" : "text-primary";
  return (
    <div className="category-flashcard group min-h-64 md:min-h-72 rounded-[2rem] text-left"
      tabIndex={0} role="group" aria-label={`${label}: focus or tap to reveal a program spotlight`}
      onMouseEnter={() => setFlipped(true)} onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFlipped(false); }}
      onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "Escape") setFlipped(false); if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setFlipped(value => !value); } }}>
      <div className={`category-flashcard-inner ${flipped ? "is-flipped" : ""}`}>
        <div onClick={() => setFlipped(true)} aria-hidden={flipped}
          className={`category-flashcard-face flex w-full flex-col items-start rounded-[2rem] p-8 md:p-11 text-left ${surface}`}>
          <span className={`mb-5 h-2 w-2 rounded-full ${DOTS[category]}`} aria-hidden="true" />
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.045em]">{label}</h2>
          <p className={`mt-3 text-base ${muted}`}>{DESCRIPTIONS[category]}</p>
          <span className={`mt-7 inline-flex items-center gap-1 text-base font-medium ${link}`}>Browse {label.toLowerCase()} <ChevronRight size={16} /></span>
        </div>
        <div aria-hidden={!flipped} className={`category-flashcard-face category-flashcard-back flex flex-col items-start rounded-[2rem] p-8 md:p-11 ${surface}`}>
          <p className={`text-base font-medium ${link}`}>{label} spotlight</p>
          <h3 className="mt-2 line-clamp-2 text-xl font-semibold leading-tight tracking-tight">{program?.name || `Explore ${label.toLowerCase()} programs`}</h3>
          <p className={`mt-2 line-clamp-2 text-base leading-relaxed ${muted}`}>{program?.description || "Discover programs and official resources in this category."}</p>
          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-4">
            {program?.url && <a href={program.url} target="_blank" rel="noopener noreferrer" tabIndex={flipped ? 0 : -1} className={`inline-flex items-center gap-1 text-base font-medium hover:underline ${link}`}>View program <ExternalLink size={16} /></a>}
            <Link to={`/federal?category=${category}`} tabIndex={flipped ? 0 : -1} className={`inline-flex items-center gap-1 text-base font-medium hover:underline ${link}`}>Browse all <ChevronRight size={16} /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
