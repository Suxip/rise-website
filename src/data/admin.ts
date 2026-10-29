import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, PROGRAM_TYPES, US_STATES, type ProgramCategory } from "@/data/programs";

// Data functions for the admin pages. Like fetchPrograms for public pages,
// admin pages should talk to Supabase only through this file. The database
// enforces permissions (see supabase/migrations/20261030000000_admin_access.sql);
// the checks here exist to give admins friendly messages.

export type ProgramLevel = "state" | "federal" | "territory";

export interface AdminProgram {
  id: number;
  name: string;
  category: ProgramCategory;
  programType: string | null;
  description: string;
  url: string;
  howToAccess: string;
  /** Two-letter code; null for federal programs. */
  stateCode: string | null;
  state: string;
  level: ProgramLevel;
  source: string | null;
  isPublished: boolean;
  linkStatus: string | null;
  lastReviewed: string | null;
  reviewedBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

/** The fields an admin can edit in the add/edit form. */
export type ProgramInput = Pick<
  AdminProgram,
  "name" | "category" | "programType" | "description" | "url" | "howToAccess" | "stateCode" | "level" | "isPublished"
>;

export interface CurrentAdmin {
  userId: string;
  displayName: string;
}

const PAGE_SIZE = 1000;

function client() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

interface AdminRow {
  id: number;
  name: string;
  category: ProgramCategory;
  program_type: string | null;
  description: string;
  url: string;
  how_to_access: string;
  state: string;
  state_code: string | null;
  level: ProgramLevel;
  source: string | null;
  is_published: boolean;
  link_status: string | null;
  last_reviewed: string | null;
  reviewed_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

const toAdminProgram = (row: AdminRow): AdminProgram => ({
  id:           row.id,
  name:         row.name,
  category:     row.category,
  programType:  row.program_type,
  description:  row.description,
  url:          row.url,
  howToAccess:  row.how_to_access,
  stateCode:    row.state_code,
  state:        row.state,
  level:        row.level,
  source:       row.source,
  isPublished:  row.is_published,
  linkStatus:   row.link_status,
  lastReviewed: row.last_reviewed,
  reviewedBy:   row.reviewed_by,
  updatedAt:    row.updated_at,
  updatedBy:    row.updated_by,
});

// ---------------------------------------------------------------------------
// Login

export async function signIn(email: string, password: string): Promise<CurrentAdmin> {
  const { error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw new Error("Wrong email or password.");
  const admin = await getCurrentAdmin();
  if (!admin) {
    await signOut();
    throw new Error("This account is not an admin. Ask Venya for access.");
  }
  return admin;
}

export async function signOut(): Promise<void> {
  await client().auth.signOut();
}

/** The logged-in admin, or null if nobody is logged in or the user is not an admin. */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const { data: { user } } = await client().auth.getUser();
  if (!user) return null;
  // Row-level security returns this row only to admins.
  const { data, error } = await client()
    .from("admins")
    .select("user_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return { userId: data.user_id, displayName: data.display_name };
}

/** Admin user id → display name, for "Last reviewed by …". */
export async function listAdminNames(): Promise<Record<string, string>> {
  const { data, error } = await client().from("admins").select("user_id, display_name");
  if (error) throw error;
  return Object.fromEntries(data.map((a) => [a.user_id, a.display_name]));
}

// ---------------------------------------------------------------------------
// Programs

/** Every program, including hidden ones. Filter and search on the page. */
export async function listAllPrograms(): Promise<AdminProgram[]> {
  const rows: AdminRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client()
      .from("programs")
      .select("*")
      .order("state")
      .order("name")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data as AdminRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows.map(toAdminProgram);
}

/** Plain-English problems with the form, keyed by field. Empty when valid. */
export function validateProgram(input: ProgramInput): Partial<Record<keyof ProgramInput, string>> {
  const errors: Partial<Record<keyof ProgramInput, string>> = {};
  if (!input.name.trim()) errors.name = "Program name is required.";
  if (!CATEGORIES.some((c) => c.key === input.category)) errors.category = "Choose a category.";
  if (input.programType && !(PROGRAM_TYPES as readonly string[]).includes(input.programType)) {
    errors.programType = "Choose a program type from the list.";
  }
  if (!/^https:\/\/\S+\.\S+/.test(input.url.trim())) errors.url = "Link must start with https://";
  if (input.level === "federal") {
    if (input.stateCode) errors.stateCode = "Federal programs should not have a state.";
  } else if (!US_STATES.some((s) => s.code === input.stateCode)) {
    errors.stateCode = "Choose a state or territory.";
  }
  return errors;
}

function toRow(input: ProgramInput) {
  const stateCode = input.level === "federal" ? null : input.stateCode;
  return {
    name:          input.name.trim(),
    category:      input.category,
    program_type:  input.programType || null,
    description:   input.description.trim(),
    url:           input.url.trim(),
    how_to_access: input.howToAccess.trim(),
    state_code:    stateCode,
    state:         stateCode ? US_STATES.find((s) => s.code === stateCode)!.name : "US",
    level:         input.level,
    is_published:  input.isPublished,
  };
}

/** Create a program (no id) or update one. Throws if the input is invalid. */
export async function saveProgram(input: ProgramInput, id?: number): Promise<AdminProgram> {
  const errors = Object.values(validateProgram(input));
  if (errors.length) throw new Error(errors.join(" "));

  const table = client().from("programs");
  const query = id === undefined ? table.insert(toRow(input)) : table.update(toRow(input)).eq("id", id);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return toAdminProgram(data as AdminRow);
}

/** Hide or publish instead of deleting, so mistakes can be undone. */
export async function setPublished(id: number, isPublished: boolean): Promise<void> {
  const { error } = await client().from("programs").update({ is_published: isPublished }).eq("id", id);
  if (error) throw error;
}

/** Record that the current admin checked this program today. */
export async function markReviewed(id: number): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Log in as an admin first.");
  const today = format(new Date(), "yyyy-MM-dd"); // local date, not UTC
  const { error } = await client()
    .from("programs")
    .update({ last_reviewed: today, reviewed_by: admin.userId })
    .eq("id", id);
  if (error) throw error;
}
