# Google Forms Engine

This project keeps the TDEA user flow branded while using Google Forms as the form engine.

## Setup

1. Open Google Apps Script and create a new project.
2. Paste `docs/google-forms-generator.gs` into `Code.gs`.
3. Open Project Settings and enable "Show appsscript.json manifest file in editor".
4. Paste `docs/appsscript.json` into `appsscript.json`.
5. In `CONFIG`, set:
   - `DRIVE_FOLDER_ID`: the folder where forms and response sheets should be stored.
   - `SHARED_SECRET`: any private random string. Use the same value in Cloudflare.
   - `SYNC_WEBHOOK_URL`: the Worker endpoint that receives submitted Google Form responses.
6. Deploy as a Web App:
   - Execute as: Me
   - Who has access: Anyone
7. In the Apps Script editor, select `authorizeTriggerScope` and run it once. Approve permissions when Google asks.
8. Deploy a new Web App version and copy the `/exec` Web App URL.
9. Add these Cloudflare Worker variables:
   - `GOOGLE_FORMS_SCRIPT_URL`: the Apps Script `/exec` URL.
   - `GOOGLE_FORMS_SHARED_SECRET`: the same value as `CONFIG.SHARED_SECRET`.

## Flow

`TDEA admin page`
-> `POST /api/google-forms/create`
-> `Apps Script`
-> `Google Form + response Sheet`
-> `formUrl` returns to the admin page
-> activity data stores the public registration URL
-> `onFormSubmit` sends each response to `/api/google-forms/submission`
-> `/api/registrations/summary` feeds the dashboard registration count
-> monthly activity Flex uses that URL.

## Notes

- File upload fields in Google Forms may require a Google Workspace account or a compatible account. If Apps Script cannot create the file upload item, the script falls back to a paragraph field asking for a file link.
- Custom fields support short answer, paragraph, single choice, multiple choice, and dropdown. For choice fields, options are sent from the admin UI as an array.
- Apps Script Web Apps do not reliably expose custom request headers, so the shared secret is sent in the JSON body by the Worker.
- The current frontend still allows pasting an existing Google Form URL. That keeps events usable even before this engine is fully configured.
- After changing `docs/google-forms-generator.gs`, paste the updated code into Apps Script and deploy a new Web App version. Existing forms created before this trigger code was installed will not auto-sync unless they are regenerated or given a submit trigger manually.
- If Google says `ScriptApp.newTrigger` is not authorized, the manifest is missing the `https://www.googleapis.com/auth/script.scriptapp` scope. Add `docs/appsscript.json`, deploy a new version, and approve permissions again.
- If the Web App still cannot create triggers after deployment, run `authorizeTriggerScope` manually from the Apps Script editor once, then deploy another new Web App version.
