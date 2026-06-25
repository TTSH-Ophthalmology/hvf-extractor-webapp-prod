# Developer Setup Guide

## Required Tools

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | https://python.org or `pyenv` |
| Node.js | 20+ (LTS) | https://nodejs.org or `nvm` |
| npm | 10+ (bundled with Node 20) | — |
| Git | 2.40+ | https://git-scm.com |

### Optional but recommended

| Tool | Purpose |
|------|---------|
| `pyenv` | Manage multiple Python versions (macOS/Linux) |
| `nvm` | Manage multiple Node versions |
| VS Code | Editor with workspace settings |
| Postman / Insomnia | Manual API testing |

---

## Quick Setup (recommended)

Run the setup script from the repo root. It handles the virtual environment,
all dependencies, and `.env` files for both backend and frontend automatically.

**macOS / Linux**
```bash
bash scripts/setup.sh
```

**Windows (PowerShell)**
```powershell
.\scripts\setup.ps1
```

> If you get an execution policy error, run this once first:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

Once the script finishes, skip to [Starting the Servers](#starting-the-servers).

---

## Manual Setup

```bash
cd backend

# 1. Create virtual environment
python -m venv .venv

# 2. Activate it
#    macOS/Linux:
source .venv/bin/activate
#    Windows (PowerShell):
.venv\Scripts\Activate.ps1
#    Windows (CMD):
.venv\Scripts\activate.bat

# 3. Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt   # dev tools: pytest, ruff, black

# 4. Copy env template
cp .env.example .env
# Edit .env as needed (defaults work for local development)

# 5. Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs: http://localhost:8000/docs

---

## Frontend Setup (manual)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env
# Edit VITE_API_URL if your backend runs on a different port

# 3. Start dev server
npm run dev
```

App: http://localhost:5173

Vite is pre-configured to proxy all `/api` requests to `http://localhost:8000`,
so you do not need to configure CORS headers during development.

---

## Starting the Servers

After either setup method, start both servers:

**Backend**
```bash
cd backend
source .venv/bin/activate        # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm run dev
```

Or use the **VS Code `Full Stack` debug configuration** to start both with one click.

---

## Running Tests

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm run test        # unit tests (Vitest)
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000
UPLOAD_DIR=./data/uploads
CORS_ORIGINS=["http://localhost:5173"]
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

---

## Project Structure Overview

```
hvf-extractor-webapp-prod/
├── docs/       Developer documentation
├── backend/    FastAPI app (Python)  — MVC: models/, routers/, services/
└── frontend/   React app (Vite)      — MVC: models/, components|pages/, hooks|services/
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for a full explanation of the MVC conventions.
