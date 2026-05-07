# TDEA Apps Script to GitHub + Cloudflare Worker Migration

## Goal

Move the current TDEA management system from a single Google Apps Script web app into a maintainable GitHub repository and Cloudflare Worker deployment.

## Recommended Phase 1

Use Cloudflare Worker for the application and API, and use Cloudflare D1 as the new database.

The existing Google Apps Script project can remain online during migration. Data can be exported from Google Sheets into CSV files, then imported into D1.

## Current Apps Script Modules

- Activity dashboard
- Association member management
- Vendor member management
- Activity creator
- User-facing activity preview

## New Worker API

- `GET /api/activities`
- `GET /api/activities/active`
- `POST /api/activities`
- `GET /api/members/association`
- `PUT /api/members/association/:id`
- `GET /api/members/vendor`
- `PUT /api/members/vendor/:id`

## Security Notes

The current Apps Script page exposes admin UI through a public deployment URL. In the Worker version, admin writes should be protected by Cloudflare Access, OAuth, or a signed session cookie.

The starter code uses an `x-admin-email` header only as a placeholder. Replace it before production.

## Data Migration

Export these sheets as CSV:

- Activities
- Association members
- Vendor members
- Registrations or form responses

Then map them into the D1 tables defined in `migrations/0001_initial.sql`.

## Deployment Steps

1. Create a GitHub repository.
2. Push this `tdea-worker` folder.
3. Create a Cloudflare D1 database named `tdea-db`.
4. Put the D1 database ID into `wrangler.toml`.
5. Run `npm install`.
6. Run `npm run db:migrate:local`.
7. Run `npm run dev`.
8. After testing, run `npm run db:migrate:prod`.
9. Deploy with `npm run deploy`.
