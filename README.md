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
- [Papa Parse](https://www.papaparse.com/) for CSV data
- [Vitest](https://vitest.dev/) and Testing Library

## Program data

RISE fetches its directory data from the CSV URL configured in `VITE_SHEETS_URL`. The CSV must include these exact column headings:

| Column | Description |
| --- | --- |
| `Program` | Program or incentive name |
| `Type` | `energy`, `water`, `transportation`, or `recycling` |
| `Description` | Short public-facing description |
| `Link` | Official program URL |
| `How to Access` | Eligibility or application details |
| `State` | State or territory name, or the value used for federal records |
| `Level` | Program level, such as `state` or `federal` |

After a successful request, the application saves the parsed program list in browser local storage. If a later request fails, the application uses that cached data when available.

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
├── data/         Program types, state data, and CSV loading logic
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
2. Copy `.env.example` to `.env` and set `VITE_SHEETS_URL` to the existing public CSV export URL. Keep the current URL to preserve the same program data. This build variable is visible to browsers; use a public read-only CSV URL.
3. Run `npm run dev`, or `npm run build` followed by `npm run preview`.

### Move to a fresh repository

Create a new empty GitHub repository under the intended account. For source history without prior platform references, export the prepared working tree into a separate directory, excluding `.git`, `.env`, `node_modules`, and `dist`, then initialize a new Git repository there. Keep this original repository intact until the migration is verified. Existing Git history can retain removed files and old commit messages, so pushing the original history does not produce a clean provenance-free repository.

The checked-in GitHub Actions workflow builds and deploys `dist/` to GitHub Pages. In the new repository:

1. Configure the `VITE_SHEETS_URL` Actions secret with the same value used by the current site.
2. Enable Pages with GitHub Actions as the deployment source.
3. Keep the site served at the domain root. Current routes, asset URLs, and `public/404.html` assume this. A repository subpath URL requires additional routing and asset configuration.
4. To retain `risebenefits.org`, configure that custom domain in the new repository and coordinate its DNS/Pages cutover after verification. The root `CNAME` documents the current domain but is not copied by Vite into `dist/`; configure the domain in Pages settings.

### Behavior to verify before switching the live domain

- Home, state directory, individual states, federal programs, local guidance, about, and contact pages match the current site on desktop and mobile.
- Direct navigation and refresh on nested routes work with the existing 404 redirect.
- Program data, category filters, and local-storage fallback work using the existing spreadsheet.
- Contact submissions open the visitor's email client with the same recipient and message.
- Existing Google Analytics and Google Fonts remain in place.

There is no server/database implementation in this repository. Program data is fetched directly from the configured CSV; the contact form uses `mailto:`. Unused localhost API constants do not make network requests. Preserve the existing spreadsheet and its publishing permissions. A different origin starts with an empty browser cache; cached programs from the old domain do not transfer automatically.
