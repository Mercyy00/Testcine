# Auth + database setup

1. Create a free Supabase project. Copy `.env.example` to `.env.local` and fill DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, TMDB_API_KEY.
2. `npm install` (runs `prisma generate`)
3. `npm run db:push` (creates the tables in Supabase)
4. `npm run dev`, open /auth/signup, create an account.

Signed-in users sync history, watchlist, settings, reactions, ratings, watched episodes and custom lists automatically (components/SyncManager.js -> /api/user/sync). Signed-out users stay on localStorage only.
Docker: run `npx prisma generate` in the build stage and copy `prisma/` and `node_modules/.prisma` into the runner image.
