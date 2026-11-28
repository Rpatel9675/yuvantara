# Fixes & Improvements
## Bugs fixed
- Password reset, super-admin password change/suspend/remove now persist (wrong storage key)
- Added missing `changePassword()` (portal Change Password crashed)
- Signup keeps the student's chosen password (previously forced `student123`)
- Re-registration can no longer overwrite existing credentials
- Reset requires matching DOB; admin accounts blocked (account-takeover hole)
- Certificate verification searches all records; revoked status shown
- Session expiry preserved after profile updates
- Removed admins stay removed; super admin protected
- Super admin redirected from student gate; `pending_payment` shows pending banner
- Payment page: no fake success, honours `payment.mode`, URL backdoor removed, correct config keys
- Backend: fail-closed payment verify, fixed amount, CORS from env, admin-key on data routes, hashed OTP, rate limits
- Quota errors surfaced; public replica links removed
## Deployment / docs
- Single workflow publishing only site files; removed Jekyll workflow
- Added sitemap.xml; robots updated; README corrected
## Still open (needs your decision)
- Self-service "Complete 100% + generate certificate" in portal
- Real backend + server-side auth; rotate seeded admin passwords
- GST shown while isGstRegistered=false; remove scratch/ and duplicate data/ replicas

## Latest update (3 tasks)
1. **Enroll from the Login page too** - the Login tab (modal) and the Student Portal login gate now have an optional
   "Enroll in a course" dropdown. Clicking a course's Enroll button pre-selects it. After login the student continues to the
   payment/application page with that course. Logged-in students can also click a course's Enroll button directly.
   A student who has already paid / been approved keeps the track fixed (a clear message is shown). If someone tries to
   sign up with an email that already exists, they are sent to the Login tab with the course pre-selected.
2. **Admin portal now receives new accounts** - the sign-up page redirected to the payment page before the database upload
   finished, so the upload was cancelled. The upload now completes (with `keepalive`) before the redirect. The admin portal
   also pulls from the cloud as soon as it opens, and has a new **Download Data Sheet (Excel .csv)** button.
3. **All user data reset** - demo dataset (`assets/seed_1000_users.json`), seeded students/registrations/audit logs and the
   `data/*.json` replicas were emptied. `dataEpoch` + `dataResetBefore` in `assets/config.js` wipe every browser's cached
   student data once and ignore all older cloud records. The Super Admin tab has a new **Reset ALL User Data** button that
   also deletes the cloud records (type RESET to confirm). Admin accounts are never touched.

## Final update
1. **Certificate allotment no longer leaves the intern at the initial state** - when an admin allots a certificate
   (Graduate / Issue Certificate) or progress reaches 100%, all 5 modules are now marked completed (previously progress
   became 100% but the modules stayed at the initial 20% state) and a logged-in student's session is refreshed immediately.
2. **One payment status everywhere** - `paymentStatus` is now always exactly `paid` or `unpaid` (a payment reference = paid).
   Removed the extra `authorized` value (granting access no longer changes payment status), old `PAID`/`UNPAID` variants
   are normalised on load/save, and invoice status follows it. Interns are no longer force-marked `paid` when merged.
3. **Invoice blocked until paid** - the Tax Invoice card shows "Payment Pending" and View/Download are disabled (and guarded in code) unless `paymentStatus` is `paid`.
4. **New Firebase project** - `assets/config.js` and `.firebaserc` now point to project `yuvantaraventures-1aa54` (the old project was suspended by Google).
5. **Cloud writes + auto sign-in** - cloud document names no longer percent-encode the email (`a%40b.com`), which made Firestore
   rules reject new-user writes (`email.lower() == id`) so the admin portal never received registrations. A new applicant
   is also signed in automatically after registering, so they are no longer asked to log in again.
6. **Admin decisions always reach the student** - grant access, progress, payment and certificate changes carry an `adminTs`;
   when two devices disagree, the newer admin decision wins for those fields (a student's stale copy can no longer undo it).
   Admin actions now push to the cloud immediately and show a warning if the push fails.
7. **Admin payment verification** - new "Mark Paid / Mark Unpaid" buttons (pending registrations, current interns, employees).
   Paid sets reference/amount/date and the invoice; Unpaid clears them; pending <-> pending_payment follows. Admin lists now
   use `paymentStatus` only (no more `paymentRef` guessing), so status is identical everywhere.
8. **Root cause of "certificate not downloadable / logged out"** - graduating a student overwrote their account `role` with a job
   title, so sync treated the record as removed (deleted it from the cloud + tombstone) and the portal gate logged them out.
   `role` now always stays `student`; the job title is stored in `jobTitle`. Old records are migrated automatically.
9. **Paying after approval no longer reverts access** - a student already `active`/`completed` is never pushed back to `pending`.
10. **New Payments tab** in the admin portal: search/filter all students and change Paid <-> Unpaid in one click.
11. **Cache-busting** - every page's script/CSS links now carry `?v=20261125b`, so browsers load the new code instead of old cached files.
12. **No course choice at signup or login** - the "Internship Track" field is hidden on every signup form and the optional course
    dropdown is removed from the login form and the portal login gate. New accounts are created with no course.
13. **Program picker after login** - a student with no purchase (not paid / not enrolled) lands in the portal on a
    "Choose your internship program" page listing all 22 programs (search + category filter, `assets/programs.js`).
    "Enroll & Pay ₹236" enrolls them and opens the payment page; a student who already picked but did not pay sees
    "Continue to payment". Once paid/approved the normal dashboard replaces it. A program's own "Apply" button still goes
    straight to payment with that program.
14. **Fixed first-visit data wipe** - pages that load db.js without config.js (internships, 404) and the dynamic script loader
    (async order) could skip the data-reset epoch, so a brand-new visitor's session / pending enrollment was wiped when they
    reached the payment page. config.js is now loaded first everywhere and dynamic scripts load in order with the cache version.
15. **Program list is behind login** - on the home page the "Explore All Programs", "View All Tracks", "View All Programs" and "Internship Catalog" links now open the Login / Sign-up window for visitors; after logging in a student without a purchase sees the program list in the portal. Logged-in unpurchased students go straight to it; enrolled students and admins still open the catalog.
16. **Course field hidden in the HTML itself** - the "Internship Track" field is now hidden (and not required) directly in every page, so even a slow/cached script cannot show it. Cache version bumped to ?v=20261125d.

## v4 — College suggestions fix
- `assets/site.js`: college field uses a custom dropdown (the native datalist arrow showed an empty list on phones). Tapping the field shows popular colleges; typing shows instant matches from a built-in list of 74 colleges (edit `LOCAL`), then replaces them with live CollegeDB results; falls back to the built-in list if the API is empty, asleep or blocked. Supports touch, keyboard arrows/Enter/Esc
- `server/server.js`: `/api/colleges` returns a `reason` when empty (`no_api_key`, `daily_limit`, `upstream_<status>`, `fetch_failed`, `upstream_empty_or_unknown_shape`) and accepts several response shapes; CORS origins tolerate spaces / trailing slashes and always include yuvantaraventure.com + www
- `assets/config.js`: kept the LIVE version (API on Render, `auth.mode = 'server'`)

## Live architecture (what is actually deployed)
- Website: GitHub Pages, deployed directly from the `main` branch root (no Actions workflow) at https://yuvantaraventure.com
- API: Render service at https://yuvantara.onrender.com/api (deploy `server/` there; env vars in `server/.env.example`)
- `config.js` must keep `baseUrl: 'https://yuvantara.onrender.com/api'` for non-localhost. Do NOT set it to `/api` while the site is on GitHub Pages.
- Render env must have: `COLLEGEDB_API_KEY`, `CLIENT_ORIGIN`, `ADMIN_API_KEY`, `OTP_SECRET`, SMTP vars, and `FIREBASE_SERVICE_ACCOUNT_B64` (health check currently shows firestoreAdminConnected:false until this is set).

## v4.1 — Firestore 429 (read quota) fix
- `assets/cloud-db.js`: every page used to download ALL users + deleted_users + up to 1,500 audit logs on load, on focus and every 20 s per open tab, exhausting the free 50,000 reads/day. Now: throttled (admin 5 min, student 5 min, visitor 10 min, shared across tabs/pages; login/signup 1 min), audit logs only on admin pages and at most every 30 min, and a 15-minute back-off after a 429 with a clear message. "Sync now" still forces a refresh.
- Quota resets daily around 1:30 PM IST. For headroom upgrade the Firebase project to the Blaze plan (free quota is kept) and set a budget alert.
- Long-term: move user reads to the Render server (see review notes) so browsers never download the whole collection.

## v4.2 — Super admin changed
- Super admin login is now `rocky7061patel@gmail.com` (password hash only is stored in `assets/db.js`; the password itself is NOT in the project).
- Retired logins `a4dr_00@supper` and `admin@yuvantara.com` are removed from the seed and purged from browser caches on load.
- Note: with branch-based Pages deployment, `tools/` and `server/` are no longer excluded from the published site (the old workflow filtered them).
- Issue Documents page now remembers the Admin API key in this browser (localStorage) so it is entered once; a 'Forget key' button clears it.
- To change the password later: generate a new random password, compute `'SHA256$' + sha256(SALT + password + SALT)` (SALT is in `assets/db.js`) and replace `passwordHash` of `SUPER-001`.

## v4.3 — Admin login fixes
- A built-in admin / super admin address now always resolves to the ADMIN account, even if a student record with the same email exists (it used to hit the student record first -> "Incorrect password"). Cached same-email student records are dropped on load and the cloud sync can no longer overwrite an admin account with a student copy.
- Admin login form ignores leading/trailing spaces in the password (copy/paste).

## v4.4 — Admin console not receiving sign-ups, Super Admin OTP reset, Reset-ALL fix
### 1. New accounts did not appear in the admin console  (regression from v4.1's read-quota throttle)
Root causes, each reproduced in a two-browser test against a mock Firestore (old `rocky_2_publish` behaved correctly, v4 did not):
- The admin console skipped the cloud pull whenever ANY page in the same browser had pulled in the last 5 minutes, and still reported "synced". Opening/refreshing the console right after a sign-up therefore showed nothing.
- A failed pull (network, 403, 5xx) still consumed that 5-minute slot, so nothing was retried.
- After a 429 the 15-minute back-off also blocked the manual **Sync now** button.

Fix (`assets/cloud-db.js`, `admin_login_777/admin.js`):
- The admin console always pulls when it opens, then every 60 s while visible. The throttle stamp is kept per kind of page (admin vs. visitor/student) and is only set after a SUCCESSFUL pull; a failed pull retries within 30 s.
- Pulls are now **incremental**: after one full download, only documents changed since the last pull are read (Firestore `runQuery` on `_ts` / `ts`, 15-minute safety overlap for small clock differences). Reading the whole collection every time was what burned the free 50,000 reads/day; ten idle admin polls over 40 students now cost ~30 reads instead of ~400. A full re-download still happens on **Sync now**, on first load, every 30 min on the admin console (6 h elsewhere), and automatically if the query API fails.
- **Sync now** ignores the 429 back-off. Automatic reads pause for 10 min after a 429.
- Known limit: a device whose clock is more than ~15 minutes behind may take up to 30 min (or one **Sync now**) to appear.

### 2. Reset ALL user data now works (even when Firestore reads are over quota)
Before, the reset first had to LIST the whole cloud collection; if that read failed (429 quota) it aborted with "Nothing was reset locally".
- `wipeAllUsers()` now writes one small **reset marker** (`deleted_users/reset-all-marker`) plus tombstones/deletes for every locally known student, in a single commit — no reads needed. Every device that sees the marker purges its cached students; cloud records older than the marker are ignored everywhere (also on brand-new devices); students created after the reset are kept. Remaining cloud documents are then deleted best-effort.
- The audit-log view and local audit cache are cleared up to the reset time, and the reset itself is logged.
- If the WRITE fails (offline, write quota, rules) the reset is refused with the reason — nothing is half-reset.

### 3. Super Admin password reset by email OTP
- Admin login page → **Forgot password?** → enter the Super Admin email → 6-digit code by email (10 min, 5 tries, one code per 30 s, 5 per hour) → enter code + new password (min 10 chars, letters + number).
- Server endpoints (`server/server.js`): `POST /api/admin/super/forgot/send-otp`, `POST /api/admin/super/forgot/reset`, `POST /api/admin/super/login`. The answer to a non-super email is identical (no address discovery). The new password is stored only as a scrypt hash; a "password changed" email is sent.
- After a reset the **server** verifies the super admin login on every device and the built-in password stops working (8 wrong passwords = 15-minute lockout). Before any reset the old behaviour is unchanged.
- Needs on Render: working email (`BREVO_API_KEY` or SMTP) and, so the new password survives redeploys, `FIREBASE_SERVICE_ACCOUNT_B64`. `/api/health` → `superAdminReset` shows `emailConfigured`, `passwordStore` and `customPasswordSet`.
- New env var: `SUPER_ADMIN_EMAIL` (defaults to rocky7061patel@gmail.com).

Cache version bumped to `?v=20261127a` on every page.


## Fix: users missing in admin / "Reset ALL user data" failing (2026-11-27)
- **firestore.rules**: deleting a document that does not exist yet was rejected (rule read `resource.data` on a null resource), and because a Firestore commit is all-or-nothing, ONE such delete made the whole batch fail - blocking new sign-ups and the Reset button. Delete now allowed when `resource == null`. **You must re-publish these rules in Firebase Console -> Firestore -> Rules.**
- **assets/cloud-db.js**: uploads and deletes are now committed separately, and a rejected batch is retried document-by-document so one bad write cannot block the rest.
- The upload queue is now saved in localStorage; a sign-up whose upload was cut off by the redirect is retried on the next page load (before, it stayed on that one device forever and never reached the admin portal).
- Reset ALL: the reset marker + tombstones are written first; real deletes run afterwards as best effort.
- One-time self-heal: each device does one full sync after this update and re-uploads any account the cloud does not have yet (the older build did this on every 20 s pull).

## v6 — Database reads only when required
- Before: every page that loaded `cloud-db.js` (home, internships, 404, forgot-password, verify-certificate, ...) downloaded the users + deleted_users collections as soon as it opened, again on every tab focus / visibility change, and on a timer. A brand-new visitor's first pull was a FULL download.
- Now: a plain visitor on a public page sends NO request. Automatic pulls (on load, focus, visibility, timer) run only on the admin console, and for a logged-in student on the portal / payment pages (`pageNeedsCloud()` in `assets/cloud-db.js`).
- Everything else pulls ON DEMAND at the moment it needs server data: login, sign-up duplicate check, enroll, certificate verification (already used `ensureFresh`), and forgot-password (now fetches when the email is submitted instead of relying on a page-load download).
- The one-time self-heal full sync now runs only where a pull runs anyway.
- Measured with a headless browser (Firestore mocked): public pages 0 requests (was 2 on home / 404 / forgot-password / internships), portal + payment + admin unchanged, login / forgot-password / verify send requests only when used.

## v7 — Admin: issue Offer Letter + Internship Certificate
- Admin page `admin_login_777/issue-documents.html` (button in admin tab bar): enter intern details → server generates both PDFs (new logo, natural signatures, QR) → emails them → saves the record. Preview, list, resend included.
- Records live in Firestore collection `issued_documents` (needs `FIREBASE_SERVICE_ACCOUNT_B64`; otherwise a local file that is lost on redeploy). Certificate no. `YV-YYYY-NNNNNN`, offer ref `YV/OL/YYYY/NNNN`, auto-numbered or manual.
- Public page `/download-certificate/` regenerates the identical PDF from the record (certificate no. + email required). `GET /api/documents/verify/:no` for verification.
- Render env: `ADMIN_API_KEY` (required), `BREVO_API_KEY` or SMTP, `FIREBASE_SERVICE_ACCOUNT_B64`, optional `DOC_SHOW_PARTNER_BADGES=false`, `CLIENT_ORIGIN`. Run `npm install` in `server/` (adds pdf-lib).

### v7.1 — Automatic delivery
- Verified payment (`/api/payment/verify`) → server emails **Offer Letter + Invoice** (invoice `YV/INV/YYYY/NNNN`, ₹236 incl. 18% GST) and stores the record.
- Course completion (`/api/notify/course-complete`) → server emails the **Certificate**, only if that email has a paid record. Offer/invoice/certificate can be re-downloaded at `/download-certificate/` (offer letter and invoice stay identical; the certificate unlocks after completion).
- Internship length defaults to 4 weeks (`DEFAULT_INTERNSHIP_WEEKS`). Attendance/marks appear on the certificate only if the portal supplies them.

### v9 — deep review fixes
- Offer letter and certificate now use the exact wording, titles, DD-MM-YYYY dates and layout of the supplied sample PDFs (the earlier build had paraphrased terms).
- Numbering/writes serialised (no duplicate certificate numbers on simultaneous requests); completion no longer blocked forever if it fires before payment is recorded; non-English names rejected in the admin form with a clear message.
- Added the missing `assets/images/signature-*.png` files used by the portal certificate; Pages workflow uses upload-pages-artifact@v4; `.env.example` documents all new settings.

### v9.1
- Fixed: issue/download pages called the wrong API address (read `baseUrl` instead of `api.baseUrl`) -> "Unexpected token '<'".
- Removed the "Edit Name / College" buttons from the student portal certificate area.
- Fix: `/api/admin/documents/*` (issue/preview/resend certificates and offer letters) returned "Not found" because documents/issue.js was mounted after the catch-all `/api` 404 handler in server/server.js. It is now mounted before it. Redeploy the Render server for this to take effect.
- Issue Documents: new 'Documents to issue' option (Offer letter + Certificate, or Offer letter only). Offer-only skips attendance/marks, emails only the offer letter and creates no certificate. The issued list shows which kind each record is.
- Issue Documents now also adds the person to the student database (Firestore `users`) if the email is not there yet (existing students are never overwritten). Offer-only -> Current Interns (active); Offer + Certificate -> completed.
- Admin 'Enroll New Candidate' now uploads to the cloud database immediately and warns if the upload fails.
- 404 page: now works at any wrong URL, including nested ones (all links/CSS resolve from the site root), and shows the address that was not found.
- Issue Documents: 'Send certificate' button on records that only got an offer letter (asks attendance + marks, emails the certificate only, marks the student completed). DEPLOY.md now explains how to connect Firebase Admin on Render.
