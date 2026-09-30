# Collection Manager

Track the value of your Pokémon TCG collection. Organise cards and sealed products into binders, keep wishlists, and follow price history over time, with market prices collected daily from Cardmarket.

Live at [collectionmanager.petomis.com](https://www.collectionmanager.petomis.com).

## Features

- **Portfolio**: total value of your collection, split between cards and sealed products, with its history over time.
- **Binders**: group the items you own, with quantities and per-binder value and trends (1 day, 1 week, 1 month, 1 year).
- **Wishlists**: keep track of the items you want and what they cost today.
- **Database**: browse sets, cards and sealed products (by set or by product type), with price history per language and variant (English, Italian, Japanese; regular, 1st edition, shadowless, …).
- **Demo mode**: visitors can try the app without signing in, on a sample collection. Their changes are saved in their browser only. Signing in with Google starts an empty collection of your own.
- **Offline mode**: Settings → Offline mode (before Theme) downloads the catalog, daily prices and price histories, binders, wishlists, portfolio, and available product images. It locks collection edits and supports browsing and reopening the app without a connection.

### Preparing for a convention

Enable Offline mode while connected, preferably on Wi-Fi, and keep Settings open until the download finishes. The app reloads into the saved snapshot and shows a read-only banner. Settings shows the download date and any unavailable images. To refresh the snapshot or edit the collection, reconnect, turn offline mode off, then download again as needed. Closing Settings or pressing Cancel cancels an unfinished download.

The complete data snapshot is transferred in one authenticated `/api/offline` request, streamed set by set. Image files and app assets are cached separately. Data is stored locally in IndexedDB, pages and images in Cache Storage, and the snapshot selection in localStorage. These browser stores support the complete catalog beyond localStorage's small quota. A failed or cancelled download never replaces the previous snapshot. Downloads belong to the account that created them; signing out removes its saved download. Clearing browser site data also removes offline access. Card images use their low-resolution version offline; unavailable images keep the normal placeholder. Optional live TCGdex rarity and illustrator details are not included.

Offline page loading requires HTTPS (or localhost) and service-worker support. Verify it with a production build (`npm run build` then `npm start`), since development chunks change during hot reload. Run the data-routing and read-only regression checks with `npm run test:offline`.

## How it works

```
 ┌──────────────────┐   daily    ┌─────────┐   reads / user data   ┌────────────────────┐
 │ Scraper (Lambda) │ ─────────▶ │ MongoDB │ ◀───────────────────▶ │ Collection Manager │
 │  not in this repo│   prices   └─────────┘                       │   (this Next.js)   │
 └──────────────────┘                                              └────────────────────┘
```

- An external scraper runs daily and writes the catalog (sets, cards, sealed products) and their prices to MongoDB. It is not part of this repository.
- This app reads the catalog and prices, and owns the user data: `users`, `binders`, `binder-items`, `wishlists`, `wishlist-items`. `portfolios` is read by the app.
- Users can only edit their own binders and wishlists. The catalog is read-only for them.
- The demo collection is a static file, `public/demo-collection.json`. Visitors' edits are kept in their browser's localStorage and never reach the database.

## Tech stack

- [Next.js 15](https://nextjs.org/) (Pages Router, API routes) with React 18 and TypeScript
- [NextAuth.js v4](https://next-auth.js.org/) with Google sign-in (JWT sessions, no session storage)
- [MongoDB](https://www.mongodb.com/) with the official Node.js driver
- Redux Toolkit, Tailwind CSS, Radix UI (dialogs)
- [TCGdex](https://tcgdex.dev/) for card data and images, and the Pokémon TCG API for set data

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

To create the Google OAuth client, in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID** of type **Web application** with:

- Authorized JavaScript origin: `http://localhost:5555` (and your production URL)
- Authorized redirect URI: `http://localhost:5555/api/auth/callback/google` (and `<production URL>/api/auth/callback/google`)

### 3. Set up the collections

```bash
yarn db:setup           # dry run: shows the rules
yarn db:setup --apply   # applies them (needs MONGODB_ADMIN_URI)
```

Adds the ownership rules to the user data collections: MongoDB rejects binders, wishlists and their items without a `user`, and each gets an index on `user`. Run it once per database; running it again is safe.

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
| `yarn db:setup`      | Add the ownership validators and indexes to the user data collections (`--apply` to write). |

## Project structure

```
pages/          Routes and API routes (pages/api)
containers/     Page-level components (home, binders, wishlists, database)
components/     Shared UI components
redux/          Store and slices, one per resource
lib/            MongoDB client, authentication, input validation, demo collection
types/          Data models and constants
scripts/        Maintenance scripts (demo generator, collection setup, cleanups)
```

## Security

- The user is always resolved on the server from the session cookie, never from the request.
- Every binder, wishlist and item carries its owner (`user`), and every query on them filters by the session user, so one user's documents are never read or changed by another. Items are checked through their list and by their own `user`.
- MongoDB has no row-level security, so the database enforces the next best thing (`yarn db:setup`): documents without an owner are rejected. The app's database user has `readWrite` only and can't change these rules.
- Visitors who are not signed in cannot use the collection API: the demo runs entirely in their browser.
- API input is validated (Joi), and user content has limits: 50 binders and 50 wishlists per user, 2000 items each, names up to 100 characters.
- Security headers (Content Security Policy, frame protection, HSTS) are set in `next.config.js`.
