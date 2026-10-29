import { supabase } from "@/lib/supabase";

export type ProgramCategory = "energy" | "water" | "transportation" | "recycling";

export interface Program {
  id: string;
  name: string;
  category: string;
  state: string;
  stateCode: string | null;
  description: string;
  url: string;
  details: string;
  level: string;
  /** e.g. "Rebate Program"; null when not classified. */
  programType: string | null;
  /** Data source needing attribution, e.g. "DSIRE"; null for RISE-researched programs. */
  source: string | null;
}

export const CATEGORIES: { key: ProgramCategory; label: string; icon: string }[] = [
  { key: "energy", label: "Energy", icon: "⚡" },
  { key: "water", label: "Water", icon: "💧" },
  { key: "transportation", label: "Transportation", icon: "🚗" },
  { key: "recycling", label: "Recycling", icon: "♻️" },
];

// Must match the program_type check constraint in supabase/migrations.
export const PROGRAM_TYPES = [
  "Rebate Program", "Loan Program", "Grant Program", "Leasing Program",
  "PACE Financing", "Personal Tax Credit", "Personal Tax Deduction",
  "Personal Tax Exemption", "Corporate Tax Exemption", "Property Tax Incentive",
  "Sales Tax Incentive", "Building Energy Code", "Net Metering",
  "Solar/Wind Permitting Standards",
] as const;

export const SOURCE_ATTRIBUTIONS: Record<string, string> = {
  DSIRE: "Data derived from DSIRE®, operated by the N.C. Clean Energy Technology Center at NC State University.",
};

const DEFAULT_HOW_TO_ACCESS = "See the official site below for eligibility and how to apply.";

export const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
  { code: "PR", name: "Puerto Rico" }, { code: "GU", name: "Guam" },
  { code: "VI", name: "U.S. Virgin Islands" }, { code: "AS", name: "American Samoa" },
  { code: "MP", name: "Northern Mariana Islands" },
];

const CACHE_KEY = "programs_cache";
const PAGE_SIZE = 1000; // Supabase caps a single request at 1000 rows.

export interface ProgramFilters {
  /** Two-letter state/territory code, e.g. "CA" or "DC". */
  stateCode?: string;
  levels?: string[];
  category?: ProgramCategory;
  programType?: string;
  /** Free-text search over name, description and access notes. */
  search?: string;
}

interface ProgramRow {
  id: number;
  name: string;
  category: string;
  description: string;
  url: string;
  how_to_access: string;
  state: string;
  state_code: string | null;
  level: string;
  program_type: string | null;
  source: string | null;
}

const toProgram = (row: ProgramRow): Program => ({
  id:          String(row.id),
  name:        row.name,
  category:    row.category,
  // Programs imported from DSIRE have no written description yet; show their type instead.
  description: row.description || row.program_type || "",
  url:         row.url,
  details:     row.how_to_access || DEFAULT_HOW_TO_ACCESS,
  state:       row.state,
  stateCode:   row.state_code,
  level:       row.level,
  programType: row.program_type,
  source:      row.source,
});

export async function fetchPrograms(filters: ProgramFilters = {}): Promise<Program[]> {
  const cacheKey = `${CACHE_KEY}:${JSON.stringify(filters)}`;
  try {
    if (!supabase) throw new Error("Supabase is not configured");

    const rows: ProgramRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabase
        .from("programs")
        .select("id, name, category, description, url, how_to_access, state, state_code, level, program_type, source")
        // Logged-in admins can read hidden rows too, so always filter here.
        .eq("is_published", true)
        .order("state")
        .order("name")
        .order("id")
        .range(from, from + PAGE_SIZE - 1);

      if (filters.stateCode) query = query.eq("state_code", filters.stateCode.toUpperCase());
      if (filters.levels?.length) query = query.in("level", filters.levels);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.programType) query = query.eq("program_type", filters.programType);
      if (filters.search?.trim()) {
        query = query.textSearch("search", filters.search.trim(), { type: "websearch", config: "english" });
      }

      const { data, error } = await query;
      if (error) throw error;
      rows.push(...(data as ProgramRow[]));
      if (data.length < PAGE_SIZE) break;
    }

    const programs = rows.map(toProgram);

    // Save to cache on success
    localStorage.setItem(cacheKey, JSON.stringify(programs));
    return programs;

  } catch (err) {
    console.warn("Failed to fetch programs — falling back to cache:", err);
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
    throw err;
  }
}
