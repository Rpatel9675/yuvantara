# One-time setup: shared database (needed so every device sees the same users)

GitHub Pages only hosts static files, so without this step each browser has its **own private copy** of the data:
users registered on a phone never appear in the admin portal, and admin approvals never reach the user.

## Steps (about 5 minutes, free tier)
1. Go to https://console.firebase.google.com -> **Add project**.
2. **Build -> Firestore Database -> Create database** (start in *production mode*, any region).
3. **Project settings (gear) -> General -> Your apps -> Web (`</>`)** -> register an app -> copy `projectId` and `apiKey`.
4. **Firestore -> Rules** -> paste the rules below -> **Publish**.
5. Open `assets/config.js`, fill the `firebase` block and set `enabled: true`:
   ```js
   firebase: { enabled: true, projectId: 'your-project-id', apiKey: 'your-web-api-key' },
   ```
6. Commit & push. Hard-refresh the site on every device (Ctrl+Shift+R).

The admin page shows a green **"Cloud sync ON"** strip when it works (red warning when it is off).

## Firestore rules (TESTING ONLY)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{coll}/{doc} {
      allow read, write: if coll in ['users', 'deleted_users', 'audit_logs'];
    }
  }
}
```

## Important security note
These rules let anyone who has the site's API key read/write those collections, and the stored records contain
password hashes, phone numbers and dates of birth. That is acceptable for a short test with fake data, **not for
real users**. Before launch, move to a real backend (the `server/` folder in this repo) or Firebase Authentication
with per-user rules, and make admin actions server-side.

## How syncing behaves
- Every change is uploaded within ~1 second; every open page checks for updates every 20 s, when the tab regains
  focus, and right before login / registration / certificate verification.
- If two devices edit the same user, the newest edit wins. Deletions are propagated as tombstones.
- The bundled 1,000-user demo dataset is never uploaded; only real records are.
