# Binderly

Track the value of your Pokémon TCG collection. Organise cards and sealed products into binders, keep wishlists, and follow price history over time, with market prices collected from Cardmarket several times a day.

Live at [binderly.petomis.com](https://binderly.petomis.com).

## Features

- **Portfolio**: total value of your collection, split between cards and sealed products, with its history over time.
- **Binders**: group the items you own, with quantities and per-binder value and trends (1 day, 1 week, 1 month, 1 year).
- **Wishlists**: keep track of the items you want and what they cost today.
- **Database**: browse sets, cards and sealed products (by set or by product type), with price history per language and variant (English, Italian, Japanese; regular, 1st edition, shadowless, …).
- **Demo mode**: visitors can try the app without signing in, on a sample collection. Their changes are saved in their browser only. Signing in with Google starts an empty collection of your own.
- **English and Italian**: the app follows the browser's language; Settings → Language switches it. Prices and dates are formatted for the language.
- **Offline mode**: Settings → Offline mode (before Theme) downloads the catalog, daily prices and price histories, binders, wishlists, portfolio, and available product images. It locks collection edits and supports browsing and reopening the app without a connection.

### Preparing for a convention

Enable Offline mode while connected, preferably on Wi-Fi, and keep Settings open until the download finishes. The app reloads into the saved snapshot and shows a read-only banner. Settings shows the download date and any unavailable images. To refresh the snapshot or edit the collection, reconnect, turn offline mode off, then download again as needed. Closing Settings or pressing Cancel cancels an unfinished download.

The complete data snapshot is transferred in one authenticated `/api/offline` request, streamed set by set. Image files and app assets are cached separately. Data is stored locally in IndexedDB, pages and images in Cache Storage, and the snapshot selection in localStorage. These browser stores support the complete catalog beyond localStorage's small quota. A failed or cancelled download never replaces the previous snapshot. Downloads belong to the account that created them; signing out removes its saved download. Clearing browser site data also removes offline access. Card images use their low-resolution version offline; unavailable images keep the normal placeholder. Optional live TCGdex rarity and illustrator details are not included.

Offline page loading requires HTTPS (or localhost) and service-worker support. Verify it with a production build (`yarn build` then `yarn start`), since development chunks change during hot reload. Run the data-routing and read-only regression checks with `yarn test:offline`.

## How it works

```
 ┌──────────────────┐  every 3 h  ┌─────────┐   reads / user data   ┌──────────────────┐
 │     Scraper      │ ──────────▶ │ MongoDB │ ◀───────────────────▶ │     Binderly     │
 │ (separate repo)  │   prices    └─────────┘                       │  (this Next.js)  │
 └──────────────────┘                                               └──────────────────┘
```

- A separate scraper (`collection-manager-backend`, a NestJS worker) runs every 3 hours and writes the catalog (sets, cards, sealed products), their prices and the Cardmarket listings (`offers`) to MongoDB. It is not part of this repository.
- This app reads the catalog and prices, and owns the user data: `users`, `binders`, `binder-items`, `wishlists`, `wishlist-items`. `portfolios` is shared: the app recomputes the totals after every binder change, the scraper appends the history points. `rate-limits` holds the app's request counters. `offers` is read by the Offers tab of a card's detail (`/api/offers`): the listings of its last scrape and those gone in the 30 days before it.
- Users can only edit their own binders and wishlists. The catalog is read-only for them.
- The demo collection is a static file, `public/demo-collection.json`. Visitors' edits are kept in their browser's localStorage and never reach the database.

## Tech stack

- [Next.js 15](https://nextjs.org/) (Pages Router, API routes) with React 18 and TypeScript
- [NextAuth.js v4](https://next-auth.js.org/) with Google sign-in (JWT sessions, no session storage)
- [MongoDB](https://www.mongodb.com/) with the official Node.js driver
- Redux Toolkit, Tailwind CSS, Radix UI (dialogs)
- [TCGdex](https://tcgdex.dev/) for card data and images

## Getting started

### Prerequisites

- Node.js 20.6 or later and Yarn 1
- A MongoDB database that the scraper populates (for example on MongoDB Atlas)
- A Google OAuth client

### 1. Install

```bash
yarn install
```

### 2. Configure

Copy `.env.template` to `.env` and fill it in:

| Variable               | Description                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`          | MongoDB connection string. Use a user with `readWrite` on the `collection-manager` database only. |
| `NEXTAUTH_URL`         | Public URL of the app, `http://localhost:5555` in development.                                    |
| `NEXTAUTH_SECRET`      | Random secret used to sign sessions: `openssl rand -base64 32`.                                   |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID.                                                                           |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret.                                                                       |
| `MONGODB_ADMIN_URI`    | Optional, only for `yarn db:setup --apply`: a user with `dbAdmin`, which the app's user lacks.     |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional: the Sentry project's DSN. Error reporting is off without it (see [Monitoring](#monitoring)). |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Optional, at build time: upload source maps to Sentry so its stack traces show the original code. |

To create the Google OAuth client, in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID** of type **Web application** with:

- Authorized JavaScript origin: `http://localhost:5555` (and your production URL)
- Authorized redirect URI: `http://localhost:5555/api/auth/callback/google` (and `<production URL>/api/auth/callback/google`)

### 3. Set up the collections

```bash
yarn db:setup           # dry run: shows the rules
yarn db:setup --apply   # applies them (needs MONGODB_ADMIN_URI)
```

Applies `scripts/collection-rules.mjs`: MongoDB rejects binders, wishlists and their items without a `user` (portfolios only log a warning, since the scraper writes them too), the user data gets an index on `user`, `users` gets a unique index on the Google account (so a user is never created twice), and the catalog and price collections get the indexes their reads need. The dry run reports documents that break the rules and duplicate users, which must be merged before the unique index can be built. Run it once per database; running it again is safe.

### 4. Generate the demo collection (optional)

```bash
yarn demo:generate
```

This rewrites `public/demo-collection.json`, the sample collection shown to visitors who are not signed in: a few binders and a wishlist built from random items of the catalog, with that day's prices. It only reads the database. The file is committed, so you only need to run this to refresh the demo.

### 5. Run

```bash
yarn dev
```

The app runs on [http://localhost:5555](http://localhost:5555).

## Scripts

| Command              | Description                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `yarn dev`           | Start the development server on port 5555.                                                  |
| `yarn build`         | Build for production.                                                                       |
| `yarn start`         | Start the production server.                                                                |
| `yarn demo:generate` | Regenerate the static demo collection from the catalog.                                     |
| `yarn db:setup`      | Add the validators and indexes of `scripts/collection-rules.mjs` (`--apply` to write).      |
| `yarn typecheck`     | Type-check the project (`tsc --noEmit`).                                                    |
| `yarn test`          | All tests: unit, database (throwaway MongoDB) and offline.                                  |
| `yarn test:unit`     | Unit tests only (`tests/*.test.ts`), no database needed.                                    |
| `yarn test:offline`  | Offline-mode regression checks (`node --test`).                                             |
| `yarn test:coverage` | Unit and database tests with a coverage report in `coverage/`.                              |
| `yarn test:e2e`      | Production build into `.next-e2e`, then the Playwright journeys on port 5556.               |

One-off maintenance scripts run directly with `node --env-file=.env scripts/<name>.mjs` (dry run by default, `--apply` to write): `fetch-card-images.mjs` (card images TCGdex lacks) and `set-sealed-paths.mjs` (sealed product images). `generate-icons.mjs` rebuilds the home screen icons. They import `sharp`, which comes in only as an optional dependency of Next.js.

## Testing

| Layer | Where | What it covers |
| --- | --- | --- |
| Unit | `tests/*.test.ts` | Pure logic: prices, items, formatting, new lists, validation, set eras, TCGdex ids |
| Database | `tests/db/` | `lib/db/` and every API route against a one-node MongoDB replica set (`mongodb-memory-server`) with the production validators and indexes; sign-in; demo mode following the server's rules |
| Contract | `tests/contract.test.ts` | The scraper's document types still match `types/mongodb.ts` (needs `../collection-manager-backend`, skipped without it) |
| Offline | `tests/offline.test.cjs` | Offline snapshot reads, blocked writes, stream integrity, account isolation |
| End-to-end | `e2e/` | Playwright on a production build, desktop and phone: creating a binder and adding cards, two users' isolation, the demo, offline browsing, downloading and deleting an account |

`yarn test` runs the first four, `yarn test:e2e` the last (install its browser once with `npx playwright install chromium`). The first database run downloads a MongoDB binary. The end-to-end tests sign in by minting a session cookie with a test secret, so they need no Google account, and never touch the database in `.env`.

GitHub Actions (`.github/workflows/ci.yml`) runs the typecheck, the tests with coverage (summary on the run page, report as an artifact) and the end-to-end journeys on every push to `main` and every pull request, and `yarn audit` on those and weekly. The contract test runs there only if the repository has a `BACKEND_TOKEN` secret: a fine-grained token with read-only Contents access to the backend repository.

## Project structure

```
pages/          Routes and API routes (pages/api)
containers/     Page-level components (home, binders, wishlists, database)
components/     Shared UI components
redux/          Store and slices, one per resource
lib/            MongoDB client, authentication, input validation, demo collection
types/          Data models and constants
scripts/        Maintenance scripts (demo generator, collection setup, cleanups)
tests/          Unit, database, contract and offline tests
e2e/            Playwright journeys, their server and catalog
public/         Static assets, demo collection, offline service worker
```

## Monitoring

Errors are reported to [Sentry](https://sentry.io) when `NEXT_PUBLIC_SENTRY_DSN` is set, in production builds only (`lib/monitoring.ts`):

- **Server**: errors thrown in API routes and pages (`instrumentation.ts`), and the ones the code recovers from but logs (`reportError`: portfolio updates, offline downloads).
- **Browser**: uncaught errors and crashes (`instrumentation-client.ts`, `pages/_error.tsx`). They go to `/monitoring` on the app's own origin, which forwards them to Sentry, so the Content Security Policy stays `'self'` and ad blockers don't drop them.
- **No personal data**: no tracing or session replay; reports carry the stack and the URL path, never cookies, request bodies, query strings or the user. In the Sentry project settings, also turn on **Prevent Storing of IP Addresses** and keep data retention at 90 days or less, as the privacy policy says.

To set it up, create a Next.js project in Sentry and set `NEXT_PUBLIC_SENTRY_DSN` in the hosting environment. For readable stack traces, also set `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` (an organization token with the `project:releases` scope) for the production build: the source maps are uploaded, then deleted from the build so they are never served. Add an alert rule for new issues to get an email when something breaks.

## Privacy

`/privacy` describes what the app stores and sends; it is linked from the home page footer and from Settings. Keep it in step with the code when that changes: a new kind of personal data, a new provider, a new cookie or storage key. Before going live, set its contact address (`CONTACT_EMAIL` in `pages/privacy.tsx`) to a mailbox you read.

In **Settings → Your data**, a signed-in user can download everything stored about them (`GET /api/account`, 10 per hour) and delete their account (`DELETE /api/account` with `{ "confirm": true }`). Deletion removes the user, their binders, wishlists, items and portfolio in one transaction. A session cookie outlives its deleted account until it expires, so `getUserId` refuses sessions whose user no longer exists.

## Security

- The user is always resolved on the server from the session cookie, never from the request.
- Every binder, wishlist and item carries its owner (`user`), and every query on them filters by the session user, so one user's documents are never read or changed by another. Items are checked through their list and by their own `user`.
- MongoDB has no row-level security, so the database enforces the next best thing (`yarn db:setup`): documents without an owner are rejected. The app's database user has `readWrite` only and can't change these rules.
- Visitors who are not signed in cannot use the collection API: the demo runs entirely in their browser.
- Writes only accept `application/json`, so another site can't send them with the session cookie without a CORS preflight, which the API never grants.
- The catalog is public, so its uncacheable reads are rate limited per address (search 60 per minute, price batches 60, single price reads 120), and offline downloads 5 per hour per user. Limits are counted in MongoDB so they hold across instances.
- API input is validated (Joi), and user content has limits: 50 binders and 50 wishlists per user, 2000 items each, names up to 100 characters.
- Security headers (Content Security Policy, frame protection, HSTS) are set in `next.config.js`.
