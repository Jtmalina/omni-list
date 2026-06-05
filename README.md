# OmniList 📝

OmniList is a professional, visual task and media management application built for those who want to bridge their personal organization with their home media lab. Built with Next.js 15, Prisma, and Supabase, it offers a seamless blend of tactile TODO lists, rich media tracking, and direct integration with your home server.

## ✨ Core Features

### 🎬 Media Command Center
- **Radarr & Sonarr Integration:** Direct "one-click" movie and TV show requests to your home server.
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
- **PostgreSQL:** (Local or via Supabase)
- **Home Server (Optional):** Radarr/Sonarr instances reachable via public URL (e.g., Tailscale Funnel or Cloudflare Tunnel).

### Setup Instructions

1. **Clone & Install:**
   ```bash
   git clone <your-repo-url>
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file with your database URI, `AUTH_SECRET`, and OAuth keys. Also include:
   ```env
   # Master key for API key encryption (64-char hex string)
   ENCRYPTION_KEY="your-generated-32-byte-key"
   
   # For Sonarr TVDB mapping
   TMDB_API_KEY="your-themoviedb-api-key"
   ```

3. **Initialize & Run:**
   ```bash
   npx prisma db push
   npx prisma generate
   npm run dev
   ```

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Auth:** Auth.js v5 (NextAuth)
- **Styling:** Tailwind CSS + shadcn/ui
- **Notifications:** Sonner
- **Icons:** Lucide React
- **Testing:** Vitest & Playwright

## 📄 License

This project is licensed under the MIT License.
