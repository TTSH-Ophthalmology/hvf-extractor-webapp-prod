# HVF Extractor Web App

A web application for extracting structured data from Humphrey Visual Field (HVF)
test PDF reports and exporting the values as CSV files.

## What It Does

1. **Upload** — Clinician uploads one or more HVF PDF reports
2. **Extract** — Backend parses the PDF and extracts key visual field values
3. **Review** — User reviews and optionally edits the extracted data in-browser
4. **Export** — Download the final data as a CSV file

## Architecture

```
frontend/   React + TypeScript (Vite)   — user interface
backend/    FastAPI (Python 3.11+)       — PDF processing API
```

MVC is applied in both layers. See [SETUP.md](./SETUP.md) to get running locally
and [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution workflow.

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Interactive API docs | http://localhost:8000/docs |

## Docs

- [docs/SETUP.md](./docs/SETUP.md) — full environment setup and tools required
- [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) — branching strategy, code conventions, MVC rules
