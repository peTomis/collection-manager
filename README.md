# Collection Manager

Track the value of your Pokémon TCG collection. Organise cards and sealed products into binders, keep wishlists, and follow price history over time, with market prices collected daily from Cardmarket.

Live at [collectionmanager.petomis.com](https://www.collectionmanager.petomis.com).

## Features

- **Portfolio**: total value of your collection, split between cards and sealed products, with its history over time.
- **Binders**: group the items you own, with quantities and per-binder value and trends (1 day, 1 week, 1 month, 1 year).
- **Wishlists**: keep track of the items you want and what they cost today.
- **Database**: browse sets, cards and sealed products (by set or by product type), with price history per language and variant (English, Italian, Japanese; regular, 1st edition, shadowless, …).
- **Demo mode**: visitors can try the app without signing in, on a sample collection. Their changes are saved in their browser only. Signing in with Google starts an empty collection of your own.

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
- Redux Toolkit, Tailwind CSS, Radix UI / shadcn components, Recharts
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

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. Use a user with `readWrite` on the `collection-manager` database only. |
| `NEXTAUTH_URL` | Public URL of the app, `http://localhost:5555` in development. |
| `NEXTAUTH_SECRET` | Random secret used to sign sessions: `openssl rand -base64 32`. |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret. |

To create the Google OAuth client, in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID** of type **Web application** with:

- Authorized JavaScript origin: `http://localhost:5555` (and your production URL)
- Authorized redirect URI: `http://localhost:5555/api/auth/callback/google` (and `<production URL>/api/auth/callback/google`)

### 3. Generate the demo collection (optional)

```bash
yarn demo:generate
```

This rewrites `public/demo-collection.json`, the sample collection shown to visitors who are not signed in: a few binders and a wishlist built from random items of the catalog, with that day's prices. It only reads the database. The file is committed, so you only need to run this to refresh the demo.

### 4. Run

```bash
yarn dev
```

The app runs on [http://localhost:5555](http://localhost:5555).

## Scripts

| Command | Description |
| --- | --- |
| `yarn dev` | Start the development server on port 5555. |
| `yarn build` | Build for production. |
| `yarn start` | Start the production server. |
| `yarn demo:generate` | Regenerate the static demo collection from the catalog. |

## Project structure

```
pages/          Routes and API routes (pages/api)
containers/     Page-level components (home, binders, wishlists, database)
components/     Shared UI components
redux/          Store and slices, one per resource
lib/            MongoDB client, authentication, input validation, demo collection
types/          Data models and constants
scripts/        Maintenance scripts (demo generator)
```

## Security

- The user is always resolved on the server from the session cookie, never from the request.
- Visitors who are not signed in cannot use the collection API: the demo runs entirely in their browser.
- API input is validated (Joi), and user content has limits: 50 binders and 50 wishlists per user, 2000 items each, names up to 100 characters.
- Security headers (Content Security Policy, frame protection, HSTS) are set in `next.config.js`.
