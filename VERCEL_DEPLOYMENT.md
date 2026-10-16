# Deploying the COLLAB API on Vercel

This backend is deployed as one Express serverless function through `api/index.js`. It connects to external services; Vercel does not host MongoDB, Redis, or persistent filesystem data.

## Required services

- MongoDB Atlas (a free cluster is sufficient for a showcase)
- Resend for transactional email
- Vercel Blob for new uploaded project files

Redis is optional. Without it, rate limiting uses a per-instance fallback. Use a free Redis provider only when shared rate limiting is needed.

## Vercel project setup

1. Import the `backend` directory as its own Vercel project.
2. Keep the framework preset as `Other` and leave the build command empty; Vercel uses `vercel.json`.
3. Add the values from `.env.example` in Vercel Project Settings -> Environment Variables.
4. Set `NODE_ENV=production`.
5. Set `CORS_ORIGINS` to the exact frontend deployment URL, for example `https://collab-frontend.vercel.app`.
6. Leave `COOKIE_DOMAIN` empty when frontend and backend use different Vercel domains.
7. Set `PUBLIC_API_BASE` to this API's Vercel URL.
8. Create a Vercel Blob store, connect it to this project, and set `BLOB_READ_WRITE_TOKEN`.

## Frontend setup

Deploy the `frontend` directory as a separate Vercel project. Set:

```text
VITE_API_URL=https://your-backend.vercel.app/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Then add the frontend URL to the backend `CORS_ORIGINS` variable and redeploy both projects.

## Upload note

New project files use private Vercel Blob objects when `BLOB_READ_WRITE_TOKEN` is configured. Existing local `uploads/` files are not automatically transferred to Vercel; migrate any files you need before retiring the old host.

From a machine that still has the old `uploads/` folder and uses the production MongoDB connection, run the migration once after configuring `MONGO_URI` and `BLOB_READ_WRITE_TOKEN`:

```bash
npm run migrate:uploads
```

Vercel Functions have request/response size limits. The existing 25 MB upload limit continues to work locally, but large uploads should use a direct-to-Blob upload flow before relying on them in a production Vercel deployment.
