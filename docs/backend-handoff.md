# RISE Backend Handoff: Supabase, Admin Editing, and Search

**Owner:** Venya Sharma · **Team:** Venya (backend), Anna (frontend), Samantha (admin pages and data quality)
**Updated:** October 29, 2026 · **Target public launch:** Thursday, November 5, 2026 (November 12 if part-time)

This explains how RISE program data is moving from a Google Sheet to a Supabase database, what is already built in this repo, and who does what next. You don't need to have seen the old `rise-benefits` repo.

---

## 1. Why

The site used to download a Google Sheet as CSV on every page. Renaming a column or a typo could break the site without warning, nothing stopped bad values like "Deleware", every page downloaded all 740 programs to filter them in the browser, and anyone who could edit the sheet could break the site with no history.

We're replacing the sheet with **[Supabase](https://supabase.com)**: a hosted Postgres database with logins and permissions built in.

## 2. How it works (no server of our own)

```
Visitor's browser  ──►  Supabase API  ──►  Supabase Postgres
(files from GitHub Pages)   └──────── hosted by Supabase ───────┘
```

GitHub Pages only serves files, so the browser asks Supabase for data directly.

- The site contains a **publishable key**. It is meant to be public.
- **Permission rules inside the database** (row-level security) decide what that key can do:
  - **Anyone:** read *published* programs.
  - **Admins (logged in):** read everything, add, edit, hide/publish. Nobody can delete; hide instead.
- The **secret `service_role` key** bypasses all rules. **It never goes in frontend code or GitHub.**

The `Mindi-Backend` branch in the old repo built a Node/Express server instead. That works, but it needs a separate host. Supabase removes that piece.

---

## 3. What's built (branch `venya-supabase-backend` in this repo)

| Piece | File |
| --- | --- |
| `programs` table, search index, public read-only rules | `supabase/migrations/20261029000000_create_programs.sql` |
| New columns: `program_type`, `source`, `is_published`, `updated_by`, `reviewed_by` | `supabase/migrations/20261029000001_add_program_metadata.sql` |
| `admins` list and admin permission rules | `supabase/migrations/20261030000000_admin_access.sql` |
| Cleaned data: 739 programs (715 state, 15 federal, 9 territory) | `supabase/seed.sql` (generated, don't edit) |
| Spreadsheet → seed converter with automatic cleaning | `scripts/xlsx_to_seed.py` |
| Rows that need a person's judgment, with database ids | `docs/data-review-checklist.csv` |
| Browser connection to Supabase | `src/lib/supabase.ts` |
| **Public data function:** `fetchPrograms(filters)` | `src/data/programs.ts` |
| **Admin data functions** for the admin pages | `src/data/admin.ts` |
| Tests | `src/test/programs.test.ts`, `src/test/admin.test.ts` |
| Deploy passes the two Supabase settings to the build | `.github/workflows/static.yml` |

The State, All States, and Federal pages already use `fetchPrograms`. D.C.'s page now shows its programs: the sheet says "Washington D.C." but the site looked for "District of Columbia", so programs now match on the two-letter code (`DC`).

**Tested in a local Postgres:** the migrations and seed load, and running the migrations again is safe. Search works ("heat pump rebate"). The public key can't add, edit, or delete. A logged-in non-admin can't either. An admin can add and edit but not delete. Admins can't grant themselves admin through the API. Hidden programs are invisible to the public.

**Not yet done:** none of this has run against our real Supabase project, which doesn't exist yet. See section 5.

### `programs` table

| Column | Example | Notes |
| --- | --- | --- |
| `id` | `42` | Automatic |
| `name` | `Carroll White REMC – Heat Pump Rebate` | Required |
| `category` | `energy` | `energy`, `water`, `transportation`, `recycling` |
| `program_type` | `Rebate Program` | One of 14 fixed values (`PROGRAM_TYPES` in `src/data/programs.ts`), or empty |
| `description` | `Get up to $500 back…` | Empty for DSIRE imports until someone writes one |
| `url` | `https://…` | |
| `how_to_access` | `Fill out the form…` | Empty means "see official site"; the site shows a standard message |
| `state` / `state_code` | `Indiana` / `IN` | Code is empty for federal programs |
| `level` | `state` | `state`, `federal`, `territory` |
| `source` | `DSIRE` | Data source that needs a credit on the card |
| `is_published` | `true` | `false` = hidden from the public |
| `link_status`, `last_reviewed`, `reviewed_by` | `Working`, `2026-10-29` | |
| `created_at`, `updated_at`, `updated_by` | | Set automatically |

---

## 4. Rules for frontend code

> **Public pages get programs only through `fetchPrograms(...)`. Admin pages only through `src/data/admin.ts`.** No page loads a CSV, calls Supabase directly, or downloads everything to filter it.

That way design work and backend work can't break each other.

### Public pages (Anna)

```ts
import { fetchPrograms } from "@/data/programs";

await fetchPrograms({ levels: ["federal"] });
await fetchPrograms({ stateCode: "CA" });
await fetchPrograms({ levels: ["state", "territory"], stateCode: selectedCode });
await fetchPrograms({ search: "heat pump rebate", category: "energy", programType: "Rebate Program" });
```

Each program looks like:

```ts
{
  id: "42", name: "…", category: "energy",
  description: "…",          // falls back to the program type, e.g. "Rebate Program"
  details: "…",              // "How to access"; falls back to a standard message
  url: "https://…", state: "Indiana", stateCode: "IN", level: "state",
  programType: "Rebate Program",
  source: "DSIRE",           // show SOURCE_ATTRIBUTIONS[source] on the card (ProgramCard already does)
}
```

If a request fails and there's no cached copy, `fetchPrograms` **throws**: show an error, not "no programs". Switching categories can filter the list already on the page.

### Admin pages (Samantha)

```ts
import {
  signIn, signOut, getCurrentAdmin,      // login; signIn rejects non-admins with a clear message
  listAllPrograms,                       // every program, including hidden
  validateProgram,                       // { url: "Link must start with https://", … } for the form
  saveProgram,                           // saveProgram(input) adds; saveProgram(input, id) edits
  setPublished,                          // setPublished(id, false) hides; true publishes
  markReviewed,                          // records today's date and who reviewed it
  listAdminNames,                        // user id → name, for "Last reviewed by Venya"
} from "@/data/admin";
```

Routes to build: `/admin/login`, `/admin` (table with search and filters: *Broken link*, *Missing description*, *Hidden*, *Not reviewed recently*), and an add/edit form:

```
┌─ Edit program ─────────────────────────────────────────────┐
│ Program name   [ Carroll White REMC – Heat Pump Rebate    ]│
│ State          [ Indiana            ▾ ]   Level [ State ▾ ]│
│ Category       [ Energy             ▾ ]                    │
│ Program type   [ Rebate Program     ▾ ]                    │
│ Description    [ Get up to $500 back when you install...  ]│
│ Link           [ https://www.cwremc.coop/programs/...     ]│
│ How to apply   [ Fill out the online rebate form after... ]│
│ Visible on site  (●) Published   ( ) Hidden                │
│ Last reviewed: Oct 29, 2026 by Venya     [Mark reviewed]   │
│                            [ Cancel ]  [ Save changes ]    │
└────────────────────────────────────────────────────────────┘
```

Use dropdowns for state, level, category, and type (`US_STATES`, `CATEGORIES`, `PROGRAM_TYPES` from `@/data/programs`). Until these pages exist, admins can edit in Supabase's **Table Editor**.

---

## 5. Setup

### One-time project setup (Venya)

1. Create the project at supabase.com/dashboard. Invite Anna and Samantha (Organization → Members).
2. **SQL Editor:** run each file in `supabase/migrations/` in filename order, then `supabase/seed.sql`.
3. **Authentication → Sign In / Providers:** Email on, **"Allow new users to sign up" off**.
4. **Authentication → Users → Add user** for each admin (at least two), then in the SQL Editor:
   ```sql
   insert into public.admins (user_id, display_name)
   select id, 'Samantha' from auth.users where email = 'samantha@example.com';
   ```
5. **GitHub → this repo → Settings → Secrets and variables → Actions:** add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API Keys, the **publishable** key).
6. Check that the public key can't write: in the browser console on the live site, an insert should fail with a permission error.

### Every developer

```bash
git fetch origin
git checkout venya-supabase-backend    # or your branch made from it
npm ci
cp .env.example .env                   # fill in the URL and publishable key (ask Venya)
npm run dev
```

`.env` is git-ignored. Never commit it, and never put the `service_role` key anywhere in this repo.

### How we work with branches

- `venya-supabase-backend` is the base for all backend-dependent work. **Branch from it:** `git checkout -b samantha-admin-pages venya-supabase-backend`.
- Anna's `redesign` branch only restyles pages; merge it with this branch rather than copying files between them.
- Open pull requests into `main`; one other person reviews. Before opening one: `npm run lint && npm test && npm run build`.
- Database changes go in a **new** file in `supabase/migrations/` (named with a timestamp, e.g. `20261102000000_add_x.sql`), never by editing an old one, and Venya runs them in Supabase. Changes made by clicking in the dashboard should be written back into a migration so the repo stays the record.

---

## 6. Data cleaning

### Done automatically by the import script
- Stray spaces, double spaces, and line breaks collapsed (16 cells).
- 684 "See link below." access notes stored as empty. The site shows a standard message.
- 525 DSIRE placeholder descriptions ("Rebate Program. Attribution: Data derived from DSIRE®…") split into `program_type` + `source = 'DSIRE'`. Cards still show the DSIRE credit, which DSIRE requires.
- 1 exact duplicate removed (Oklahoma Natural Gas, which differed only in capitalization). *Correction to the earlier audit:* the two **NYSERDA** rows are **not** duplicates. One is Energy and one is Transportation, with different descriptions, so both stay and NYSERDA appears in the review list instead.

### Needs a person (Samantha leads): `docs/data-review-checklist.csv`

Each row has the database `id`, so you can find it in the Table Editor or admin page.

| Issue | Count | What to do |
| --- | --- | --- |
| Possible duplicates (same name and state) | 4 pairs | NJCEP (NJ), NM Environment Dept, NYSERDA (NY), MidAmerican (IA): keep one or both |
| Empty descriptions | 7 | Write one sentence each |
| Broken links (Dead, Server Error, Unreachable, Invalid, Error) | 23 | Find the new link, or hide |
| Link check "Blocked" | 71 | Open each by hand |
| `http://` links | 92 | Low priority: switch to `https://` where it works |
| Puerto Rico "state" vs D.C. "territory" | 1 | Team decision (section 9) |

Not in the CSV (found by reading, so check by hand): Energy Star filed under *Water*; the EV tax credit under *Energy* rather than *Transportation*; typos "Department of **Revernue**" (Missouri) and "Washington State Department of Commerce**.**". **Missing content:** "Move Minneapolis" (only on the sheet's `additional data` tab), and no programs at all for Guam, U.S. Virgin Islands, American Samoa, Northern Mariana Islands.

Writing real descriptions for the 525 DSIRE programs is **not** required for launch.

---

## 7. Who does what

| When | Venya (backend) | Anna (frontend) | Samantha (admin + data) |
| --- | --- | --- | --- |
| Thu Oct 29 | ✅ Backend in this repo, cleaned data, admin rules, checklist. ☐ Create Supabase project, run migrations + seed, invite team, push branch | | |
| Fri Oct 30 | ☐ Sign-ups off, add admins, GitHub secrets | | Start admin pages from `venya-supabase-backend` |
| Mon Nov 2 | Support and review PRs | Merge `redesign` with backend branch; check State, All States, Federal pages | Admin pages; start checklist in Table Editor |
| Tue Nov 3 | | Public search box + category/type/state filters; type label and DSIRE credit in new card design | Admin pages working (unstyled) |
| Wed Nov 4 | Security check (section 8) | Style admin pages; phone/tablet testing | Finish checklist; add Move Minneapolis; test admin flow end to end |
| Thu Nov 5 | **Launch** (or buffer day) | | |

Swap tasks if someone's skills fit better.

**After launch (optional):** change history, "Suggest a program" form, scheduled link checker, separate editor/admin roles, rewriting DSIRE descriptions.

---

## 8. Launch checklist

- [ ] The live site loads programs from Supabase, not the Google Sheet.
- [ ] No duplicates, no visible dead links, no empty descriptions.
- [ ] DSIRE text shows as a source credit, not as the description.
- [ ] Admin login works; public sign-ups are **off**.
- [ ] Admins can add, edit, hide, and publish through the form.
- [ ] Search box and filters work on the public pages.
- [ ] Security: the public key can't change data; no secret key in either repo (`git grep -i service_role` finds nothing sensitive).
- [ ] The design works on phones, tablets, and desktops.
- [ ] At least two people have admin access.

## 9. Decisions still open

1. **Retire the spreadsheet after import?** Recommended yes. Re-running `seed.sql` replaces every row and would erase admins' edits.
2. **Who are the admins?** Recommended: one admin role for everyone who edits.
3. **Review before publishing?** Should new programs start hidden until a second person approves?
4. **Is the DSIRE split OK?** (Program type as a filter, credit shown once per card.)
5. **Puerto Rico and D.C.:** both "territory" or both "state"?
6. **`Mindi-Backend` branch:** tell Mindi about this approach so work isn't duplicated.

## 10. Quick reference

| | |
| --- | --- |
| This repo | `github.com/Suxip/rise-website`, branch `venya-supabase-backend` |
| Old repo | `github.com/brielle-young/rise-benefits` |
| Source spreadsheet | `RISE_data.xlsx`, tab `allData` (not committed; ask Venya) |
| Re-generate data | `python3 scripts/xlsx_to_seed.py RISE_data.xlsx` (also rewrites the checklist), then run `supabase/seed.sql` in the SQL Editor (**only before admins start editing**) |
| Supabase dashboard | supabase.com/dashboard (ask Venya for an invite) |
| Questions | Venya |
