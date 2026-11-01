# AGENTS.md

Guidance for coding agents working in this repository. See `README.md` for the features, setup and
the security model.

## What this is

Binderly, a Next.js 15 app (Pages Router, API routes, React 18, TypeScript, Redux Toolkit, Tailwind)
to track the value of a Pokémon TCG collection. Users sign in with Google (NextAuth v4, JWT
sessions) and keep binders and wishlists in MongoDB. The catalog and prices are written by the
scraper in the sibling repository `../collection-manager-backend`: this app only reads them.

## Commands

```bash
yarn install
yarn typecheck       # tsc --noEmit (must pass)
yarn test            # vitest (unit + db) and node:test (offline)
yarn test:unit       # pure logic only, no MongoDB
yarn build           # production build
```

- The user keeps `yarn dev` running on port 5555. Do not start a second dev server or `next build`
  while it runs: both write `.next/` and break the running one. Ask before building.
- `yarn db:setup --apply`, `yarn demo:generate` and the `scripts/*.mjs` with `--apply` write to the
  database in `.env` (production). Only run their dry runs unless asked.
- Database tests (`tests/db/`) use a throwaway `mongodb-memory-server` replica set with the
  production rules from `scripts/collection-rules.mjs`. After changing `lib/db/`, an API route or
  the rules, run `yarn test`.

## Code map

| Path                           | Responsibility                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `pages/api/*.ts`               | API routes: method guard, session user, Joi validation, then a `lib/db/` call     |
| `lib/auth.ts`                  | NextAuth options, `getUserId` (the only source of the current user)               |
| `lib/guards.ts`                | `allowMethods`, `requireJson`                                                     |
| `lib/validation.ts`            | `queryString`, `parseObjectId`, `LIMITS` (from `lib/limits.ts`)                   |
| `lib/db/`                      | Server-only queries on binders, wishlists, portfolios, sets                       |
| `lib/mirror.ts`                | Keeps a binder and its linked wishlist in step                                    |
| `lib/portfolio.ts`             | Recomputes a user's portfolio totals after binder changes                         |
| `lib/rate-limit.ts`            | Fixed-window limits stored in the `rate-limits` collection                        |
| `lib/demo-collection.ts`       | Demo mode for signed-out visitors, in localStorage only                           |
| `lib/api-fetch.ts`, `offline*` | Client API boundary; serves reads from the IndexedDB snapshot in offline mode     |
| `public/offline-sw.js`         | Service worker: app shell cache, never caches `/api/`                             |
| `redux/slices/`                | One slice per resource; picks demo, offline or API                                |
| `containers/`, `components/`   | Page-level containers; shared atoms and organisms                                 |
| `types/mongodb.ts`             | Document types, mirrored from the backend's `src/modules/mongodb/types/`          |
| `scripts/collection-rules.mjs` | Validators and indexes, applied by `yarn db:setup` and by the db tests            |

## Invariants to preserve

- **Ownership**: the user always comes from `getUserId(req, res)`, never from the request. Every
  query on `binders`, `wishlists`, `binder-items`, `wishlist-items` and `portfolios` filters by that
  `user`, items included (by their own `user`, not only through their list). The `?user=` query
  param that the client sends is not authentication: never use it to select data.
- **Input**: query params go through `queryString` / `parseObjectId` (arrays and objects rejected);
  bodies through a Joi schema; only validated fields reach a query, so no operators can be
  injected. Respect `LIMITS` (names, lists per user, items per list, batch sizes).
- **CSRF**: every write route calls `requireJson`. New writes must use POST/DELETE with JSON, never
  GET.
- **Prices**: an item's `historicPrice` must be one of that item's own versions
  (`pricesMatchItems`); set binders only accept cards of their set (`itemsFitSet`).
- **Linked lists**: a linked binder/wishlist pair is kept in step by `lib/mirror.ts` (missing in the
  binder = wanted in the wishlist). Moves between lists run in a transaction (`inTransaction`).
- **Portfolio**: call `updatePortfolio(user)` after any change to binder contents; its failure only
  logs.
- **Demo and offline**: signed-out visitors (`DEMO_USER`) never reach the database. Every client
  API call goes through `apiFetch`; offline mode is read-only and must never fall back to live
  data. Personal API responses are never cached (no `Cache-Control: public` on user data).
- **Catalog is read-only**: `cards`, `sealed`, `sets`, the price collections and `offers` belong to
  the scraper. Their shape changes there first: mirror them in `types/mongodb.ts`.
- **CSP** (`next.config.js`): the only inline script is the theme one, allowed by hash. A new
  external image or API host must be added to `img-src` / `connect-src`. Do not add
  `'unsafe-inline'` or `'unsafe-eval'` to production `script-src`.
- **External URLs** from the database go into `href`/`src` only if they start with `https://`, and
  links open with `rel="noopener noreferrer"`.

## Conventions

- TypeScript `strict`. Imports use the `@/` alias.
- Prettier (`.vscode/settings.json`): double quotes, print width 180.
- Short comments that explain why, above the code they describe; same density as the surrounding
  files. Server-only modules start with a `// Server only: ...` line.
- API errors: `res.status(4xx).json({ message })` with a user-readable message.
- Commits: conventional style (`feat:`, `fix(db):`, `refactor(atoms):`, `test:`), with no
  co-author trailers.
