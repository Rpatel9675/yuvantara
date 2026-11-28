// Yuvantara Cloud Backend API Server
// Production server for https://yuvantaraventure.com
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const scryptAsync = promisify(crypto.scrypt);

// Load environment variables if .env exists
try {
  require('dotenv').config();
} catch (e) {}

const app = express();
const PORT = process.env.PORT || 5000;
const SITE_ROOT = path.join(__dirname, '..');

// Behind nginx / Render / Railway the real client IP arrives via X-Forwarded-For (needed for rate limits)
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security headers for every response
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  if (req.path.startsWith('/api')) { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'"); }
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Middleware
// Allowed browser origins: the CLIENT_ORIGIN list (spaces / trailing slashes tolerated) plus the official domain.
const ALLOWED_ORIGINS = Array.from(new Set(
  (process.env.CLIENT_ORIGIN || '').split(',')
    .concat(['https://yuvantaraventure.com', 'https://www.yuvantaraventure.com'])
    .map(s => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
));
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
}));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true }));

// Razorpay SDK Setup
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('💳 Razorpay SDK initialized successfully.');
  } catch (err) {
    console.warn('Razorpay package not installed or configuration error:', err.message);
  }
}

// Nodemailer SMTP Setup for Email OTP
let mailTransporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    const nodemailer = require('nodemailer');
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: String(process.env.SMTP_PASS).replace(/\s+/g, '')   // Gmail shows App Passwords with spaces; strip them
      }
    });
    console.log('📧 SMTP Email Transporter configured.');
  } catch (err) {
    console.warn('Nodemailer setup warning:', err.message);
  }
}

// Email sender: Brevo HTTPS API (works on Render free tier, which blocks SMTP ports) with SMTP as fallback.
const BREVO_KEY = (process.env.BREVO_API_KEY || '').trim();
if (BREVO_KEY) console.log('📧 Brevo email API configured (HTTPS, no SMTP needed).');
function emailReady() { return !!(BREVO_KEY || mailTransporter); }
async function sendMailUnified(to, subject, html, attachments) {
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const fromName = process.env.EMAIL_FROM_NAME || 'Yuvantara';
  if (BREVO_KEY) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: fromName, email: fromEmail }, to: [{ email: to }], subject: subject, htmlContent: html, ...(attachments && attachments.length ? { attachment: attachments.map(a => ({ name: a.name, content: Buffer.from(a.content).toString('base64') })) } : {}) })
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error('Brevo API ' + r.status + ': ' + t.slice(0, 300));
    }
    return;
  }
  await mailTransporter.sendMail({ from: `"${fromName}" <${fromEmail}>`, replyTo: fromEmail, to: to, subject: subject, html: html, attachments: (attachments || []).map(a => ({ filename: a.name, content: a.content, contentType: 'application/pdf' })) });
}

// Firebase Admin SDK (optional but recommended): keeps applications in Firestore so they survive redeploys.
// Provide the service-account JSON, base64 encoded, in FIREBASE_SERVICE_ACCOUNT_B64 (see DEPLOY.md).
let firestore = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
  try {
    const admin = require('firebase-admin');
    const cred = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(cred) });
    firestore = admin.firestore();
    console.log('🔥 Firebase Admin connected to project:', cred.project_id);
  } catch (err) {
    console.warn('Firebase Admin not available, using local file store:', err.message);
  }
}

// In-Memory & File-backed Store for Cloud Data
const DATA_FILE = path.join(__dirname, 'cloud_db.json');
let cloudData = {
  users: [],
  applications: [],
  payments: [],
  otps: {},
  orders: {},
  notified: {}
};

// Load existing data
try {
  if (fs.existsSync(DATA_FILE)) {
    cloudData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    cloudData.orders = cloudData.orders || {};
    cloudData.notified = cloudData.notified || {};
  }
} catch (e) {
  console.warn('Could not read existing data file, initializing fresh.');
}

function persistData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cloudData, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing to data file:', e);
  }
}


// ── Security helpers ──
const FIXED_AMOUNT_PAISE = 23600; // ₹236 — never trust an amount sent by the browser
function escapeHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function hashOtp(email, code) {
  return crypto.createHmac('sha256', process.env.OTP_SECRET || process.env.ADMIN_API_KEY || 'dev-only-secret')
    .update(email + '|' + code).digest('hex');
}
// Protects every endpoint that reads or writes personal data. Fails CLOSED if no key is configured.
function requireAdminKey(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;
  const provided = req.get('x-admin-key') || '';
  if (!expected) return res.status(503).json({ success: false, error: 'Admin API is disabled: set ADMIN_API_KEY in server/.env.' });
  const a = Buffer.from(provided), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ success: false, error: 'Unauthorized' });
  next();
}
// Minimal in-memory rate limiter (per IP + route)
const hits = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const key = req.ip + '|' + req.path, now = Date.now();
    const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ success: false, error: 'Too many requests. Please slow down.' });
    arr.push(now); hits.set(key, arr); next();
  };
}

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Yuvantara Enterprise Cloud Backend',
    domain: 'https://yuvantaraventure.com',
    razorpayConfigured: !!razorpay,
    emailConfigured: emailReady(),
    firestoreAdminConnected: !!firestore,
    // Super Admin OTP reset: needs email; the new password survives redeploys only when Firebase Admin is connected
    superAdminReset: { emailConfigured: emailReady(), passwordStore: firestore ? 'firestore (durable)' : 'file (lost on redeploy - connect Firebase Admin)', customPasswordSet: !!superCred },
    timestamp: new Date().toISOString()
  });
});

let docsAuto = null;   // set once documents/issue.js is mounted
// ── 1. Razorpay Order Creation ──
app.post('/api/payment/create-order', rateLimit(10, 60000), async (req, res) => {
  const { receipt, studentEmail } = req.body;

  if (!razorpay) {
    return res.status(503).json({ success: false, error: 'Payment gateway is not configured on the server.' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: FIXED_AMOUNT_PAISE,
      currency: 'INR',
      receipt: String(receipt || 'rcpt_' + Date.now().toString().slice(-6)).slice(0, 40),
      notes: { studentEmail: String(studentEmail || '').slice(0, 120) }
    });
    cloudData.orders[order.id] = { email: String(studentEmail || '').trim().toLowerCase().slice(0, 120), name: String(req.body.studentName || '').slice(0, 80), at: Date.now() };
    persistData();
    res.json({ success: true, orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ success: false, error: 'Could not create payment order.' });
  }
});

// ── 2. Razorpay Signature Verification ──
app.post('/api/payment/verify', rateLimit(20, 60000), async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!process.env.RAZORPAY_KEY_SECRET) {
    // Fail CLOSED: never report a payment as verified when we cannot check the signature.
    return res.status(503).json({ success: false, verified: false, error: 'Payment verification is not configured on the server.' });
  }
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, error: 'Missing payment fields.' });
  }

  if (cloudData.payments.some(p => p.paymentId === razorpay_payment_id)) {
    return res.json({ success: true, verified: true, paymentId: razorpay_payment_id, duplicate: true });
  }

  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const exp = Buffer.from(expectedSignature), got = Buffer.from(String(razorpay_signature));
    const isAuthentic = exp.length === got.length && crypto.timingSafeEqual(exp, got);
    if (isAuthentic) {
      // Second check straight from Razorpay: the order must be for exactly the fixed fee
      if (razorpay) {
        try {
          const ord = await razorpay.orders.fetch(razorpay_order_id);
          if (ord.amount !== FIXED_AMOUNT_PAISE) {
            return res.status(400).json({ success: false, error: 'Payment amount mismatch.' });
          }
        } catch (e) {
          console.warn('Razorpay order check failed:', e && e.message);
          return res.status(502).json({ success: false, error: 'Could not confirm the payment with Razorpay. Please contact support with your Payment ID.' });
        }
      }
      cloudData.payments.push({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        verifiedAt: new Date().toISOString()
      });
      persistData();
      // Receipt email to the address stored when the order was created (never to an address sent now)
      const ord = cloudData.orders[razorpay_order_id];
      if (ord && ord.email && emailReady()) {
        sendMailUnified(ord.email, 'Yuvantara Venture — Payment Received', mailShell('Payment received ✅',
          '<p>Hi ' + escapeHtml(ord.name || 'Student') + ',</p>' +
          '<p>We have received your payment of <strong>₹236</strong> (documentation fee incl. GST) for your Yuvantara Venture internship enrollment.</p>' +
          '<table style="border-collapse:collapse;margin:12px 0;font-size:14px"><tr><td style="padding:4px 12px 4px 0;color:#64748B">Payment ID</td><td><strong>' + escapeHtml(razorpay_payment_id) + '</strong></td></tr>' +
          '<tr><td style="padding:4px 12px 4px 0;color:#64748B">Order ID</td><td>' + escapeHtml(razorpay_order_id) + '</td></tr>' +
          '<tr><td style="padding:4px 12px 4px 0;color:#64748B">Date</td><td>' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST</td></tr></table>' +
          '<p>You can now log in to your student portal and start your program.</p>'
        )).catch(e => console.warn('Receipt email failed:', e.message));
      }
      if (ord && ord.email && docsAuto) docsAuto.onPayment({ email: ord.email, name: ord.name, orderId: razorpay_order_id, paymentId: razorpay_payment_id, amountInr: FIXED_AMOUNT_PAISE / 100 }).catch(e => console.warn('Auto documents failed:', e.message));
      return res.json({ success: true, verified: true, paymentId: razorpay_payment_id });
    } else {
      return res.status(400).json({ success: false, error: 'Payment signature verification failed' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 3. Send Email OTP ──
app.post('/api/auth/send-otp', rateLimit(5, 60000), async (req, res) => {
  const name = String(req.body.name || 'Student').slice(0, 80);
  const purpose = ['signup', 'login', 'forgot_password', 'verification'].includes(req.body.purpose) ? req.body.purpose : 'verification';
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) {
    return res.status(400).json({ success: false, error: 'Valid email is required.' });
  }

  // Generate 6-digit OTP
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

  const prev = cloudData.otps[email];
  if (prev && prev.sentAt && Date.now() - prev.sentAt < 30000) {
    return res.status(429).json({ success: false, error: 'Please wait 30 seconds before requesting another code.' });
  }
  cloudData.otps[email] = {
    codeHash: hashOtp(email, code),
    sentAt: Date.now(),
    expiresAt,
    purpose,
    attemptsRemaining: 5
  };
  persistData();

  // Anti mail-bombing: at most 5 codes per email address per hour
  cloudData.otpLog = cloudData.otpLog || {};
  const hourAgo = Date.now() - 3600000;
  const recent = (cloudData.otpLog[email] || []).filter(t => t > hourAgo);
  if (recent.length >= 5) {
    return res.status(429).json({ success: false, error: 'Too many codes requested for this email. Please try again in an hour.' });
  }
  recent.push(Date.now());
  cloudData.otpLog[email] = recent;

  const subject = purpose === 'forgot_password' ? 'Yuvantara — Password Reset OTP'
    : purpose === 'login' ? 'Yuvantara — Login Verification Code'
    : purpose === 'signup' ? 'Yuvantara — Verify Your Email to Complete Sign Up'
    : 'Yuvantara — Verify Your Email Address';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1D4ED8; margin: 0;">Yuvantara</h2>
        <p style="color: #64748B; font-size: 14px; margin: 4px 0 0;">Industrial Internship & Technology Council</p>
      </div>
      <p style="color: #334155; font-size: 15px;">Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        Your one-time 6-digit verification code is:
      </p>
      <div style="background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1D4ED8;">${code}</span>
      </div>
      <p style="color: #64748B; font-size: 13px;">
        This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
      </p>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
      <p style="color: #94A3B8; font-size: 12px; text-align: center; margin: 0;">
        Yuvantara Venture · Lekha Nagar, Saguna More, Patna, Bihar<br>
        Need help? Contact: ${escapeHtml(process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_USER || '')}
      </p>
    </div>
  `;

  if (emailReady()) {
    try {
      await sendMailUnified(email, subject, html);
      return res.json({ success: true, email: email, dispatched: true });
    } catch (mailErr) {
      console.warn('EMAIL Send error:', mailErr.message);
      delete cloudData.otps[email]; persistData();
      return res.status(500).json({ success: false, error: 'Failed to deliver the OTP email. Please try again in a moment or contact support.' });
    }
  }

  if (process.env.NODE_ENV === 'production') {
    delete cloudData.otps[email]; persistData();
    return res.status(503).json({ success: false, error: 'Email service is not configured yet. Please contact support.' });
  }
  // If SMTP not yet configured in .env (development only), log to backend server console for the server administrator (NEVER send code in JSON response!)
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[DEV ONLY] OTP for ${email}: ${code} (configure SMTP_USER & SMTP_PASS for real delivery)`);
  }
  res.json({ success: true, email: email, dispatched: false, message: 'OTP generated. Configure SMTP credentials in server/.env for live inbox delivery.' });
});

// ── 4. Verify Email OTP ──
app.post('/api/auth/verify-otp', rateLimit(20, 60000), (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = req.body.code;
  if (!email || !code) {
    return res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
  }

  const record = cloudData.otps[email];
  if (!record) {
    return res.status(400).json({ success: false, error: 'No OTP requested for this email or session expired.' });
  }
  if (req.body.purpose && req.body.purpose !== record.purpose) {
    return res.status(400).json({ success: false, error: 'This code was not issued for this action. Please request a new code.' });
  }
  if (Date.now() > record.expiresAt) {
    delete cloudData.otps[email]; persistData();
    return res.status(400).json({ success: false, error: 'The OTP code has expired. Please request a new code.' });
  }

  const a = Buffer.from(record.codeHash), b = Buffer.from(hashOtp(email, String(code).trim()));
  if (!(a.length === b.length && crypto.timingSafeEqual(a, b))) {
    record.attemptsRemaining -= 1;
    if (record.attemptsRemaining <= 0) delete cloudData.otps[email];
    persistData();
    return res.status(400).json({ success: false, error: `Incorrect code. ${Math.max(0, record.attemptsRemaining)} attempts remaining.` });
  }

  delete cloudData.otps[email]; persistData();
  res.json({ success: true, verified: true, email });
});

// ── 5. Cloud Data Endpoints (Users, Applications, 7 Synchronized Replicas) ──
const REPLICA_FILES = [
  'master_super_admin.json',
  'admin_adk_01.json',
  'admin_alk_01.json',
  'admin_dhb_03.json',
  'admin_abk_04.json',
  'admin_anp_05.json',
  'admin_rop_06.json'
];

function updateAllReplicasOnDisk(state) {
  const dataDirPath = path.join(__dirname, '..', 'data');
  const now = new Date().toISOString();
  REPLICA_FILES.forEach(fileName => {
    const fullPath = path.join(dataDirPath, fileName);
    let existing = {};
    try {
      if (fs.existsSync(fullPath)) {
        existing = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      }
    } catch(e) {}

    const updated = {
      ...existing,
      lastSynced: now,
      new_registrations: state.new_registrations || existing.new_registrations || [],
      current_interns: state.current_interns || existing.current_interns || [],
      all_employees: state.all_employees || existing.all_employees || [],
      audit_logs: state.audit_logs || existing.audit_logs || []
    };
    try {
      fs.writeFileSync(fullPath, JSON.stringify(updated, null, 2), 'utf8');
    } catch(err) {
      console.warn('Could not write replica file:', fileName, err.message);
    }
  });
}

// 7-Replica Sync Endpoint
app.get('/api/replicas', requireAdminKey, (req, res) => {
  const dataDirPath = path.join(__dirname, '..', 'data');
  const masterPath = path.join(dataDirPath, 'master_super_admin.json');
  try {
    if (fs.existsSync(masterPath)) {
      const data = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
      return res.json({ success: true, replicasCount: 7, data });
    }
  } catch(e) {}
  res.json({ success: false, message: 'Replicas not loaded' });
});

app.post('/api/replicas/sync', requireAdminKey, (req, res) => {
  const state = req.body;
  if (!state) return res.status(400).json({ success: false, message: 'Invalid payload' });
  updateAllReplicasOnDisk(state);
  res.json({ success: true, syncedReplicas: 7, timestamp: new Date().toISOString() });
});

app.get('/api/users', requireAdminKey, (req, res) => {
  res.json(cloudData.users);
});

app.post('/api/users', requireAdminKey, (req, res) => {
  const user = req.body;
  if (!user || typeof user.email !== 'string') return res.status(400).json({ success: false, error: 'email is required' });
  const existingIdx = cloudData.users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (existingIdx >= 0) {
    cloudData.users[existingIdx] = { ...cloudData.users[existingIdx], ...user };
  } else {
    cloudData.users.push(user);
  }
  persistData();
  res.json({ success: true, user });
});

app.get('/api/applications', requireAdminKey, (req, res) => {
  res.json(cloudData.applications);
});

app.post('/api/applications', rateLimit(10, 60000), (req, res) => {
  const b = req.body || {};
  if (typeof b.email !== 'string') return res.status(400).json({ success: false, error: 'email is required' });
  // Whitelist fields — never store credentials or arbitrary client-supplied keys
  const appItem = {};
  ['id', 'name', 'email', 'phone', 'dob', 'track', 'stream', 'college', 'registeredAt'].forEach(k => {
    if (b[k] != null) appItem[k] = String(b[k]).slice(0, 200);
  });
  appItem.receivedAt = new Date().toISOString();
  cloudData.applications.unshift(appItem);
  if (cloudData.applications.length > 5000) cloudData.applications.length = 5000;
  persistData();
  if (firestore) {
    const docId = (appItem.email || 'unknown').toLowerCase() + '_' + Date.now();
    firestore.collection('applications').doc(docId).set(appItem).catch(e => console.warn('Firestore application write failed:', e.message));
  }
  res.json({ success: true, application: appItem });
});

// ── Super Admin: OTP password reset + server-verified login ─────────────────────────────────────────────────
// The super admin's built-in password lives inside the website code (a hash in assets/db.js), so it cannot be changed
// from a browser alone. This block lets the super admin reset it by email OTP: the new password is stored HERE
// (scrypt hash, in Firestore when Firebase Admin is connected, otherwise in cloud_db.json) and, once it exists, the
// server decides whether a super admin login is correct on every device.
const SUPER_ADMIN_EMAIL = String(process.env.SUPER_ADMIN_EMAIL || 'rocky7061patel@gmail.com').trim().toLowerCase();
let superCred = (cloudData.superAdmin && cloudData.superAdmin.hash) ? cloudData.superAdmin : null;   // { salt, hash, updatedAt }
const saLogin = { fails: 0, lockedUntil: 0 };

if (firestore) {
  // the Firestore copy wins when it is newer (survives redeploys of the file store)
  firestore.collection('system').doc('super_admin').get().then(doc => {
    const remote = doc.exists ? doc.data() : null;
    if (remote && remote.hash && (!superCred || (remote.updatedAt || 0) >= (superCred.updatedAt || 0))) {
      superCred = remote; cloudData.superAdmin = remote; persistData();
      console.log('🔐 Super admin custom password loaded from Firestore.');
    } else if (superCred) {
      firestore.collection('system').doc('super_admin').set(superCred).catch(() => {});
    }
  }).catch(e => console.warn('Could not read super admin credential from Firestore:', e.message));
}

function persistSuperCred() {
  cloudData.superAdmin = superCred;
  persistData();
  if (firestore) firestore.collection('system').doc('super_admin').set(superCred).catch(e => console.warn('Firestore super admin write failed:', e.message));
}
async function scryptHash(password, saltHex) {
  return (await scryptAsync(String(password), Buffer.from(saltHex, 'hex'), 64)).toString('hex');
}
function checkNewPassword(pw) {
  pw = String(pw || '');
  if (pw.length < 10) return 'Password must be at least 10 characters.';
  if (pw.length > 128) return 'Password is too long (max 128 characters).';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Password must contain letters and at least one number.';
  if (pw.toLowerCase().includes(SUPER_ADMIN_EMAIL.split('@')[0].toLowerCase()) && SUPER_ADMIN_EMAIL.split('@')[0].length >= 4) return 'Password must not contain your email name.';
  return '';
}
function saOtpHash(code) { return hashOtp('superadmin-reset:' + SUPER_ADMIN_EMAIL, code); }

// Step 1: email a 6-digit code to the super admin address. The answer is identical for any address, so this cannot
// be used to find out which address is the super admin.
app.post('/api/admin/super/forgot/send-otp', rateLimit(5, 60000), async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const generic = { success: true, message: 'If this is the Super Admin email, a verification code has been sent to it.' };
  if (email !== SUPER_ADMIN_EMAIL) return res.json(generic);

  cloudData.saOtp = cloudData.saOtp || {};
  const prev = cloudData.saOtp;
  if (prev.sentAt && Date.now() - prev.sentAt < 30000) {
    return res.status(429).json({ success: false, error: 'Please wait 30 seconds before requesting another code.' });
  }
  const hourAgo = Date.now() - 3600000;
  const recent = (cloudData.saOtpLog || []).filter(t => t > hourAgo);
  if (recent.length >= 5) return res.status(429).json({ success: false, error: 'Too many codes requested. Please try again in an hour.' });

  if (!emailReady() && process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Email service is not configured on the server (set BREVO_API_KEY or SMTP_USER/SMTP_PASS).' });
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  cloudData.saOtp = { codeHash: saOtpHash(code), sentAt: Date.now(), expiresAt: Date.now() + 10 * 60 * 1000, attemptsRemaining: 5 };
  recent.push(Date.now()); cloudData.saOtpLog = recent;
  persistData();

  if (!emailReady()) {
    console.info(`[DEV ONLY] Super admin reset OTP: ${code}`);
    return res.json(Object.assign({ dispatched: false }, generic));
  }
  const html = mailShell('Super Admin password reset',
    '<p>Use this code to reset the Super Admin password:</p>' +
    '<div style="background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:10px;padding:16px;text-align:center;margin:18px 0"><span style="font-size:30px;font-weight:800;letter-spacing:8px;color:#1D4ED8">' + code + '</span></div>' +
    '<p style="color:#64748B;font-size:13px">Valid for <strong>10 minutes</strong>. If you did not request this, ignore this email — your password has not changed. Never share this code.</p>');
  try {
    await sendMailUnified(SUPER_ADMIN_EMAIL, 'Yuvantara — Super Admin Password Reset Code', html);
    return res.json(Object.assign({ dispatched: true }, generic));
  } catch (err) {
    console.warn('Super admin OTP email failed:', err.message);
    cloudData.saOtp = {}; persistData();
    return res.status(500).json({ success: false, error: 'Could not send the email. Please try again in a moment.' });
  }
});

// Step 2: code + new password. The password rules are checked first so a typo in the password does not burn the code.
app.post('/api/admin/super/forgot/reset', rateLimit(10, 60000), async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').replace(/\D/g, '');
  const newPassword = String(req.body.newPassword || '');
  const bad = { success: false, error: 'Invalid or expired code. Request a new code and try again.' };

  const pwProblem = checkNewPassword(newPassword);
  if (pwProblem) return res.status(400).json({ success: false, error: pwProblem });
  if (email !== SUPER_ADMIN_EMAIL || code.length !== 6) return res.status(400).json(bad);

  const rec = cloudData.saOtp;
  if (!rec || !rec.codeHash) return res.status(400).json(bad);
  if (Date.now() > rec.expiresAt) { cloudData.saOtp = {}; persistData(); return res.status(400).json(bad); }

  const a = Buffer.from(rec.codeHash), b = Buffer.from(saOtpHash(code));
  if (!(a.length === b.length && crypto.timingSafeEqual(a, b))) {
    rec.attemptsRemaining -= 1;
    if (rec.attemptsRemaining <= 0) cloudData.saOtp = {};
    persistData();
    return res.status(400).json({ success: false, error: rec.attemptsRemaining > 0 ? `Incorrect code. ${rec.attemptsRemaining} attempt(s) remaining.` : 'Too many wrong codes. Request a new code.' });
  }

  try {
    const salt = crypto.randomBytes(16).toString('hex');
    superCred = { salt, hash: await scryptHash(newPassword, salt), updatedAt: Date.now() };
    cloudData.saOtp = {};
    saLogin.fails = 0; saLogin.lockedUntil = 0;
    persistSuperCred();
    console.log('🔐 Super admin password was reset by email OTP at', new Date().toISOString());
    if (emailReady()) {
      sendMailUnified(SUPER_ADMIN_EMAIL, 'Yuvantara — Super Admin password changed',
        mailShell('Your Super Admin password was changed', '<p>The Super Admin password was just reset using an email code. If this was not you, reset it again immediately and review the audit log.</p>'))
        .catch(() => {});
    }
    res.json({ success: true, durable: !!firestore });
  } catch (err) {
    console.error('Super admin reset failed:', err.message);
    res.status(500).json({ success: false, error: 'Could not save the new password. Please try again.' });
  }
});

// Login check used by every login form once a custom super admin password exists.
//   override:false -> no custom password yet: the browser falls back to the built-in password check
//   override:true  -> valid:true/false is the final answer
app.post('/api/admin/super/login', rateLimit(10, 60000), async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (email !== SUPER_ADMIN_EMAIL || !superCred) return res.json({ success: true, override: false });
  if (Date.now() < saLogin.lockedUntil) {
    return res.status(429).json({ success: false, locked: true, error: '🔒 Super admin login is locked for ' + Math.ceil((saLogin.lockedUntil - Date.now()) / 60000) + ' minute(s) after too many wrong passwords.' });
  }
  try {
    const got = Buffer.from(await scryptHash(password, superCred.salt), 'hex');
    const want = Buffer.from(superCred.hash, 'hex');
    const ok = got.length === want.length && crypto.timingSafeEqual(got, want);
    if (ok) { saLogin.fails = 0; return res.json({ success: true, override: true, valid: true }); }
    saLogin.fails += 1;
    if (saLogin.fails >= 8) { saLogin.lockedUntil = Date.now() + 15 * 60000; saLogin.fails = 0; }
    return res.json({ success: true, override: true, valid: false, attemptsRemaining: Math.max(0, 8 - saLogin.fails) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Login check failed.' });
  }
});

// ── Unknown API routes -> JSON 404 ──
// ── Branded email wrapper ──
function mailShell(title, bodyHtml) {
  const support = escapeHtml(process.env.SUPPORT_EMAIL || 'yuvantara@yuvantaraventure.com');
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">' +
    '<div style="background:#ffffff;padding:16px 20px;border-bottom:3px solid #1D4ED8"><img src="https://yuvantaraventure.com/assets/images/logo.png" alt="Yuvantara Venture" height="64" style="height:64px;width:auto;display:block;border:0"></div>' +
    '<div style="padding:20px;color:#0F172A;font-size:15px;line-height:1.6"><h2 style="margin:0 0 12px;font-size:18px">' + title + '</h2>' + bodyHtml + '</div>' +
    '<div style="background:#F8FAFC;padding:12px 20px;color:#64748B;font-size:12px">Lekha Nagar, Saguna More, Patna, Bihar · ' + support + ' · +91 98765 43210</div></div>';
}

// ── Course completion email (called by the portal when a certificate is issued) ──
app.post('/api/notify/course-complete', rateLimit(5, 60000), (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const name = String(req.body.name || 'Student').slice(0, 80);
  const track = String(req.body.track || 'your internship program').slice(0, 120);
  const certNumber = String(req.body.certNumber || '').slice(0, 60);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ success: false, error: 'Valid email required.' });
  if (!emailReady()) return res.json({ success: true, sent: false });

  // Once per student+certificate, and at most 3 such mails per address ever (limits abuse)
  const key = 'complete:' + email + ':' + (certNumber || track);
  if (cloudData.notified[key]) return res.json({ success: true, sent: false, duplicate: true });
  const perEmail = Object.keys(cloudData.notified).filter(k => k.startsWith('complete:' + email + ':')).length;
  if (perEmail >= 3) return res.json({ success: true, sent: false });
  cloudData.notified[key] = Date.now();
  persistData();

  if (docsAuto) docsAuto.onComplete({ email, name, track, rollNo: req.body.rollNo, institution: req.body.institution, attendance: req.body.attendance, marks: req.body.marks, mode: req.body.mode })
    .then(r => { if (r && r.reason) { console.warn('Certificate not auto-issued for', email, r.reason); delete cloudData.notified[key]; persistData(); } }).catch(e => console.warn('Auto certificate failed:', e.message));
  sendMailUnified(email, 'Congratulations — Course Completed | Yuvantara Venture', mailShell('Congratulations, ' + escapeHtml(name) + '! 🎓',
    '<p>You have successfully completed <strong>' + escapeHtml(track) + '</strong> at Yuvantara Venture.</p>' +
    (certNumber ? '<p>Your certificate number: <strong>' + escapeHtml(certNumber) + '</strong><br>Anyone can verify it at <a href="https://yuvantaraventure.com/verify-certificate">yuvantaraventure.com/verify-certificate</a>.</p>' : '') +
    '<p>Log in to your student portal to view and download your certificate. We are proud of your work!</p>'
  )).catch(e => { console.warn('Completion email failed:', e.message); delete cloudData.notified[key]; persistData(); });
  res.json({ success: true, sent: true });
});

// ── College search (proxy to collegedb.in so the API key never reaches the browser) ──
const collegeCache = new Map();
let collegeBudget = { day: '', used: 0 };
const COLLEGE_DAILY_LIMIT = 45;   // CollegeDB free plan = 50 requests/day; keep a safety margin
app.get('/api/colleges', rateLimit(30, 60000), async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase().slice(0, 60);
  if (q.length < 3) return res.json({ success: true, results: [] });
  const apiKey = process.env.COLLEGEDB_API_KEY;
  // "reason" tells you WHY the list is empty: open /api/colleges?q=patna in a browser to see it.
  if (!apiKey) return res.json({ success: true, results: [], fallback: true, reason: 'no_api_key' });

  const hit = collegeCache.get(q);
  if (hit && Date.now() - hit.t < 24 * 3600000) return res.json({ success: true, results: hit.results, cached: true });

  const today = new Date().toISOString().slice(0, 10);
  if (collegeBudget.day !== today) collegeBudget = { day: today, used: 0 };
  if (collegeBudget.used >= COLLEGE_DAILY_LIMIT) return res.json({ success: true, results: [], fallback: true, reason: 'daily_limit' });
  collegeBudget.used++;

  try {
    const r = await fetch('https://api.collegedb.in/v1/colleges/search?q=' + encodeURIComponent(q), {
      headers: { Authorization: 'Bearer ' + apiKey, Accept: 'application/json' }
    });
    if (!r.ok) { console.warn('CollegeDB error', r.status); return res.json({ success: true, results: [], fallback: true, reason: 'upstream_' + r.status }); }
    const data = await r.json();
    // Accept {results:[]}, {data:[]}, {colleges:[]}, {data:{results:[]}} or a bare array
    const list = Array.isArray(data) ? data
      : (Array.isArray(data.results) ? data.results
      : (Array.isArray(data.data) ? data.data
      : (Array.isArray(data.colleges) ? data.colleges
      : (data.data && Array.isArray(data.data.results) ? data.data.results : []))));
    const results = list.slice(0, 10).map(c => ({
      name: String(c.name || c.college_name || c.institute_name || '').slice(0, 160),
      city: String(c.city || c.district || '').slice(0, 60),
      state: String(c.state || '').slice(0, 60)
    })).filter(c => c.name);
    if (!results.length) {
      console.warn('CollegeDB returned no usable rows. Top-level keys:', Object.keys(data || {}).join(','));
      return res.json({ success: true, results: [], fallback: true, reason: 'upstream_empty_or_unknown_shape' });
    }
    collegeCache.set(q, { t: Date.now(), results });
    if (collegeCache.size > 2000) collegeCache.delete(collegeCache.keys().next().value);
    res.json({ success: true, results });
  } catch (e) {
    console.warn('CollegeDB fetch failed:', e.message);
    res.json({ success: true, results: [], fallback: true, reason: 'fetch_failed' });
  }
});

// Document-issuing routes (/api/admin/documents/*, /api/certificate/*) MUST be mounted BEFORE the catch-all 404 below,
// otherwise every one of them answers "Not found".
docsAuto = require('./documents/issue')(app, { requireAdminKey, rateLimit, sendMail: sendMailUnified, emailReady, getFirestore: () => firestore, cloudData, persistData, escapeHtml, mailShell });

app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'Not found' }));

// ── Static website (same origin as the API, so no CORS problems) ──
// Private folders / files are never served.
const BLOCKED = /^\/(server|data|scratch|tools|\.git|\.github|node_modules)(\/|$)|^\/(\.env|server\.ps1|README[^/]*\.md|CHANGES\.md|firebase\.json|firestore\.rules|\.firebaserc|DEPLOY\.md)$|\/raw_originals\//i;
app.use((req, res, next) => {
  let p;
  try { p = decodeURIComponent(req.path); } catch (e) { return res.status(400).end(); }
  if (BLOCKED.test(p) || p.split('/').some(seg => seg.startsWith('.') && seg !== '')) return res.status(404).sendFile(path.join(SITE_ROOT, '404.html'));
  next();
});
app.use(express.static(SITE_ROOT, {
  index: 'index.html',
  extensions: ['html'],
  dotfiles: 'ignore',
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  setHeaders: (res, filePath) => {
    if (/\.(html|js|css)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');   // always revalidate code
  }
}));
app.use((req, res) => res.status(404).sendFile(path.join(SITE_ROOT, '404.html')));

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Yuvantara Cloud Server running on port ${PORT}`);
  console.log(`🌐 Site + API ready (domain: ${process.env.CLIENT_ORIGIN || 'https://yuvantaraventure.com'})`);
});
