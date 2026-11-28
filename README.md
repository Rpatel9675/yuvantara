# Yuvantara Venture — Corporate & Academic Training Platform
### Official Domain: [https://yuvantaraventure.com](https://yuvantaraventure.com)

Official website, Industrial Internship Portal, and Executive Command Center for **Yuvantara Venture**, Patna, Bihar.

- **Headquarters**: Lekha Nagar, Saguna More, Patna, Bihar
- **Contact**: +91 98765 43210 &nbsp;|&nbsp; `yuvantara@yuvantaraventure.com`
- **Accreditation**: ISO 9001:2015 Certified &bull; MSME Registered
- **GSTIN**: 10AABCY1234F1Z5

---

## 🚀 Hosting on `yuvantaraventure.com`

**Go-live steps: see [DEPLOY.md](DEPLOY.md).** (Node server serves site + API; Firebase Firestore stores data.)


This project is built to deploy on any web hosting environment:
- **cPanel / Apache / Nginx**: Upload all files to your `public_html` directory.
- **GitHub Pages with Custom Domain**: Add a `CNAME` file containing `yuvantaraventure.com` and map your DNS A records to GitHub.
- **Vercel / Netlify / Firebase Hosting**: Point project root to this repository for instant global CDN delivery with automatic SSL.

---

## ⚡ Production Feature Suite

### 1. 💳 Razorpay Payment Gateway (₹200 + 18% GST = ₹236)
- **Official SDK**: Powered by Razorpay Checkout (`https://checkout.razorpay.com/v1/checkout.js`).
- **Payment Methods**: UPI (Google Pay, PhonePe, Paytm, BHIM, QR code scan), Credit/Debit Cards (Visa, MasterCard, RuPay), Net Banking (50+ Indian banks).
- **GST Invoice Receipt**: Automated computer-generated tax invoice with SAC/HSN codes, itemized CGST/SGST, and print/download options.
- **Configuration**: Edit `assets/config.js` to set your Razorpay Key ID (`rzp_live_...` or `rzp_test_...`).

### 2. 🔐 Password Reset (DOB + captcha)
The email-OTP flow was retired. Students reset via `/forgot-password/` using registered email, date of birth and a captcha. Admin accounts cannot self-reset; the Super Admin changes them.

### 3. 🔐 Forgot Password & Password Reset
- **Dedicated Page**: `/forgot-password/`
- **In-Modal Access**: Direct "Forgot password?" links on all login modals and gate screens.
- **4-Step Wizard**:
  1. Enter registered email address.
  2. Receive & enter 6-digit OTP code (with live countdown).
  3. Set new password (with real-time strength meter, min 8 chars & number check).
  4. Success confirmation with direct login redirect.

### 4. ☁️ Cloud Data Synchronization
- **Engine**: `assets/cloud-db.js`
- **Google Firebase Firestore**: Connect your Firebase project in `assets/config.js` to store users, applications, and payments directly in the cloud.
- **Admin Cloud Sync**: 1-click "☁️ Sync Cloud DB" button in the Admin Command Center (`/admin_login_777/`).
- **Resilient Offline Cache**: Works with zero downtime even if internet drops.

### 5. 🖥️ Node.js Cloud Backend Server (`server/`)
- Express API server with CORS, Razorpay order generation & HMAC SHA256 signature verification, Nodemailer Gmail SMTP, and cloud data store.
- **Quick Start**:
  ```bash
  cd server
  npm install
  npm start
  ```

---

## 🔑 Default Accounts

| Role | Portal URL | Email | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | `/admin_login_777/` | see private credentials file | rotated with `tools/rotate-admin-passwords.js` |
| **Reset Password** | `/forgot-password/` | Any registered email | *OTP Verified* |
| **Checkout** | `/payment/` | Auto-populated from application | ₹236 via Razorpay |
| **Credential Verification** | `/verify-certificate/` | Sample ID: `YUV-2026-CS101` | *Public* |

---

## 💻 Local Development

Launch the included PowerShell web server:
```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```
Open: [http://localhost:8080/](http://localhost:8080/)

---

## ⚠️ Production notes
- Data is stored in each visitor's browser (`localStorage`); a real backend is required for shared admin data.
- Payments are disabled by default (`payment.mode` in `assets/config.js`). Set `razorpay` with a real key to enable; use `demo` only on localhost.
- Deployment: GitHub Pages serves the `main` branch root directly (Settings -> Pages -> Deploy from a branch -> `main` / `(root)`), with the custom domain set by the `CNAME` file. No workflow is used, so everything committed to `main` is publicly served. Keep secrets out of the repo (`.gitignore` already covers `.env`, service-account keys and credential files).
- Backend needs `ADMIN_API_KEY` set in `server/.env`.
