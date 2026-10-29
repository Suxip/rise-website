# RISE

**Residential Incentives for Sustainability and Environmentalism**

RISE is a free, public website that helps households find residential sustainability incentives, rebates, and programs across the United States and its territories. It brings state and federal resources into one searchable site and organizes them into four categories: energy, water, transportation, and recycling.

## Features

- Search and browse programs by state or U.S. territory
- Browse nationwide federal programs
- Filter programs by category
- View eligibility and access details with links to official sources
- Find guidance for locating utility, city, and county programs
- Cache program data locally for improved resilience
- Responsive interface for desktop and mobile devices

## Tech stack

- [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) and [Radix UI](https://www.radix-ui.com/)
- [React Router](https://reactrouter.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Supabase](https://supabase.com/) for program data
- [Vitest](https://vitest.dev/) and Testing Library

## Program data

Program data lives in a [Supabase](https://supabase.com) Postgres database. The browser talks to Supabase directly with the public *publishable* key; row-level security in the database allows public reads and blocks public writes. There is no separate server.

Pages get programs only through `fetchPrograms(filters)` in `src/data/programs.ts`:

```ts
await fetchPrograms({ levels: ["federal"] });
await fetchPrograms({ stateCode: "CA" });
await fetchPrograms({ search: "heat pump rebate", category: "energy" });
```

After a successful request, the result is cached in local storage per filter set. If a later request fails, the cached copy is used; with no cache, the function throws so pages can show an error.

| Path | Purpose |
| --- | --- |
| `supabase/migrations/` | Database structure and permission rules, applied in filename order |
| `supabase/seed.sql` | Generated program data (replaces all rows when run) |
| `scripts/xlsx_to_seed.py` | Regenerates `seed.sql` from the program spreadsheet |
| `src/lib/supabase.ts` | Browser Supabase client |
| `docs/backend-handoff.md` | Full backend plan, setup steps, and team responsibilities |

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run build:dev` | Create a development-mode build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |

## Project structure

```text
src/
├── assets/       Images and brand assets
├── components/   Shared layout, program, filter, and UI components
├── data/         Program types, state data, and Supabase data loading
├── hooks/        Shared React hooks
├── lib/          Utility functions
├── pages/        Route-level page components
└── test/         Test setup and tests
```

## Routes

| Route | Page |
| --- | --- |
| `/` | Home and state search |
| `/states` | State and territory programs |
| `/state/:code` | Program page for an individual state |
| `/federal` | Federal programs |
| `/local` | Guidance for finding local resources |
| `/about` | About RISE |
| `/contact` | Contact and feedback |

## Quality checks

Before opening a pull request, run:

```bash
npm run lint
npm test
npm run build
```

## Disclaimer

RISE is an informational resource. It does not provide financial advice, determine eligibility, process applications, or guarantee that a program is available. Always confirm current requirements and availability with the official program administrator.



## Independent deployment and repository migration

This repository runs as a standalone static React application. No authoring-platform account or runtime service is required.

### Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from Supabase → Project Settings → API Keys. Use the publishable key only, never the secret/`service_role` key.
3. Run `npm run dev`, or `npm run build` followed by `npm run preview`.

### Move to a fresh repository

Create a new empty GitHub repository under the intended account. For source history without prior platform references, export the prepared working tree into a separate directory, excluding `.git`, `.env`, `node_modules`, and `dist`, then initialize a new Git repository there. Keep this original repository intact until the migration is verified. Existing Git history can retain removed files and old commit messages, so pushing the original history does not produce a clean provenance-free repository.

The checked-in GitHub Actions workflow builds and deploys `dist/` to GitHub Pages. In the new repository:

1. Configure the `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` Actions secrets.
2. Enable Pages with GitHub Actions as the deployment source.
3. The workflow reads the Pages base path and configures assets, routing, and nested-route redirects for either the repository URL or a custom domain. Locally, builds default to the domain root.
4. To retain `risebenefits.org`, configure that custom domain in the new repository and coordinate its DNS/Pages cutover after verification. The root `CNAME` documents the current domain but is not copied by Vite into `dist/`; configure the domain in Pages settings.

### Behavior to verify before switching the live domain

- Home, state directory, individual states, federal programs, local guidance, about, and contact pages match the current site on desktop and mobile.
- Direct navigation and refresh on nested routes work with the existing 404 redirect.
- Program data, category filters, and local-storage fallback work against Supabase.
- Contact submissions open the visitor's email client with the same recipient and message.
- Existing Google Analytics and Google Fonts remain in place.

There is no server in this repository. Program data is fetched directly from Supabase; the contact form uses `mailto:`. A different origin starts with an empty browser cache; cached programs from the old domain do not transfer automatically.
