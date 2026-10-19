# Testing authentication with Supabase Postgres

These routes use application-managed accounts and sessions in Postgres, separate from Supabase Auth. No Supabase API key is required. Your existing signup/signin screens use these routes.

1. Set `DATABASE_URL` in `.env` to the exact connection URI from Supabase's Connect panel. Replace the database password placeholder; URL-encode special characters in the password. Keep this file private.
2. Run `npm install`.
3. Run `node --env-file=.env scripts/setup-auth-db.mjs` once to create the app's users and sessions tables. This enables RLS and denies access to these tables through Supabase's browser API roles. The server connection needs schema/table ownership privileges.
4. Run `npm run dev`, visit `/signup`, create an account, sign out, then sign back in at `/signin`. Reload to check session persistence.
5. With the development server running, run `node --env-file=.env scripts/test-auth.mjs`. It checks validation, duplicate signup, wrong passwords, session lookup, and token revocation after signout, then deletes its own test account. Set `AUTH_TEST_ORIGIN` if using a different port.

Routes: `POST /api/auth/signup`, `POST /api/auth/signin`, `POST /api/auth/signout`, and `GET /api/auth/me`. Signup expects `{ name, email, password, zipCode, skillLevel? }`; signin expects `{ email, password }`. Success sets an HTTP-only session cookie valid for 30 days. Production cookies require HTTPS. Database failures return a generic 503 JSON error without exposing connection details.

`ENOTFOUND` means the configured hostname could not be resolved. Verify the URI in Connect. Direct Supabase connections may require IPv6; if your network cannot reach the direct endpoint, use the Session pooler URI from the same panel. Restart the development server after changing `.env`.

This schema initializes authentication only; it does not create tournament/bracket tables. Rate limiting, email verification and password recovery are not implemented.
