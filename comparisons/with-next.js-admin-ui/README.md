# Next.js Admin UI (defuss clone)

A minimal Next.js + shadcn/ui clone of the defuss `with-admin-ui` example.

## Routes
- `/` Login screen
- `/dashboard`
- `/users`
- `/tenants`
- `/api-keys`

## Development
### 1) Start the backend
```bash
cd comparisons/with-next.js-admin-ui
uv run --with fastapi --with uvicorn uvicorn backend.main:app --reload --port 8000
```

### 2) Start Next.js
```bash
cd comparisons/with-next.js-admin-ui
cp .env.example .env.local
pnpm dev
```

## Notes
- Server components fetch backend data with `fetch` in `lib/api-client.ts`.
- Backend endpoints are defined in `backend/main.py`.
- Default backend URL is `http://127.0.0.1:8000` and can be changed with `ADMIN_BACKEND_URL`.
- Admin pages are protected by middleware (`middleware.ts`) and require a demo session cookie.
- Login posts to `/api/auth/login` using demo credentials shown on the login card.
- Styling is Tailwind v4 + shadcn/ui primitives.

## E2E (Playwright)
### 1) Install browser binaries in a writable location
```bash
cd comparisons/with-next.js-admin-ui
PLAYWRIGHT_BROWSERS_PATH=/Users/tom/Library/Caches/ms-playwright npx playwright install chromium
```

### 2) Run tests
```bash
cd comparisons/with-next.js-admin-ui
PLAYWRIGHT_BROWSERS_PATH=/Users/tom/Library/Caches/ms-playwright pnpm run test:e2e
```

Playwright will start both servers automatically via `playwright.config.ts`:
- Next.js on `http://127.0.0.1:3001`
- FastAPI backend on `http://127.0.0.1:8000`

If you run tests from Codex, grant one-time approval for the command prefix
`pnpm run test:e2e` so Chromium can launch outside the sandbox.
