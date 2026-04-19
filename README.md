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

### Backend on Render

This repo includes a root [render.yaml](./render.yaml) blueprint for the backend service.

1. Push the repo to GitHub.
2. In Render, create a new Blueprint instance from the repo, or create a Web Service manually with:
   - Root directory: `backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
3. Set these environment variables in Render:
   - `NODE_ENV=production`
   - `FRONTEND_ORIGIN=https://<your-vercel-domain>`
   - `SESSION_SECRET=<strong-random-secret>`
   - `MONGODB_URI=<your-mongodb-connection-string>`
   - `HF_TOKEN=<your-hugging-face-token>`
   - `HF_TEXT_MODEL` and `HF_VISION_MODEL` if you want overrides
4. After deploy, note the Render backend URL, for example `https://your-api.onrender.com`.

### Frontend on Vercel

This repo includes a root [vercel.json](./vercel.json) config that builds the Vite app from `frontend/`.

1. Import the repo into Vercel.
2. Set the environment variable:
   - `VITE_API_BASE=https://<your-render-backend-url>`
3. Deploy.

### Important production note

The backend uses cross-site session cookies between Vercel and Render. In production it now automatically uses `SameSite=None` and `Secure`, so `FRONTEND_ORIGIN` must exactly match your deployed Vercel origin.
