# Vault & Board — Tabletop Collection Tracker

Next.js app for personal board game collections, local gaming sessions, scores, and filtered/random game picking — backed by Supabase and BoardGameGeek XML API2. UI based on the Google Stitch project **Tabletop Collection Tracker**.

## Features

- Auth (Supabase email/password)
- Collection CRUD via BGG search + cached game metadata
- Filters (# players, play time, category) + random pick
- Sessions with players and score tracking
- Stitch-inspired “Vault & Board” design system

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Auth + Postgres + RLS)
- BoardGameGeek XML API2 (`/xmlapi2/search`, `/xmlapi2/thing`)
- Vercel hosting

## Setup

1. **Install**

```bash
npm install
```

2. **Environment** — copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon / publishable key |
| `BGG_API_KEY` | **Yes** | BoardGameGeek Application Token (`Authorization: Bearer …`). Required — XML API2 returns 401 without it. Create at [boardgamegeek.com/applications](https://boardgamegeek.com/applications) after app approval. |
| `BGG_USERNAME` | No | Optional; reserved for collection sync |

3. **Database** — schema is already applied on Supabase project `boardgames-vault`. For a new project, run the SQL in `supabase/migrations/20260913150000_initial_schema.sql` (plus RLS policies / signup trigger from the remote migration), or use Supabase MCP `apply_migration`.

4. **Auth** — in Supabase Dashboard → Authentication, enable Email provider. For local testing you may disable “Confirm email”.

5. **Run**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/collection` (login required).

## Routes

| Path | Description |
|---|---|
| `/auth/login`, `/auth/signup` | Auth |
| `/collection` | My Collection (Stitch-based UI) |
| `/games/[id]` | Game details, start session, per-game history |
| `/games/add` | BGG search + add to collection |
| `/sessions` | Recent sessions |
| `/sessions/new` | Create session |
| `/sessions/[id]` | Session detail + scores |
| `/api/bgg/search`, `/api/bgg/thing` | Server-side BGG proxy |
| `/api/collection` | Collection list / add / remove |
| `/api/sessions` | Sessions CRUD + scores |

## Schema (summary)

- `profiles` ← `auth.users` (trigger creates profile + default collection)
- `games` — cached BGG metadata (`bgg_id` unique)
- `collections` / `collection_items`
- `sessions` / `session_games` / `session_players` / `session_scores`
- `filter_presets` (optional presets table)
- RLS: users only access their own rows; `games` readable/writable by authenticated users for cache upserts

## Design assets

Stitch exports live in `design/stitch/`:

- `DESIGN.md` — design tokens
- `html/` — screen HTML
- `screenshots/` — PNGs
- `manifest.json` — screen index

## Deploy (Vercel)

Existing Vercel project: `boardgames` (`prj_bB5F5dsKYx6vAdf46NlUiWWjfYbf`), linked to `DigasMC/boardgames`.

1. Commit and push this branch to `master` (or open a PR) — Vercel deploys from GitHub.
2. In the Vercel project settings, add env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `BGG_API_KEY` (required Application Token)
3. In Supabase Auth → URL configuration, add the Vercel domain to Site URL / Redirect URLs.

Local CLI deploy also works after `npx vercel login` + `npx vercel link` + `npx vercel env pull`.

> Note: anonymous/`--temporary` CLI deploys are blocked for Edge middleware and older Next.js CVEs; use the linked Git project or an authenticated CLI session.

## BGG notes

- Requests are server-side only; respect rate limits (retries on HTTP 202/429).
- Game details are cached in `games` after first fetch.
- Do not commit API keys; use env vars only.
