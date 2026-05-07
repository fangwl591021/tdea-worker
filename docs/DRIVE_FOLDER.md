# Google Drive Folder

Target folder:

https://drive.google.com/drive/folders/1bH00to19ErCUAgVFWG0T34kZxxEaDAqP

Folder ID:

```text
1bH00to19ErCUAgVFWG0T34kZxxEaDAqP
```

## Current Status

The folder currently contains the existing Apps Script project:

- TDEA管理系統

## Recommended Use

Use this folder for migration files and backups:

- Original Apps Script export
- Google Sheets CSV exports
- D1 import CSV files
- Worker deployment notes
- GitHub repository link

The production application data should live in Cloudflare D1. Google Drive should be treated as backup and migration storage, not the main database for frequent reads and writes.

## Upload Note

The local workspace contains `tdea-worker.zip`, which can be uploaded to this folder when Drive write permission is available.
