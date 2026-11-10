# Shop-Corner 2.0 — Frontend

The frontend is built using React, TypeScript, and Vite. It provides the customer shopping experience and the shop-owner inventory management interface.

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide React
- Recharts
- Supabase JavaScript Client

## Setup

Install dependencies:

```powershell
npm install
```

Create `.env.local` in the frontend directory:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

## Run Development Server

```powershell
npm run dev
```

Open `http://localhost:5173`.

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Type-check and build the frontend |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview the production build |

## Backend Connection

The frontend communicates with the FastAPI backend using `VITE_API_URL`.

The Supabase client uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for authentication-related operations.

Ensure the backend and Supabase project are configured before testing application workflows.
