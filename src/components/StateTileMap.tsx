import { US_STATES } from "@/data/programs";

// A tile atlas preserves the relative geography while keeping small states clickable.
const ROWS = [
  ["AK", "", "", "", "", "", "", "", "", "", "ME"],
  ["", "", "", "", "", "WI", "", "", "", "VT", "NH"],
  ["WA", "ID", "MT", "ND", "MN", "IL", "MI", "", "NY", "MA", ""],
  ["OR", "NV", "WY", "SD", "IA", "IN", "OH", "PA", "NJ", "CT", "RI"],
  ["CA", "UT", "CO", "NE", "MO", "KY", "WV", "VA", "MD", "DE", ""],
  ["", "AZ", "NM", "KS", "AR", "TN", "NC", "SC", "DC", "", ""],
  ["", "", "", "OK", "LA", "MS", "AL", "GA", "", "", ""],
  ["HI", "", "", "TX", "", "", "", "", "FL", "", ""],
];
const TERRITORIES = ["PR", "GU", "VI", "AS", "MP"];

export default function StateTileMap({ selected, onSelect }: {
  selected: string;
  onSelect: (name: string) => void;
}) {
  const tile = (code: string, row?: number, col?: number) => {
    const state = US_STATES.find((entry) => entry.code === code)!;
    const active = selected === state.name;
    return (
      <button key={code} type="button" aria-label={state.name} aria-pressed={active}
        title={state.name} onClick={() => onSelect(state.name)}
        style={row === undefined ? undefined : { gridRow: row + 1, gridColumn: col! + 1 }}
        className={`flex min-h-11 items-center justify-center rounded-xl px-2 py-3 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
        {code}
      </button>
    );
  };
  return (
    <div>
      <p className="mb-3 text-base text-muted-foreground sm:hidden">Swipe across the map to see every state, or use the dropdown.</p>
      <div className="overflow-x-auto rounded-2xl p-1" role="region" aria-label="United States tile map" tabIndex={0}>
        <div className="grid min-w-[550px] grid-cols-11 gap-1.5 md:gap-2">
          {ROWS.flatMap((row, r) => row.flatMap((code, c) => code ? [tile(code, r, c)] : []))}
        </div>
      </div>
      <div className="mt-5 border-t pt-4">
        <p className="mb-3 text-base text-muted-foreground">U.S. territories</p>
        <div className="grid max-w-sm grid-cols-5 gap-2">{TERRITORIES.map((code) => tile(code))}</div>
      </div>
    </div>
  );
}
