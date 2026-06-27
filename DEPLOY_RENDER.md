# Alyssia's Angels — deploying on Render

This repo is configured for Render's Blueprint deploy via `render.yaml`. Two
services are provisioned from a single connect-to-GitHub action.

## 0. One-time prep

1. Push this repo to GitHub.
2. Make sure your **MongoDB Atlas** Network Access still allows `0.0.0.0/0` (or
   add Render's egress IPs once you've identified them).
3. Have these secrets ready:

| Secret | Where to get it |
|---|---|
| `MONGO_URL` | Atlas → Database → Connect → Drivers (URL-encode any `@` in the password as `%40`) |
| `JWT_SECRET` | Generate any 32+ char random string (`openssl rand -hex 32`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_FULL_NAME` | Whatever you want to log in with |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Already provided — paste them in |
| `RESEND_API_KEY` / `SENDER_EMAIL` | Resend dashboard. Sender must be on a verified Resend domain or it falls back to `onboarding@resend.dev` (test-only) |
| `EMERGENT_LLM_KEY` | Only needed if you keep using Emergent object storage for uploads. Replace with S3/R2 long-term — see "Replacing object storage" below. |
| `ADMIN_NOTIFICATION_EMAIL` | Email that receives "new payout request" notifications |

## 1. First deploy (Render Blueprint)

1. In Render dashboard click **New +** → **Blueprint**.
2. Connect the GitHub repo containing this code.
3. Render parses `render.yaml` and offers to create two services:
   - `alyssias-angels-api` (FastAPI backend)
   - `alyssias-angels-web` (React static site)
4. Click **Apply**.
5. For **every secret listed above**, paste the value into the corresponding
   env var in the Render dashboard. (Public values are already filled in.)
6. Wait for the API to deploy (~5 min). Once green, copy its URL — it will
   look like `https://alyssias-angels-api.onrender.com`.
7. Paste that URL into the web service's `REACT_APP_BACKEND_URL` env var, then
   click **Manual Deploy → Clear build cache & deploy** on the web service.
8. Once the web service finishes, hit its URL to verify everything works.

## 2. Attach `alyssiasangels.online`

Once Namecheap activates the domain (2 days from purchase):

1. In the Render dashboard, open the **web service** (not the API).
2. **Settings** → **Custom Domains** → **Add Custom Domain** → `alyssiasangels.online`.
3. Render gives you a CNAME (e.g. `alyssias-angels-web.onrender.com`) plus
   sometimes A records for the apex.
4. In Namecheap → **Domain List** → **Manage** → **Advanced DNS**:
   - Delete the default Namecheap parking records first.
   - Add the records Render gives you (typically a `CNAME` for `www` and
     `A`/`ALIAS` records for the apex).
5. Repeat the same custom domain step for the **API service** if you want it
   on a subdomain like `api.alyssiasangels.online` (optional but clean).
6. SSL is provisioned automatically by Render within ~5 min once DNS resolves.

## 3. Final env var pass after the domain is live

In Render dashboard, update these (and trigger a redeploy):

- API service:
  - `FRONTEND_URL=https://alyssiasangels.online`
- Web service:
  - `REACT_APP_BACKEND_URL=https://api.alyssiasangels.online` (or the
    `*.onrender.com` URL if you didn't set up an api subdomain)
  - `REACT_APP_SHARE_BASE_URL=https://alyssiasangels.online`

All share links will then read `https://alyssiasangels.online/c/<code>` and
verification emails will link to the production URL.

## 4. Replacing Emergent object storage (recommended long-term)

The current upload endpoint stores files via Emergent's object storage
(`integrations.emergentagent.com`). It works in production but is tied to the
Emergent platform. To make this fully portable:

1. Provision an S3-compatible bucket (Cloudflare R2, AWS S3, Backblaze B2).
2. Replace `put_object` / `get_object` in `/app/backend/server.py` with
   `boto3` calls.
3. Set `S3_*` env vars in Render.

Until that's done: keep `EMERGENT_LLM_KEY` set in Render and the existing
upload flow continues to work.

## 5. Cold-start note (Render Starter plan)

The Starter plan ($7/mo) keeps the service warm. If you ever switch the API
to the Free plan, Render will spin it down after 15 min of inactivity and the
first request after a sleep takes 30-60 seconds. For a donation platform
where users land via shared links, Starter is the right call.
