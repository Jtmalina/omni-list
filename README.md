# OmniList 📝

OmniList is a professional, visual task and media management application built for those who want to bridge their personal organization with their home media lab. Built with Next.js 15, Prisma, and Supabase, it offers a seamless blend of tactile TODO lists, rich media tracking, and direct integration with your home server.

## ✨ Core Features

### 🎬 Media Command Center
- **[Radarr](https://radarr.video/) & [Sonarr](https://sonarr.tv/) Integration:** Direct "one-click" movie and TV show requests to your home server.
- **Real-time Status Tracking:** Live feedback for downloads, including percentage progress, library detection, and monitored status badges.
- **Library Management:** Remotely remove media from your server directly from the UI, with options to delete library entries or wipe actual disk files.
- **Netflix-style Dashboard:** A dedicated media view with a hideable sidebar for quick filtering between Movies, TV, and Games.

### 📌 Interactive Organization
- **Tactile Post-it UI:** A creative board where tasks appear as colorful sticky notes pinned with realistic thumbtacks.
- **Rich Calendar View:** A modern, scannable calendar for scheduled items with detailed pop-up cards for quick viewing and editing.
- **Advanced Tagging & Coloring:** 
  - **Tag-Color Association:** Assign colors to tags (e.g., "Urgent" = Red) specific to each list.
  - **Color Overrides:** Set individual colors on any item to permanently override tag or default themes.
  - **Smart Suggestions:** Top 3 recently used tags are suggested during item creation for lightning-fast entry.
- **Instant Search:** Powerful local search across all list views for real-time filtering.

### 🤝 Secure Collaboration
- **Mutual Friendships:** Secure friendship system requiring requests and acceptance before sharing.
- **Granular List Sharing:** Share any list with friends and choose between **View Only** or **Can Edit** permissions.
- **Ownership Controls:** Critical server actions (like media deletion) are strictly restricted to the list owner for security.

## 🔐 Security & Reliability
- **AES-256 Encryption:** User API keys for media servers are encrypted at rest in the database using a master secret key.
- **Masked Credentials:** Sensitive server settings are masked in the UI and never leave the backend in plain text.
- **Automated Testing:** Core logic (encryption, permissions) is backed by a robust Vitest suite to ensure production stability.

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v20.10.0 or higher
- **PostgreSQL:** (Local or via [Supabase](https://supabase.com/))
- **Home Server (Optional):** Radarr/Sonarr instances reachable via public URL (e.g., [Tailscale Funnel](https://tailscale.com/kb/1223/funnel/) or [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/)).

### Setup Instructions

1. **Clone & Install:**
   ```bash
   git clone <your-repo-url>
   cd omni-list
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following:
   ```env
   # Database (Supabase URI)
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

   # Supabase Client (For Realtime Sync)
   # Find in: Supabase Dashboard -> Project Settings -> API
   NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"

   # Auth.js Secrets
   AUTH_SECRET="your-auth-secret" # Generate with: npx auth secret

   # OAuth Credentials (GitHub/Google)
   AUTH_GITHUB_ID="your-github-client-id"
   AUTH_GITHUB_SECRET="your-github-client-secret"
   AUTH_GOOGLE_ID="your-google-client-id"
   AUTH_GOOGLE_SECRET="your-google-client-secret"

   # Security & APIs
   # Master key for API key encryption (64-char hex string)
   # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ENCRYPTION_KEY="your-generated-32-byte-key"
   
   # External API Keys
   TMDB_API_KEY="your-themoviedb-api-key"
   RAWG_API_KEY="your-rawg-api-key"
   ```

3. **Initialize & Run:**
   ```bash
   npx prisma db push
   npx prisma generate
   npm run dev
   ```

## 🛠 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Database:** [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/))
- **ORM:** [Prisma](https://www.prisma.io/)
- **Auth:** [Auth.js v5](https://authjs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Notifications:** [Sonner](https://sonner.emilkowal.ski/)
- **Media APIs:** [TMDB](https://www.themoviedb.org/) & [RAWG](https://rawg.io/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Testing:** [Vitest](https://vitest.dev/) & [Playwright](https://playwright.dev/)

## 📄 License

This project is licensed under the MIT License.
