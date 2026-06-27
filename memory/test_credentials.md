# Test Credentials — Alyssia's Angels

## Admin
- **Email:** dgawaine@yahoo.com
- **Password:** Gee@140994
- **Role:** admin
- **Full Name:** Alyssia Hazel D'Ahl
- **email_verified:** true (auto)
- **requires_password_change:** false (admin uses their own password from .env)

## Fundraiser (test recipe)
The testing agent should register a new fundraiser via the UI / API:
- Suggested email: `qa+<timestamp>@example.com`
- Suggested password: `Password123`
- Role assigned automatically: `fundraiser`
- email_verified: starts `false`; verification link logged in backend logs as `VERIFICATION_LINK for <email>: <url>`

To retrieve the latest verification token from MongoDB:
```
mongosh alyssias_angels --quiet --eval "print(db.email_verification_tokens.find({},{token:1,email:1,_id:0}).sort({created_at:-1}).limit(1).toArray()[0].token)"
```
Then POST to `/api/auth/verify-email?token=<TOKEN>` to confirm.

## Auth Endpoints
- `POST /api/auth/register` — creates `fundraiser` with `email_verified=false`, sends verification email (via Resend if configured, else logs link to backend stdout/log)
- `POST /api/auth/login` — returns `{ token, user }`; user has `email_verified` boolean
- `GET /api/auth/me` — current user (includes `role`, `email_verified`, kyc fields)
- `POST /api/auth/verify-email?token=...` — marks user as verified
- `POST /api/auth/resend-verification` body `{ email }` — re-sends verification email (anti-enumeration: always returns ok)
- `POST /api/auth/change-password` body `{ current_password, new_password }`

## Gating Rules
Endpoints requiring `email_verified=true` (or `role=admin`):
- `POST /api/campaigns` — create campaign
- `POST /api/campaigns/{id}/updates` — post fundraiser update with optional image
- `POST /api/payouts/request` — request payout

Admin-only (returns 403 for fundraiser):
- All `/api/admin/*` endpoints (stats, campaigns, payouts decision, kyc, donations log, ledger, csv exports)

## Frontend Routes
- `/` Landing
- `/discover` Discover campaigns (public)
- `/campaigns/:id` Campaign detail (public; donate button)
- `/donate/:id` Enter amount → PayPal Live checkout
- `/donate/return` Capture order → ledger transaction
- `/fundraisers`, `/fundraisers/:id` Public fundraiser directory
- `/login`, `/register`, `/verify-email` Auth
- `/dashboard` Fundraiser dashboard (protected) — email-verify banner visible if unverified
- `/campaigns/new` Create campaign (protected; backend blocks if unverified)
- `/kyc` KYC submission (protected)
- `/admin` AdminPanel (protected, role=admin)

## PayPal
- Mode: **Live**
- Configured in `/app/backend/.env` (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`)
- Flow: `POST /api/donate/create` → approval_url → user pays on PayPal → return URL → `POST /api/donate/capture`
