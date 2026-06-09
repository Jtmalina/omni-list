@AGENTS.md

# OmniList — CLAUDE.md

## Default Change Process

**Every code change — no exceptions — must follow this sequence before being considered done:**

1. **Tests first** — add or update test cases in the relevant `*.test.ts` file covering the new behaviour or bug fix (even a minimal happy-path test). If the area has no test file yet, create one.
2. **Run tests and fix until green** — `npm test` must exit with all tests passing. Fix any failures before moving on.
3. **Build check** — `npm run build` must complete without errors. Fix any TypeScript or build errors.
4. **Commit** — stage only the relevant files (never `git add -A`). Write a conventional-commit message (`feat:`, `fix:`, `refactor:`, etc.) with a brief body explaining *why*. Include the co-author trailer.
5. **Push to main** — `git push origin main` triggers Vercel auto-deploy.

```bash
# Quick checklist
npm test          # all green
npm run build     # no errors
git add <files>
git commit -m "type: description"
git push origin main
```

> If tests are genuinely impossible to add for a change (e.g. pure UI styling), note the reason in the commit message body.

A catch-all personal tracker: task lists, media watchlists (movies, TV, games), and calendar views — all shareable with friends. Integrates with home media servers (Radarr/Sonarr) so users can queue downloads directly from the app.

---

## List types

| Type | Display | Items |
|------|---------|-------|
| `TODO` | Post-it sticky note grid (colour-cycled, slight rotation) | Tasks with optional due date, notes, tags, color |
| `MEDIA` | Vertical card list | Movies, TV shows, and games pulled from TMDB/RAWG |
| `CALENDAR` | Monthly calendar grid | Items with `dueDate` appear on their day; undated items go in an Unscheduled section |

---

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack) — see AGENTS.md for breaking changes
- **Runtime:** React 19
- **Database:** PostgreSQL via Supabase, ORM is Prisma 5
- **Auth:** Auth.js v5 (NextAuth beta) — GitHub + Google OAuth, JWT sessions via PrismaAdapter
- **Realtime:** Supabase PostgreSQL change streams (`useRealtimeSync` hook)
- **Styling:** Tailwind CSS v4 + shadcn/ui + Lucide React
- **Notifications:** Sonner toast
- **Testing:** Vitest (unit), Playwright (e2e)
- **Deployment:** Vercel, CI/CD active on `main`

---

## Running locally

```bash
npm install
npx prisma db push
npm run dev        # http://localhost:3000
npm test           # Vitest unit tests
npx playwright test  # E2E (requires running dev server)
```

---

## Environment variables

All variables in `.env`. Required:

```env
DATABASE_URL=          # Supabase PostgreSQL connection string
AUTH_SECRET=           # npx auth secret
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
TMDB_API_KEY=          # TMDB Read Access Token (v4 Bearer ~239 chars) — NOT the short v3 key
RAWG_API_KEY=          # rawg.io API key for game search
ENCRYPTION_KEY=        # AES-256 key for Radarr/Sonarr API key storage
CRON_SECRET=           # Bearer token for /api/cron/sync protection
```

Optional:
```env
ENABLE_TEST_AUTH=true  # Enables /api/test/session for Playwright E2E (dev only)
```

> **Vercel:** paste raw token values only — no surrounding quotes. The app strips quotes defensively (`.replace(/^["']|["']$/g, '')`), but Vercel stores values literally.

---

## Project structure

```
src/
  app/
    page.tsx                    # Landing page
    dashboard/page.tsx          # Lists grid (server component)
    list/[id]/page.tsx          # List detail (server component)
    media/[type]/[id]/          # Media detail pages
    login/page.tsx              # Auth entry point
    api/
      auth/[...nextauth]/       # Auth.js handler
      test/tmdb/route.ts        # TMDB connectivity diagnostic
      test/session/route.ts     # E2E test helper (blocked in prod)
      cron/sync/route.ts        # Vercel cron: release sync (CRON_SECRET required)
    layout.tsx                  # Root layout with Navbar
  actions/
    list.ts                     # createList, getLists, deleteList, upsertTagConfig
    item.ts                     # createItem, updateItem, deleteItem, updateItemStatus
    media.ts                    # searchMediaAction (TMDB), searchGamesAction (RAWG),
                                #   fetchStreamingInfoAction, fetchGameDetailsAction
    servarr.ts                  # getServarrConfigAction, saveServarrConfigAction,
                                #   getMediaStatusAction, requestMovieAction,
                                #   requestSeriesAction, deleteMediaAction
    friends.ts                  # sendFriendRequestAction, getFriendsAction,
                                #   acceptFriendRequestAction, getPendingFriendsAction
    follow.ts                   # toggleFollowAction, getFollowsAction,
                                #   syncUpcomingReleasesAction
    share.ts                    # shareListAction, revokeAccessAction,
                                #   getListCollaboratorsAction
    activity.ts                 # getActivitiesAction
    user.ts                     # user profile management
  components/
    ListClientView.tsx          # Client shell — routes to TODO/MEDIA/CALENDAR views
    CalendarView.tsx            # Month grid; items interactive
    AddItemDialog.tsx           # Add item form; type selector drives TMDB/RAWG search
    AddListDialog.tsx           # Create list form
    MediaSearch.tsx             # TMDB debounced search dropdown
    GameSearch.tsx              # RAWG debounced search dropdown
    ItemActions.tsx             # Checkbox + delete button (TODO and MEDIA)
    ListDeleteButton.tsx        # Delete list with confirmation
    Navbar.tsx
    ui/                         # shadcn/ui primitives
  lib/
    media-api.ts                # searchMedia (TMDB), searchGames (RAWG),
                                #   getStreamingProviders
    encryption.ts               # AES-256-CBC encrypt/decrypt for API keys
    permissions.ts              # verifyListAccess() — ownership + shared access checks
    auth.ts                     # NextAuth setup with PrismaAdapter
    prisma.ts                   # Prisma client singleton
    utils.ts                    # cn() helper
    hooks/
      useRealtimeSync.ts        # Supabase realtime subscriptions (client only)
    __mocks__/                  # Test mocks
  proxy.ts                      # Auth route protection (Next.js 16 — was middleware.ts)
  auth.config.ts                # OAuth providers + authorized() callback
prisma/
  schema.prisma
  migrations/
tests/
  e2e/                          # Playwright tests
```

---

## Data model

```
User → List (type: TODO | MEDIA | CALENDAR)
          → Item (type: TASK | MEDIA, status: TODO | IN_PROGRESS | COMPLETED)
               → MediaMetadata (posterPath, rating, externalId, streamingInfo JSON)
          → TagConfig (tag → color mapping, per list)
          → ListAccess (shared users with VIEW | EDIT permission)

User → Friendship (PENDING | ACCEPTED, bidirectional)
User → Follow (actor, director, studio, series — TMDB/RAWG external IDs)
User → Activity (event log: ITEM_CREATED, ITEM_COMPLETED, LIST_SHARED, etc.)
User → ServarrConfig (encrypted Radarr + Sonarr URLs + API keys + root folders)
```

- `Item.mediaType`: `MOVIE | SHOW | GAME`
- `MediaMetadata.streamingInfo`: streaming provider data (movies/TV) or `{ metacritic: N }` (games)
- `Friendship` has a unique constraint per sender-receiver pair

---

## Permissions

All server actions verify access before any DB operation via `verifyListAccess()` in `lib/permissions.ts`.

| Action | Required level |
|--------|---------------|
| Read items, view collaborators | VIEW or owner |
| Create/update/delete items, tag management | EDIT or owner |
| Delete list, share list, configure Servarr, delete from server | Owner only |

---

## Servarr integration (Radarr + Sonarr)

Users configure their home server URLs and API keys in settings (`ServarrConfig`). Keys are stored AES-256-CBC encrypted in the database (`lib/encryption.ts`). The `saveServarrConfigAction` detects the `********` placeholder and skips overwriting an existing key.

- **Radarr:** add movies via TMDB ID → `POST /api/v3/movie`
- **Sonarr:** add TV series via TVDB ID → `POST /api/v3/series`
- Status/progress, library detection, and monitored badges are fetched per-item
- Media can be deleted from the server or wiped from disk via `deleteMediaAction`

---

## Social features

- **Friends:** mutual request/accept (`Friendship` model). Dashboard shows a pending-requests indicator.
- **List sharing:** owner shares a list with a friend at VIEW or EDIT level (`ListAccess`). Collaborator avatars shown on list cards.
- **Activity feed:** realtime log of friends' actions visible on dashboard.
- **Follow system:** follow actors, directors, studios, series. Cron job (`/api/cron/sync`) auto-discovers new releases and can add them to designated auto-add lists.

---

## External APIs

### TMDB (movies & TV)
- Auth: `Authorization: Bearer <TMDB_API_KEY>` header
- Search: `GET /3/search/multi`
- Detail: `GET /3/{movie|tv}/{id}?append_to_response=videos,credits,recommendations,similar`
- Streaming providers: `GET /3/{movie|tv}/{id}/watch/providers` → `results.US`
- Images: `https://image.tmdb.org/t/p/w500{poster_path}`

### RAWG (games)
- Auth: `?key=<RAWG_API_KEY>` query param (not Bearer)
- Search: `GET https://api.rawg.io/api/games?key=...&search=...&page_size=10`
- Images: `background_image` is a full URL (`media.rawg.io`)
- Metacritic score returned directly in search results (`r.metacritic`)

Both APIs use `cache: 'no-store'` — required in Next.js 16 to prevent ECONNRESET on requests with auth headers.

---

## Key conventions

- **Server actions are the only mutation path** — no API routes for data changes.
- **`revalidatePath`** is called after every mutation to invalidate the RSC cache.
- **Dates:** always create with `new Date(dateString + 'T00:00:00')` — date-only ISO strings parse as UTC midnight and shift the day in non-UTC timezones.
- **`proxy.ts`** (not `middleware.ts`) — Next.js 16 renamed middleware to proxy. Exports the Auth.js `auth` handler; protects `/dashboard` and `/list` routes.
- **Environment variable quoting:** `.trim().replace(/^["']|["']$/g, '')` is applied to all API keys to handle copy-paste from quoted `.env` files.
- **Image domains:** `image.tmdb.org` and `media.rawg.io` are in `next.config.ts` remotePatterns.
- **Realtime:** `useRealtimeSync` subscribes to Supabase change streams and calls `router.refresh()` for RSC updates. Only usable in client components.
- **`export const dynamic = 'force-dynamic'`** is required on pages that need real-time data.

---

## Testing

```bash
npm test             # Vitest unit tests
npx playwright test  # E2E smoke tests (requires running dev server)
```

Unit tests mock Prisma globally via `vitest-mock-extended` (`src/test/prisma-mock.ts`).  
Auth is mocked per-test with `vi.mock('@/lib/auth', ...)` returning a fixed test user.  
The E2E session helper at `GET /api/test/session` is blocked in production unless `ENABLE_TEST_AUTH=true`.

Test files:
- `lib/media-api.test.ts` — API response parsing
- `lib/encryption.test.ts` — AES encrypt/decrypt
- `lib/permissions.test.ts` — list access control
- `actions/list.test.ts` — list CRUD permission enforcement
- `lib/utils.test.ts` — utility helpers
