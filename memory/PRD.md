# Alyssia's Angels — Crowdfunding Platform

## Original problem statement
Source: github.com/AlyssiasAngels/Alyssia-s-Angels.git (uploaded as zip)

User asks (verbatim):
1. Ensure PayPal is done correctly.
2. Only admin must be able to access admin — logging in as a fundraiser must NOT show admin.
3. Separate fundraiser accounts.
4. Donators don't need an account, but can sign up if they want to.
5. Fundraisers must be able to add updates and pictures.
6. Signup must be email-verified for fundraiser users.

Design preference: keep existing design.

## Architecture
- **Backend:** FastAPI (Python) + Motor (async MongoDB) — `/app/backend/server.py`
- **Frontend:** React 18 + Vite/CRA, Tailwind + shadcn/ui — `/app/frontend/src`
- **Database:** MongoDB (local in preview; user-provided Atlas URI failed SSL handshake from container — easy to swap once IP allowlist is opened on Atlas)
- **PayPal:** Live Orders v2 (`/app/backend/paypal_client.py`)
- **Email:** Resend (currently no API key in `.env`; verification links logged to backend stdout as `VERIFICATION_LINK for <email>: <url>`)
- **Auth:** Bearer JWT (PyJWT + bcrypt)

## Roles
- `admin` — full access to all `/api/admin/*` routes; can manage payouts, KYC, ledger.
- `fundraiser` — creates campaigns, posts updates with images, requests payouts (after email verification).
- `(anonymous)` — anyone can donate via PayPal and post comments without an account.

## Implemented in this session
- [2026-06-27] Bootstrapped codebase from uploaded zip; created `.env` for backend & frontend.
- [2026-06-27] **Role rename**: signup now creates `role: "fundraiser"` (was `"user"`); `users_count` stat covers both legacy and new role names.
- [2026-06-27] **Email verification**:
  - Added `email_verification_tokens` MongoDB collection (indexed, 24h TTL).
  - `POST /api/auth/register` now creates `email_verified=false` + sends verification email (via Resend or log fallback).
  - `POST /api/auth/verify-email?token=...` — idempotent (re-clicking the link returns success if already verified).
  - `POST /api/auth/resend-verification` — anti-enumeration, invalidates prior unused tokens.
  - New dependency `require_verified_fundraiser` gates `POST /campaigns`, `POST /campaigns/{id}/updates`, `POST /payouts/request`.
  - `GET /auth/me` and login response include `email_verified`.
- [2026-06-27] **Admin separation hardened**:
  - Admin seed now uses real admin name from env, sets `email_verified=true`, `requires_password_change=false`.
  - All `/api/admin/*` endpoints protected by `require_admin`; fundraiser receives 403 `Admin only`.
  - Frontend Navbar shows admin button only when `user.role === "admin"`; `ProtectedRoute role="admin"` redirects fundraisers to `/dashboard`.
- [2026-06-27] **Frontend additions**:
  - New `/verify-email` route with success / error / resend states (`VerifyEmail.jsx`).
  - Dashboard email-verify banner (`data-testid="email-verify-banner"`) with `Resend email` button.
  - Banner suppressed once `email_verified=true`.
- [2026-06-27] **Anonymous donors** confirmed: `/api/comments` accepts no Authorization; donations via PayPal don't require auth. Sign-up remains optional.
- [2026-06-27] **PayPal Live** wired and verified: `POST /api/donate/create` returns `https://www.paypal.com/checkoutnow` approval URL.
- [2026-06-27] Testing agent: 27/27 backend tests passed; one frontend UX regression (StrictMode double-call) fixed by making verify endpoint idempotent.
- [2026-06-27] **Atlas migrated**: user opened `0.0.0.0/0` allowlist; backend now points to `cluster0.hxtpclc.mongodb.net/alyssias_angels`. Local data migrated, then DB was wiped to a clean state with only admin.
- [2026-06-27] **Edit & Delete campaigns**: `PATCH /api/campaigns/{id}` and `DELETE /api/campaigns/{id}` for owner/admin; new `/campaigns/:id/edit` page with image replace; Edit buttons on Dashboard cards & CampaignDetail.
- [2026-06-27] **Shareable codes**: every campaign now gets a short 7-char URL-safe `share_code` on creation (no ambiguous chars). New endpoint `GET /api/c/{code}` resolves to the campaign. New public route `/c/:code` redirects donors straight to the campaign page. New `ShareDialog` component with copy-link + WhatsApp, Facebook, X, Email, and native share. Share buttons on CampaignDetail and Dashboard cards.
- [2026-06-27] **Bank-based payouts (international)**: replaces PayPal-email-only payouts.
  - User profile carries `bank_details` (account holder, bank, country, IBAN, account #, SWIFT/BIC, routing/sort, address, reference).
  - New page `/payout-method` to save/edit bank details.
  - `POST /api/payouts/request` requires saved bank details (snapshots into the payout request); legacy `payout_method: "paypal"` still accepted as fallback.
  - Admin payouts table shows full bank details inline for each request.
  - Admin email notification now includes full bank destination.
  - "Settles in 2–5 business days" notice across the payout UI.
  - Dashboard banner prompts new fundraisers to set up bank details; switches to a verified-style banner once saved.
- [2026-06-27] Migrated legacy `role: "user"` accounts to `role: "fundraiser"`.
- [2026-06-27] **Fee model simplified**: replaced the old PayPal 3.49%+$0.49 / total 8.5%+$0.49 split with a **flat 13% processing fee**. Recompute applied retroactively to existing ledger transactions and campaign balances. Dashboard now shows `Amount raised` (gross), `Net earned` (after 13%), and `Available to withdraw` (net − committed payouts since last). Admin Ledger columns simplified to `Gross / Fee (13%) / Net (87%)`. Terms of Service & Donate page updated.

## Out-of-scope / Backlog
- P1: Verify a Resend domain (currently restricted to `taksigeorgia@gmail.com` only).
- P2: Refactor server.py (~1700 lines) into routers.
- P2: `/api/donate/capture` returns 502 for ORDER_NOT_APPROVED — could return 400.
- P2: Branded Resend HTML email templates.
- P2: Admin "force-resend verification" tool.
- P2: Custom-vanity share codes (let fundraisers pick a memorable slug).
- P2: Export bank details in admin CSV.

## Test credentials
See `/app/memory/test_credentials.md` (admin: `dgawaine@yahoo.com / Gee@140994`).
