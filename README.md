# Sadaf 360

Business control tower for a medical equipment / devices / consumables distributor (first customer: Sadaf Medical, Jordan).

- `src/` – Next.js app (multi-tenant: every business table carries `company_id`). Login, session, audit log, login throttle.
- `src/core/calc.ts` – pure calculation core (gross profit, aging, expiry loss, purchase gap, tenders…). Tested against the worked examples in `docs/Sadaf_inputs_workbook.xlsx`. All date logic takes an explicit `asOf`.
- `demo/index.html` – frozen promotional demo with synthetic data. Deployed separately; never served by the app site.
- `docs/` – input workbook (what Alpha ERP must export, what is entered manually).

## Develop

```
cp .env.example .env.local      # set DATABASE_URL and SESSION_SECRET
npm i
npm run db:migrate
COMPANY_SLUG=sadaf COMPANY_NAME="Sadaf Medical" USER_EMAIL=... USER_NAME=... USER_PASSWORD=... npm run user:create
npm run dev
```

Before a PR: `npm run typecheck && npm run lint && npm test && npx next build`.

Schema changes: `npm run db:generate` then `npm run db:netlify-migrations` (mirrors Drizzle SQL into `netlify/database/migrations`).

## Accounts

- `/signup` creates a company and its owner (free; limited to 5 per network address per hour, honeypot, password policy).
- `/forgot-password` emails a one-time link (valid 60 minutes, only its hash is stored); `/reset-password` sets the new password and signs out every older session.
- Email goes through Brevo: set `BREVO_API_KEY` and `MAIL_SENDER` (a verified sender). Without them the forgot-password page says it is not set up. Links use `APP_URL` (or Netlify's `URL`), never request headers.
- Tests run the real migrations on an in-process Postgres (PGlite): `tests/integration/accounts.test.ts`.

## Rules

- Never show a figure without its as-of date and source file.
- Estimates (expiry loss, purchase gap, scenarios) are labelled as estimates and never summed with overlapping measures.
- No real client data in `demo/` or in this repo.
