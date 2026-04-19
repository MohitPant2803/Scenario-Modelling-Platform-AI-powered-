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
