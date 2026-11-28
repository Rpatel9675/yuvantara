'use strict';
// Admin "Issue Documents" API. Records are the single source of truth: PDFs are regenerated from them on demand,
// so a later download has the same certificate number and identical details.
const pdf = require('./pdf');

module.exports = function mount(app, deps) {
  const { requireAdminKey, rateLimit, sendMail, emailReady, getFirestore, cloudData, persistData, escapeHtml, mailShell } = deps;
  const COL = 'issued_documents';
  let chain = Promise.resolve();                       // serialise numbering + writes (single Render instance)
  const locked = fn => { const r = chain.then(fn, fn); chain = r.catch(() => {}); return r; };
  const origin = () => (process.env.CLIENT_ORIGIN || 'https://yuvantaraventure.com').replace(/\/$/, '');

  // ── storage (Firestore if connected, else cloud_db.json) ──
  cloudData.issued = cloudData.issued || {};
  const keyOf = n => String(n).replace(/\//g, '_');
  async function all() {
    const fs = getFirestore();
    if (fs) { const s = await fs.collection(COL).get(); return s.docs.map(d => d.data()); }
    return Object.values(cloudData.issued);
  }
  async function get(no) {
    const fs = getFirestore();
    if (fs) { const d = await fs.collection(COL).doc(keyOf(no)).get(); return d.exists ? d.data() : null; }
    return cloudData.issued[keyOf(no)] || null;
  }
  async function put(rec) {
    const fs = getFirestore();
    if (fs) await fs.collection(COL).doc(keyOf(rec.certNo)).set(rec);
    else { cloudData.issued[keyOf(rec.certNo)] = rec; persistData(); }
  }
  async function nextNumbers(year, list) {
    const mx = (re) => list.reduce((m, r) => { const x = re.exec(r.certNo || '') || re.exec(r.offerRef || ''); return x ? Math.max(m, +x[1]) : m; }, 0);
    return {
      certNo: `YV-${year}-${String(mx(new RegExp('^YV-' + year + '-(\\d+)$')) + 1).padStart(6, '0')}`,
      offerRef: `YV/OL/${year}/${String(mx(new RegExp('^YV/OL/' + year + '/(\\d+)$')) + 1).padStart(4, '0')}`
    };
  }

  const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 200);
  const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
  function validate(b) {
    const r = {
      name: str(b.name, 80), email: str(b.email, 120).toLowerCase(), rollNo: str(b.rollNo, 40), institution: str(b.institution, 120),
      domain: str(b.domain, 100), mode: str(b.mode, 30) || 'Online', startDate: str(b.startDate, 10), endDate: str(b.endDate, 10),
      issueDate: str(b.issueDate, 10) || new Date().toISOString().slice(0, 10), offerDate: str(b.offerDate, 10),
      docType: b.docType === 'offer' ? 'offer' : 'both', attendance: Number(b.attendance), marks: Number(b.marks),
      designation: str(b.designation, 60), location: str(b.location, 80), hours: str(b.hours, 80), reportingTo: str(b.reportingTo, 80),
      stipend: str(b.stipend, 60), minAttendance: str(b.minAttendance, 20), acceptBy: str(b.acceptBy, 10)
    };
    const err = [];
    if (r.name.length < 2 || /[^\x20-\x7E\u00A0-\u00FF\u2019]/.test(r.name)) err.push('name (use English letters only)'); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) err.push('email'); if (!r.domain) err.push('domain');
    if (!isDate(r.startDate)) err.push('startDate'); if (!isDate(r.endDate) || r.endDate < r.startDate) err.push('endDate'); if (!isDate(r.issueDate)) err.push('issueDate');
    if (r.offerDate && !isDate(r.offerDate)) err.push('offerDate'); if (r.acceptBy && !isDate(r.acceptBy)) err.push('acceptBy');
    if (r.docType === 'both') { if (!(r.attendance >= 0 && r.attendance <= 100)) err.push('attendance'); if (!(r.marks >= 0 && r.marks <= 100)) err.push('marks'); }
    if (err.length) return { error: 'Invalid or missing: ' + err.join(', ') };
    if (r.docType === 'offer') { delete r.attendance; delete r.marks; }   // offer letter only: no performance data
    const weeks = Math.max(1, Math.round((Date.parse(r.endDate) - Date.parse(r.startDate)) / 604800000));
    r.weeks = weeks; r.durationLabel = weeks + (weeks === 1 ? ' Week' : ' Weeks'); r.firstName = r.name.split(/\s+/)[0];
    if (!r.offerDate) r.offerDate = r.startDate;
    return { rec: r };
  }

  const build = async (rec, withCert = true) => ({ cert: withCert ? Buffer.from(await pdf.certificate(rec, origin())) : null, offer: Buffer.from(await pdf.offerLetter(rec)) });
  const buf = async (rec, kind) => Buffer.from(kind === 'offer' ? await pdf.offerLetter(rec) : kind === 'invoice' ? await pdf.invoice(rec) : await pdf.certificate(rec, origin()));
  const fname = (rec, kind) => kind === 'offer' ? `Offer-Letter-${rec.offerRef.replace(/\//g, '-')}.pdf` : kind === 'invoice' ? `Invoice-${String(rec.invoiceNo).replace(/\//g, '-')}.pdf` : `Internship-Certificate-${rec.certNo}.pdf`;
  const istDate = (d) => new Date((d || new Date()).getTime() + 19800000).toISOString().slice(0, 10);
  const addDays = (iso, n) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
  const WEEKS = Math.max(1, parseInt(process.env.DEFAULT_INTERNSHIP_WEEKS, 10) || 4);
  const byEmail = async (email) => (await all()).filter(r => r.email === email && r.auto).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
  async function sendKinds(rec, kinds, subject, intro) {
    if (!emailReady()) throw new Error('Email not configured');
    const att = []; for (const k of kinds) att.push({ name: fname(rec, k), content: await buf(rec, k) });
    await sendMail(rec.email, subject, mailShell(subject.split(' | ')[0], `<p>Dear ${escapeHtml(rec.name)},</p>${intro}<p>You can re-download your documents any time at ${origin()}/download-certificate/ using your certificate number <b>${escapeHtml(rec.certNo)}</b> and this email address.</p>`), att);
  }
  // Automatic delivery -- called by the server after a verified payment / a completed course
  const auto = {
    // Payment success -> offer letter + invoice
    onPayment: (a) => locked(() => auto._onPayment(a)),
    onComplete: (a) => locked(() => auto._onComplete(a)),
    async _onPayment({ email, name, orderId, paymentId, amountInr }) {
      email = String(email || '').toLowerCase(); if (!email) return;
      const all0 = await all(); if (all0.some(r => r.paymentId === paymentId)) return; // idempotent
      const today = istDate(), year = today.slice(0, 4), n = await nextNumbers(year, all0);
      const inv = all0.reduce((m, r) => { const x = new RegExp('^YV/INV/' + year + '/(\\d+)$').exec(r.invoiceNo || ''); return x ? Math.max(m, +x[1]) : m; }, 0) + 1;
      const rec = { auto: true, name: (str(name, 80).replace(/[^\x20-\x7E\u00A0-\u00FF\u2019]/g, '').trim()) || 'Student', email, firstName: str(name, 80).split(/\s+/)[0] || 'Student', domain: 'Internship Program', mode: process.env.DEFAULT_INTERNSHIP_MODE || 'Online', ...n,
        invoiceNo: `YV/INV/${year}/${String(inv).padStart(4, '0')}`, paymentId, orderId, amount: amountInr || 236, paidDate: today, issueDate: today, offerDate: today,
        offerStart: today, offerEnd: addDays(today, WEEKS * 7), startDate: today, endDate: addDays(today, WEEKS * 7), weeks: WEEKS, durationLabel: WEEKS + ' Weeks',
        certIssuedAt: null, createdAt: new Date().toISOString(), emailedAt: null };
      await put(rec);
      try { await sendKinds(rec, ['offer', 'invoice'], 'Your Offer Letter & Invoice | Yuvantara Venture', `<p>Thank you for your payment. Attached are your <b>Internship Offer Letter</b> (Ref ${escapeHtml(rec.offerRef)}) and your <b>Invoice</b> (${escapeHtml(rec.invoiceNo)}).</p>`); rec.emailedAt = new Date().toISOString(); await put(rec); }
      catch (e) { console.warn('Auto offer/invoice mail failed:', e.message); }
    },
    // Course completed -> certificate (requires an earlier paid record)
    async _onComplete({ email, name, track, rollNo, institution, attendance, marks, mode }) {
      email = String(email || '').toLowerCase(); const rec = await byEmail(email);
      if (!rec) return { sent: false, reason: 'no-paid-record' };
      if (rec.certIssuedAt) return { sent: false, duplicate: true };
      const today = istDate();
      Object.assign(rec, { certName: str(name, 80) || rec.name, certDomain: str(track, 100) || rec.domain, certRollNo: str(rollNo, 40), certInstitution: str(institution, 120),
        mode: str(mode, 30) || rec.mode, issueDate: today, endDate: today, startDate: rec.offerStart || rec.startDate });
      const w = Math.max(1, Math.round((Date.parse(rec.endDate) - Date.parse(rec.startDate)) / 604800000)); rec.weeks = w; rec.durationLabel = w + (w === 1 ? ' Week' : ' Weeks');
      if (isFinite(parseFloat(attendance))) rec.attendance = Math.min(100, Math.max(0, parseFloat(attendance))); if (isFinite(parseFloat(marks))) rec.marks = Math.min(100, Math.max(0, parseFloat(marks)));
      rec.certIssuedAt = new Date().toISOString(); await put(rec);
      try { await sendKinds(rec, ['certificate'], 'Your Internship Certificate | Yuvantara Venture', `<p>Congratulations on completing <b>${escapeHtml(rec.certDomain || rec.domain)}</b>! Your <b>Internship Certificate</b> (No. ${escapeHtml(rec.certNo)}) is attached.</p>`); rec.emailedAt = new Date().toISOString(); await put(rec); return { sent: true }; }
      catch (e) { rec.certIssuedAt = null; await put(rec); throw e; }
    }
  };
  async function mailDocs(rec) {
    if (!emailReady()) throw new Error('Email is not configured on the server (set BREVO_API_KEY or SMTP_*).');
    const withCert = !!rec.certIssuedAt;   // offer-letter-only records have no certificate
    const f = await build(rec, withCert);
    const offerAtt = { name: `Offer-Letter-${rec.offerRef.replace(/\//g, '-')}.pdf`, content: f.offer };
    if (!withCert) {
      const html1 = mailShell('Your Internship Offer Letter',
        `<p>Dear ${escapeHtml(rec.name)},</p><p>Congratulations! Please find attached your <b>Internship Offer Letter</b> (Ref ${escapeHtml(rec.offerRef)}) for <b>${escapeHtml(rec.domain)}</b>.</p>` +
        `<p>You can re-download it any time at ${origin()}/download-certificate/ using your reference number and email.</p>`);
      return sendMail(rec.email, 'Your Internship Offer Letter | Yuvantara Venture', html1, [offerAtt]);
    }
    const html = mailShell('Your Internship Documents',
      `<p>Dear ${escapeHtml(rec.name)},</p><p>Congratulations! Please find attached your <b>Internship Offer Letter</b> (Ref ${escapeHtml(rec.offerRef)}) and <b>Internship Certificate</b> (No. ${escapeHtml(rec.certNo)}) for <b>${escapeHtml(rec.domain)}</b>.</p>` +
      `<p>You can verify the certificate at ${origin()}/verify-certificate/?id=${encodeURIComponent(rec.certNo)} and re-download it any time from the same page using your certificate number and email.</p>`);
    await sendMail(rec.email, 'Your Internship Offer Letter & Certificate | Yuvantara Venture', html, [
      offerAtt,
      { name: `Internship-Certificate-${rec.certNo}.pdf`, content: f.cert }]);
  }
  // Make sure the person exists in the student database (Firestore `users`, the same collection the admin portal reads).
  // Never overwrites an existing student. Returns 'added' | 'exists' | 'local' (Firestore Admin not connected).
  async function ensureUser(rec) {
    const id = String(rec.email || '').trim().toLowerCase(); if (!id) return 'skipped';
    const done = !!rec.certIssuedAt, now = Date.now();
    const u = { id: 'REG-' + now.toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900), name: rec.name, email: id, phone: '', dob: '',
      track: rec.domain || '', stream: '', college: rec.institution || '', rollNo: rec.rollNo || '', role: 'student', registeredAt: istDate(),
      paymentStatus: 'unpaid', paymentAmount: 0, paymentRef: null, paymentMethod: null, paidAt: null,
      accountStatus: done ? 'completed' : 'active', status: done ? 'completed' : 'active', progress: done ? 100 : 0, modules: [],
      addedBy: 'admin-documents', _ts: now };
    if (done) { u.certificateNumber = rec.certNo; u.issueDate = rec.issueDate; }
    const fs = getFirestore();
    if (fs) {
      const ref = fs.collection('users').doc(id);
      if ((await ref.get()).exists) return 'exists';
      await ref.set(u); return 'added';
    }
    cloudData.users = cloudData.users || [];
    if (cloudData.users.some(x => x && String(x.email).toLowerCase() === id)) return 'exists';
    cloudData.users.push(u); persistData(); return 'local';
  }
  const ready = (res) => { if (!getFirestore() && process.env.REQUIRE_FIRESTORE_FOR_DOCS === 'true') { res.status(503).json({ success: false, error: 'Firestore Admin not connected.' }); return false; } return true; };

  // Admin: issue (create record, optionally email)
  app.post('/api/admin/documents/issue', requireAdminKey, rateLimit(30, 60000), async (req, res) => {
    try {
      if (!ready(res)) return;
      const v = validate(req.body || {}); if (v.error) return res.status(400).json({ success: false, error: v.error });
      const man = str(req.body.certNo, 40);
      if (man && !/^[A-Za-z0-9\-_.]{3,40}$/.test(man)) return res.status(400).json({ success: false, error: 'Invalid certificate number.' });
      const made = await locked(async () => {
        const list = await all(), year = v.rec.issueDate.slice(0, 4), n = await nextNumbers(year, list);
        if (man) n.certNo = man;
        if (await get(n.certNo)) return { conflict: n.certNo };
        const r0 = Object.assign(v.rec, n, { createdAt: new Date().toISOString(), emailedAt: null, certIssuedAt: v.rec.docType === 'offer' ? null : new Date().toISOString() });
        await put(r0); return { rec: r0 };
      });
      if (made.conflict) return res.status(409).json({ success: false, error: 'Certificate number already exists: ' + made.conflict });
      const rec = made.rec;
      let userStatus = 'error', userError = null;
      try { userStatus = await ensureUser(rec); } catch (e) { userError = e.message; console.warn('ensureUser failed:', e.message); }
      let emailed = false, emailError = null;
      if (req.body.sendEmail !== false) { try { await mailDocs(rec); rec.emailedAt = new Date().toISOString(); await put(rec); emailed = true; } catch (e) { emailError = e.message; } }
      res.json({ success: true, record: rec, emailed, emailError, user: userStatus, userError });
    } catch (e) { console.error('issue error', e); res.status(500).json({ success: false, error: e.message }); }
  });
  // Admin: send the certificate later for a record that only got the offer letter (or an auto/paid record)
  async function completeUser(rec) {
    const id = String(rec.email || '').trim().toLowerCase(), now = Date.now();
    const fields = { accountStatus: 'completed', status: 'completed', progress: 100, certificateNumber: rec.certNo, issueDate: rec.issueDate, adminTs: now, _ts: now };
    const fs = getFirestore();
    if (fs) {
      const ref = fs.collection('users').doc(id);
      if ((await ref.get()).exists) { await ref.set(fields, { merge: true }); return 'updated'; }
      return ensureUser(rec);
    }
    const u = (cloudData.users || []).find(x => x && String(x.email).toLowerCase() === id);
    if (u) { Object.assign(u, fields); persistData(); return 'updated-local'; }
    return ensureUser(rec);
  }
  app.post('/api/admin/documents/:no/certificate', requireAdminKey, rateLimit(20, 60000), async (req, res) => {
    try {
      const b = req.body || {};
      const out = await locked(async () => {
        const rec = await get(req.params.no); if (!rec) return { code: 404, error: 'Not found' };
        if (rec.certIssuedAt) return { code: 409, error: 'The certificate was already issued for this record.' };
        const attendance = Number(b.attendance), marks = Number(b.marks);
        if (!(attendance >= 0 && attendance <= 100) || !(marks >= 0 && marks <= 100)) return { code: 400, error: 'Invalid or missing: attendance, marks (0-100)' };
        const issueDate = str(b.issueDate, 10) || istDate(); if (!isDate(issueDate)) return { code: 400, error: 'Invalid issueDate' };
        Object.assign(rec, { attendance, marks, issueDate, certIssuedAt: new Date().toISOString() });
        const endDate = str(b.endDate, 10);
        if (endDate) { if (!isDate(endDate) || (rec.startDate && endDate < rec.startDate)) return { code: 400, error: 'Invalid endDate' }; rec.endDate = endDate; }
        if (rec.startDate && rec.endDate) { const w = Math.max(1, Math.round((Date.parse(rec.endDate) - Date.parse(rec.startDate)) / 604800000)); rec.weeks = w; rec.durationLabel = w + (w === 1 ? ' Week' : ' Weeks'); }
        await put(rec); return { rec };
      });
      if (out.error) return res.status(out.code).json({ success: false, error: out.error });
      const rec = out.rec;
      let userStatus = 'error', userError = null;
      try { userStatus = await completeUser(rec); } catch (e) { userError = e.message; console.warn('completeUser failed:', e.message); }
      let emailed = false, emailError = null;
      if (b.sendEmail !== false) {
        try {
          await sendKinds(rec, ['certificate'], 'Your Internship Certificate | Yuvantara Venture',
            `<p>Congratulations on completing <b>${escapeHtml(rec.domain)}</b>! Your <b>Internship Certificate</b> (No. ${escapeHtml(rec.certNo)}) is attached.</p><p>You can verify it at ${origin()}/verify-certificate/?id=${encodeURIComponent(rec.certNo)}.</p>`);
          rec.emailedAt = new Date().toISOString(); await put(rec); emailed = true;
        } catch (e) { emailError = e.message; }
      }
      res.json({ success: true, record: rec, emailed, emailError, user: userStatus, userError });
    } catch (e) { console.error('certificate error', e); res.status(500).json({ success: false, error: e.message }); }
  });
  app.get('/api/admin/documents', requireAdminKey, async (req, res) => {
    try { const l = await all(); l.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')); res.json({ success: true, records: l }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });
  app.post('/api/admin/documents/:no/resend', requireAdminKey, rateLimit(20, 60000), async (req, res) => {
    try { const rec = await get(req.params.no); if (!rec) return res.status(404).json({ success: false, error: 'Not found' }); await mailDocs(rec); rec.emailedAt = new Date().toISOString(); await put(rec); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });
  app.get('/api/admin/documents/:no/pdf/:kind', requireAdminKey, async (req, res) => {
    try { const rec = await get(req.params.no); if (!rec) return res.status(404).json({ success: false, error: 'Not found' }); await send(res, rec, req.params.kind); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });
  // Admin preview without saving
  app.post('/api/admin/documents/preview/:kind', requireAdminKey, rateLimit(30, 60000), async (req, res) => {
    try { const v = validate(req.body || {}); if (v.error) return res.status(400).json({ success: false, error: v.error });
      Object.assign(v.rec, { certNo: str(req.body.certNo, 40) || 'YV-' + v.rec.issueDate.slice(0, 4) + '-PREVIEW', offerRef: 'YV/OL/' + v.rec.issueDate.slice(0, 4) + '/PREVIEW' }); await send(res, v.rec, req.params.kind); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });
  async function send(res, rec, kind) {
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fname(rec, kind)}"`, 'Cache-Control': 'no-store' });
    res.send(await buf(rec, kind));
  }
  // Public: verify (limited fields)
  app.get('/api/documents/verify/:no', rateLimit(30, 60000), async (req, res) => {
    try { const r = await get(req.params.no); if (!r || !r.certIssuedAt) return res.status(404).json({ success: false, error: 'Not found' });
      res.json({ success: true, certificate: { certNo: r.certNo, name: r.name, domain: r.domain, mode: r.mode, startDate: r.startDate, endDate: r.endDate, issueDate: r.issueDate, institution: r.institution } }); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });
  // Public: re-download (needs certificate no + email on record)
  app.post('/api/documents/download', rateLimit(8, 60000), async (req, res) => {
    try {
      const r = await get(str(req.body && req.body.certNo, 40));
      if (!r || r.email !== str(req.body.email, 120).toLowerCase()) return res.status(404).json({ success: false, error: 'No matching certificate for that number and email.' });
      const kind = ['offer', 'invoice'].includes(req.body.kind) ? req.body.kind : 'certificate';
      if (kind === 'invoice' && !r.invoiceNo) return res.status(404).json({ success: false, error: 'No invoice for this record.' });
      if (kind === 'certificate' && !r.certIssuedAt) return res.status(409).json({ success: false, error: 'Your certificate is issued after you complete the course.' });
      await send(res, r, kind);
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });
  return auto;
};
