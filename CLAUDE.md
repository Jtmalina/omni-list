@AGENTS.md

# OmniList

A personal task and media tracking app. Users create lists in one of three modes and manage items within them.

## List types

| Type | Display | Items |
|------|---------|-------|
| `TODO` | Post-it sticky note grid (colour-cycled, slight rotation) | Tasks with optional due date and notes |
| `MEDIA` | Vertical card list | Movies, TV shows, and games pulled from external APIs |
| `CALENDAR` | Monthly calendar grid | Any item with a `dueDate` appears on its day; items without appear in an Unscheduled section below |

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack) — see AGENTS.md for breaking changes
- **Runtime:** React 19
- **Database:** PostgreSQL via Supabase, ORM is Prisma 5
- **Auth:** Auth.js v5 (NextAuth beta) — GitHub + Google OAuth, JWT sessions via PrismaAdapter
- **Styling:** Tailwind CSS v4 + shadcn/ui + Lucide React
- **Testing:** Vitest (unit), Playwright (e2e)
- **Deployment:** Vercel, CI/CD active on `main`

## Running locally

```bash
npm install
npx prisma db push
npm run dev        # http://localhost:3000
npm test           # Vitest unit tests
```

## Environment variables

All variables live in `.env`. Required:

```env
DATABASE_URL=          # Supabase PostgreSQL connection string
AUTH_SECRET=           # Generate with: npx auth secret
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
TMDB_API_KEY=          # TMDB Read Access Token (v4 Bearer, ~239 chars) — NOT the short v3 API key
RAWG_API_KEY=          # rawg.io API key for game search
```

> **Vercel:** paste the raw token value only — no surrounding quotes. If the `.env` value is quoted (`KEY="value"`), copy just the inner value. The app strips surrounding quotes defensively, but Vercel stores values literally.

## Project structure

```
src/
  app/
    page.tsx                  # Dashboard — lists grid (server component)
    list/[id]/page.tsx        # List detail (server component)
    login/page.tsx            # Auth page
    api/
      auth/[...nextauth]/     # Auth.js handler
      test/tmdb/route.ts      # Dev+prod diagnostic: GET /api/test/tmdb
      test/session/route.ts   # E2E test helper (non-production only)
  actions/
    list.ts                   # createList, getLists, deleteList
    item.ts                   # createItem, getItems, updateItemStatus, deleteItem
    media.ts                  # searchMediaAction (TMDB), searchGamesAction (RAWG),
                              #   fetchStreamingInfoAction
  components/
    ListClientView.tsx        # Client shell — renders TODO/MEDIA/CALENDAR views
    CalendarView.tsx          # Month grid; items interactive (toggle + delete)
    AddItemDialog.tsx         # Add item form; type selector drives TMDB/RAWG search
    AddListDialog.tsx         # Create list form
    MediaSearch.tsx           # TMDB debounced search dropdown
    GameSearch.tsx            # RAWG debounced search dropdown
    ItemActions.tsx           # Checkbox + delete button used in TODO and MEDIA views
    ListDeleteButton.tsx      # Delete list with confirm
    Navbar.tsx
    ui/                       # shadcn/ui primitives
  lib/
    media-api.ts              # searchMedia (TMDB), searchGames (RAWG),
                              #   getStreamingProviders
    auth.ts                   # NextAuth setup with PrismaAdapter
    prisma.ts                 # Prisma client singleton
    utils.ts                  # cn() helper
  proxy.ts                    # Auth route protection (Next.js 16 — was middleware.ts)
  auth.config.ts              # OAuth providers + authorized() callback
prisma/
  schema.prisma
  migrations/
```

## Data model

```
User → List (type: TODO | MEDIA | CALENDAR)
     → Item (type: TASK | MEDIA, status: TODO | IN_PROGRESS | COMPLETED)
          → MediaMetadata (posterPath, rating, externalId, streamingInfo JSON)
```

- `Item.mediaType`: `MOVIE | SHOW | GAME`
- `MediaMetadata.streamingInfo`: stores streaming providers (movies/TV) or `{ metacritic: N }` (games)
- All server actions verify list ownership against the session userId before any DB operation

## External APIs

### TMDB (movies & TV)
- Auth: `Authorization: Bearer <TMDB_API_KEY>` header
- Search: `GET /3/search/multi`
- Streaming providers: `GET /3/{movie|tv}/{id}/watch/providers` → `results.US`
- Images: `https://image.tmdb.org/t/p/w500{poster_path}`

### RAWG (games)
- Auth: `?key=<RAWG_API_KEY>` query param (not Bearer)
- Search: `GET https://api.rawg.io/api/games?key=...&search=...&page_size=10`
- Images: `background_image` field is a full URL (`media.rawg.io`)
- Metacritic score is returned directly in search results (`r.metacritic`)

Both APIs use `cache: 'no-store'` — required in Next.js 16 to prevent the fetch instrumentation layer from causing ECONNRESET on requests with auth headers.

## Key conventions

- **Server actions** are the only mutation path — no API routes for data.
- **`revalidatePath`** is called after every mutation to invalidate the RSC cache.
- **Dates:** always create with `new Date(dateString + 'T00:00:00')` — date-only ISO strings parse as UTC midnight and shift the day in non-UTC timezones.
- **`proxy.ts`** (not `middleware.ts`) — Next.js 16 renamed middleware to proxy. The file exports the Auth.js `auth` handler as default.
- **Environment variable quoting:** `.replace(/^["']|["']$/g, '')` is applied to all API keys after `.trim()` to handle copy-paste from quoted `.env` files.
- **Image domains:** `image.tmdb.org` and `media.rawg.io` are both in `next.config.ts` remotePatterns.

## Testing

```bash
npm test           # Vitest unit tests (actions + utils + media-api)
npx playwright test  # E2E smoke tests (requires running dev server)
```

Unit tests mock Prisma via `vitest-mock-extended` (`src/test/prisma-mock.ts`).
Auth is mocked with `vi.mock('@/lib/auth', ...)` returning a fixed test user.
The E2E test session helper lives at `GET /api/test/session` — blocked in production unless `ENABLE_TEST_AUTH=true`.
