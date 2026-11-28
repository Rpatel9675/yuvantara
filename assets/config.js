// Yuvantara Production Configuration
// Official Domain: https://yuvantaraventure.com
(function(window) {
  'use strict';

  var COMPANY_IDENTITY = {
    // ── Master Company Details (Single Source of Truth) ──
    // Replace placeholder markers (TODO_REAL_VALUE) with your verified corporate documentation
    legalName: 'Yuvantara Venture', // TODO_REAL_VALUE: Official registered corporate entity name
    tradeName: 'Yuvantara',
    tagline: 'Cybersecurity, Enterprise Software & Industrial Internship Programs',
    cin: 'U72900BR2024PTC068942', // TODO_REAL_VALUE: Corporate Identification Number (MCA verified)
    gstin: '10AABCY1234F1Z5', // TODO_REAL_VALUE: 15-digit GST identification number
    isGstRegistered: false, // Set to true once verified with Chartered Accountant
    pan: 'AABCY1234F', // TODO_REAL_VALUE: Permanent Account Number
    sacCode: '9992', // Education, Vocational & Technical Training Support Services
    isoCertification: 'ISO 9001:2015 Certified Quality Management System (Cert # QMS-2024-YUV-8821)', // TODO_REAL_VALUE
    registeredOffice: 'Lekha Nagar, Saguna More, Patna, Bihar', // TODO_REAL_VALUE
    corporateOffice: 'Lekha Nagar, Saguna More, Patna, Bihar', // TODO_REAL_VALUE
    primaryPhone: '+91 98765 43210', // TODO_REAL_VALUE: Student / Helpline telephone
    supportEmail: 'yuvantara@yuvantaraventure.com', // TODO_REAL_VALUE: Primary operational helpdesk email
    billingEmail: 'yuvantara@yuvantaraventure.com', // TODO_REAL_VALUE: Accounts & invoice enquiries
    careersEmail: 'yuvantara@yuvantaraventure.com', // TODO_REAL_VALUE: Student internship inquiries
    officialWebsite: 'https://yuvantaraventure.com',
    portalUrl: 'https://yuvantaraventure.com/portal/',
    verifyCertUrl: 'https://yuvantaraventure.com/verify-certificate/',
    signatoryName: 'Shalu Shimpi Kumari', // TODO_REAL_VALUE: Authorized Signatory
    signatoryTitle: 'Head of Cyber Defense Operations & Industrial Training' // TODO_REAL_VALUE
  };

  var CONFIG = {
    // Production: demo payment and sample certificate IDs are OFF.
    demoMode: false,

    domain: COMPANY_IDENTITY.officialWebsite,
    siteName: COMPANY_IDENTITY.tradeName,
    company: COMPANY_IDENTITY,
    tagline: COMPANY_IDENTITY.tagline,
    supportEmail: COMPANY_IDENTITY.supportEmail,
    supportPhone: COMPANY_IDENTITY.primaryPhone,
    address: COMPANY_IDENTITY.registeredOffice,
    gstin: COMPANY_IDENTITY.gstin,

    // ── Payment Gateway & Mode Settings ──
    // Options: 'disabled' (no fee displayed), 'manual' (offline UPI/bank transfer), 'razorpay' (active gateway)
    payment: {
      mode: 'disabled', // Payment gateway OFF for now: applications are saved, admin activates accounts. Switch to 'razorpay' later.
      amountInPaise: 23600, // ₹236.00 (₹200 Base Fee + 18% GST ₹36)
      currency: 'INR',
      razorpayKeyId: 'rzp_test_51H0yourKeyHere', // Set when razorpay mode is active
      upiId: 'yuvantara@upi', // TODO_REAL_VALUE: For manual UPI transfers
      bankDetails: {
        accountName: 'Yuvantara Venture',
        accountNumber: '918020000000000', // TODO_REAL_VALUE
        ifsc: 'UTIB0000000', // TODO_REAL_VALUE
        bankName: 'Axis Bank' // TODO_REAL_VALUE
      }
    },

    // ── Security & Authentication ──
    // Email OTP (sent via the SMTP account set in server/.env).
    // Used for: sign up and forgot password only (login uses just the password).
    // Login system: 'server' = passwords are verified on the Render server (credentials are never sent to browsers).
    auth: { mode: 'server' },
    otp: { enabled: true, expiryMinutes: 10, onSignup: true, onLogin: false, onForgotPassword: true },
    // Automatic emails sent by the server: payment receipt (always) and course-completion message
    mail: { onCourseComplete: true },

    // ── Shared cloud database (REQUIRED for multi-device use on GitHub Pages) ──
    // Without this every browser has its own private data: users registered on one device never show up in the
    // admin portal, and admin approvals never reach the user's dashboard. Setup (5 minutes, free tier):
    //   1. https://console.firebase.google.com -> Add project -> Build -> Firestore Database -> Create database
    //   2. Project settings -> General -> "Your apps" -> Web app (</>) -> copy projectId and apiKey below
    //   3. Firestore -> Rules -> paste the TEST rules from README_CLOUD_SETUP.md and Publish
    //   4. Set enabled: true, commit, and reload the site on every device.
    firebase: {
      enabled: true,
      projectId: 'yuvantaraventures-1aa54',
      apiKey: 'AIzaSyANkaQ896PnKW4ASgqd2uQgvNDR_ULoa8M'   // public web key; restrict it to your domain in Google Cloud Console (see DEPLOY.md)
    },

    // ── Data reset (all user data reset on 2026-11-25) ──
    // dataEpoch: every browser deletes its cached student data ONCE when this value changes (admin accounts are kept).
    // dataResetBefore: shared-database records last edited before this time (ms) are ignored/removed everywhere.
    // To wipe all users again later: change dataEpoch, set dataResetBefore to Date.now() (or use the Super Admin
    // "Reset ALL user data" button in the admin portal, which also deletes the cloud records).
    dataEpoch: 'reset-2026-11-25',
    dataResetBefore: 1795547149740,

    // ── Backend API ──
    api: {
      // The website is on GitHub Pages, the API (OTP, login, payments, college search) runs on Render.
      baseUrl: (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) ? '/api' : 'https://yuvantara.onrender.com/api',
      isServerRunning: false
    }
  };

  window.YUVANTARA_CONFIG = CONFIG;
  window.COMPANY_CONFIG = COMPANY_IDENTITY;
  window.getCompanyDetails = function() { return COMPANY_IDENTITY; };
})(window);
