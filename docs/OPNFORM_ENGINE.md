# OpnForm form engine

TDEA now treats the registration form as a managed form engine. The frontend calls the Worker first, and the Worker creates or syncs OpnForm forms. Google Forms / Apps Script remains as a fallback while old activities are still in use.

## Cloudflare variables

Set these on the `tdeawork` Worker:

- `OPNFORM_API_TOKEN` secret: OpnForm personal access token with `forms-write`, `forms-read`, and `manage-integrations`.
- `OPNFORM_WORKSPACE_ID` variable or secret: numeric OpnForm workspace id.
- `OPNFORM_WEBHOOK_SECRET` secret: any strong random string. Use the same value when OpnForm installs the webhook integration.
- `OPNFORM_API_BASE` variable: `https://api.opnform.com`.
- `OPNFORM_PUBLIC_BASE` variable: `https://opnform.com/forms`.

Webhook URL:

```text
https://tdeawork.fangwl591021.workers.dev/api/opnform/webhook
```

## Flow

1. Admin creates an activity.
2. Frontend asks `POST /api/opnform/create`.
3. Worker creates an OpnForm form with the activity fields and hidden TDEA activity ids.
4. Worker stores the OpnForm form id mapping in R2.
5. OpnForm webhook sends each submission to Worker, and Worker stores the registration summary/list in R2.
6. Dashboard can also manually call `POST /api/opnform/sync` to pull submissions.

## Fallback

If OpnForm variables are not configured, the frontend falls back to the existing Google Forms endpoint. This keeps old testing data usable during migration.
