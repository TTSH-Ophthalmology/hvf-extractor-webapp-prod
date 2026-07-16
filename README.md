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
scripts/    Build and deployment scripts
docs/       Documentation
```

MVC is applied in both layers. See [docs/SETUP.md](./docs/SETUP.md) to get running locally
and [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) for the contribution workflow.

---

## Local Development

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

Or run the automated setup script:

```bash
# macOS / Linux
bash scripts/setup.sh

# Windows (PowerShell)
.\scripts\setup.ps1
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Interactive API docs | http://localhost:8000/docs |

---

## Air-Gapped Deployment

For deployment on machines with no internet access. The bundle includes a pre-built
frontend, all Python dependencies, PaddleOCR models, and a self-contained Python
runtime — the target machine needs nothing pre-installed (Windows).

### Build the bundle (developer machine)

```powershell
# Windows
.\scripts\bundle.ps1

# Linux / macOS
./scripts/bundle.sh
```

### Install and run (target machine)

```cmd
# Windows — Command Prompt
install.bat
start.bat
```

```powershell
# Windows — PowerShell
.\install.ps1
.\start.ps1
```

```bash
# Linux / macOS
./install.sh
./start.sh
```

Open your browser at `http://127.0.0.1:8000`.

See [docs/AIRGAPPED-DEPLOY.md](./docs/AIRGAPPED-DEPLOY.md) for full instructions,
transfer options, and configuration notes.

---

## Docs

- [docs/SETUP.md](./docs/SETUP.md) — full environment setup and tools required
- [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) — branching strategy, code conventions, MVC rules
- [docs/AIRGAPPED-DEPLOY.md](./docs/AIRGAPPED-DEPLOY.md) — air-gapped deployment guide
