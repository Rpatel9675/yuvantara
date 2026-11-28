# Yuvantara — Go-Live Guide (A to Z)

Architecture: **one Node.js server** serves the website + `/api`, and **Firebase Firestore** stores users/audit logs.
Payment gateway stays OFF (`payment.mode = 'disabled'`): students register, you approve them in the admin portal.

---
## PART 1 — Firebase (10 min)

1. https://console.firebase.google.com → open project **yuvantara**.
2. **Build → Firestore Database → Create database** → *Production mode* → region **asia-south1 (Mumbai)**.
3. Deploy the rules from this project (they replace the old "test" rules):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules      # run inside the project folder
   ```
   (Or paste `firestore.rules` into Firestore → Rules → Publish.)
4. **Lock the API key to your domain** (very important):
   Google Cloud Console → *APIs & Services → Credentials* → key `AIzaSyBB…` → *Application restrictions: Websites* → add
   `https://yuvantaraventure.com/*` and `https://www.yuvantaraventure.com/*` → *API restrictions: Cloud Firestore API only* → Save.
5. Service account for the Node server: *Project settings → Service accounts → Generate new private key*.
   Convert to base64 and keep it for Part 2:
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))`
   - Linux/Mac: `base64 -w0 serviceAccountKey.json`
   Never put this file in the website folder or on GitHub.

### Connecting Firebase Admin to the server (needed to save issued documents and users permanently)
1. Firebase console -> project **yuvantaraventures-1aa54** -> Build -> Firestore Database -> create it if you haven't (production mode).
2. Project settings (gear) -> **Service accounts** -> **Generate new private key** -> download the JSON.
3. Convert it to base64 (one line): Linux/Mac `base64 -w0 serviceAccountKey.json`; PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))`.
4. Render -> your service -> **Environment** -> add `FIREBASE_SERVICE_ACCOUNT_B64` = that text -> Save (Render redeploys).
5. Open `https://yuvantara.onrender.com/api/health` and check `"firestoreAdminConnected": true`.
Never commit the JSON file or the base64 text to GitHub.

## PART 2 — Node.js server

```bash
cd server
cp .env.example .env        # then edit .env
npm install
npm start                   # test locally: http://localhost:5000
```
In `.env` set: `NODE_ENV=production`, `CLIENT_ORIGIN`, `ADMIN_API_KEY` and `OTP_SECRET`
(generate each with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`),
and `FIREBASE_SERVICE_ACCOUNT_B64`. Leave Razorpay empty.
Check: open `/api/health` → `firestoreAdminConnected: true`.

## PART 3 — Put it online on yuvantaraventure.com

### Option A: Render.com (easiest, no server admin)
1. Push this project to a **private** GitHub repo (`.gitignore` already protects secrets).
2. Render → *New → Web Service* → pick the repo. Root directory: *(blank)*.
   Build command: `cd server && npm install` Start command: `cd server && node server.js`
3. Add the environment variables from `.env` in *Environment*.
4. *Settings → Custom Domains* → add `yuvantaraventure.com` and `www.yuvantaraventure.com` → Render shows the DNS records.
5. At your domain registrar's DNS panel add exactly those records (usually an `A`/`ALIAS` for the root, `CNAME` for `www`). HTTPS is automatic. DNS can take up to a few hours.
   Note: Render's free plan sleeps when idle; use a paid plan for a real launch.

### Option B: Your own VPS (Ubuntu 22/24)
```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2
# upload the project to /var/www/yuvantara, create server/.env, then:
cd /var/www/yuvantara/server && npm install --omit=dev
pm2 start ecosystem.config.js && pm2 save && pm2 startup
```
`/etc/nginx/sites-available/yuvantara`:
```
server {
  server_name yuvantaraventure.com www.yuvantaraventure.com;
  client_max_body_size 2m;
  location / { proxy_pass http://127.0.0.1:5000; proxy_set_header Host $host;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/yuvantara /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yuvantaraventure.com -d www.yuvantaraventure.com
```
DNS: `A` record for `@` and `www` → your server's IP.

> GitHub Pages option: this repo has no deploy workflow. In GitHub go to Settings -> Pages -> Source: **Deploy from a branch** -> `main` / `(root)`. Pages serves only the static site (no API), so `assets/config.js` must keep `baseUrl: 'https://yuvantara.onrender.com/api'` for non-localhost.
>
> Custom domain: the repo contains a `CNAME` file (`yuvantaraventure.com`). Settings -> Pages -> Custom domain -> `yuvantaraventure.com` -> Save, then at your DNS provider add four `A` records for `@` (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153) and a `CNAME` for `www` pointing to `<your-github-username>.github.io`. Remove any old records (e.g. ones pointing to Render). Tick **Enforce HTTPS** once the certificate is ready (DNS can take up to 24 h).

## PART 4 — First-day checklist
1. Admin logins are in `PRIVATE_admin_credentials.txt` (separate file, not in the website). Save to a password manager, **delete the file**.
2. User data is already reset in this build (`dataEpoch` / `dataResetBefore` in `assets/config.js`). Log in as Super Admin once and press **System → Reset ALL User Data** to also delete the old records from Firebase (or delete the `users` collection in the Firebase console). Next time you need a fresh start, change `dataEpoch` and set `dataResetBefore` to the current time in milliseconds.
3. Test on a phone: register → admin portal on a laptop shows the student → approve → student logs in.
4. Test password reset, certificate verification, QR code, `/api/health`.
5. Submit `https://yuvantaraventure.com/sitemap.xml` in Google Search Console.

## Enabling Razorpay later (when ready)
In `assets/config.js` set `payment.mode: 'razorpay'` + your live `razorpayKeyId`; in `server/.env` set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. Redeploy.

## ⚠️ Known limitation — read before taking real money / issuing certificates at scale
Login and approvals still run **in the browser**; the database is reachable with the public web key. This build closes the worst holes
(rotated admin passwords, no admin records in the shared DB, locked rules, append-only audit log, domain-restricted key), but a technically skilled
person could still alter *student* records (e.g. mark themselves approved or edit a certificate). For a public launch, plan **Phase 2**:
move login, registration, approvals and certificate issuing into the Node server (Firebase Admin SDK) and set Firestore rules to deny all browser access.

## Email OTP (signup, login, forgot password)
OTP emails are currently sent through the Gmail account **yuvantaraventures@gmail.com**.
1. Sign in to that Google account -> Security -> turn on **2-Step Verification**.
2. Security -> **App passwords** -> create one ("Yuvantara website") and copy the 16-character code.
3. In `server/.env` set `SMTP_USER=yuvantaraventures@gmail.com`, `SMTP_PASS=<app password>`, `EMAIL_FROM=yuvantaraventures@gmail.com`, and a long random `OTP_SECRET` (see `.env.example`).
4. Restart the server (`pm2 restart all`). In production, OTP requests return an error until SMTP is configured.
5. Gmail limit is about 500 mails/day. When the official mailbox (Yuvantara@yuvantaraventure.com) is ready, change only the SMTP_* and EMAIL_FROM lines and add SPF/DKIM DNS records.
6. To switch OTP off for a flow, edit the `otp: {...}` block in `assets/config.js`.
