# DWfindIT

Mobile-first inventory, equipment, and work-order tooling for Ditch Witch field ops.

## Development Setup

- **Node.js 22.12.0** – already installed to `~/.local/node` and added to `PATH`.
- Install dependencies: `npm install`
- Run the dev server: `npm run dev`
- Production build check: `npm run build`

## Key Screens

- **Home** – quick actions (scan, work orders, inventory) and recent activity.
- **Lists & Detail** – create collaborative lists, add items via scanner, export CSV/PDF.
- **Scan** – barcode/QR scanner backed by Supabase parts & equipment tables.
- **Work Orders** – capture equipment details, signature, and auto-generate a PDF.
- **Inventory** – search parts/equipment across store locations with clipboard helpers.

## Recent Improvements

- Exported `ListWithCount` from `listStore` and corrected the manager module import so manager tooling compiles cleanly.
- Upgraded the toolchain to Node 22.12.0 for Vite compatibility (available via `~/.local/node/bin`).
- Added guards around manager queries so Supabase requests wait for a resolved `selectedStore`.
- Switched all major routes to `React.lazy` with tailored Suspense skeletons for faster, more polished navigation.
- Deferred heavy exports (CSV/PDF and work-order PDF generation) with dynamic imports to shrink initial bundles.

## Project Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint the project with ESLint |
| `npm run clean` | Remove `node_modules`, `dist`, and `dev-dist` |

## Environment

Supabase credentials should be provided via `.env` variables expected by `src/services/supabaseClient.ts` (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
