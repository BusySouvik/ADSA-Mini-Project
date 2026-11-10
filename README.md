# Shop-Corner

A full-stack shop and inventory management system developed as an ADSA mini-project. It supports customers and shop owners, with data structures and algorithms implemented in C++ and integrated through a FastAPI backend.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, HTTPX |
| Database and Authentication | Supabase PostgreSQL, Supabase Auth |
| ADSA Engine | C++17 |
| UI Libraries | React Router, Lucide React, Recharts |

## Main Features

### Customer
- Browse and search available products.
- Filter products by category and price range.
- Sort products by price, name, or newest.
- Add products to the cart and complete checkout.
- View personal order history and order details.

### Shop Owner
- Add, edit, and delete inventory products.
- View inventory statistics and stock information.
- Monitor low-stock products.
- View and manage customer orders.
- Create and process persistent restock requests.

### Data Structures and Algorithms
The C++ engine supports the following ADSA operations:

- **AVL Tree:** Price-range searching.
- **Hash Table:** Product lookup.
- **Trie:** Product-name autocomplete.
- **Min Heap:** Low-stock product prioritization.
- **FIFO Queue:** Restock request processing.

The FastAPI backend communicates with the C++ executable through standard input and output.

## Project Structure

```text
ADSA-Mini-Project/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py
│   ├── .env
│   └── requirements.txt
│
├── cpp_engine/
│   ├── include/
│   │   └── engine.hpp
│   ├── src/
│   │   ├── bridge.cpp
│   │   └── main.cpp
│   └── build/
│       └── shop_corner_adsa.exe
│
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   ├── assets/
│   │   ├── App.tsx
│   │   ├── CustomerOrders.tsx
│   │   ├── OwnerDashboard.tsx
│   │   ├── OwnerOrders.tsx
│   │   └── ShopCatalogue.tsx
│   ├── .env.local
│   └── package.json
│
├── docs/
├── tests/
└── README.md
```

## Prerequisites

Install the following before running the project:

- Node.js and npm
- Python 3
- A C++17-compatible compiler
- Supabase project with the required database schema, authentication configuration, and Row Level Security policies

## Configuration

Create the following environment files locally. Never commit actual credentials or secret keys.

### Frontend: `frontend/.env.local`

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

### Backend: `backend/.env`

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
FRONTEND_URL=http://localhost:5173
```

The frontend and backend use separate environment variable names. Keep them consistent with their respective application code.

## Installation and Setup

### 1. Clone or open the project

```powershell
cd "ADSA-Mini-Project"
```

### 2. Set up the backend

```powershell
cd backend

py -3 -m venv .venv

.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create the backend `.env` file using the configuration above.

### 3. Build the C++ engine

From the project root, using an MSYS2 UCRT64 GCC installation:

```powershell
$env:Path = "C:\msys64\ucrt64\bin;$env:Path"

g++ -std=c++17 -O2 -Wall -Wextra -static -static-libgcc -static-libstdc++ `
  -I ".\cpp_engine\include" `
  ".\cpp_engine\src\bridge.cpp" `
  -o ".\cpp_engine\build\shop_corner_adsa.exe"
```

Ensure the `cpp_engine/build` directory exists before compiling:

```powershell
New-Item -ItemType Directory -Force ".\cpp_engine\build"
```

### 4. Start the backend

From the backend directory:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Backend API:

- Base URL: `http://127.0.0.1:8000`
- Swagger documentation: `http://127.0.0.1:8000/docs`
- Health endpoint: `http://127.0.0.1:8000/health`

### 5. Set up and start the frontend

Open another terminal:

```powershell
cd frontend

npm install
npm run dev
```

Frontend development URL:

`http://localhost:5173`

## Useful Commands

### Frontend

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```

### Backend syntax verification

```powershell
.\.venv\Scripts\python.exe -m compileall app
```

## Important Notes

- Supabase is used for persistent application data and authentication.
- Configure the required Supabase tables, functions, triggers, and RLS policies before using the application.
- The C++ executable must be compiled and available at the expected path for ADSA operations.
- Product UUIDs remain database identifiers; product codes provide a separate human-readable identifier.
- Do not expose backend credentials or commit `.env` files.
- The `docs` and `tests` directories are reserved for future documentation and automated tests.

## Project Purpose

Shop-Corner 2.0 demonstrates how data structures and algorithms can be integrated into a practical full-stack inventory and shopping management application.
