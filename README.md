# OmniList 📝

OmniList is a modern, visual task and media tracking application built with Next.js 15, Prisma, and Supabase. It features a unique **Post-it Style** interface for managing todo lists, making organization feel more tactile and interactive.

## ✨ Features

- **OAuth Authentication:** Secure login via GitHub and Google using Auth.js (NextAuth v5).
- **Post-it Style UI:** A creative grid layout where tasks are displayed as colorful, interactive sticky notes.
- **Multi-List Management:** Create separate boards for different projects or categories.
- **Responsive Design:** Built with Tailwind CSS and shadcn/ui for a seamless experience across devices.
- **Server Actions:** Fast, type-safe data mutations using Next.js Server Actions.
- **PostgreSQL Backend:** Scalable data storage powered by Supabase.

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v20.10.0 or higher
- **npm:** v8.0.0 or higher
- **PostgreSQL:** (Local or via Supabase)
- **Docker:** (Optional, for local Supabase development)

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd omni-list
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following:
   ```env
   # Database (Supabase URI)
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

   # Auth.js Secrets
   AUTH_SECRET="your-auth-secret" # Generate with: npx auth secret

   # OAuth Credentials
   AUTH_GITHUB_ID="your-github-client-id"
   AUTH_GITHUB_SECRET="your-github-client-secret"
   AUTH_GOOGLE_ID="your-google-client-id"
   AUTH_GOOGLE_SECRET="your-google-client-secret"
   ```

4. **Initialize the Database:**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🛠 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Database:** [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/))
- **ORM:** [Prisma](https://www.prisma.io/)
- **Auth:** [Auth.js v5](https://authjs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Icons:** [Lucide React](https://lucide.dev/)

## 📄 License

This project is licensed under the MIT License.
