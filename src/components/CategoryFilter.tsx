import { CATEGORIES, type ProgramCategory } from "@/data/programs";

interface Props {
  active: ProgramCategory | "all";
  onChange: (cat: ProgramCategory | "all") => void;
}

export default function CategoryFilter({ active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("all")}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          active === "all"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        All Programs
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onChange(cat.key)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            active === cat.key
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {cat.icon} {cat.label}
        </button>
      ))}
    </div>
  );
}
