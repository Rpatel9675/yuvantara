// Yuvantara Cloud Database & Sync Engine (Firebase Firestore REST)
//
// WHY THIS EXISTS
// GitHub Pages is static hosting, so without a shared database every browser keeps its own private copy of the data
// (localStorage). A user who registers on their phone is invisible to the admin on a laptop, and an approval made by
// the admin never reaches the user's browser. This module keeps all browsers in sync through Firestore:
//   - every change made to a user record is pushed to the cloud (debounced, batched)
//   - READS ONLY WHEN REQUIRED: a plain visitor on a public page sends NO request to the database at all. Automatic pulls (on
//     load, on focus and on a timer) run only on the admin console and, for a logged-in student, on the portal / payment pages.
//     Everything else pulls ON DEMAND at the moment it needs data (login, sign-up, forgot-password, certificate verify, enroll).
//   - pages pull + merge the latest cloud data. The first pull downloads everything; later
//     pulls are INCREMENTAL (a Firestore query for documents changed since the last pull), so the admin portal refreshes
//     every minute for only a few reads and never shows stale data because of a throttle. A 429 (quota) back-off pauses
//     only the automatic pulls - the manual "Sync now" button always tries.
//   - the newest edit (_ts) wins; deletions travel as tombstones
// Turn it on by filling in firebase.projectId / firebase.apiKey / firebase.enabled in assets/config.js.
(function(window) {
  'use strict';

  var PUSH_DELAY_MS = 300;
  // Read-quota protection. After the first full download, pulls are INCREMENTAL (only documents whose _ts / ts is newer
  // than the last pull are read, through a Firestore query), so the admin portal can refresh every minute for a few reads.
  var GAP_ADMIN_MS = 20000;       // admin portal: at most one pull per 20 s (cheap: incremental)
  var GAP_STUDENT_MS = 300000;    // logged-in student: 5 minutes
  var GAP_VISITOR_MS = 600000;    // anonymous visitor: 10 minutes
  var POLL_ADMIN_MS = 60000;      // admin portal background refresh
  var FULL_RESYNC_ADMIN_MS = 1800000;   // admin: full re-download at most every 30 min (catches devices with a wrong clock)
  var FULL_RESYNC_OTHER_MS = 21600000;  // everyone else: every 6 h
  var CURSOR_OVERLAP_MS = 900000; // re-read the last 15 min on every incremental pull (tolerates small clock differences)
  var BACKOFF_429_MS = 600000;    // after "429 quota exceeded": stop automatic reads for 10 minutes ("Sync now" still tries)
  var RETRY_AFTER_ERROR_MS = 30000;     // after any other failed pull: try again in 30 s (never wait a full gap)
  var RESET_MARKER_ID = 'reset-all-marker';   // tombstone document written by "Reset ALL user data" (see wipeAllUsers)
  var LS_BACKOFF = 'yuv_cloud_backoff_until', LS_CURSOR = 'yuv_cloud_cursor', LS_LOGS_CURSOR = 'yuv_cloud_logs_cursor',
      LS_FULL = 'yuv_cloud_last_full', LS_MARKER = 'yuv_cloud_reset_marker';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function isAdminPage() { return /admin_login_777/.test(window.location.pathname || ''); }
  function hasSession() { return !!lsGet('yuvantara_session_user'); }
  // Does THIS page need cloud data the moment it opens?  Admin console: yes.  Logged-in student: only where their own record or
  // approval status is shown (portal, payment).  Anyone else (public pages, 404, blog, forms): no - those flows call
  // YuvantaraDB.ensureFresh() themselves when the visitor actually does something that needs server data.
  function pageNeedsCloud() {
    if (isAdminPage()) return true;
    if (!hasSession()) return false;
    return /\/(portal|payment)(\/|$)/.test(window.location.pathname || '');
  }
  // Admin pages and everything else keep separate "last pull" stamps, so a visitor page opened in the same browser
  // can never make the admin console think it is already up to date.
  function lastKey() { return isAdminPage() ? 'yuv_cloud_last_pull_admin' : 'yuv_cloud_last_pull'; }
  function pullGap() { return isAdminPage() ? GAP_ADMIN_MS : (hasSession() ? GAP_STUDENT_MS : GAP_VISITOR_MS); }
  var MAX_WRITES_PER_COMMIT = 400;
  var DEMO_ID = /^(REG|INT|USR|EMP)-\d{3,4}$/;     // ids of the bundled demo dataset: never pushed automatically

  var LS_PENDING = 'yuv_cloud_pending';
  var pendingUpserts = {};   // email -> record
  var pendingDeletes = {};   // email -> ts
  // The queue survives page navigation / closing the tab, so a sign-up whose upload was cut off is retried later.
  function savePending() {
    try {
      if (!Object.keys(pendingUpserts).length && !Object.keys(pendingDeletes).length) localStorage.removeItem(LS_PENDING);
      else localStorage.setItem(LS_PENDING, JSON.stringify({ u: pendingUpserts, d: pendingDeletes }));
    } catch (e) {}
  }
  function loadPending() {
    try {
      var raw = localStorage.getItem(LS_PENDING);
      if (!raw) return;
      var p = JSON.parse(raw) || {};
      Object.keys(p.u || {}).forEach(function(id) { if (!pendingUpserts[id]) pendingUpserts[id] = p.u[id]; });
      Object.keys(p.d || {}).forEach(function(id) { if (!pendingUpserts[id] && !pendingDeletes[id]) pendingDeletes[id] = p.d[id]; });
    } catch (e) {}
  }
  var pushTimer = null;
  var pulling = null;
  var pollTimer = null;
  var status = { lastPull: null, lastPush: null, lastError: null };

  function cfg() { return window.YUVANTARA_CONFIG || {}; }
  function fire(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {}
  }
  function setError(err) {
    status.lastError = err ? String(err.message || err) : null;
    fire('yuvantara_cloud_status', { error: status.lastError });
  }
  // Only STUDENT records are ever synced. Admin / super-admin accounts live in the app itself and are never
  // written to or read from the shared database (otherwise anyone could forge an admin record).
  function isSyncable(u) { return !!u && !!u.email && u.role !== 'admin' && u.role !== 'superadmin'; }
  function docId(email) { return String(email || '').trim().toLowerCase(); }

  // ── Value encoding (JS <-> Firestore) ──
  function encodeValue(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(function(i) { return encodeValue(i); }) } };
    if (typeof v === 'object') return { mapValue: { fields: encodeFields(v) } };
    return { stringValue: String(v) };
  }
  function encodeFields(obj) {
    var f = {};
    Object.keys(obj || {}).forEach(function(k) { if (obj[k] !== undefined) f[k] = encodeValue(obj[k]); });
    return f;
  }
  function decodeValue(f) {
    if (!f) return null;
    if ('stringValue' in f) return f.stringValue;
    if ('integerValue' in f) return parseInt(f.integerValue, 10);
    if ('doubleValue' in f) return parseFloat(f.doubleValue);
    if ('booleanValue' in f) return f.booleanValue;
    if ('nullValue' in f) return null;
    if ('timestampValue' in f) return f.timestampValue;
    if ('arrayValue' in f) return ((f.arrayValue && f.arrayValue.values) || []).map(decodeValue);
    if ('mapValue' in f) return decodeFields(f.mapValue.fields);
    return null;
  }
  function decodeFields(fields) {
    var o = {};
    Object.keys(fields || {}).forEach(function(k) { o[k] = decodeValue(fields[k]); });
    return o;
  }

  // Firestore documents are limited to 1 MB: keep uploaded files (base64) on the device only.
  function forCloud(rec) {
    var c = JSON.parse(JSON.stringify(rec));
    if (c.uploadedCertificate && c.uploadedCertificate.dataUrl) {
      c.uploadedCertificate = { name: c.uploadedCertificate.name, uploadedAt: c.uploadedCertificate.uploadedAt };
    }
    delete c.password;
    c.role = 'student';   // Firestore rules only accept student records
    return c;
  }

  // Fields decided by an admin. When two copies of a record disagree, the copy with the newer `adminTs` wins for these.
  var ADMIN_FIELDS = ['accountStatus', 'status', 'progress', 'modules', 'paymentStatus', 'paymentAmount', 'paymentRef',
    'paymentMethod', 'paidAt', 'paymentVerifiedBy', 'paymentVerifiedAt', 'invoice', 'certificate', 'certificateNumber',
    'issueDate', 'grade', 'duration', 'authority', 'verificationUrl', 'approvedByAdmin', 'approvedAt', 'enrolledAt',
    'enrolledByAdmin', 'jobTitle', 'lastModifiedByAdmin', 'lastModifiedAt', 'adminTs'];

  var CloudDB = {
    isConfigured: function() {
      var f = cfg().firebase;
      return !!(f && f.enabled && f.projectId && f.apiKey);
    },
    getBackendUrl: function() { return (cfg().api && cfg().api.baseUrl) || ''; },
    getStatus: function() {
      return {
        configured: this.isConfigured(),
        lastPull: status.lastPull,
        lastPush: status.lastPush,
        lastError: status.lastError,
        pendingWrites: Object.keys(pendingUpserts).length + Object.keys(pendingDeletes).length
      };
    },

    _root: function() {
      return 'https://firestore.googleapis.com/v1/projects/' + cfg().firebase.projectId + '/databases/(default)/documents';
    },
    _docName: function(collection, id) {
      return 'projects/' + cfg().firebase.projectId + '/databases/(default)/documents/' + collection + '/' + id;
    },
    _key: function() { return 'key=' + encodeURIComponent(cfg().firebase.apiKey); },

    _toFirestoreFields: encodeFields,
    _fromFirestoreFields: decodeFields,

    // Single document write (used for audit logs)
    saveDocument: function(collection, id, data) {
      if (!this.isConfigured()) return Promise.resolve({ local: true, data: data });
      return fetch(this._root() + '/' + encodeURIComponent(collection) + '/' + encodeURIComponent(id) + '?' + this._key(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: encodeFields(data) })
      }).then(function(res) {
        if (!res.ok) throw new Error('Firestore write error: ' + res.status);
        return res.json();
      }).then(function(json) {
        return { success: true, doc: decodeFields(json.fields) };
      }).catch(function(err) {
        setError(err);
        return { local: true, error: err.message };
      });
    },

    // Whole collection (follows pagination)
    fetchCollection: function(collection, maxDocs) {
      var self = this;
      if (!this.isConfigured()) return Promise.resolve([]);
      var out = [];
      maxDocs = maxDocs || 5000;
      function page(token) {
        var url = self._root() + '/' + encodeURIComponent(collection) + '?pageSize=300&' + self._key() +
                  (token ? '&pageToken=' + encodeURIComponent(token) : '');
        return fetch(url).then(function(res) {
          if (res.status === 404) return { documents: [] };
          if (!res.ok) throw new Error('Firestore read error (' + collection + '): ' + res.status);
          return res.json();
        }).then(function(data) {
          (data.documents || []).forEach(function(d) { out.push(decodeFields(d.fields)); });
          if (data.nextPageToken && out.length < maxDocs) return page(data.nextPageToken);
          return out;
        });
      }
      return page(null);
    },

    // Documents of `collection` whose numeric `field` is greater than `since` (a Firestore structured query, so only
    // the changed documents are read and billed).
    fetchChanged: function(collection, field, since, maxDocs) {
      var self = this, out = [], seen = {};
      maxDocs = maxDocs || 5000;
      function page(sinceVal, loops) {
        var body = { structuredQuery: {
          from: [{ collectionId: collection }],
          where: { fieldFilter: { field: { fieldPath: field }, op: 'GREATER_THAN', value: { integerValue: String(Math.max(0, Math.floor(sinceVal))) } } },
          orderBy: [{ field: { fieldPath: field }, direction: 'ASCENDING' }],
          limit: 1000
        } };
        return fetch(self._root() + ':runQuery?' + self._key(), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        }).then(function(res) {
          if (!res.ok) throw new Error('Firestore query error (' + collection + '): ' + res.status);
          return res.json();
        }).then(function(rows) {
          var n = 0, maxTs = sinceVal;
          (rows || []).forEach(function(r) {
            if (!r || !r.document) return;
            n++;
            var d = decodeFields(r.document.fields);
            if (!seen[r.document.name]) { seen[r.document.name] = true; out.push(d); }
            var t = Number(d[field]) || 0; if (t > maxTs) maxTs = t;
          });
          if (n >= 1000 && maxTs > sinceVal && loops < 20 && out.length < maxDocs) return page(maxTs - 1, loops + 1);   // more pages
          return out;
        });
      }
      return page(since, 0);
    },

    _commit: function(writes) {
      var self = this;
      var chunks = [];
      for (var i = 0; i < writes.length; i += MAX_WRITES_PER_COMMIT) chunks.push(writes.slice(i, i + MAX_WRITES_PER_COMMIT));
      return chunks.reduce(function(p, chunk) {
        return p.then(function() {
          var body = JSON.stringify({ writes: chunk });
          return fetch(self._root() + ':commit?' + self._key(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
            // keepalive lets the request finish even if the page navigates away (e.g. signup -> payment page).
            // Browsers cap keepalive bodies at 64 KB, so only use it for small batches.
            keepalive: body.length < 60000
          }).then(function(res) {
            if (!res.ok) throw new Error('Firestore commit error: ' + res.status);
            return res.json();
          });
        });
      }, Promise.resolve());
    },

    // Commit writes in one batch; if the batch is rejected (one bad document rejects ALL of them), retry each write
    // on its own so a single refused document can never block everyone else. Resolves { ok, failed:[writes], error }.
    _commitEach: function(writes) {
      var self = this;
      return this._commit(writes).then(function() { return { ok: writes.length, failed: [], error: null }; }, function(batchErr) {
        if (writes.length <= 1) return { ok: 0, failed: writes, error: batchErr.message };
        var ok = 0, failed = [], lastErr = batchErr.message;
        return writes.reduce(function(p, w) {
          return p.then(function() {
            return self._commit([w]).then(function() { ok++; }, function(e) { failed.push(w); lastErr = e.message; });
          });
        }, Promise.resolve()).then(function() { return { ok: ok, failed: failed, error: failed.length ? lastErr : null }; });
      });
    },

    // ── Push side ──
    // Called by YuvantaraDB.saveMasterDB(previousRecords, nextRecords) after every local change.
    queuePush: function(prev, next) {
      if (!this.isConfigured()) return;
      var prevMap = {}, nextMap = {};
      (prev || []).forEach(function(u) { if (isSyncable(u)) prevMap[docId(u.email)] = JSON.stringify(u); });
      (next || []).forEach(function(u) {
        if (!isSyncable(u)) return;
        var id = docId(u.email);
        nextMap[id] = true;
        if (prevMap[id] !== JSON.stringify(u)) { pendingUpserts[id] = u; delete pendingDeletes[id]; }
      });
      Object.keys(prevMap).forEach(function(id) {
        if (!nextMap[id]) { pendingDeletes[id] = Date.now(); delete pendingUpserts[id]; }
      });
      savePending();
      this._schedulePush();
    },

    _schedulePush: function() {
      var self = this;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(function() { self.flush().catch(function() {}); }, PUSH_DELAY_MS);
    },

    flush: function() {
      var self = this;
      if (!this.isConfigured()) return Promise.resolve({ pushed: 0 });
      var ups = pendingUpserts, dels = pendingDeletes;
      pendingUpserts = {}; pendingDeletes = {};
      var resetFloor = this.getResetBefore();
      if (resetFloor) Object.keys(ups).forEach(function(id) { if ((ups[id]._ts || 0) < resetFloor) delete ups[id]; });   // wiped by a reset: never re-publish
      // Upserts (sign-ups, approvals) and deletes go in SEPARATE commits, and each is retried document-by-document on failure,
      // so a refused delete can never block a new registration from reaching the admin portal.
      var upWrites = [], delWrites = [], upIds = [], delIds = [];
      Object.keys(ups).forEach(function(id) {
        upIds.push(id);
        upWrites.push({ update: { name: self._docName('users', id), fields: encodeFields(forCloud(ups[id])) } });
      });
      Object.keys(dels).forEach(function(id) {
        delIds.push(id);
        delWrites.push({ update: { name: self._docName('deleted_users', id), fields: encodeFields({ email: id, _ts: dels[id] }) } });
        delWrites.push({ delete: self._docName('users', id) });
      });
      if (!upWrites.length && !delWrites.length) { savePending(); return Promise.resolve({ pushed: 0 }); }
      return this._commitEach(upWrites).then(function(r1) {
        return self._commitEach(delWrites).then(function(r2) { return [r1, r2]; });
      }).then(function(rs) {
        var failedNames = {};
        rs.forEach(function(r) { r.failed.forEach(function(w) { failedNames[(w.update || {}).name || w.delete] = true; }); });
        // re-queue only what really failed
        upIds.forEach(function(id) { if (failedNames[self._docName('users', id)] && !pendingUpserts[id] && !pendingDeletes[id]) pendingUpserts[id] = ups[id]; });
        delIds.forEach(function(id) {
          if ((failedNames[self._docName('deleted_users', id)]) && !pendingUpserts[id] && !pendingDeletes[id]) pendingDeletes[id] = dels[id];
        });
        savePending();
        var okCount = rs[0].ok + rs[1].ok, err = rs[0].error || rs[1].error;
        if (okCount) status.lastPush = Date.now();
        if (err) { setError(new Error('Some changes could not be saved to the cloud: ' + err)); throw new Error(err); }
        setError(null);
        return { pushed: okCount };
      });
    },

    // Push whatever is queued RIGHT NOW and wait for the result (never waits longer than timeoutMs).
    // Used before redirecting away from a page right after a signup/enrollment so the record is not lost.
    flushNow: function(timeoutMs) {
      var self = this;
      if (!this.isConfigured()) return Promise.resolve({ pushed: 0, skipped: true });
      if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
      var done = this.flush().then(function(r) { return r; }, function(err) { return { pushed: 0, error: err.message }; });
      var timeout = new Promise(function(resolve) { setTimeout(function() { resolve({ pushed: 0, timedOut: true }); }, timeoutMs || 4000); });
      return Promise.race([done, timeout]);
    },

    // Timestamp (ms) before which every cloud/local student record is treated as wiped: the later of
    // config.dataResetBefore and the newest "Reset ALL user data" marker seen in the shared database.
    getResetBefore: function() { return Math.max(Number(cfg().dataResetBefore) || 0, Number(lsGet(LS_MARKER)) || 0); },

    // Forget the incremental cursor so the next pull downloads everything again.
    resetSyncState: function() {
      [LS_CURSOR, LS_LOGS_CURSOR, LS_FULL, 'yuv_cloud_last_pull', 'yuv_cloud_last_pull_admin'].forEach(function(k) { lsSet(k, 0); });
    },

    // SUPER ADMIN: wipe EVERY student record.
    //  1. One small write puts a RESET MARKER into deleted_users. Every device that reads it drops all student records
    //     older than the marker (cloud copies are ignored, local caches are purged). This needs no reads, so it works
    //     even when the free read quota is exhausted, and it also catches devices that were offline.
    //  2. Records known locally get tombstones + deletes in the same commit.
    //  3. Best effort: the cloud collection is listed and any remaining records are deleted for real (skipped silently
    //     when reads are unavailable - the marker already hides them).
    // Admin accounts are never stored in the cloud, so they are untouched.
    wipeAllUsers: function() {
      var self = this;
      if (!this.isConfigured()) return Promise.resolve({ success: true, deleted: 0, cloud: false });
      var now = Date.now();
      var DB = window.YuvantaraDB;
      var writes = [{ update: { name: this._docName('deleted_users', RESET_MARKER_ID), fields: encodeFields({ email: RESET_MARKER_ID, _ts: now }) } }];
      var deletes = [];   // actual document deletes: best effort, done AFTER the marker is safely written
      var seenIds = {};
      function addRecord(email) {
        var id = docId(email);
        if (!id || seenIds[id]) return;
        seenIds[id] = true;
        writes.push({ update: { name: self._docName('deleted_users', id), fields: encodeFields({ email: id, _ts: now }) } });
        deletes.push({ delete: self._docName('users', id) });
      }
      try { (DB ? DB.getMasterDB() : []).forEach(function(u) { if (isSyncable(u)) addRecord(u.email); }); } catch (e) {}
      pendingUpserts = {}; pendingDeletes = {}; savePending();
      return this._commitEach(writes).then(function(r) {
        // the reset marker (first write) is what matters: without it the wipe did not happen
        var markerName = self._docName('deleted_users', RESET_MARKER_ID);
        if (r.failed.some(function(w) { return w.update && w.update.name === markerName; })) throw new Error(r.error || 'reset marker was rejected');
        lsSet(LS_MARKER, Math.max(now, Number(lsGet(LS_MARKER)) || 0));
        status.lastPush = Date.now();
        setError(null);
        var deleted = Object.keys(seenIds).length;
        // step 3 (best effort)
        return self.fetchCollection('users').then(function(docs) {
          var tombs = [];
          docs.forEach(function(d) {
            if (!d || !d.email) return;
            var id = docId(d.email);
            if (seenIds[id]) return;
            seenIds[id] = true; deleted++;
            tombs.push({ update: { name: self._docName('deleted_users', id), fields: encodeFields({ email: id, _ts: now }) } });
            deletes.push({ delete: self._docName('users', id) });
          });
          return tombs.length ? self._commitEach(tombs) : null;
        }).catch(function() { /* reads unavailable: the reset marker already hides every old record */ }).then(function() {
          return deletes.length ? self._commitEach(deletes).catch(function() {}) : null;
        }).then(function() {
          return { success: true, deleted: deleted, cloud: true };
        });
      }).catch(function(err) {
        setError(err);
        return { success: false, error: err.message };
      });
    },

    // Admin diagnostics: reads the shared database directly (no filters) and explains why records may be missing.
    diagnose: function() {
      var self = this, out = [];
      function line(t) { out.push(t); }
      if (!this.isConfigured()) return Promise.resolve('Cloud sync is NOT configured (assets/config.js -> firebase.enabled / projectId / apiKey).');
      var f = cfg().firebase, floor = this.getResetBefore();
      line('Project: ' + f.projectId + '   |   API key: ' + String(f.apiKey).slice(0, 8) + '…');
      line('Reset floor: ' + (floor ? new Date(floor).toLocaleString() : 'none') + '  (records last edited before this are hidden)');
      function raw(coll) {
        return fetch(self._root() + '/' + coll + '?pageSize=300&' + self._key()).then(function(res) {
          return res.json().catch(function() { return {}; }).then(function(b) { return { status: res.status, body: b }; });
        }).catch(function(e) { return { status: 0, body: { error: { message: String(e.message || e) } } }; });
      }
      // Real write test: one tiny harmless tombstone document (never matches a real user).
      function writeTest() {
        return fetch(self._root() + '/deleted_users/diag-write-test?' + self._key(), {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: encodeFields({ email: 'diag-write-test', _ts: 1 }) })
        }).then(function(res) {
          return res.json().catch(function() { return {}; }).then(function(b) { return { status: res.status, body: b }; });
        }).catch(function(e) { return { status: 0, body: { error: { message: String(e.message || e) } } }; });
      }
      return Promise.all([raw('users'), raw('deleted_users'), writeTest()]).then(function(r) {
        var u = r[0], d = r[1], w = r[2];
        if (w.status === 200) {
          line('WRITE test: OK (the browser CAN write to Firestore).');
        } else {
          var wm = (w.body && w.body.error && w.body.error.message) || '';
          line('WRITE test: FAILED -> ' + w.status + ' ' + wm);
          if (w.status === 403 && /disabled|not been used|API has not/i.test(wm)) line('=> The Cloud Firestore API is not enabled for this project. Create the database in Firebase Console (Build -> Firestore Database -> Create database).');
          else if (w.status === 403) line('=> Firestore RULES refuse writes. Firebase Console -> Firestore Database -> Rules: paste the rules and click PUBLISH.');
          else if (w.status === 400 && /API key/i.test(wm)) line('=> The apiKey in assets/config.js is wrong for this project. Copy it from Project settings -> Your apps -> Web app.');
          else if (w.status === 404) line('=> No Firestore database in project ' + f.projectId + '. Create it, or fix projectId in assets/config.js.');
          else if (w.status === 0) line('=> The request never left the browser (offline, ad-blocker, or a network firewall blocking firestore.googleapis.com).');
          else line('=> Send me this line.');
        }
        function err(x) { return x.status + ' ' + ((x.body && x.body.error && x.body.error.message) || ''); }
        if (u.status !== 200 && u.status !== 404) {
          line('READ users: FAILED -> ' + err(u));
          line(u.status === 403
            ? '=> Firestore REFUSED the read. Publish rules that allow read on users (firestore.rules), or the API key is restricted / the Firestore API is disabled.'
            : '=> Check the internet connection, the project id, and that a Firestore database exists in this project.');
        } else {
          var docs = (u.body.documents || []).map(function(x) { return decodeFields(x.fields); });
          if (u.status === 404) line('READ users: 404 (no Firestore database / collection in this project).');
          line('Cloud users collection: ' + docs.length + ' document(s)' + (u.body.nextPageToken ? ' (more than 300, list truncated)' : ''));
          var visible = docs.filter(function(c) { return c && (c._ts || 0) >= floor; });
          line('  visible after reset filter: ' + visible.length + '   |   hidden by reset filter: ' + (docs.length - visible.length));
          docs.sort(function(a, b) { return (b._ts || 0) - (a._ts || 0); }).slice(0, 5).forEach(function(c) {
            line('  • ' + c.email + '  edited ' + (c._ts ? new Date(c._ts).toLocaleString() : 'NO _ts (always hidden)'));
          });
        }
        if (d.status === 200) {
          var tombs = (d.body.documents || []).map(function(x) { return decodeFields(x.fields); });
          line('Deleted-user tombstones: ' + tombs.length + (tombs.some(function(t) { return t.email === RESET_MARKER_ID; }) ? ' (includes a Reset-ALL marker)' : ''));
        } else line('READ deleted_users: ' + err(d));
        var DB = window.YuvantaraDB, local = 0;
        try { local = DB.getMasterDB().filter(isSyncable).length; } catch (e) {}
        line('Students in THIS browser: ' + local + '   |   waiting to upload: ' + (Object.keys(pendingUpserts).length + Object.keys(pendingDeletes).length));
        line('Last upload error: ' + (status.lastError || 'none') + '   |   last upload: ' + (status.lastPush ? new Date(status.lastPush).toLocaleString() : 'never in this session'));
        return out.join('\n');
      });
    },

    // ── Pull + merge side ──
    // pullAndMerge(force): true (manual "Sync now") = full download, ignores the time gap and any 429 back-off;
    // a number = the caller accepts data up to that many ms old; nothing = the default gap for this kind of page.
    pullAndMerge: function(force) {
      var self = this;
      if (!this.isConfigured()) return Promise.resolve({ synced: false, reason: 'Firebase is not configured in assets/config.js' });
      if (pulling) return pulling;
      var DB = window.YuvantaraDB;
      if (!DB) return Promise.resolve({ synced: false });
      var now = Date.now(), manual = (force === true), admin = isAdminPage();
      var backoffUntil = Number(lsGet(LS_BACKOFF)) || 0;
      if (!manual && backoffUntil > now) {
        return Promise.resolve({ synced: false, throttled: true, reason: 'Cloud reads paused after a quota (429) response; retrying in ' + Math.ceil((backoffUntil - now) / 60000) + ' min (press Sync now to try immediately)' });
      }
      var gap = (typeof force === 'number') ? force : pullGap();
      var lk = lastKey();
      if (!manual && now - (Number(lsGet(lk)) || 0) < gap) return Promise.resolve({ synced: true, throttled: true });

      var cursor = Number(lsGet(LS_CURSOR)) || 0;
      var logsCursor = Number(lsGet(LS_LOGS_CURSOR)) || 0;
      var lastFull = Number(lsGet(LS_FULL)) || 0;
      var isFull = manual || !cursor || (now - lastFull > (admin ? FULL_RESYNC_ADMIN_MS : FULL_RESYNC_OTHER_MS));
      var startedAt = now;   // captured BEFORE the download so anything written while it runs is read next time

      function is429(err) { return /\b429\b/.test(String(err && err.message)); }
      function download(full, noQueries) {
        var since = cursor - CURSOR_OVERLAP_MS;
        return Promise.all([
          full ? self.fetchCollection('users') : self.fetchChanged('users', '_ts', since),
          full ? self.fetchCollection('deleted_users') : self.fetchChanged('deleted_users', '_ts', since),
          !admin ? Promise.resolve([])
            : ((logsCursor && !noQueries) ? self.fetchChanged('audit_logs', 'ts', logsCursor - CURSOR_OVERLAP_MS) : self.fetchCollection('audit_logs', 1500))
        ]);
      }

      pulling = download(isFull, false).catch(function(err) {
        // a query failed for a reason other than quota: fall back to plain full downloads (no queries at all)
        if (!is429(err)) { isFull = true; return download(true, true); }
        throw err;
      }).then(function(r) {
        var cloudUsers = r[0] || [], tombs = r[1] || [], cloudLogs = r[2] || [];

        // Newest "Reset ALL user data" marker (a tombstone with a reserved id)
        var marker = Number(lsGet(LS_MARKER)) || 0;
        tombs = tombs.filter(function(t) {
          if (t && t.email === RESET_MARKER_ID) { if ((t._ts || 0) > marker) marker = t._ts; return false; }
          return true;
        });
        if (marker > (Number(lsGet(LS_MARKER)) || 0)) lsSet(LS_MARKER, marker);

        var local = DB.getMasterDB().slice();
        var byEmail = {}; local.forEach(function(u, i) { if (u && u.email) byEmail[docId(u.email)] = i; });
        var tombMap = {}; tombs.forEach(function(t) { if (t && t.email) tombMap[docId(t.email)] = t._ts || 0; });
        var changed = false, pushBack = 0;
        var cloudIds = {};
        // Data reset: records last edited before the reset time no longer exist (cloud or local cache).
        var resetBefore = self.getResetBefore();
        if (resetBefore) {
          cloudUsers = cloudUsers.filter(function(c) { return c && (c._ts || 0) >= resetBefore; });
          var beforeLen = local.length;
          local = local.filter(function(l) { return !isSyncable(l) || (l._ts || 0) >= resetBefore; });
          if (local.length !== beforeLen) { changed = true; byEmail = {}; local.forEach(function(u, i) { if (u && u.email) byEmail[docId(u.email)] = i; }); }
        }

        cloudUsers.forEach(function(c) {
          if (!isSyncable(c)) return;
          var id = docId(c.email);
          cloudIds[id] = true;
          if (tombMap[id] !== undefined && tombMap[id] >= (c._ts || 0)) return;           // deleted after last edit
          var idx = byEmail[id];
          if (idx !== undefined && local[idx] && (local[idx].role === 'admin' || local[idx].role === 'superadmin')) return;   // never let a cloud student copy overwrite an admin account
          if (idx === undefined) {
            local.push(c); byEmail[id] = local.length - 1; changed = true;
          } else {
            var l = local[idx];
            var cAdm = c.adminTs || 0, lAdm = l.adminTs || 0;
            if (cAdm > lAdm) {
              // an admin decision made elsewhere is newer: take its admin fields no matter who edited last
              var m1 = Object.assign({}, l, (c._ts || 0) > (l._ts || 0) ? c : {});
              ADMIN_FIELDS.forEach(function(f) { if (f in c) m1[f] = c[f]; else delete m1[f]; });
              if (l.uploadedCertificate && l.uploadedCertificate.dataUrl) m1.uploadedCertificate = l.uploadedCertificate;
              m1._ts = Math.max(c._ts || 0, l._ts || 0);
              local[idx] = m1; changed = true;
              if ((l._ts || 0) > (c._ts || 0)) { pendingUpserts[id] = m1; pushBack++; }
            } else if (lAdm > cAdm) {
              // our admin decision is newer than the cloud copy: keep it and publish it
              var m2 = (c._ts || 0) > (l._ts || 0) ? Object.assign({}, c) : Object.assign({}, l);
              ADMIN_FIELDS.forEach(function(f) { if (f in l) m2[f] = l[f]; else delete m2[f]; });
              if (l.uploadedCertificate && l.uploadedCertificate.dataUrl) m2.uploadedCertificate = l.uploadedCertificate;
              m2._ts = Math.max(c._ts || 0, l._ts || 0);
              local[idx] = m2; changed = true;
              pendingUpserts[id] = m2; pushBack++;
            } else if ((c._ts || 0) > (l._ts || 0)) {
              var merged = Object.assign({}, l, c);
              // restore a locally stored uploaded file that the cloud copy intentionally omits
              if (l.uploadedCertificate && l.uploadedCertificate.dataUrl && merged.uploadedCertificate &&
                  merged.uploadedCertificate.name === l.uploadedCertificate.name) {
                merged.uploadedCertificate = l.uploadedCertificate;
              }
              local[idx] = merged; changed = true;
            } else if ((l._ts || 0) > (c._ts || 0)) {
              pendingUpserts[id] = l; pushBack++;                                        // we hold the newer edit
            }
          }
        });

        // Local records the cloud has never seen (created while offline / before cloud was enabled).
        // Only meaningful after a FULL download: an incremental pull sees just the changed documents.
        if (isFull) {
          local.forEach(function(l) {
            if (!isSyncable(l)) return;
            var id = docId(l.email);
            if (!cloudIds[id] && tombMap[id] === undefined && l._ts && !DEMO_ID.test(l.id || '')) { pendingUpserts[id] = l; pushBack++; }
          });
        }

        // apply deletions made on other devices
        var kept = local.filter(function(l) {
          if (!l || !l.email) return true;
          var t = tombMap[docId(l.email)];
          if (t !== undefined && (l._ts || 0) <= t) { changed = true; return false; }
          return true;
        });

        if (changed) DB.saveMasterDB(kept, { fromCloud: true });

        // audit trail from all admins
        var logsChanged = false;
        if (resetBefore) cloudLogs = cloudLogs.filter(function(l) { return l && (l.ts || 0) >= resetBefore; });
        if (cloudLogs.length) {
          var logs = DB.getAuditLogs();
          var have = {}; logs.forEach(function(l) { have[l.id] = true; });
          cloudLogs.forEach(function(l) { if (l && l.id && !have[l.id]) { logs.push(l); logsChanged = true; } });
          if (logsChanged) {
            logs.sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); });
            try { localStorage.setItem('yuvantara_audit_logs', JSON.stringify(logs.slice(0, 3000))); } catch (e) {}
          }
        }

        // success: remember where this pull started
        lsSet(lk, startedAt);
        lsSet(LS_CURSOR, startedAt);
        if (isFull) lsSet(LS_FULL, startedAt);
        if (admin) lsSet(LS_LOGS_CURSOR, startedAt);
        status.lastPull = Date.now();
        setError(null);
        if (pushBack) self._schedulePush();
        if (changed || logsChanged) fire('yuvantara_cloud_synced', { changed: true });
        return { synced: true, users: cloudUsers.length, changed: changed || logsChanged, full: isFull };
      }).catch(function(err) {
        if (is429(err)) {
          lsSet(LS_BACKOFF, Date.now() + BACKOFF_429_MS);
          err = new Error('Firestore read quota exceeded (429). The free plan allows 50,000 reads/day and resets around 1:30 PM IST; automatic reads are paused for 10 minutes (the Sync now button still tries). Upgrade the Firebase project to the Blaze plan (free quota stays) to remove the daily cap.');
        }
        // a failed pull must NOT use up the time gap: retry soon
        lsSet(lk, Math.min(Date.now(), Date.now() - pullGap() + RETRY_AFTER_ERROR_MS));   // retry soon, never a stamp in the future
        setError(err);
        return { synced: false, error: err.message };
      }).then(function(res) { pulling = null; return res; });
      return pulling;
    },

    // Manual "Sync now": push every real (non-demo) local record, then pull.
    syncToCloud: function() {
      if (!this.isConfigured()) return Promise.resolve({ synced: false, reason: 'Firebase credentials not configured in assets/config.js' });
      var DB = window.YuvantaraDB;
      if (!DB) return Promise.resolve({ synced: false });
      DB.getMasterDB().forEach(function(u) {
        if (isSyncable(u) && !DEMO_ID.test(u.id || '')) pendingUpserts[docId(u.email)] = u;
      });
      return this.flush().then(function() { return CloudDB.pullAndMerge(true); }, function(err) { return { synced: false, error: err.message }; });
    },
    syncFromCloud: function() { return this.pullAndMerge(true); },
    syncNow: function() { return this.syncToCloud(); },

    startAutoSync: function() {
      var self = this;
      if (pollTimer || !this.isConfigured() || !pageNeedsCloud()) return;   // no timer, no focus listener on pages that do not need data
      pollTimer = setInterval(function() { if (!document.hidden) self.pullAndMerge(); }, isAdminPage() ? POLL_ADMIN_MS : GAP_STUDENT_MS);   // pullAndMerge re-checks the gap itself
      document.addEventListener('visibilitychange', function() { if (!document.hidden) self.pullAndMerge(); });
      window.addEventListener('focus', function() { self.pullAndMerge(); });
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
      if (CloudDB.isConfigured()) {
        loadPending();
        if (Object.keys(pendingUpserts).length || Object.keys(pendingDeletes).length) CloudDB._schedulePush();   // finish uploads cut off by a page change (a write, and only when something is queued)
        // Reads: only on pages that need data right now (see pageNeedsCloud). A visitor on a public page sends nothing.
        if (pageNeedsCloud()) {
          // One-time self-heal (per device): accounts created before the upload-queue fix may exist only on this device.
          // Forcing one FULL sync makes this device re-upload every record the cloud is missing. Runs only where a pull runs anyway.
          if (lsGet("yuv_cloud_heal") !== "v2") {
            lsSet("yuv_cloud_heal", "v2");
            lsSet(LS_FULL, 0); lsSet(lastKey(), 0);
          }
          CloudDB.pullAndMerge().then(function(res) {
            if (res && res.synced) console.log('☁️ Yuvantara cloud sync active (' + res.users + ' cloud records).');
          });
          CloudDB.startAutoSync();
        }
      }
    });
    // push anything still queued if the tab is closed
    window.addEventListener('pagehide', function() { if (CloudDB.isConfigured()) CloudDB.flush().catch(function() {}); });
  }

  window.YuvantaraCloudDB = CloudDB;
})(window);
