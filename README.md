# TDEA Worker

GitHub + Cloudflare Worker version of the TDEA management system.

This starter replaces the current Google Apps Script frontend/backend mix with:

- Cloudflare Worker API
- Cloudflare D1 schema
- GitHub version control
- A cleaner migration path from Google Sheets

## Local Development

```bash
npm install
npm run db:migrate:local
npm run dev
```

## Production Deployment

```bash
npm run db:migrate:prod
npm run deploy
```

## GitHub Actions Deployment

Add these repository secrets in GitHub:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Then push to `main`, or run the `Deploy Worker` workflow manually.

The Worker name is configured in `wrangler.toml`:

```toml
name = "tdeawork"
```

## Important

`x-admin-email` authorization in `src/index.ts` is a development placeholder. Use Cloudflare Access or a real login flow before production.
