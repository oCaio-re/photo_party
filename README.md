This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database & storage setup

The database schema lives in `src/db/schema.ts` and is **not** created at runtime.
After changing the schema (or on a fresh database), run with `DATABASE_URL` set:

```bash
npm run db:init   # = db:push (drizzle-kit syncs tables/indexes) + db:setup (seeds flagship Event and default Photo Quests)
```

Guest uploads go straight from the browser to Cloudflare R2 through presigned URLs
(`POST /api/events/[slug]/upload/presign`), so the Vercel function body limit (~4.5MB) does not apply.
This requires a CORS rule on the R2 bucket allowing `PUT` from the app origin with the `Content-Type` header:

```json
[{ "AllowedOrigins": ["https://your-app.vercel.app"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600 }]
```

Without R2 credentials (local development) files are stored in `public/uploads/` via a regular multipart upload.

Each presigned key is recorded in `pending_uploads` until the Guest confirms it. A daily Vercel Cron
(`vercel.json` → `/api/cron/cleanup-uploads`) deletes files of uploads abandoned for over an hour;
set `CRON_SECRET` in the Vercel project so the route accepts the scheduler's requests.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
