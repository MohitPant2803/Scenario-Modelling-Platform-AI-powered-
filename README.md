# Scenario Analysis Platform

Monorepo scaffold for a React + Express + MongoDB (Mongoose) scenario analysis application.

## Packages

- `frontend` - Vite React app with project/scenario UI, table/chart/chat components
- `backend` - Express API with auth, projects, scenarios, and AI endpoints
- `shared` - shared TypeScript DTO/types

## Quick start

1. Install dependencies:
   - `npm install`
2. Configure backend:
   - copy `backend/.env.example` to `backend/.env`
3. Ensure MongoDB is running and `MONGODB_URI` is set in `backend/.env`.
4. Add your Hugging Face token as `HF_TOKEN` in `backend/.env`.
5. Recommended defaults for scenario text + Excel data + PNG graph analysis:
   - `HF_TEXT_MODEL=zai-org/GLM-4.5:fastest`
   - `HF_VISION_MODEL=zai-org/GLM-4.5V:fastest`
6. Optional: override those model ids in `backend/.env` if you want a different Hugging Face provider/model.
7. Run apps:
   - Backend: `npm run dev:backend`
   - Frontend: `npm run dev:frontend`

## Deployment

### Backend on Vercel

The backend is configured as an Express app wrapped by a Vercel function entry at [backend/api/index.ts](./backend/api/index.ts) with Vercel config in [backend/vercel.json](./backend/vercel.json).

Create a separate Vercel project for the backend with:

- Root directory: `backend`
- Framework preset: `Other`
- Install command: `npm install`
- Build command: `npm run build`

Set these environment variables:

- `NODE_ENV=production`
- `SESSION_SECRET=<strong-random-secret>`
- `MONGODB_URI=<your-mongodb-connection-string>`
- `FRONTEND_ORIGIN=https://<your-frontend-vercel-domain>`
- `HF_TOKEN=<your-hugging-face-token>`
- Optional: `HF_TEXT_MODEL`, `HF_VISION_MODEL`

After deployment, verify:

- `https://<your-backend-domain>/health`

### Frontend on Vercel

The frontend is configured as a separate Vite project with config in [frontend/vercel.json](./frontend/vercel.json).

Create another Vercel project for the frontend with:

- Root directory: `frontend`
- Framework preset: `Vite`

Set this environment variable:

- `VITE_API_BASE=https://<your-backend-vercel-domain>`

Then redeploy the frontend.

### Important production note

The backend uses cross-site session cookies between the frontend Vercel project and the backend Vercel project. In production it automatically uses `SameSite=None` and `Secure`, so `FRONTEND_ORIGIN` must exactly match your deployed frontend origin.

If you use multiple frontend domains, you can provide a comma-separated `FRONTEND_ORIGIN` value such as:

`https://your-app.vercel.app,https://your-custom-domain.com`
