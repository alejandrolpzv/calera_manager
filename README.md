# Calcium Factory OS

Mobile-first full-stack factory management for a small calcium carbonate operation, built to start lean in Phase 1 and scale into a broader industrial system without rewriting the foundation.

## Phase 1 scope

- Expenses with standardized categories
- Sales and automatic total calculation
- Production entries and automatic inventory increase
- Inventory tracking with automatic sales decrease
- Admin and operator roles with secure password hashing and JWT cookie auth
- Dashboard with core KPIs and charts
- Weekly/monthly style reporting with date-range filters
- PDF and Excel export

## Architecture notes

The current UI only implements Phase 1 features, but the database already includes future-ready models for:

- `Machine`
- `MachineLog`
- `Shift`
- `Maintenance`

`Production` already has an optional `shiftId`, and the domain services are centralized in [`src/server/services/factory.ts`](./src/server/services/factory.ts) so future machine, shift, and maintenance workflows can be added without refactoring the whole app.

## Tech stack

- Next.js App Router
- React 19
- Tailwind CSS 4
- Prisma + PostgreSQL
- JWT auth with secure HTTP-only cookies
- Custom SVG/CSS dashboard charts
- jsPDF + Excel-compatible report export

## Local setup

1. Copy environment variables:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Set a real PostgreSQL connection string in `.env`.

3. Generate Prisma client and push the schema:

```bash
npm install
npm run db:generate
npm run db:push
```

4. Seed the first users and products:

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Default seeded users

- Admin: `admin@factory.local` / `Admin123!`
- Operator: `operator@factory.local` / `Operator123!`

Change these in `.env` before seeding production data.

## Deployment

For production, do **not** enable `USE_LOCAL_DEV_STORE`. The local JSON store is only for quick development demos. Use PostgreSQL/Supabase so the app works reliably from your phone and across devices.

### Recommended: Vercel + Supabase

1. Create a new Supabase project.
2. In Supabase, open **Connect** and copy a Postgres connection string for Prisma.
3. In this project, set `DATABASE_URL` to that connection string.
4. Push the schema to Supabase once:

```bash
npm run db:push
```

5. Seed the first admin/operator users once:

```bash
npm run db:seed
```

6. Push the project to GitHub.
7. Import the GitHub repo into Vercel.
8. In Vercel Project Settings -> Environment Variables, add:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `USE_LOCAL_DEV_STORE=false`
   - `DEFAULT_ADMIN_NAME`
   - `DEFAULT_ADMIN_EMAIL`
   - `DEFAULT_ADMIN_PASSWORD`
   - `DEFAULT_OPERATOR_NAME`
   - `DEFAULT_OPERATOR_EMAIL`
   - `DEFAULT_OPERATOR_PASSWORD`
   - optional: `OPENAI_API_KEY`
   - optional: `OPENAI_PAYROLL_MODEL`
9. Vercel build command:

```bash
npm run build
```

The build script already runs `prisma generate && next build`.

10. After deployment, open the Vercel URL on your phone and use the browser option **Add to Home Screen**.

### Netlify alternative

Netlify supports modern Next.js apps, including App Router and route handlers, through its OpenNext adapter. Use these settings:

- Build command: `npm run build`
- Publish directory: `.next`
- Environment variables: same list as Vercel
- Database: Supabase/PostgreSQL, same as above

For this app, Vercel is still the preferred first deployment target because the project is Next.js + API routes + Prisma.

### Production notes

- Change `DEFAULT_ADMIN_PASSWORD` before running `npm run db:seed` in production.
- Keep `JWT_SECRET` long and random.
- Do not commit `.env`.
- If using Supabase pooler strings, use the session/direct connection for `npm run db:push`; use a pooled connection for deployed serverless runtime if needed.
- If you change database models later, run `npm run db:push` again against production deliberately.


## Business rules implemented

- Income total = `quantity * price_per_unit`
- Profit = `total_income - total_expenses`
- Cost per unit = `total_expenses / total_production`
- Production increments inventory
- Sales decrement inventory
- Sales are blocked when inventory is insufficient

## API routes

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/expenses`
- `POST /api/income`
- `POST /api/production`
- `GET /api/inventory`
- `GET /api/products`
- `POST /api/products`
- `GET /api/dashboard`
- `GET /api/reports`

## Future extension ideas

- Add machine-hour and diesel forms on top of `Machine` and `MachineLog`
- Link `Production` to shifts in the UI
- Add maintenance planning and cost analytics
- Add client master data and receivables
- Add audit logs and approvals
