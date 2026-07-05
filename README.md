# Rentfolio

A free, self-hosted rental property management app, an [Avail](https://www.avail.co)-style
tool you fully own and can modify. No subscriptions, no per-unit fees. Built for small
landlords (a 15-property portfolio is well within its comfort zone).

## What it does

**Landlord side** (sign in → `/dashboard`)

- **Dashboard**, portfolio overview: occupancy, rent collected this month, overdue balances, open maintenance, new applications.
- **Properties & units**, any mix of single-family and multi-unit buildings, with notes and per-property documents.
- **Leases**, terms, deposits, due day, grace period, automatic late fees, tenants on lease, document uploads.
- **Rent collection**, monthly rent charges generate automatically for every active lease (no cron needed; they're created lazily when you open the app). Record payments by cash/check/Zelle/Venmo/ACH; partial payments supported; **every payment links to the specific charge it pays**, so you never lose track of which month a payment applied to. Late fees auto-apply after the grace period.
- **Maintenance**, track requests with priority, status, cost, and a comment thread shared with the tenant.
- **Listings**, create a listing for a vacant unit with photos and amenities; publishing gives you a public page (`/l/<slug>`) and application link (`/apply/<slug>`) you can paste into Zillow Rental Manager/Craigslist/Facebook Marketplace.
- **Leads**, a lighter-weight contact form on the public listing page for people who aren't ready for a full application yet.
- **Applications**, applicants fill out a full rental application (income, employment, references, pets...); review, annotate, and approve/deny in-app.
- **Tenants**, create tenant accounts; they get their own portal.
- **Accounting**, income vs. expenses by year and property, expenses tracked in IRS Schedule E categories, CSV export for your tax preparer.
- **Rent roster**, a court/lender-ready export of every active lease, tenant, rent, and balance owed.
- **E-signature**, mark an uploaded document as requiring a signature; the tenant signs by typing their full name, which is recorded with a timestamp and IP address. (See "What's intentionally different" below for why this isn't DocuSign.)
- **Two-factor authentication**, optional TOTP (any authenticator app) on both landlord and tenant logins, set up from Settings.
- **Resources**, a place to save your own links (court case lookups, screening services, listing sites), nothing is pre-filled with guessed URLs; you add what you actually use.
- **Weekly follow-up digest**, emails overdue rent, leases ending within 30 days, and open maintenance, so you know who to follow up with. Trigger it manually from Settings or schedule it (see below).
- **Ask the data**, a plain-English question box that generates a read-only SQL query against your own data and shows you exactly what ran before showing results. Needs an `ANTHROPIC_API_KEY` (see below).

**Tenant portal** (tenant sign in → `/portal`)

- Balance, charge ledger, payment history.
- Submit and follow maintenance requests.
- Sign documents the landlord has flagged as needing a signature.

## Getting started

```bash
npm install
npm run setup    # creates the SQLite database and the first accounts
npm run dev      # development, or: npm run build && npm start for production
```

Then open http://localhost:3000 and sign in:

| Account | Email | Password |
| --- | --- | --- |
| Landlord | `landlord@example.com` | `rentfolio123` |
| Demo tenant 1 | `demo.tenant1@example.com` | `tenant1234` |
| Demo tenant 2 | `demo.tenant2@example.com` | `tenant1234` |

**Change all passwords right away** (Settings page). The seed creates a small demo portfolio
(3 properties, 2 tenants, 1 published listing with a sample lead) so you can poke around,
delete it once you add your real properties. Override the seeded landlord login with
`SEED_LANDLORD_EMAIL` / `SEED_LANDLORD_PASSWORD` environment variables before running `npm run setup`.

## Optional environment variables

None of these are required to run the core app, only the features that need them:

| Variable | Enables | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | Session signing | Set a strong random value in production. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Weekly digest emails | Any SMTP provider works (Gmail app password, Resend, etc.), no paid service required. |
| `DIGEST_TO` | Weekly digest recipient | Defaults to your own login email if unset. |
| `DIGEST_CRON_SECRET` | Scheduled digest | Lets a cron job hit `/digest/send?token=...` without a login session. |
| `GEMINI_API_KEY` | "Ask the data" assistant | Free key at aistudio.google.com. Without it, that page shows a setup message instead of crashing. |
| `ASSISTANT_MODEL` | Assistant model override | Defaults to `gemini-1.5-flash`. |

**Scheduling the weekly digest:** since this is a single self-hosted process with no built-in
cron, schedule an external hit to the endpoint, e.g. a Windows Task Scheduler job or cron
entry running weekly:

```bash
curl "http://localhost:3000/digest/send?token=YOUR_DIGEST_CRON_SECRET"
```

## Running it for real

- `npm run build && npm start` runs the production server on port 3000. Put it on any
  always-on box: a $4 VPS, a Raspberry Pi, or a spare PC. If tenants should reach the
  portal/listings from outside, put it behind a domain with HTTPS (e.g. Caddy or
  Cloudflare Tunnel).
- **Backups**: all data is two things, `prisma/dev.db` (the SQLite database) and the
  `uploads/` folder. Copy them anywhere on a schedule and you have a full backup.

## What's intentionally different from Avail

These aren't oversights, they're things that genuinely can't be free, don't have a public
API to build against, or carry real legal/financial risk that's worth a deliberate decision
rather than a quiet auto-build:

- **Online rent payment processing (Square/Stripe/card collection)**, moving real money
  requires a payment processor with KYC and per-transaction fees, so it can't be free.
  Rentfolio tracks charges/balances and you collect via Zelle/check/ACH as you do today.
- **Bank and payment-app API access (Zelle, Venmo, Cash App, PayPal, Apple Pay, Google Pay)**
 , none of these expose a personal transaction API to outside developers, at any price. The
  only real path is Plaid linking an actual bank account (which itself isn't free at
  meaningful volume, and still wouldn't see Cash App/Venmo balances that never hit the bank).
- **DocuSign**, has no free tier for real production use. The built-in e-signature (typed
  name + timestamp + IP, recorded in the Document model) is E-SIGN-Act-sufficient for most
  residential leases at $0 instead of a per-envelope fee.
- **Credit/background screening**, Avail resells TransUnion reports. Use TransUnion
  SmartMove (or similar) directly and paste results into the application's internal notes,
  save the link in Resources.
- **Automated eviction-record lookups**, many states' public court case-lookup sites (like
  Indiana's mycase.in.gov) are free to search manually, but automating that via scraping is
  brittle (every state runs a different system) and several states' terms of service
  prohibit automated access. That's a legal-risk decision, not a coding one, Resources lets
  you save the lookup links you actually use instead.
- **Listing syndication to Zillow/Realtor.com/Trulia**, no developer API exists for
  individual landlords to post programmatically. The public listing page gives you one link
  to paste manually into each site's own free listing tool instead.

## Tech

Next.js 16 (App Router, server actions) · TypeScript · Tailwind CSS 4 · Prisma 6 + SQLite ·
JWT cookie sessions (`jose`) + `bcryptjs` · `otpauth`/`qrcode` for TOTP-based MFA ·
`nodemailer` for the optional weekly digest · Google Gemini Flash (via REST, no SDK) for the
optional "Ask the data" assistant (guarded to read-only, schema-limited SELECT queries, see
`src/lib/sqlSafety.ts`). No required external services; the core app runs in one Node process.

Schema lives in `prisma/schema.prisma`; after editing it run `npx prisma db push`.
"# rentfolio" 
