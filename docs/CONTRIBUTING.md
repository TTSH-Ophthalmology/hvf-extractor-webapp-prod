# Contributing Guide

## Branching Strategy

```
main        - production-ready code only; merges via PR from develop
develop     - integration branch; all feature/fix branches target this
feature/*   - new features          (branch from develop)
fix/*       - bug fixes             (branch from develop)
chore/*     - tooling, deps, docs   (branch from develop)
```

## Workflow

1. Branch from `develop`: `git checkout -b feature/your-feature develop`
2. Make changes following the conventions below
3. Run tests and linting locally before pushing
4. Open a Pull Request targeting **`develop`**
5. At least one peer review required before merge
6. Merges to `main` are done by the project maintainer after QA

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

Types:  feat | fix | docs | style | refactor | test | chore
Scopes: frontend | backend | api | pdf | extraction | export | deps

Examples:
  feat(extraction): add threshold sensitivity parsing
  fix(api): handle empty PDF upload gracefully
  docs(setup): add Windows activation instructions
  test(extraction): add unit tests for MD field parser
```

---

## Code Conventions

### Python (Backend)

- **Formatter:** Black (line length 88)
- **Linter:** Ruff
- **Type hints** required on all function signatures
- **Docstrings** on all public service methods (Google style)

```bash
# Run before every commit:
black app/
ruff check app/
pytest
```

### TypeScript (Frontend)

- **Formatter:** Prettier
- **Linter:** ESLint with TypeScript plugin
- All React components must be typed, no implicit `any`
- Custom hooks must start with `use`

```bash
# Run before every commit:
npm run lint
npm run typecheck
npm run test
```

---

## MVC Rules (enforced in code review)

### Backend

| Layer | Folder | Rule |
|-------|--------|------|
| Model | `app/models/` | Pydantic schemas only. No methods, no imports from routers or services. |
| View | `app/routers/` | Define HTTP endpoints. Call a service method. Return the response model. Nothing else. |
| Controller | `app/services/` | All business logic lives here. No HTTP knowledge (no `Request`, no `Response`). |

### Frontend

| Layer | Folder | Rule |
|-------|--------|------|
| Model | `src/models/` | TypeScript `interface`/`type` only. No methods. Mirror backend schemas. |
| View | `src/components/`, `src/pages/` | Render JSX, accept props, call hook callbacks. Never import from `services/` directly. |
| Controller | `src/hooks/`, `src/services/` | Hooks manage state and compose service calls. Services contain raw axios functions. |

---

## How to Add a New HVF Extraction Field

Follow these steps in order so both layers stay in sync:

1. **Backend model**: add the field to `backend/app/models/extraction.py`
2. **Backend service**: implement parsing logic in `backend/app/services/extraction_service.py`
3. **Backend test**: add a test case in `backend/tests/test_extraction_service.py`
4. **Frontend model**: mirror the new field in `frontend/src/models/extraction.ts`
5. **Frontend view**: display it in `frontend/src/components/extraction/ResultExtractionDataPreview/ResultExtractionDataPreview.tsx`

---

## Pull Request Checklist

- [ ] Branched from `develop`, not `main`
- [ ] Commit messages follow Conventional Commits format
- [ ] All tests pass locally (`pytest` / `npm run test`)
- [ ] Linting passes (`ruff check` / `npm run lint`)
- [ ] TypeScript compiles cleanly (`npm run typecheck`)
- [ ] MVC layer boundaries respected (no cross-layer logic leaks)
- [ ] New HVF fields added following the checklist above (if applicable)
- [ ] `docs/SETUP.md` or `docs/CONTRIBUTING.md` updated if tooling/workflow changed
