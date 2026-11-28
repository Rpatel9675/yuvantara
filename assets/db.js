// Yuvantara Database & Authentication Service (LocalStorage + Cloud Synchronization)
// Production Engine: Role-Based Access Control, SHA-256 Hashing, Audit Logging & Action Ownership Locking
(function(window) {
  'use strict';

  var STORAGE_KEYS = {
    MASTER_DB: 'yuvantara_master_db',
    NEW_REGISTRATIONS: 'yuvantara_new_registrations',
    CURRENT_INTERNS: 'yuvantara_current_interns',
    ALL_EMPLOYEES: 'yuvantara_all_employees',
    USERS: 'yuvantara_users_db',
    APPLICATIONS: 'yuvantara_apps_db',
    CURRENT_USER: 'yuvantara_session_user',
    CERTIFICATES: 'yuvantara_certs_db',
    LOCKOUTS: 'yuvantara_lockouts',
    AUDIT_LOGS: 'yuvantara_audit_logs'
  };

  // Pure JavaScript SHA-256 Implementation for Production Grade Password Hashing
  function sha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;
    var result = '';
    var words = [];
    var asciiBitLength = ascii[lengthProperty] * 8;
    var hash = [];
    var k = [];
    var primeCounter = 0;
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      words[i >> 2] |= j << ((3 - (i % 4)) * 8);
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;
    for (j = 0; j < words[lengthProperty];) {
      var w = words.slice(j, (j += 16));
      var oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        var s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        var ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
        var maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
        var temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
        var temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
          var b = (hash[i] >> (j * 8)) & 255;
          result += ((b < 16) ? 0 : '') + b.toString(16);
        }
      }
    }
    return result;
  }

  var SALT = 'YUVANTARA_DEFENSE_PROD_SALT_@2026_PATNA#';
  function hashPassword(password) {
    if (!password) return '';
    return 'SHA256$' + sha256(SALT + password + SALT);
  }

  // ── SEED DATA DEFINITIONS ──
  var SEED_USERS = [
    // 👑 Super Administrator
    {
      id: 'SUPER-001',
      name: 'Super Administrator',
      email: 'rocky7061patel@gmail.com',
      passwordHash: 'SHA256$a4fe96c9d5f12424103f6b0799a5cbc0f704fd92e63c4bee838831c1ebe36979',
      role: 'superadmin',
      status: 'active',
      registeredAt: '2025-01-01',
      phone: '+91 98765 00000'
    },
    // 🛡️ 6 Administrators
    {
      id: 'ADM-01',
      name: 'Admin ADK-01',
      email: 'adk_01@admin',
      passwordHash: 'SHA256$4513d20152f6a155af9296f5084a1cf2cc2426a5c108cae4a041208cf14c8e25',
      role: 'admin',
      status: 'active',
      registeredAt: '2026-01-01',
      phone: '+91 98765 00001'
    },
    {
      id: 'ADM-02',
      name: 'Admin ALK-01',
      email: 'alk_01@admin',
      passwordHash: 'SHA256$dc44c2dc7dca68c9156f657684208479c58b57f267fc7604f49a24925b5a1fa2',
      role: 'admin',
      status: 'active',
      registeredAt: '2026-01-01',
      phone: '+91 98765 00002'
    },
    {
      id: 'ADM-03',
      name: 'Admin DHB-03',
      email: 'dhb_03@admin',
      passwordHash: 'SHA256$f027e8f32289e0376fae19ce99499e62ef28700b4dbf276cd3eab75708bd18bc',
      role: 'admin',
      status: 'active',
      registeredAt: '2026-01-01',
      phone: '+91 98765 00003'
    },
    {
      id: 'ADM-04',
      name: 'Admin ABK-04',
      email: 'abk_04@admin',
      passwordHash: 'SHA256$b798d8ac1cc162d48b86b0eeaf6d619980fb510ac534ade21123bff1055e5dfa',
      role: 'admin',
      status: 'active',
      registeredAt: '2026-01-01',
      phone: '+91 98765 00004'
    },
    {
      id: 'ADM-05',
      name: 'Admin ANP-05',
      email: 'anp_05@admin',
      passwordHash: 'SHA256$4be0f9236cca60639cdbe17a16b4819c201c156a8a03079d1db0c990727cbf42',
      role: 'admin',
      status: 'active',
      registeredAt: '2026-01-01',
      phone: '+91 98765 00005'
    },
    {
      id: 'ADM-06',
      name: 'Admin ROP-06',
      email: 'rop_06@admin',
      passwordHash: 'SHA256$16d1f602972d6c46ac8469098f9e6286d3b347d65d57e451f56464d394b3c1ab',
      role: 'admin',
      status: 'active',
      registeredAt: '2026-01-01',
      phone: '+91 98765 00006'
    }
  ];

  var SEED_APPLICATIONS = [];

  var SEED_AUDIT_LOGS = [];

  // ── 7 Synchronized Replicas Definition ──
  var REPLICA_METADATA = [
    { id: 'master_super_admin', email: 'rocky7061patel@gmail.com', role: 'superadmin', name: 'Super Admin Command', file: 'master_super_admin.json' },
    { id: 'admin_adk_01', email: 'adk_01@admin', role: 'admin', name: 'Admin ADK-01 (Patna SOC)', file: 'admin_adk_01.json' },
    { id: 'admin_alk_01', email: 'alk_01@admin', role: 'admin', name: 'Admin ALK-01 (Gaya Cloud)', file: 'admin_alk_01.json' },
    { id: 'admin_dhb_03', email: 'dhb_03@admin', role: 'admin', name: 'Admin DHB-03 (Muzaffarpur Lab)', file: 'admin_dhb_03.json' },
    { id: 'admin_abk_04', email: 'abk_04@admin', role: 'admin', name: 'Admin ABK-04 (Bhagalpur IoT)', file: 'admin_abk_04.json' },
    { id: 'admin_anp_05', email: 'anp_05@admin', role: 'admin', name: 'Admin ANP-05 (Darbhanga Unit)', file: 'admin_anp_05.json' },
    { id: 'admin_rop_06', email: 'rop_06@admin', role: 'admin', name: 'Admin ROP-06 (Purnia AI Command)', file: 'admin_rop_06.json' }
  ];

  // 1. Seed: Category 1 - New Registrations (Incoming users)
  var SEED_NEW_REGISTRATIONS = [];

  // 2. Seed: Category 2 - Current Interns (Active verified interns)
  var SEED_CURRENT_INTERNS = [];

  // 3. Seed: Category 3 - All Employees (Reset to NILL per user instruction)
  var SEED_ALL_EMPLOYEES = [];

  function getStorage(key, defaultVal) {
    try {
      var item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  function setStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      console.error('Storage quota exceeded or error:', e);
      // Let the UI warn the user instead of silently losing the write
      try { window.dispatchEvent(new CustomEvent('yuvantara_storage_error', { detail: { key: key } })); } catch (_) {}
      return false;
    }
  }

  // ── Data reset epoch ──
  // When YUVANTARA_CONFIG.dataEpoch changes, every browser wipes its cached STUDENT data exactly once
  // (admin accounts are kept). Change the value in assets/config.js to reset all users again.
  (function applyDataResetEpoch() {
    try {
      var wanted = (window.YUVANTARA_CONFIG && window.YUVANTARA_CONFIG.dataEpoch) || '';
      if (!wanted || typeof localStorage === 'undefined') return;
      if (localStorage.getItem('yuvantara_data_epoch') === wanted) return;

      function adminsOnly(key) {
        var arr = getStorage(key, []);
        return Array.isArray(arr) ? arr.filter(function(u) { return u && (u.role === 'admin' || u.role === 'superadmin'); }) : [];
      }
      var admins = adminsOnly(STORAGE_KEYS.MASTER_DB);
      adminsOnly(STORAGE_KEYS.USERS).forEach(function(a) {
        if (!admins.some(function(x) { return x.email === a.email; })) admins.push(a);
      });
      if (admins.length) {
        setStorage(STORAGE_KEYS.MASTER_DB, admins);
        setStorage(STORAGE_KEYS.USERS, admins);
      } else {
        localStorage.removeItem(STORAGE_KEYS.MASTER_DB);
        localStorage.removeItem(STORAGE_KEYS.USERS);
      }
      [STORAGE_KEYS.NEW_REGISTRATIONS, STORAGE_KEYS.CURRENT_INTERNS, STORAGE_KEYS.ALL_EMPLOYEES,
       STORAGE_KEYS.APPLICATIONS, STORAGE_KEYS.CERTIFICATES, STORAGE_KEYS.LOCKOUTS, STORAGE_KEYS.AUDIT_LOGS,
       'yuvantara_seed_hydrated', 'yuvantara_audit_hydrated', 'yuvantara_pending_app'
      ].forEach(function(k) { localStorage.removeItem(k); });

      // a logged-in student session no longer has an account behind it
      var sess = getStorage(STORAGE_KEYS.CURRENT_USER, null);
      if (sess && sess.role !== 'admin' && sess.role !== 'superadmin') localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);

      localStorage.setItem('yuvantara_data_epoch', wanted);
    } catch (e) {}
  })();

  // Quota & Storage Hygiene: Purge any legacy replica caches to enforce ONLY 1 Unified Master DB
  (function cleanLegacyReplicaBlobs() {
    try {
      if (typeof localStorage !== 'undefined') {
        var toRemove = [];
        for (var k = 0; k < localStorage.length; k++) {
          var keyName = localStorage.key(k);
          if (keyName && keyName.indexOf('yuvantara_replica_') === 0) {
            toRemove.push(keyName);
          }
        }
        toRemove.forEach(function(k) { localStorage.removeItem(k); });
      }
    } catch(e) {}
  })();

  // Retired super-admin logins: removed from every browser cache (master DB + legacy users list) on load, and the
  // current super admin is added to caches that pre-date the change. Admin accounts are never synced to the cloud.
  (function retireOldSuperAdmins() {
    try {
      var RETIRED = ['admin@yuvantara.com', 'a4dr_00@supper'];
      var current = null;
      SEED_USERS.forEach(function(u) { if (u.role === 'superadmin') current = u; });
      [STORAGE_KEYS.MASTER_DB, STORAGE_KEYS.USERS].forEach(function(key) {
        var arr = getStorage(key, null);
        if (!Array.isArray(arr) || !arr.length) return;
        var kept = arr.filter(function(u) {
          if (!u || !u.email) return true;
          var em = String(u.email).toLowerCase();
          if (RETIRED.indexOf(em) !== -1) return false;
          // a student record that uses the super admin's address would shadow the admin account
          if (current && em === current.email.toLowerCase() && u.role !== 'superadmin') return false;
          return true;
        });
        var changed = kept.length !== arr.length;
        if (current && !kept.some(function(u) { return u && u.email === current.email; })) { kept.push(Object.assign({}, current)); changed = true; }
        if (changed) setStorage(key, kept);
      });
    } catch (e) {}
  })();

  // Self-Healing Initialization: Ensure all 7 admin accounts exist
  (function ensureAdminAccounts() {
    var users = getStorage(STORAGE_KEYS.USERS, null);
    if (!users) {
      setStorage(STORAGE_KEYS.USERS, SEED_USERS);
      return;
    }

    // Check if superadmin exists, if not inject all 7 admins
    var hasSuper = users.some(function(u) { return u.email === 'rocky7061patel@gmail.com'; });
    if (!hasSuper) {
      // Add superadmin & 6 admins from seed
      var adminsFromSeed = SEED_USERS.filter(function(u) { return u.role === 'admin' || u.role === 'superadmin'; });
      adminsFromSeed.forEach(function(adm) {
        if (!users.some(function(x) { return x.email === adm.email; })) {
          users.push(adm);
        }
      });
      setStorage(STORAGE_KEYS.USERS, users);
    }

    // Ensure seed students have DOB, Offer Letter, Invoice and Certificate metadata
    var modified = false;
    users.forEach(function(u) {
      if (u.email === 'student@yuvantara.com') {
        if (!u.dob) { u.dob = '2002-05-15'; modified = true; }
        if (!u.offerLetter) {
          u.offerLetter = {
            refNo: 'YUV/HR/INT-2026/USR-101',
            date: 'January 15, 2026',
            joiningDate: 'January 15, 2026',
            track: u.track || 'Cybersecurity & SOC Operations',
            duration: '6 Months',
            college: u.college || 'National Institute of Technology (NIT), Patna',
            stream: u.stream || 'B.Tech (Computer Science)',
            status: 'Confirmed & Active'
          };
          modified = true;
        }
        if (!u.invoice) {
          u.invoice = {
            invNumber: 'INV-2026-101',
            date: 'January 15, 2026',
            amount: 236,
            baseAmount: 200,
            gstAmount: 36,
            sacCode: '9992',
            paymentRef: 'PAY-RZP-20260115-01',
            status: 'PAID'
          };
          modified = true;
        }
        if (u.certificate) {
          u.certificate.certNumber = u.certificate.certNumber || u.certificate.id || 'YUV-2026-CS101';
          u.certificate.name = u.certificate.name || u.name;
          u.certificate.domain = u.certificate.domain || u.track;
          u.certificate.dob = u.certificate.dob || u.dob || '2002-05-15';
          u.certificate.email = u.certificate.email || u.email;
          u.certificate.phone = u.certificate.phone || u.phone;
          u.certificate.date = u.certificate.date || u.certificate.issueDate || 'June 20, 2026';
          u.certificate.qrCodeUrl = 'https://yuvantaraventure.com/verify-certificate/index.html?id=' + encodeURIComponent(u.certificate.certNumber);
          modified = true;
        }
      }
      if (u.email === 'priya@example.com') {
        if (!u.dob) { u.dob = '2003-08-20'; modified = true; }
        if (!u.offerLetter) {
          u.offerLetter = {
            refNo: 'YUV/HR/INT-2026/USR-102',
            date: 'February 01, 2026',
            joiningDate: 'February 01, 2026',
            track: u.track || 'Artificial Intelligence & Machine Learning',
            duration: '6 Months',
            college: u.college || 'Indian Institute of Technology (IIT), Patna',
            stream: u.stream || 'B.Tech (IT)',
            status: 'Confirmed & Active'
          };
          modified = true;
        }
        if (!u.invoice) {
          u.invoice = {
            invNumber: 'INV-2026-102',
            date: 'February 01, 2026',
            amount: 236,
            baseAmount: 200,
            gstAmount: 36,
            sacCode: '9992',
            paymentRef: 'PAY-RZP-20260201-02',
            status: 'PAID'
          };
          modified = true;
        }
      }
      if (u.role === 'student') {
        if (!u.offerLetter) {
          u.offerLetter = {
            refNo: 'YUV/HR/INT-2026/' + (u.id || 'USR-000'),
            date: u.registeredAt || '2026-01-01',
            joiningDate: u.registeredAt || '2026-01-01',
            track: u.track || 'Industrial Internship Program',
            duration: '6 Months',
            college: u.college || 'Affiliated Institution',
            stream: u.stream || 'Engineering & Technology',
            status: 'Confirmed & Active'
          };
          modified = true;
        }
      }
    });
    if (modified) {
      setStorage(STORAGE_KEYS.USERS, users);
    }
  })();

  // ── Unified Single Master Database Engine ──
  // Exactly 1 unified database: new registrations (unpaid/paid), current interns, and certified employees
  function initMasterDB() {
    var master = getStorage(STORAGE_KEYS.MASTER_DB, null);
    if (master && Array.isArray(master) && master.length > 0) {
      return master;
    }

    var userMap = {};

    // 1. Seed Administrators (Super Admin + 6 Admins)
    SEED_USERS.forEach(function(u) {
      if (u && u.email) userMap[u.email.toLowerCase()] = Object.assign({}, u);
    });

    // 2. Existing USERS
    var existingUsers = getStorage(STORAGE_KEYS.USERS, []);
    if (Array.isArray(existingUsers)) {
      existingUsers.forEach(function(u) {
        if (u && u.email) {
          var em = u.email.toLowerCase();
          userMap[em] = Object.assign({}, userMap[em] || {}, u);
        }
      });
    }

    // 3. Category 1: New Registrations
    var existingRegs = getStorage(STORAGE_KEYS.NEW_REGISTRATIONS, SEED_NEW_REGISTRATIONS);
    if (Array.isArray(existingRegs)) {
      existingRegs.forEach(function(r) {
        if (r && r.email) {
          var em = r.email.toLowerCase();
          var item = Object.assign({}, userMap[em] || {}, r);
          item.accountStatus = item.accountStatus || 'pending';
          item.paymentStatus = item.paymentStatus || r.paymentStatus || 'unpaid';
          userMap[em] = item;
        }
      });
    }

    // 4. Category 2: Current Interns
    var existingInterns = getStorage(STORAGE_KEYS.CURRENT_INTERNS, SEED_CURRENT_INTERNS);
    if (Array.isArray(existingInterns)) {
      existingInterns.forEach(function(i) {
        if (i && i.email) {
          var em = i.email.toLowerCase();
          var item = Object.assign({}, userMap[em] || {}, i);
          item.accountStatus = 'active';
          item.paymentStatus = i.paymentStatus || item.paymentStatus || (item.paymentRef ? 'paid' : 'unpaid');
          userMap[em] = item;
        }
      });
    }

    // 5. Category 3: All Employees / Certified (Reset to NILL per user instruction)
    var existingEmps = getStorage(STORAGE_KEYS.ALL_EMPLOYEES, []);
    if (Array.isArray(existingEmps)) {
      existingEmps.forEach(function(e) {
        if (e && e.email) {
          var em = e.email.toLowerCase();
          var item = Object.assign({}, userMap[em] || {}, e);
          item.accountStatus = 'completed';
          item.certificateNumber = item.certificateNumber || e.certificateNumber;
          userMap[em] = item;
        }
      });
    }

    var masterList = Object.values(userMap);
    setStorage(STORAGE_KEYS.MASTER_DB, masterList);
    return masterList;
  }

  // Self-Healing Initialization of Master DB.
  // NOTE: this used to DELETE every record that had a certificate / "completed" status on every page load,
  // which wiped graduated interns (and their certificates) after a refresh. It no longer removes anything.
  (function ensureMasterDatabase() {
    initMasterDB();
  })();

  if (!localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) {
    setStorage(STORAGE_KEYS.APPLICATIONS, SEED_APPLICATIONS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
    setStorage(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
  }

  // The bundled 1,000-user demo dataset (assets/seed_1000_users.json) has been REMOVED.
  // The portal now starts with zero student records; only real sign-ups appear.

  // Single write path for user records: always goes through the unified master DB
  // (the old code wrote only to the legacy USERS key, so edits were silently lost).
  function persistUsers(users) {
    if (!Array.isArray(users)) return;
    DB.saveMasterDB(users);
  }

  // Tombstones: accounts deleted by the Super Admin must not be resurrected from seed data
  function getRemovedAccounts() { return getStorage('yuvantara_removed_accounts', []); }

  // ── Unique Certificate Numbers ──
  // Every certificate number is checked against ALL records (cloud-synced ones included) so two people can
  // never receive the same number. Format: YUV-<year>-<2 letter track code><6 digits>, e.g. YUV-2026-CY482913
  function allCertificateNumbers(exceptEmail) {
    var used = {};
    var skip = (exceptEmail || '').toLowerCase();
    (getStorage(STORAGE_KEYS.MASTER_DB, []) || []).forEach(function(u) {
      if (!u || ((u.email || '').toLowerCase() === skip && skip)) return;
      var nums = [u.certificateNumber, u.certificate && u.certificate.id, u.certificate && u.certificate.certNumber];
      nums.forEach(function(n) { if (n) used[String(n).trim().toUpperCase()] = true; });
    });
    return used;
  }

  function generateUniqueCertNumber(track, exceptEmail) {
    var used = allCertificateNumbers(exceptEmail);
    var code = ((track || 'IN').replace(/[^A-Za-z]/g, '').slice(0, 2) || 'IN').toUpperCase();
    var yr = new Date().getFullYear();
    for (var attempt = 0; attempt < 500; attempt++) {
      var digits = attempt < 100 ? 6 : 8;
      var rnd = new Uint32Array(1);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(rnd);
      else rnd[0] = Math.floor(Math.random() * 4294967295);
      var min = Math.pow(10, digits - 1), span = 9 * min;
      var num = 'YUV-' + yr + '-' + code + (min + (rnd[0] % span));
      if (!used[num]) return num;
    }
    return 'YUV-' + yr + '-' + code + Date.now();   // practically unreachable fallback
  }

  function hasValidCertificate(u) {
    return !!(u && u.certificate && (u.certificate.id || u.certificate.certNumber) && u.certificate.status !== 'revoked');
  }

  // Fire-and-forget: asks the server to email the student a course-completion message (server de-duplicates).
function notifyCourseComplete(u) {
  try {
    var c = window.YUVANTARA_CONFIG || {};
    if (!u || !u.email || (c.mail && c.mail.onCourseComplete === false)) return;
    var base = (c.api && c.api.baseUrl) || '/api';
    var cert = u.certificate || {};
    fetch(base + '/notify/course-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, name: u.name, track: u.track, certNumber: cert.certNumber || cert.id || u.certificateNumber || '', rollNo: u.rollNo || u.universityRollNo || u.roll || '', institution: u.college || u.institution || u.university || '', attendance: u.attendance, marks: u.score != null ? u.score : u.marks })
    }).catch(function () {});
  } catch (e) {}
}

function buildCertificateRecord(student, certNumber, opts) {
    opts = opts || {};
    var todayFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    var issueDate = opts.issueDate || todayFormatted;
    return {
      certNumber: certNumber,
      id: certNumber,
      name: opts.name || student.name,
      college: opts.college || student.college || '',
      domain: student.track,
      dob: student.dob || '',
      email: student.email,
      phone: student.phone || '',
      date: issueDate,
      issueDate: issueDate,
      title: opts.title || ((student.track || 'Industrial') + ' Industrial Internship'),
      duration: opts.duration || '6 Months (Jan 2026 – Jun 2026)',
      grade: opts.grade || 'Grade A+ (Distinction)',
      authority: opts.authority || 'Yuvantara Academic & Cyber Defense Council',
      status: 'Valid & Verified',
      issuedByAdmin: opts.issuedBy || 'System Automated Council',
      issuedAt: new Date().toISOString(),
      qrCodeUrl: 'https://yuvantaraventure.com/verify-certificate/index.html?id=' + encodeURIComponent(certNumber),
      fileUrl: opts.fileUrl || ''
    };
  }

  // Runs on a user object (mutates it). Called automatically the moment a candidate reaches 100%.
  // Idempotent: a candidate who already holds a valid number keeps it.
  function allocateCertificateOnCompletion(user, issuedBy) {
    if (!user || user.role === 'admin' || user.role === 'superadmin') return null;
    if (typeof user.progress !== 'number' || user.progress < 100) return null;
    if (user.accountStatus === 'pending' || user.accountStatus === 'pending_payment') return null;
    // 100% means every module is done (keeps modules in step with progress)
    user.modules = ALL_MODULES_DONE.map(function(n) { return { name: n, status: 'completed' }; });
    if (hasValidCertificate(user)) {
      if (!user.certificateNumber) user.certificateNumber = user.certificate.id || user.certificate.certNumber;
      return user.certificate;
    }
    if (user.certificate && user.certificate.status === 'revoked') return null;   // never silently re-issue a revoked certificate
    var num = generateUniqueCertNumber(user.track, user.email);
    var cert = buildCertificateRecord(user, num, { issuedBy: issuedBy });
    user.certificate = cert;
    user.certificateNumber = num;
    user.issueDate = cert.issueDate;
    user.accountStatus = 'completed';
    user.status = 'completed';
    notifyCourseComplete(user);
    DB.logAuditAction(
      issuedBy || 'System Automated Council',
      'AUTO_ISSUE_CERTIFICATE',
      num,
      'Course completed (100%). Unique certificate number ' + num + ' allocated to ' + user.name,
      user.name + ' (' + user.email + ')'
    );
    return cert;
  }

  // ── One consistent payment status everywhere: exactly 'paid' or 'unpaid' ──
  // (older records had 'PAID', 'UNPAID', 'authorized', 'Pending Payment', ...). A payment reference means paid.
  function normalizePaymentStatus(u) {
    if (!u || u.role === 'admin' || u.role === 'superadmin') return u;
    // `role` is the ACCOUNT type ('student' / 'admin' / 'superadmin'). A job title (e.g. "Security Analyst") used to be
    // written into it at graduation, which made the sync layer treat the student as removed and log them out.
    if (u.role && u.role !== 'student') { if (!u.jobTitle) u.jobTitle = u.role; u.role = 'student'; }
    var raw = String(u.paymentStatus || '').trim().toLowerCase();
    var paid = raw === 'paid' || (!raw && !!u.paymentRef) || (raw !== 'unpaid' && !!u.paymentRef);
    u.paymentStatus = paid ? 'paid' : 'unpaid';
    if (u.invoice && typeof u.invoice === 'object' && u.role !== 'employee') {
      u.invoice.status = paid ? 'PAID' : 'UNPAID';
    }
    return u;
  }

  // Admin decisions (grant access, progress, payment, certificate) carry an `adminTs`. When two devices disagree, the
  // newer admin decision always wins for those fields (see cloud-db.js), so a student's own stale copy can never undo it.
  function stampAdmin(rec) { if (rec) rec.adminTs = Date.now(); return rec; }

  var ALL_MODULES_DONE = [
    'Module 1: Orientation & Core Foundations',
    'Module 2: Lab Setup & Environment Diagnostics',
    'Module 3: Hands-on Case Studies & Practical Labs',
    'Module 4: Mid-Term Evaluation & Milestone Submission',
    'Module 5: Capstone Project & Certification'
  ];

  var DB = {
    hashPassword: hashPassword,

    generateUniqueCertNumber: generateUniqueCertNumber,
    isCertificateNumberTaken: function(num, exceptEmail) { return !!allCertificateNumbers(exceptEmail)[String(num || '').trim().toUpperCase()]; },
    // Gives the candidate a unique number now if they have completed (100%) and have none yet.
    ensureCertificateNumber: function(email, issuedBy) {
      var users = this.getUsers();
      var em = (email || '').trim().toLowerCase();
      for (var i = 0; i < users.length; i++) {
        if (users[i] && users[i].email && users[i].email.toLowerCase() === em) {
          var had = hasValidCertificate(users[i]);
          var cert = allocateCertificateOnCompletion(users[i], issuedBy);
          if (cert && !had) {
            this.saveMasterDB(users);
            var cur = this.getCurrentUser();
            if (cur && cur.email && cur.email.toLowerCase() === em) { var r = Object.assign({}, users[i]); r._sessionExpiry = cur._sessionExpiry; this.setCurrentUser(r); }
          }
          return { success: !!cert, certificate: cert, user: users[i] };
        }
      }
      return { success: false, message: 'Student not found.' };
    },

    _getLockouts: function() { return getStorage(STORAGE_KEYS.LOCKOUTS, {}); },
    _setLockouts: function(d) { setStorage(STORAGE_KEYS.LOCKOUTS, d); },

    _isLocked: function(email) {
      var lockouts = this._getLockouts();
      var rec = lockouts[(email || '').toLowerCase()];
      if (!rec || !rec.lockedUntil) return false;
      if (Date.now() < rec.lockedUntil) return { locked: true, remainingMs: rec.lockedUntil - Date.now() };
      delete lockouts[(email || '').toLowerCase()];
      this._setLockouts(lockouts);
      return false;
    },

    _recordFail: function(email) {
      var lockouts = this._getLockouts();
      var key = (email || '').toLowerCase();
      if (!lockouts[key]) lockouts[key] = { count: 0, lockedUntil: null };
      lockouts[key].count = (lockouts[key].count || 0) + 1;
      var remaining = 5 - lockouts[key].count;
      if (lockouts[key].count >= 5) {
        lockouts[key].lockedUntil = Date.now() + 15 * 60 * 1000;
        lockouts[key].count = 0;
        remaining = 0;
      }
      this._setLockouts(lockouts);
      return remaining;
    },

    _clearFails: function(email) {
      var lockouts = this._getLockouts();
      delete lockouts[(email || '').toLowerCase()];
      this._setLockouts(lockouts);
    },

    // ── Strict Anti-Fake Validation (Email & Phone) ──
    validateEmail: function(email) {
      if (!email || typeof email !== 'string') return { valid: false, message: 'Email address is required.' };
      email = email.trim().toLowerCase();

      var re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!re.test(email)) {
        return { valid: false, message: 'Please enter a valid email address with a proper domain (e.g. name@gmail.com).' };
      }

      var parts = email.split('@');
      var userPart = parts[0];
      var domainPart = parts[1];

      // Block disposable & temporary email domains
      var fakeDomains = [
        'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
        'throwawaymail.com', 'yopmail.com', 'trashmail.com', 'sharklasers.com',
        'dispostable.com', 'fake.com', 'dummy.com', 'temp.com', 'asdf.com',
        'fakemail.com', 'nada.ltd', 'getairmail.com', 'inboxkitten.com'
      ];
      if (fakeDomains.indexOf(domainPart) !== -1) {
        return { valid: false, message: 'Temporary or disposable email addresses are prohibited. Please use a genuine active email address.' };
      }

      // Strict validation for Gmail addresses
      if (domainPart === 'gmail.com') {
        if (userPart.length < 6) {
          return { valid: false, message: 'Invalid Gmail address: Google requires usernames to be at least 6 characters long.' };
        }
        if (!/^[a-zA-Z0-9.]+$/.test(userPart)) {
          return { valid: false, message: 'Gmail username can only contain letters, numbers, and periods.' };
        }
        if (userPart.startsWith('.') || userPart.endsWith('.') || userPart.indexOf('..') !== -1) {
          return { valid: false, message: 'Invalid Gmail format: periods cannot be at the start/end or consecutive.' };
        }
      }

      var tld = domainPart.split('.').pop();
      if (!tld || tld.length < 2) {
        return { valid: false, message: 'Email domain must have a valid top-level domain (.com, .in, .edu, .org).' };
      }

      return { valid: true, email: email };
    },

    validatePhone: function(phone) {
      if (!phone || typeof phone !== 'string') return { valid: false, message: 'Phone number is required.' };

      var clean = phone.replace(/[\s\-\(\)\+]/g, '');
      if (clean.startsWith('91') && clean.length === 12) {
        clean = clean.substring(2);
      } else if (clean.startsWith('0') && clean.length === 11) {
        clean = clean.substring(1);
      }

      // Valid 10-digit Indian mobile starting with 6, 7, 8, or 9
      if (!/^[6-9]\d{9}$/.test(clean)) {
        return { valid: false, message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' };
      }

      // Reject obvious all-same digits (e.g. 9999999999)
      if (/^(\d)\1{9}$/.test(clean)) {
        return { valid: false, message: 'Invalid phone number: all repetitive digits are not permitted.' };
      }

      return { valid: true, phone: '+91 ' + clean.slice(0, 5) + ' ' + clean.slice(5) };
    },

    // ── Audit Logging & Action Ownership Locking ──
    logAuditAction: function(adminEmail, actionType, targetId, details, targetUserName) {
      var logs = getStorage(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
      var entry = {
        ts: Date.now(),
        id: 'LOG-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }),
        adminEmail: adminEmail || 'System',
        actionType: actionType || 'GENERAL_ACTION',
        targetId: targetId || '—',
        targetUser: targetUserName || targetId || '—',
        details: details || ''
      };
      logs.unshift(entry);
      setStorage(STORAGE_KEYS.AUDIT_LOGS, logs);

      // Cloud audit logging
      if (window.YuvantaraCloudDB) {
        window.YuvantaraCloudDB.saveDocument('audit_logs', entry.id, entry);
      }
      return entry;
    },

    getAuditLogs: function() {
      return getStorage(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
    },

    // ── User Management (Operating on Single Unified Master DB) ──
    getUsers: function() {
      return this.getMasterDB();
    },

    getStudents: function() {
      return this.getMasterDB().filter(function(u) { return u && u.role === 'student'; });
    },

    getAdmins: function() {
      return this.getMasterDB().filter(function(u) { return u && u.role === 'admin'; });
    },

    isSuperAdmin: function(email) {
      var u = this.getUserByEmail(email);
      return !!(u && (u.role === 'superadmin' || u.email === 'rocky7061patel@gmail.com'));
    },

    getUserByEmail: function(email) {
      if (!email) return null;
      var users = this.getMasterDB();
      email = email.trim().toLowerCase();
      // A built-in admin / super admin address always resolves to the ADMIN account, even if a student record
      // with the same email exists (e.g. the owner once signed up as a student with that address).
      if (getRemovedAccounts().indexOf(email) === -1) {
        for (var s = 0; s < SEED_USERS.length; s++) {
          var sd = SEED_USERS[s];
          if (sd && sd.email && sd.email.toLowerCase() === email && (sd.role === 'admin' || sd.role === 'superadmin')) {
            for (var k = 0; k < users.length; k++) {
              if (users[k] && users[k].email && users[k].email.toLowerCase() === email && (users[k].role === 'admin' || users[k].role === 'superadmin')) return users[k];
            }
            return sd;
          }
        }
      }
      for (var i = 0; i < users.length; i++) {
        if (users[i] && users[i].email && users[i].email.toLowerCase() === email) return users[i];
      }
      if (getRemovedAccounts().indexOf(email) !== -1) return null;
      for (var j = 0; j < SEED_USERS.length; j++) {
        if (SEED_USERS[j] && SEED_USERS[j].email && SEED_USERS[j].email.toLowerCase() === email) {
          return SEED_USERS[j];
        }
      }
      return null;
    },

    registerStudent: function(data, registeringAdminEmail) {
      if (!data.email || !data.password) {
        return { success: false, message: 'Email and password are required.' };
      }
      var emailVal = this.validateEmail(data.email);
      if (!emailVal.valid) {
        return { success: false, message: emailVal.message };
      }
      if (data.phone) {
        var phoneVal = this.validatePhone(data.phone);
        if (!phoneVal.valid) {
          return { success: false, message: phoneVal.message };
        }
        data.phone = phoneVal.phone;
      }
      if (this.getUserByEmail(data.email)) {
        return { success: false, message: 'An account with this email already exists.' };
      }

      var users = this.getUsers();
      var stuId = 'USR-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
      var todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

      var newStudent = {
        id: stuId,
        name: data.name || 'Student Candidate',
        email: data.email.trim().toLowerCase(),
        passwordHash: hashPassword(data.password),
        phone: data.phone || '',
        dob: data.dob || '',
        track: data.track || 'Cybersecurity & SOC Operations',
        stream: data.stream || 'Engineering / Technology',
        college: data.college || 'NIT Patna',
        role: 'student',
        status: 'active',
        registeredAt: new Date().toISOString().split('T')[0],
        accountStatus: data.accountStatus || 'pending',
        enrolledByAdmin: registeringAdminEmail || 'Self-Registration',
        paymentRef: data.paymentRef || null,
        paymentMethod: data.paymentMethod || null,
        paidAt: data.paidAt || null,
        progress: 0,
        modules: [
          { name: 'Module 1: Orientation & Core Foundations', status: 'pending' },
          { name: 'Module 2: Lab Setup & Environment Diagnostics', status: 'pending' },
          { name: 'Module 3: Hands-on Case Studies & Practical Labs', status: 'pending' },
          { name: 'Module 4: Mid-Term Evaluation & Milestone Submission', status: 'pending' },
          { name: 'Module 5: Capstone Project & Certification', status: 'pending' }
        ],
        certificate: null,
        offerLetter: {
          refNo: 'YUV/HR/INT-2026/' + stuId,
          date: todayStr,
          joiningDate: todayStr,
          track: data.track || 'Cybersecurity & SOC Operations',
          duration: '6 Months',
          college: data.college || 'Affiliated Institution',
          stream: data.stream || 'Engineering & Technology',
          status: 'Confirmed & Active'
        },
        invoice: {
          invNumber: 'INV-2026-' + stuId.replace('USR-', ''),
          date: todayStr,
          amount: 236,
          baseAmount: 200,
          gstAmount: 36,
          sacCode: '9992',
          paymentRef: data.paymentRef || null,
          status: data.paymentRef ? 'PAID' : 'UNPAID'
        }
      };

      var master = this.getMasterDB();
      master.push(newStudent);
      this.saveMasterDB(master);

      this.logAuditAction(
        registeringAdminEmail || 'System',
        'ENROLL_STUDENT',
        newStudent.email,
        'Enrolled ' + newStudent.name + ' in ' + newStudent.track,
        newStudent.name + ' (' + newStudent.email + ')'
      );

      return { success: true, user: newStudent };
    },

    // ── Enroll an existing (logged-in) student in a course/track ──
    // Same outcome as choosing the track on the sign-up form, for people who already have an account.
    //  - not yet paid / activated  -> track is set to the chosen course, status 'pending_payment' (continue to payment page)
    //  - already paid or approved   -> the track is fixed for the account; returns locked:true (or already:true if same track)
    enrollStudentInTrack: function(email, track) {
      track = String(track || '').trim();
      if (!track) return { success: false, message: 'Please choose a course to enroll in.' };
      var u = this.getUserByEmail(email);
      if (!u || u.role === 'admin' || u.role === 'superadmin') return { success: false, message: 'Only student accounts can enroll in a course.' };
      var committed = u.paymentStatus === 'paid' || ['pending', 'active', 'completed'].indexOf(u.accountStatus) !== -1 ||
                      ['active', 'completed'].indexOf(u.status) !== -1;
      if (committed) {
        if ((u.track || '').toLowerCase() === track.toLowerCase()) return { success: true, already: true, user: u };
        return { success: false, locked: true, user: u,
          message: 'You are already enrolled in "' + (u.track || 'an internship track') + '". The track is fixed for each account once payment/approval has started. Please contact admissions at ' + ((window.YUVANTARA_CONFIG && window.YUVANTARA_CONFIG.supportEmail) || 'yuvantara@yuvantaraventure.com') + ' to join another program.' };
      }
      var updated = this.updateStudent(u.email, {
        track: track,
        accountStatus: 'pending_payment',
        status: 'pending_payment',
        enrolledVia: 'login',
        enrolledAt: new Date().toISOString()
      });
      var fresh = this.getUserByEmail(u.email) || u;
      return { success: true, user: fresh, changed: updated && updated.success !== false };
    },

    login: function(email, password) {
      if (!email || !password) return { success: false, message: 'Please provide both email and password.' };
      email = email.trim().toLowerCase();

      var lockCheck = this._isLocked(email);
      if (lockCheck && lockCheck.locked) {
        var mins = Math.ceil(lockCheck.remainingMs / 60000);
        return { success: false, message: '🔒 Account temporarily locked due to too many failed attempts. Try again in ' + mins + ' minute(s).' };
      }

      var user = this.getUserByEmail(email);
      if (!user) {
        this._recordFail(email);
        return { success: false, message: 'No account found with this email address.' };
      }

      // Check if admin is suspended
      if (user.status === 'suspended') {
        return { success: false, message: '⛔ Account Suspended: Your administrative privileges have been revoked by the Super Administrator.' };
      }

      var passwordOk = false;
      var inputHash = hashPassword(password);

      if (user.passwordHash) {
        passwordOk = (user.passwordHash === inputHash);
      } else if (user.password) {
        // Upgrade legacy plaintext to SHA-256 hash
        passwordOk = (user.password === password);
        if (passwordOk) {
          user.passwordHash = inputHash;
          delete user.password;
          this.updateStudent(user.email, { passwordHash: inputHash });
        }
      }

      if (!passwordOk) {
        var rem = this._recordFail(email);
        var msg = 'Incorrect password.';
        if (rem > 0) msg += ' ' + rem + ' attempt(s) remaining before 15-min lockout.';
        else msg += ' Account locked for 15 minutes.';
        return { success: false, message: msg };
      }

      this._clearFails(email);

      // Session with 8-hour expiry
      var sess = Object.assign({}, user);
      delete sess.password;
      delete sess.passwordHash;
      sess._sessionExpiry = Date.now() + (8 * 60 * 60 * 1000);
      this.setCurrentUser(sess);

      return { success: true, user: sess };
    },

    updateStudent: function(email, updates, modifyingAdminEmail) {
      var users = this.getUsers();
      email = (email || '').trim().toLowerCase();
      var updatedUser = null;

      for (var i = 0; i < users.length; i++) {
        if (users[i].email.toLowerCase() === email) {
          for (var key in updates) {
            if (updates.hasOwnProperty(key) && key !== 'id' && key !== 'role' && key !== 'email') {
              users[i][key] = updates[key];
            }
          }
          if (modifyingAdminEmail) {
            users[i].lastModifiedByAdmin = modifyingAdminEmail;
            users[i].lastModifiedAt = new Date().toISOString();
            stampAdmin(users[i]);
          }
          updatedUser = users[i];
          break;
        }
      }

      if (updatedUser) {
        // Automatic unique certificate number the moment the candidate reaches 100%
        allocateCertificateOnCompletion(updatedUser, modifyingAdminEmail);

        this.saveMasterDB(users);
        if (modifyingAdminEmail) {
          this.logAuditAction(
            modifyingAdminEmail,
            'UPDATE_STUDENT',
            email,
            'Modified student record for ' + updatedUser.name
          );
        }
        var curr = this.getCurrentUser();
        if (curr && curr.email.toLowerCase() === email) {
          var refreshed = Object.assign({}, updatedUser);
          refreshed._sessionExpiry = curr._sessionExpiry;
          this.setCurrentUser(refreshed);
        }
        return { success: true, user: updatedUser };
      }
      return { success: false, message: 'User not found.' };
    },

    // ── Super Admin Exclusive Operations ──
    changeAdminPasswordBySuper: function(superEmail, targetAdminEmail, newPassword) {
      if (!this.isSuperAdmin(superEmail)) {
        return { success: false, message: 'Permission Denied: Only Super Admin can change admin passwords.' };
      }

      var target = this.getUserByEmail(targetAdminEmail);
      if (!target || target.role !== 'admin') {
        return { success: false, message: 'Target admin account not found.' };
      }

      if (!newPassword || newPassword.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters.' };
      }

      var users = this.getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].email.toLowerCase() === targetAdminEmail.toLowerCase()) {
          users[i].passwordHash = hashPassword(newPassword);
          delete users[i].password;
          break;
        }
      }
      persistUsers(users);

      this.logAuditAction(
        superEmail,
        'SUPER_CHANGE_ADMIN_PASSWORD',
        targetAdminEmail,
        'Super Admin reset credentials for administrator ' + targetAdminEmail
      );

      return { success: true, message: 'Password successfully updated for ' + targetAdminEmail };
    },

    toggleAdminAccess: function(superEmail, targetAdminEmail, isSuspended) {
      if (!this.isSuperAdmin(superEmail)) {
        return { success: false, message: 'Permission Denied: Only Super Admin can modify admin access.' };
      }

      var target = this.getUserByEmail(targetAdminEmail);
      if (!target || target.role !== 'admin') {
        return { success: false, message: 'Target admin account not found.' };
      }

      var users = this.getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].email.toLowerCase() === targetAdminEmail.toLowerCase()) {
          users[i].status = isSuspended ? 'suspended' : 'active';
          break;
        }
      }
      persistUsers(users);

      this.logAuditAction(
        superEmail,
        isSuspended ? 'SUSPEND_ADMIN_ACCESS' : 'RESTORE_ADMIN_ACCESS',
        targetAdminEmail,
        'Super Admin ' + (isSuspended ? 'SUSPENDED' : 'RESTORED') + ' access for ' + targetAdminEmail
      );

      return { success: true, status: isSuspended ? 'suspended' : 'active' };
    },

    removeAdminBySuper: function(superEmail, targetAdminEmail) {
      if (!this.isSuperAdmin(superEmail)) {
        return { success: false, message: 'Permission Denied: Only Super Admin can remove administrators.' };
      }

      var target = this.getUserByEmail(targetAdminEmail);
      if (!target || target.role !== 'admin') {
        return { success: false, message: 'Target admin account not found (Super Admin and student accounts cannot be removed here).' };
      }

      var tgt = targetAdminEmail.trim().toLowerCase();
      var users = this.getUsers().filter(function(u) { return u.email.toLowerCase() !== tgt; });
      persistUsers(users);

      var removed = getRemovedAccounts();
      if (removed.indexOf(tgt) === -1) removed.push(tgt);
      setStorage('yuvantara_removed_accounts', removed);

      this.logAuditAction(
        superEmail,
        'REMOVE_ADMIN',
        targetAdminEmail,
        'Super Admin permanently deleted admin account ' + targetAdminEmail
      );

      return { success: true };
    },

    // ── Certificate Operations with Locked Admin Attribution ──
    assignCertificate: function(email, certData, issuingAdminEmail) {
      var student = this.getUserByEmail(email);
      if (!student) return { success: false, message: 'Student not found.' };

      var certNumber = certData.certNumber || certData.id || generateUniqueCertNumber(student.track, student.email);
      if (this.isCertificateNumberTaken(certNumber, student.email)) {
        return { success: false, message: 'Certificate number ' + certNumber + ' is already assigned to another candidate.' };
      }
      var issueDate = certData.date || certData.issueDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      var certificate = {
        certNumber: certNumber,
        id: certNumber,
        name: student.name,
        domain: student.track,
        dob: student.dob || '',
        email: student.email,
        phone: student.phone || '',
        date: issueDate,
        issueDate: issueDate,
        title: certData.title || (student.track + ' Industrial Internship'),
        duration: certData.duration || '6 Months (Jan 2026 – Jun 2026)',
        grade: certData.grade || 'Grade A+ (Distinction)',
        authority: certData.authority || 'Yuvantara Academic & Cyber Defense Council',
        status: 'Valid & Verified',
        issuedByAdmin: issuingAdminEmail || 'System',
        issuedAt: new Date().toISOString(),
        qrCodeUrl: 'https://yuvantaraventure.com/verify-certificate/index.html?id=' + encodeURIComponent(certNumber),
        fileUrl: certData.fileUrl || ''
      };

      this.logAuditAction(
        issuingAdminEmail || 'System',
        'ISSUE_CERTIFICATE',
        certificate.certNumber,
        'Issued official certificate ' + certificate.certNumber + ' to ' + student.name,
        student.name + ' (' + student.email + ')'
      );

      return this.updateStudent(email, {
        certificate: certificate,
        progress: 100
      }, issuingAdminEmail);
    },

    generateCertificateForStudent: function(email, confirmedName, confirmedCollege, issuingAdminEmail) {
      var users = this.getUsers();
      email = (email || '').trim().toLowerCase();
      var student = null;
      for (var i = 0; i < users.length; i++) {
        if (users[i].email.toLowerCase() === email) {
          student = users[i];
          break;
        }
      }
      if (!student) return { success: false, message: 'Student not found.' };

      var cleanName = ((issuingAdminEmail && confirmedName) ? confirmedName : (student.name || 'Candidate')).trim();   // students cannot change the name printed on their certificate
      var cleanCollege = (confirmedCollege || student.college || 'Engineering Institute').trim();

      var certId = hasValidCertificate(student) ? (student.certificate.id || student.certificate.certNumber) : generateUniqueCertNumber(student.track, student.email);
      var todayFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      var cert = {
        certNumber: certId,
        id: certId,
        name: cleanName,
        college: cleanCollege,
        domain: student.track,
        dob: student.dob || '',
        email: student.email,
        phone: student.phone || '',
        date: todayFormatted,
        issueDate: todayFormatted,
        title: (student.track || 'Industrial') + ' Industrial Internship',
        duration: '6 Months (Jan 2026 – Jun 2026)',
        grade: 'Grade A+ (Distinction)',
        authority: 'Yuvantara Academic & Cyber Defense Council',
        status: 'Valid & Verified',
        issuedByAdmin: issuingAdminEmail || student.enrolledByAdmin || 'adk_01@admin',
        issuedAt: new Date().toISOString(),
        qrCodeUrl: 'https://yuvantaraventure.com/verify-certificate/index.html?id=' + encodeURIComponent(certId),
        fileUrl: ''
      };

      student.name = cleanName;
      student.college = cleanCollege;
      student.progress = 100;
      student.certificate = cert;
      student.certificateNumber = certId;
      student.issueDate = todayFormatted;
      student.accountStatus = 'completed';
      student.status = 'completed';
      notifyCourseComplete(student);
      student.lastModifiedAt = new Date().toISOString();
      student.lastModifiedByAdmin = issuingAdminEmail || 'Candidate Pre-Mint Verification';

      persistUsers(users);

      var curr = this.getCurrentUser();
      if (curr && curr.email.toLowerCase() === email) {
        curr.name = cleanName;
        curr.college = cleanCollege;
        curr.progress = 100;
        curr.certificate = cert;
        this.setCurrentUser(curr);
      }

      this.logAuditAction(
        issuingAdminEmail || 'Candidate Pre-Mint Verification',
        'ISSUE_CERTIFICATE',
        certId,
        'Minted verified certificate ' + certId + ' with verified candidate name: ' + cleanName + ' (' + cleanCollege + ')',
        cleanName + ' (' + email + ')'
      );

      // 1. Save into All Employees category across all 7 database replicas for public verification
      var employees = this.getAllEmployees();
      var empRecord = {
        id: 'EMP-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
        name: cleanName,
        email: student.email,
        phone: student.phone || '',
        dob: student.dob || '',
        role: (student.track ? student.track.split(' ')[0] : 'Engineering') + ' Specialist',
        domain: student.track || 'Industrial Internship',
        college: cleanCollege,
        stream: student.stream || '',
        certificateNumber: certId,
        issueDate: todayFormatted,
        grade: 'Grade A+ (Distinction)',
        duration: '6 Months Industrial Internship',
        authority: 'Yuvantara Academic & Cyber Defense Council',
        verificationUrl: 'https://yuvantaraventure.com/verify-certificate/index.html?id=' + encodeURIComponent(certId),
        status: 'completed',
        approvedByAdmin: issuingAdminEmail || student.enrolledByAdmin || 'Admissions Council',
        approvedAt: new Date().toISOString().split('T')[0]
      };
      var empIdx = employees.findIndex(function(e) { return e.email && e.email.toLowerCase() === email; });
      if (empIdx !== -1) {
        employees[empIdx] = empRecord;
      } else {
        employees.unshift(empRecord);
      }
      setStorage(STORAGE_KEYS.ALL_EMPLOYEES, employees);

      // 2. Also update in current_interns if present
      var interns = this.getCurrentInterns();
      var intIdx = interns.findIndex(function(i) { return i.email && i.email.toLowerCase() === email; });
      if (intIdx !== -1) {
        interns[intIdx].progress = 100;
        interns[intIdx].certificate = cert;
        setStorage(STORAGE_KEYS.CURRENT_INTERNS, interns);
      }

      // 3. Atomically update all 7 database replicas together
      this.syncAllReplicas();

      return { success: true, user: student, certificate: cert };
    },

    revokeCertificate: function(email, revokingAdminEmail) {
      var student = this.getUserByEmail(email);
      if (!student) return { success: false, message: 'Student not found.' };

      var dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      var cert = student.certificate || {};
      cert.status = 'revoked';
      cert.revokedAt = dateStr;
      cert.revokedByAdmin = revokingAdminEmail || 'System';

      this.logAuditAction(
        revokingAdminEmail || 'System',
        'REVOKE_CERTIFICATE',
        cert.certNumber || cert.id || student.email,
        'Revoked certificate for ' + student.name,
        student.name + ' (' + student.email + ')'
      );

      return this.updateStudent(email, { certificate: cert }, revokingAdminEmail);
    },

    // Session Management
    getCurrentUser: function() {
      var user = getStorage(STORAGE_KEYS.CURRENT_USER, null);
      if (!user) return null;
      if (user._sessionExpiry && Date.now() > user._sessionExpiry) {
        this.logout();
        return null;
      }
      return user;
    },

    setCurrentUser: function(user) {
      if (!user) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      } else {
        var safe = Object.assign({}, user);
        delete safe.password;
        delete safe.passwordHash;
        setStorage(STORAGE_KEYS.CURRENT_USER, safe);
      }
    },

    logout: function() {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    },

    // ── Unified Single Master Database & 7-Replica Synchronization Engine ──
    initMasterDB: initMasterDB,

    getMasterDB: function() {
      var master = getStorage(STORAGE_KEYS.MASTER_DB, null);
      if (!master || !Array.isArray(master) || master.length === 0) {
        master = initMasterDB();
      }
      master.forEach(normalizePaymentStatus);
      return master;
    },

    saveMasterDB: function(records, opts) {
      if (!Array.isArray(records)) return;
      opts = opts || {};
      records.forEach(normalizePaymentStatus);
      var previous = getStorage(STORAGE_KEYS.MASTER_DB, []) || [];
      if (!opts.fromCloud) {
        // Stamp every record that actually changed so the newest edit wins when devices sync.
        var prevByEmail = {};
        previous.forEach(function(u) { if (u && u.email) prevByEmail[u.email.toLowerCase()] = JSON.stringify(u); });
        var now = Date.now();
        records.forEach(function(u) {
          if (!u || !u.email) return;
          var before = prevByEmail[u.email.toLowerCase()];
          if (before === undefined) { u._ts = now; return; }
          var snapshot = JSON.parse(before);
          var cmp = JSON.stringify(Object.assign({}, u, { _ts: snapshot._ts }));
          if (cmp !== before) u._ts = now;
        });
      }
      setStorage(STORAGE_KEYS.MASTER_DB, records);
      setStorage(STORAGE_KEYS.USERS, records);
      // Synchronize backward-compatible filtered views
      setStorage(STORAGE_KEYS.NEW_REGISTRATIONS, this.getNewRegistrations());
      setStorage(STORAGE_KEYS.CURRENT_INTERNS, this.getCurrentInterns());
      setStorage(STORAGE_KEYS.ALL_EMPLOYEES, this.getAllEmployees());
      setStorage(STORAGE_KEYS.APPLICATIONS, this.getNewRegistrations());
      if (!opts.fromCloud && window.YuvantaraCloudDB && typeof window.YuvantaraCloudDB.queuePush === 'function') {
        window.YuvantaraCloudDB.queuePush(previous, records);
      }
    },

    // Resolves once the latest cloud data (if cloud sync is configured) has been merged locally.
    ensureFresh: function(maxAgeMs) {
      var c = window.YuvantaraCloudDB;
      if (c && c.isConfigured && c.isConfigured() && typeof c.pullAndMerge === 'function') {
        return c.pullAndMerge(typeof maxAgeMs === 'number' ? maxAgeMs : undefined).catch(function() { return null; });
      }
      return Promise.resolve(null);
    },

    // Login that first pulls fresh accounts (so a user registered on another device can sign in here).
    // The built-in Super Admin address is verified by the SERVER once its password has been reset by email OTP.
    loginAsync: function(email, password) {
      var self = this;
      var em = String(email || '').trim().toLowerCase();
      if (em && SEED_USERS.some(function(u) { return u && u.role === 'superadmin' && String(u.email).toLowerCase() === em; })) {
        return this._loginSuperAdmin(em, password);
      }
      return this.ensureFresh(60000).then(function() { return self.login(email, password); });
    },

    // Opens a session for an account whose password was already verified elsewhere (the server, for the super admin).
    _grantSession: function(email) {
      var user = this.getUserByEmail(email);
      if (!user) return { success: false, message: 'No account found with this email address.' };
      if (user.status === 'suspended') return { success: false, message: '⛔ Account Suspended: Your administrative privileges have been revoked by the Super Administrator.' };
      this._clearFails(email);
      var sess = Object.assign({}, user);
      delete sess.password; delete sess.passwordHash;
      sess._sessionExpiry = Date.now() + (8 * 60 * 60 * 1000);
      this.setCurrentUser(sess);
      return { success: true, user: sess };
    },

    // Super Admin sign-in.
    //   server says "override:false" (password never reset)  -> built-in password check, as before
    //   server says "override:true"                          -> the server's answer is final (the built-in password no longer works)
    //   server unreachable                                   -> built-in check, UNLESS this browser has already seen a reset, then it
    //                                                           refuses (the server may just be waking up on a free hosting plan)
    _loginSuperAdmin: function(email, password) {
      var self = this;
      var FLAG = 'yuv_super_pw_reset';
      function flag(v) { try { if (v === null) localStorage.removeItem(FLAG); else localStorage.setItem(FLAG, v); } catch (e) {} }
      function seenReset() { try { return localStorage.getItem(FLAG) === '1'; } catch (e) { return false; } }
      function builtIn() { return self.login(email, password); }
      if (!email || !password) return Promise.resolve(builtIn());
      var c = window.YUVANTARA_CONFIG || {};
      var base = (c.api && c.api.baseUrl) || '/api';
      var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = ctl ? setTimeout(function() { ctl.abort(); }, 30000) : null;   // free hosting can take ~30 s to wake up
      return fetch(base + '/admin/super/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }), signal: ctl ? ctl.signal : undefined
      }).then(function(res) {
        if (timer) clearTimeout(timer);
        return res.json().then(function(d) { return { status: res.status, d: d || {} }; });
      }).then(function(r) {
        if (r.status === 429 && r.d && r.d.locked) return { success: false, message: r.d.error };
        if (!r.d || r.d.success !== true) throw new Error('bad response');
        if (!r.d.override) { flag(null); return builtIn(); }
        flag('1');
        if (r.d.valid) return self._grantSession(email);
        return { success: false, message: 'Incorrect password.' + (typeof r.d.attemptsRemaining === 'number' ? ' ' + r.d.attemptsRemaining + ' attempt(s) remaining before a 15-minute lockout.' : '') };
      }).catch(function() {
        if (timer) clearTimeout(timer);
        if (seenReset()) return { success: false, message: 'Could not reach the server to verify your password. It may be waking up - please wait a minute and try again.' };
        return builtIn();
      });
    },

    syncAllReplicas: function() {
      // 1 Master Database: Legacy replica sync eliminated
      return { master_db_count: this.getMasterDB().length, status: 'Single Master Database Active' };
    },

    // ── Category 1: New Registrations (Querying Unified Master DB) ──
    getNewRegistrations: function() {
      return this.getMasterDB().filter(function(u) {
        if (!u || u.role === 'admin' || u.role === 'superadmin') return false;
        // Once approved (active) or graduated (completed) or has certificate, MUST NOT be in pending registrations!
        if (u.accountStatus === 'active' || u.status === 'active' || u.accountStatus === 'completed' || u.status === 'completed' || u.certificateNumber) {
          return false;
        }
        return (u.accountStatus === 'pending' || u.accountStatus === 'pending_payment' || u.paymentStatus === 'unpaid' || u.status === 'pending');
      });
    },

    submitNewRegistration: function(data) {
      if (data.email) {
        var emailVal = this.validateEmail(data.email);
        if (!emailVal.valid) return { success: false, message: emailVal.message };
        data.email = emailVal.email;
      }
      if (data.phone) {
        var phoneVal = this.validatePhone(data.phone);
        if (!phoneVal.valid) return { success: false, message: phoneVal.message };
        data.phone = phoneVal.phone;
      }

      var email = (data.email || '').trim().toLowerCase();
      var master = this.getMasterDB();
      var idx = master.findIndex(function(r) { return r && r.email && r.email.toLowerCase() === email; });

      if (idx !== -1 && data.rejectIfExists) {
        return { success: false, message: 'An account or registration with this email already exists.' };
      }

      // Password rules: an existing account keeps its current password hash (re-submitting a
      // registration/payment must never overwrite credentials). A brand-new record without a
      // password gets a random unusable hash instead of the old shared default "student123".
      var resolvedHash;
      if (idx !== -1 && master[idx].passwordHash) {
        resolvedHash = master[idx].passwordHash;
      } else if (data.password) {
        if (data.password.length < 8 || !/[0-9]/.test(data.password)) {
          return { success: false, message: 'Password must be at least 8 characters and include a number.' };
        }
        resolvedHash = hashPassword(data.password);
      } else if (data.passwordHash) {
        resolvedHash = data.passwordHash;
      } else {
        var rnd = new Uint32Array(4);
        (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(rnd) : rnd.forEach(function(_, i) { rnd[i] = Math.floor(Math.random() * 4294967295); });
        resolvedHash = hashPassword('UNSET-' + Array.prototype.join.call(rnd, '-'));
      }

      var isPaid = data.paymentStatus === 'paid' || !!data.paymentRef;
      var record = {
        id: data.id || (idx !== -1 && master[idx].id ? master[idx].id : ('REG-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900))),
        name: data.name || (idx !== -1 ? master[idx].name : 'Student Candidate'),
        email: email,
        phone: data.phone || (idx !== -1 ? master[idx].phone : ''),
        dob: data.dob || (idx !== -1 ? master[idx].dob : ''),
        track: data.track || (idx !== -1 ? master[idx].track : ''),   // no default course: the student picks one after signing up
        stream: data.stream || (idx !== -1 ? master[idx].stream : ''),
        college: data.college || (idx !== -1 ? master[idx].college : ''),
        role: 'student',
        passwordHash: resolvedHash,
        registeredAt: data.registeredAt || (idx !== -1 && master[idx].registeredAt ? master[idx].registeredAt : new Date().toISOString().split('T')[0]),
        paymentStatus: isPaid ? 'paid' : (data.paymentStatus || 'unpaid'),
        paymentAmount: isPaid ? (data.paymentAmount || 236) : 0,
        paymentRef: data.paymentRef || (idx !== -1 ? master[idx].paymentRef : null),
        paymentMethod: data.paymentMethod || (idx !== -1 ? master[idx].paymentMethod : null),
        paidAt: data.paidAt || (isPaid ? new Date().toISOString().split('T')[0] : null),
        accountStatus: data.accountStatus || (isPaid ? 'pending' : 'pending_payment'),
        status: data.accountStatus || (isPaid ? 'pending' : 'pending_payment'),
        progress: idx !== -1 && typeof master[idx].progress === 'number' ? master[idx].progress : 0,
        modules: idx !== -1 && master[idx].modules ? master[idx].modules : []
      };

      if (idx !== -1) {
        // A student who was already approved (active) or has graduated must never be pushed back to "pending"
        // just because they pay / re-submit later.
        var prevState = master[idx].accountStatus;
        if (prevState === 'active' || prevState === 'completed') { record.accountStatus = prevState; record.status = prevState; }
        master[idx] = Object.assign({}, master[idx], record);
      } else {
        master.unshift(record);
      }

      // Save to Single Unified Master Database
      this.saveMasterDB(master);

      return { success: true, app: record, registration: record, applicant: record };
    },

    // ── Category 2: Current Interns (Querying Unified Master DB) ──
    getCurrentInterns: function() {
      return this.getMasterDB().filter(function(u) {
        if (!u || u.role === 'admin' || u.role === 'superadmin') return false;
        return (u.accountStatus === 'active' || u.status === 'active') && (!u.certificateNumber && (typeof u.progress !== 'number' || u.progress < 100));
      });
    },

    // Admin verifies a payment: flips a student between 'paid' and 'unpaid' and keeps every related field consistent
    // (reference, amount, date, invoice, and the pending/pending_payment account state).
    setPaymentStatus: function(idOrEmail, status, adminEmail) {
      status = String(status || '').trim().toLowerCase();
      if (status !== 'paid' && status !== 'unpaid') return { success: false, message: 'Payment status must be "paid" or "unpaid".' };
      var idLow = String(idOrEmail || '').trim().toLowerCase();
      var master = this.getMasterDB();
      var idx = master.findIndex(function(u) {
        return u && u.role !== 'admin' && u.role !== 'superadmin' &&
          ((u.id && String(u.id).toLowerCase() === idLow) || (u.email && String(u.email).toLowerCase() === idLow));
      });
      if (idx === -1) return { success: false, message: 'Student record not found.' };
      var rec = master[idx];
      var today = new Date().toISOString().split('T')[0];
      if (status === 'paid') {
        rec.paymentStatus = 'paid';
        rec.paymentAmount = rec.paymentAmount || 236;
        rec.paymentRef = rec.paymentRef || ('ADMIN-' + Date.now().toString(36).toUpperCase());
        rec.paymentMethod = rec.paymentMethod || 'Verified by admin';
        rec.paidAt = rec.paidAt || today;
        if (rec.accountStatus === 'pending_payment') { rec.accountStatus = 'pending'; rec.status = 'pending'; }
      } else {
        rec.paymentStatus = 'unpaid';
        rec.paymentAmount = 0;
        rec.paymentRef = null;
        rec.paymentMethod = null;
        rec.paidAt = null;
        if (rec.accountStatus === 'pending') { rec.accountStatus = 'pending_payment'; rec.status = 'pending_payment'; }
      }
      if (rec.invoice && typeof rec.invoice === 'object') rec.invoice.paymentRef = rec.paymentRef || null;
      rec.paymentVerifiedBy = adminEmail || 'Admin';
      rec.paymentVerifiedAt = today;
      normalizePaymentStatus(rec);
      stampAdmin(rec);
      master[idx] = rec;
      this.saveMasterDB(master);

      var sessionUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
      if (sessionUser && sessionUser.email && sessionUser.email.toLowerCase() === String(rec.email).toLowerCase()) {
        var refreshed = Object.assign({}, rec);
        refreshed._sessionExpiry = sessionUser._sessionExpiry;
        setStorage(STORAGE_KEYS.CURRENT_USER, refreshed);
      }
      this.logAuditAction(adminEmail || 'System Admin', 'VERIFY_PAYMENT', rec.id,
        'Payment marked ' + status.toUpperCase() + ' for ' + rec.name, rec.name + ' (' + rec.email + ')');
      return { success: true, user: rec };
    },

    // Move from New Registrations to Current Interns upon Authority Verification (in 1 Single DB)
    verifyAndApproveRegistration: function(regId, approvingAdminEmail) {
      var master = this.getMasterDB();
      var idClean = (regId || '').toString().trim().toLowerCase();
      var idx = master.findIndex(function(r) {
        return r && (
          (r.id && r.id.toString().trim().toLowerCase() === idClean) ||
          (r.email && r.email.toString().trim().toLowerCase() === idClean)
        );
      });
      if (idx === -1) {
        return { success: false, message: 'Registration record not found in master database.' };
      }

      var reg = master[idx];
      reg.accountStatus = 'active';
      reg.status = 'active';
      reg.approvedByAdmin = approvingAdminEmail || 'Admin Authority';
      reg.approvedAt = new Date().toISOString().split('T')[0];
      reg.enrolledAt = reg.approvedAt;
      normalizePaymentStatus(reg);   // payment status stays 'paid' / 'unpaid' - granting access never changes it
      stampAdmin(reg);
      if (typeof reg.progress !== 'number' || reg.progress === 0) {
        reg.progress = 20; // 20% initial progress upon access grant
      }
      if (!reg.modules || reg.modules.length === 0) {
        reg.modules = [
          { name: 'Module 1: Orientation & Foundations', status: 'completed' },
          { name: 'Module 2: Practical Lab Implementations', status: 'in_progress' },
          { name: 'Module 3: Project Architecture & Execution', status: 'pending' },
          { name: 'Module 4: Mid-Term Assessment', status: 'pending' },
          { name: 'Module 5: Capstone Review & Final Submission', status: 'pending' }
        ];
      }
      master[idx] = reg;
      this.saveMasterDB(master);

      // Synchronize active session user if currently logged in
      var sessionUser = getStorage(STORAGE_KEYS.CURRENT_USER, null);
      if (sessionUser && sessionUser.email && sessionUser.email.toLowerCase() === reg.email.toLowerCase()) {
        sessionUser.accountStatus = 'active';
        sessionUser.status = 'active';
        sessionUser.progress = reg.progress;
        sessionUser.modules = reg.modules;
        sessionUser.paymentStatus = reg.paymentStatus;
        sessionUser.approvedByAdmin = reg.approvedByAdmin;
        setStorage(STORAGE_KEYS.CURRENT_USER, sessionUser);
      }

      // Log which admin authorized it
      this.logAuditAction(
        approvingAdminEmail || 'System Admin',
        'VERIFY_AND_AUTHORIZE_INTERN',
        reg.id,
        'Authorized registration ' + reg.id + ' for ' + reg.name + ' and moved to Current Interns (Progress Active)',
        reg.name + ' (' + reg.email + ')'
      );

      return { success: true, intern: reg };
    },

    updateIntern: function(idOrEmail, updates, modifyingAdminEmail) {
      if (!idOrEmail) return { success: false, message: 'Intern identifier required.' };
      var idLow = idOrEmail.toString().trim().toLowerCase();
      var master = this.getMasterDB();
      var target = null;

      for (var i = 0; i < master.length; i++) {
        if (master[i] && ((master[i].id && master[i].id.toLowerCase() === idLow) || (master[i].email && master[i].email.toLowerCase() === idLow))) {
          for (var k in updates) {
            if (updates.hasOwnProperty(k) && k !== 'id' && k !== 'email') {
              master[i][k] = updates[k];
            }
          }
          if (modifyingAdminEmail) {
            master[i].lastModifiedByAdmin = modifyingAdminEmail;
            master[i].lastModifiedAt = new Date().toISOString();
            stampAdmin(master[i]);
          }
          target = master[i];
          break;
        }
      }

      if (target) {
        allocateCertificateOnCompletion(target, modifyingAdminEmail);
        this.saveMasterDB(master);

        this.logAuditAction(
          modifyingAdminEmail || 'System Admin',
          'UPDATE_INTERN_PROGRESS',
          target.id,
          'Updated progress to ' + target.progress + '% for ' + target.name,
          target.name + ' (' + target.email + ')'
        );

        return { success: true, intern: target };
      }
      return { success: false, message: 'Intern not found.' };
    },

    // ── Category 3: All Employees (Querying Unified Master DB) ──
    getAllEmployees: function() {
      return this.getMasterDB().filter(function(u) {
        if (!u || u.role === 'admin' || u.role === 'superadmin') return false;
        return u.certificateNumber || u.accountStatus === 'completed' || u.status === 'completed' || (typeof u.progress === 'number' && u.progress >= 100) || u.role === 'employee';
      });
    },

    resetEmployeeDatabaseToNill: function() {
      var master = this.getMasterDB();
      master = master.filter(function(u) {
        if (!u) return false;
        var isEmp = !!(u.certificateNumber || u.role === 'employee' || u.accountStatus === 'completed' || u.status === 'completed');
        return !isEmp;
      });
      setStorage(STORAGE_KEYS.ALL_EMPLOYEES, []);
      this.saveMasterDB(master);
      return { success: true, count: 0, message: 'Employee database successfully reset to NILL.' };
    },

    graduateToEmployee: function(emailOrId, certData, approvingAdminEmail) {
      certData = certData || {};
      var master = this.getMasterDB();
      var idLow = (emailOrId || '').toString().toLowerCase().trim();
      var idx = master.findIndex(function(i) {
        return i && (
          (i.email && i.email.toLowerCase() === idLow) ||
          (i.id && i.id.toLowerCase() === idLow)
        );
      });
      if (idx === -1) return { success: false, message: 'Intern not found in master database.' };

      var intern = master[idx];
      var existingNum = hasValidCertificate(intern) ? (intern.certificate.id || intern.certificate.certNumber) : '';
      var certNum = (certData.certNumber || existingNum || generateUniqueCertNumber(intern.track, intern.email)).toString().trim();
      if (this.isCertificateNumberTaken(certNum, intern.email)) {
        return { success: false, message: 'Certificate number ' + certNum + ' is already assigned to another candidate. Please use a different number.' };
      }
      var dateStr = certData.issueDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      intern.certificateNumber = certNum;
      intern.certificate = buildCertificateRecord(intern, certNum, {
        issueDate: dateStr,
        grade: certData.grade,
        title: certData.title,
        duration: certData.duration,
        authority: certData.authority,
        issuedBy: approvingAdminEmail || 'Admin Authority'
      });
      intern.progress = 100;
      intern.modules = ALL_MODULES_DONE.map(function(n) { return { name: n, status: 'completed' }; });   // progress must not stay at the initial 20% state
      intern.issueDate = dateStr;
      intern.accountStatus = 'completed';
      intern.status = 'completed';
      notifyCourseComplete(intern);
      intern.jobTitle = certData.role || (intern.track ? intern.track.split(' ')[0] + ' Specialist' : 'Specialist');
      intern.role = 'student';   // account type never changes (the job title lives in jobTitle)
      intern.grade = intern.certificate.grade;
      intern.duration = '6 Months Industrial Internship';
      intern.authority = 'Yuvantara Academic & Skill Council';
      intern.verificationUrl = 'https://yuvantaraventure.com/verify-certificate/?id=' + encodeURIComponent(certNum);
      intern.approvedByAdmin = approvingAdminEmail || 'Admin Authority';
      intern.approvedAt = new Date().toISOString().split('T')[0];
      stampAdmin(intern);

      master[idx] = intern;
      this.saveMasterDB(master);

      // Keep a logged-in session for this candidate in step (progress, modules, certificate)
      var gSess = getStorage(STORAGE_KEYS.CURRENT_USER, null);
      if (gSess && gSess.email && gSess.email.toLowerCase() === intern.email.toLowerCase()) {
        var refreshed = Object.assign({}, intern);
        refreshed._sessionExpiry = gSess._sessionExpiry;
        setStorage(STORAGE_KEYS.CURRENT_USER, refreshed);
      }

      // Log in audit trail
      this.logAuditAction(
        approvingAdminEmail || 'System Admin',
        'GRADUATE_TO_ALL_EMPLOYEES',
        certNum,
        'Graduated intern ' + intern.name + ' to All Employees with Certificate ' + certNum + ' (Unified 1 DB)',
        intern.name + ' (' + intern.email + ')'
      );

      return { success: true, employee: intern, certificateNumber: certNum };
    },

    verifyCertificate: function(certId) {
      if (!certId) return { found: false, message: 'Certificate ID is required' };
      var idClean = certId.toString().trim().toUpperCase();
      var records = this.getMasterDB();
      for (var i = 0; i < records.length; i++) {
        var emp = records[i];
        if (!emp || emp.role === 'admin' || emp.role === 'superadmin') continue;
        var cNum = (emp.certificate && (emp.certificate.id || emp.certificate.certNumber)) || emp.certificateNumber;
        if (cNum && cNum.toString().trim().toUpperCase() === idClean) {
          return {
            found: true,
            data: {
              name: emp.name,
              course: (emp.certificate && emp.certificate.title) || emp.track || 'Industrial Internship Program',
              certificateNumber: cNum,
              date: (emp.certificate && (emp.certificate.issueDate || emp.certificate.date)) || emp.issueDate || '2026',
              grade: (emp.certificate && emp.certificate.grade) || emp.grade || 'Grade A+ (Distinction)',
              status: (emp.certificate && emp.certificate.status) || emp.status || 'valid',
              revokedAt: emp.certificate ? emp.certificate.revokedAt : null
            }
          };
        }
      }
      return { found: false, message: 'Certificate not found in registry.' };
    },

    // ── Atomic Multi-Replica Deletion (from 1 Single Master DB) ──
    deleteRecord: function(category, id, adminEmail) {
      var master = this.getMasterDB();
      var idLow = id.toString().trim().toLowerCase();
      var idx = master.findIndex(function(u) {
        return u && (
          (u.id && u.id.toLowerCase() === idLow) ||
          (u.email && u.email.toLowerCase() === idLow) ||
          (u.certificateNumber && u.certificateNumber.toLowerCase() === idLow)
        );
      });

      if (idx !== -1) {
        var deletedItem = master.splice(idx, 1)[0];
        this.saveMasterDB(master);   // cloud queue sees the removal and writes a tombstone

        this.logAuditAction(
          adminEmail || 'System Admin',
          'DELETE_RECORD',
          id,
          'Deleted record: ' + deletedItem.name + ' (' + deletedItem.email + ') from master database',
          deletedItem.name + ' (' + deletedItem.email + ')'
        );

        return { success: true, message: 'Record deleted from master database.' };
      }

      return { success: false, message: 'Record not found in master database.' };
    },

    getReplicasMetadata: function() {
      return [];
    },

    // Applications with Locked Admin Attribution (Backward-compat alias for new registrations)
    getApplications: function() {
      return this.getNewRegistrations();
    },

    submitApplication: function(data) {
      return this.submitNewRegistration(data);
    },

    saveApplication: function(data) {
      return this.submitNewRegistration(data);
    },

    getCertificateByNumber: function(certNum) {
      if (!certNum) return null;
      certNum = certNum.trim().toUpperCase();

      // 1. Check all_employees category
      var employees = this.getAllEmployees();
      for (var j = 0; j < employees.length; j++) {
        var emp = employees[j];
        if (emp.certificateNumber && emp.certificateNumber.toUpperCase() === certNum) {
          return {
            name: emp.name,
            course: emp.domain || emp.jobTitle || emp.track,
            duration: emp.duration || '6 Months Industrial Internship',
            grade: emp.grade || 'Grade A+ (Distinction)',
            date: emp.issueDate,
            college: emp.college,
            status: emp.status === 'revoked' ? 'revoked' : 'valid',
            authority: emp.authority || 'Yuvantara Academic & Skill Council',
            id: emp.certificateNumber,
            certNumber: emp.certificateNumber
          };
        }
      }

      // 2. Check current_interns
      var interns = this.getCurrentInterns();
      for (var k = 0; k < interns.length; k++) {
        var intn = interns[k];
        if (intn.certificate && (intn.certificate.certNumber === certNum || intn.certificate.id === certNum)) {
          return intn.certificate;
        }
      }

      var students = this.getStudents();
      for (var i = 0; i < students.length; i++) {
        var c = students[i].certificate;
        if (c && (c.certNumber === certNum || c.id === certNum)) {
          return c;
        }
      }
      return null;
    },

    // ── DOB & Captcha Based Identity Verification for Password Reset ──
    // Only student accounts can self-reset, and ONLY when a DOB is on record and matches.
    // (Previously an account with no DOB on file passed verification with just an email,
    //  which let anyone reset the password of any admin/super-admin account.)
    verifyUserForReset: function(email, dob) {
      if (!email || !dob) {
        return { success: false, message: 'Please provide both your registered email address and Date of Birth.' };
      }
      email = email.trim().toLowerCase();
      dob = dob.trim();
      var user = this.getUserByEmail(email);
      // Same message for unknown / non-student accounts so account existence is not revealed
      var generic = { success: false, message: 'We could not verify these details. Please check your email and Date of Birth, or contact support.' };
      if (!user || user.role === 'admin' || user.role === 'superadmin') return generic;
      if (user.status === 'suspended') return generic;
      if (!user.dob || user.dob !== dob) return generic;
      var safe = Object.assign({}, user);
      delete safe.passwordHash;
      delete safe.password;
      return { success: true, user: safe };
    },

    resetPassword: function(email, newPassword) {
      if (!email || !newPassword || newPassword.length < 8 || !/[0-9]/.test(newPassword)) {
        return { success: false, message: 'Password must be at least 8 characters and include a number.' };
      }
      email = email.trim().toLowerCase();
      var users = this.getUsers();
      var found = false;
      for (var i = 0; i < users.length; i++) {
        if (users[i].email.toLowerCase() === email) {
          if (users[i].role === 'admin' || users[i].role === 'superadmin') {
            return { success: false, message: 'Administrator passwords can only be reset by the Super Administrator.' };
          }
          users[i].passwordHash = hashPassword(newPassword);
          delete users[i].password;
          found = true;
          break;
        }
      }
      if (!found) {
        return { success: false, message: 'Account not found.' };
      }
      persistUsers(users);
      this._clearFails(email);
      this.logAuditAction('System', 'RESET_PASSWORD', email, 'Password reset verified via DOB & Captcha');
      return { success: true };
    },

    // Logged-in user changes their own password (was called by the portal but never defined)
    changePassword: function(email, currentPassword, newPassword) {
      if (!email || !currentPassword || !newPassword) {
        return { success: false, message: 'Please fill in all password fields.' };
      }
      if (newPassword.length < 8 || !/[0-9]/.test(newPassword)) {
        return { success: false, message: 'New password must be at least 8 characters and include a number.' };
      }
      if (newPassword === currentPassword) {
        return { success: false, message: 'New password must be different from the current password.' };
      }
      email = email.trim().toLowerCase();
      var cur = this.getCurrentUser();
      if (!cur || (cur.email || '').toLowerCase() !== email) {
        return { success: false, message: 'Session expired. Please sign in again.' };
      }
      var lock = this._isLocked(email);
      if (lock && lock.locked) {
        return { success: false, message: 'Too many failed attempts. Please try again later.' };
      }
      var users = this.getUsers();
      var idx = -1;
      for (var i = 0; i < users.length; i++) {
        if (users[i].email && users[i].email.toLowerCase() === email) { idx = i; break; }
      }
      if (idx === -1) return { success: false, message: 'Account not found.' };
      if (users[idx].passwordHash !== hashPassword(currentPassword)) {
        this._recordFail(email);
        return { success: false, message: 'Current password is incorrect.' };
      }
      users[idx].passwordHash = hashPassword(newPassword);
      delete users[idx].password;
      persistUsers(users);
      this._clearFails(email);
      this.logAuditAction(email, 'CHANGE_PASSWORD', email, 'User changed their own password');
      return { success: true };
    },

    updateApplicationStatus: function(id, status, approvingAdminEmail) {
      var apps = this.getApplications();
      var appItem = null;
      for (var i = 0; i < apps.length; i++) {
        if (apps[i].id === id) {
          apps[i].status = status;
          if (approvingAdminEmail) {
            apps[i].lockedApprovedBy = approvingAdminEmail;
            apps[i].approvedAt = new Date().toISOString().split('T')[0];
          }
          appItem = apps[i];
          break;
        }
      }
      setStorage(STORAGE_KEYS.APPLICATIONS, apps);

      if (appItem && approvingAdminEmail) {
        this.logAuditAction(
          approvingAdminEmail,
          status === 'approved' ? 'APPROVE_APPLICATION' : 'REJECT_APPLICATION',
          id,
          'Marked application ' + id + ' as ' + status.toUpperCase() + ' for ' + appItem.name,
          appItem.name + ' (' + appItem.email + ')'
        );
      }

      return { success: true };
    },

    // Wipes ALL student/user data (local + shared cloud database). Admin accounts are kept.
    // Super Admin only. Returns a Promise.
    resetAllUserData: function(superEmail) {
      var self = this;
      if (!this.isSuperAdmin(superEmail)) return Promise.resolve({ success: false, message: 'Only the Super Administrator can reset user data.' });
      var admins = this.getMasterDB().filter(function(u) { return u && (u.role === 'admin' || u.role === 'superadmin'); });
      var cloud = window.YuvantaraCloudDB;
      var useCloud = !!(cloud && cloud.isConfigured && cloud.isConfigured() && cloud.wipeAllUsers);
      // The cloud wipe needs no read access (it writes a reset marker), so it also works when the free read quota is used up.
      var cloudP = useCloud ? cloud.wipeAllUsers() : Promise.resolve({ success: true, deleted: 0, cloud: false });
      return cloudP.then(function(res) {
        if (res && res.success === false) {
          return { success: false, message: 'The shared database could not be reset: ' + (res.error || 'unknown error') +
            '. Nothing was changed. Check your internet connection and the Firebase write quota / Firestore rules, then try again.' };
        }
        setStorage(STORAGE_KEYS.MASTER_DB, admins);
        setStorage(STORAGE_KEYS.USERS, admins);
        [STORAGE_KEYS.NEW_REGISTRATIONS, STORAGE_KEYS.CURRENT_INTERNS, STORAGE_KEYS.ALL_EMPLOYEES, STORAGE_KEYS.APPLICATIONS,
         STORAGE_KEYS.CERTIFICATES, STORAGE_KEYS.LOCKOUTS, 'yuvantara_pending_app', 'yuvantara_audit_logs'].forEach(function(k) { try { localStorage.removeItem(k); } catch (e) {} });
        if (useCloud && cloud.resetSyncState) cloud.resetSyncState();
        self.logAuditAction(superEmail, 'RESET_ALL_USER_DATA', 'ALL_USERS', 'Super Admin reset all student/user data' + (res && res.cloud ? ' (' + res.deleted + ' cloud records removed)' : ''), 'All users');
        return { success: true, deleted: (res && res.deleted) || 0, cloud: !!(res && res.cloud) };
      });
    },

    // Kept for old callers: now performs the same safe reset for the signed-in super admin.
    resetToDemoData: function() {
      var cu = this.getCurrentUser();
      return this.resetAllUserData(cu && cu.email);
    },

    DATA_ARCHITECTURE: {
      ADMIN_FILES: [
        'data/admin_adk_01.json',
        'data/admin_alk_01.json',
        'data/admin_dhb_03.json',
        'data/admin_abk_04.json',
        'data/admin_anp_05.json',
        'data/admin_rop_06.json'
      ],
      MASTER_STUDENTS_FILE: 'data/master_students.json',
      AUDIT_TRAIL_FILE: 'data/audit_trail.json',
      ADMINS_REGISTRY_FILE: 'data/admins_registry.json'
    },

    getDataArchitectureFiles: function() {
      return [
        'data/admin_adk_01.json',
        'data/admin_alk_01.json',
        'data/admin_dhb_03.json',
        'data/admin_abk_04.json',
        'data/admin_anp_05.json',
        'data/admin_rop_06.json',
        'data/master_students.json',
        'data/audit_trail.json',
        'data/admins_registry.json'
      ];
    }
  };

  window.YuvantaraDB = DB;
})(window);
