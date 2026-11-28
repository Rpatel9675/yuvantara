'use strict';
// Deterministic PDF generator for Yuvantara internship certificate + offer letter.
// Same record in => same document out (no random values, fixed creation dates).
const fs = require('fs'), path = require('path'), vm = require('vm');
let PDFLib;
try { PDFLib = require('pdf-lib'); } catch (e) { PDFLib = require('/opt/npm-tools/node_modules/pdf-lib'); }
const { PDFDocument, StandardFonts, rgb } = PDFLib;

const A = f => fs.readFileSync(path.join(__dirname, 'assets', f));
const BLUE = rgb(0.106, 0.263, 0.514), GOLD = rgb(0.72, 0.525, 0.043), GOLDL = rgb(0.88, 0.72, 0.4),
      INK = rgb(0.1, 0.1, 0.1), GREY = rgb(0.35, 0.35, 0.35), PALE = rgb(0.87, 0.89, 0.93);

// QR (reuses the site's generator)
let QR;
function qrMatrix(text) {
  if (!QR) {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'qr-generator.js'), 'utf8');
    const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(src, ctx); QR = ctx.window.YuvantaraQR;
  }
  const svg = QR.toSVG(text, 100), size = 100;
  const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)"/g)].map(m => [+m[1], +m[2]]);
  const cells = [...svg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)"/g)].map(m => +m[1]);
  return { rects, cell: cells[0] || 1, size };
}
function drawQR(page, text, x, y, s) {
  const m = qrMatrix(text), k = s / m.size;
  page.drawRectangle({ x: x - 3, y: y - 3, width: s + 6, height: s + 6, color: rgb(1, 1, 1) });
  for (const [cx, cy] of m.rects) page.drawRectangle({ x: x + cx * k, y: y + s - (cy + m.cell) * k, width: m.cell * k + 0.1, height: m.cell * k + 0.1, color: rgb(0.06, 0.09, 0.16) });
}

const clean = s => String(s == null ? '' : s).replace(/[^\x20-\x7E -ÿ–—‘’“”•₹]/g, '').replace(/₹/g, 'Rs.');
const fmtDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : clean(iso); };
const fmtDash = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : clean(iso); };
const fmtLong = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); if (!m) return clean(iso); const mn = ['January','February','March','April','May','June','July','August','September','October','November','December']; return `${+m[3]} ${mn[+m[2]-1]} ${m[1]}`; };
const showBadges = () => String(process.env.DOC_SHOW_PARTNER_BADGES || 'true').toLowerCase() !== 'false';

async function newDoc(title, rec) {
  const doc = await PDFDocument.create();
  doc.setTitle(title); doc.setAuthor('Yuvantara Venture'); doc.setCreator('Yuvantara Venture'); doc.setProducer('Yuvantara Venture');
  const d = new Date(rec.issueDate ? rec.issueDate + 'T00:00:00Z' : 0); doc.setCreationDate(d); doc.setModificationDate(d);
  const F = {
    r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold),
    i: await doc.embedFont(StandardFonts.TimesRomanItalic), bi: await doc.embedFont(StandardFonts.TimesRomanBoldItalic)
  };
  const I = {};
  for (const n of ['logo-full','logo-watermark','sig-shalu','sig-preeti','badge-msme','badge-iso','badge-aicte','badge-nip','badge-startup-bihar']) I[n] = await doc.embedPng(A(n + '.png'));
  return { doc, F, I };
}
const center = (page, txt, font, size, y, color, cx) => { const w = font.widthOfTextAtSize(txt, size); page.drawText(txt, { x: (cx == null ? page.getWidth() / 2 : cx) - w / 2, y, size, font, color }); };
function fit(font, txt, size, maxW) { while (size > 8 && font.widthOfTextAtSize(txt, size) > maxW) size -= 0.5; return size; }
function wrap(font, size, text, maxW) {
  const out = []; let line = '';
  for (const w of String(text).split(/\s+/)) { const t = line ? line + ' ' + w : w; if (font.widthOfTextAtSize(t, size) > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
function justified(page, font, size, text, x, y, maxW, lead, color) {
  const lines = wrap(font, size, text, maxW);
  lines.forEach((ln, i) => {
    const words = ln.split(' ');
    if (i === lines.length - 1 || words.length < 2) { page.drawText(ln, { x, y, size, font, color }); }
    else { const tw = words.reduce((a, w) => a + font.widthOfTextAtSize(w, size), 0), gap = (maxW - tw) / (words.length - 1); let cx = x; for (const w of words) { page.drawText(w, { x: cx, y, size, font, color }); cx += font.widthOfTextAtSize(w, size) + gap; } }
    y -= lead;
  });
  return y;
}
function signatures(page, F, I, y, xs, scaleW) {
  const sig = [[I['sig-shalu'], 'Shalu Shimpi Kumari', 'Founder & Managing Director', 'Yuvantara Venture'], [I['sig-preeti'], 'Preeti Kumari', 'Co-Founder & Chief Technology Officer', 'AI & Solutions Architecture']];
  sig.forEach(([img, name, title, sub], i) => {
    const w = scaleW, h = w * img.height / img.width, cx = xs[i];
    page.drawImage(img, { x: cx - w / 2, y: y + 4, width: w, height: h });
    page.drawLine({ start: { x: cx - w / 2 - 6, y }, end: { x: cx + w / 2 + 6, y }, thickness: 0.8, color: GREY });
    center(page, name, F.b, 10.5, y - 14, INK, cx); center(page, title, F.r, 8.5, y - 26, GREY, cx); center(page, sub, F.r, 8.5, y - 37, GREY, cx);
  });
}
function badges(page, I, y, x0) {
  if (!showBadges()) return;
  const b = [['badge-msme', 58, 46], ['badge-iso', 50, 46], ['badge-aicte', 46, 46], ['badge-nip', 84, 45], ['badge-startup-bihar', 46, 46]]; let x = x0;
  for (const [n, w, h] of b) { page.drawImage(I[n], { x, y, width: w, height: h }); x += w + 14; }
}

// ───────────── CERTIFICATE (A4 landscape) ─────────────
async function certificate(rec0, verifyBase) {
  const rec = Object.assign({}, rec0, { name: rec0.certName || rec0.name, rollNo: rec0.certRollNo != null ? rec0.certRollNo : rec0.rollNo, institution: rec0.certInstitution != null ? rec0.certInstitution : rec0.institution, domain: rec0.certDomain || rec0.domain });
  rec.firstName = rec0.certName ? rec.name.split(/\s+/)[0] : rec0.firstName;
  const { doc, F, I } = await newDoc('Internship Certificate - ' + clean(rec.name), rec);
  const W = 841.89, H = 595.28, p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
  // watermark
  const ww = 250, wh = ww * I['logo-watermark'].height / I['logo-watermark'].width;
  p.drawImage(I['logo-watermark'], { x: (W - ww) / 2, y: 105, width: ww, height: wh, opacity: 0.35 });
  // border + corner shapes
  p.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: GOLDL, borderWidth: 3 });
  p.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: BLUE, borderWidth: 0.8 });
  const tri = (pts, c) => p.drawSvgPath(`M ${pts[0][0]} ${H - pts[0][1]} L ${pts[1][0]} ${H - pts[1][1]} L ${pts[2][0]} ${H - pts[2][1]} Z`, { color: c, borderWidth: 0 });
  tri([[0, 0], [150, 0], [0, 150]], PALE); tri([[0, 0], [110, 0], [0, 110]], BLUE);
  tri([[W, H], [W - 150, H], [W, H - 150]], PALE); tri([[W, H], [W - 110, H], [W, H - 110]], BLUE);
  tri([[W, 0], [W - 70, 0], [W, 70]], rgb(0.18, 0.16, 0.48)); tri([[0, H], [70, H], [0, H - 70]], rgb(0.18, 0.16, 0.48));
  // logo + title
  const lw = 78, lh = lw * I['logo-full'].height / I['logo-full'].width;
  p.drawImage(I['logo-full'], { x: W / 2 - lw / 2, y: H - 40 - lh, width: lw, height: lh });
  center(p, 'Certificate of Internship', F.i, 46, 437, INK);
  center(p, 'PRESENTED TO', F.r, 13, 405, GREY);
  const nm = clean(rec.name); center(p, nm, F.bi, fit(F.bi, nm, 36, 640), 365, GOLD);
  p.drawLine({ start: { x: W / 2 - 200, y: 356 }, end: { x: W / 2 + 200, y: 356 }, thickness: 0.8, color: GOLDL });
  if (rec.rollNo) center(p, 'University Roll No: ' + clean(rec.rollNo) + (rec.institution ? '   |   ' + clean(rec.institution) : ''), F.r, fit(F.r, 'University Roll No:  ' + clean(rec.rollNo) + (rec.institution ? '   |   ' + clean(rec.institution) : ''), 12, 640), 338, GREY);
  center(p, `has successfully completed a ${clean(rec.durationLabel || (rec.weeks + ' Weeks'))} ${clean(rec.mode || 'Online')} internship training in`, F.r, 13, 312, INK);
  const dom = clean(rec.domain); center(p, dom, F.b, fit(F.b, dom, 18, 640), 285, BLUE);
  center(p, `from ${fmtDash(rec.startDate)} to ${fmtDash(rec.endDate)}.`, F.r, 13, 262, INK);
  const hasA = isFinite(parseFloat(rec.attendance)), hasM = isFinite(parseFloat(rec.marks));
  const perf = (hasA || hasM) ? ' The student ' + [hasA ? `maintained ${clean(rec.attendance)}% attendance` : '', hasM ? `secured ${clean(rec.marks)}% marks in the final assessment` : ''].filter(Boolean).join(' and ') + '.' : '';
  const desc = 'During this internship, the intern has learned key concepts in the above mentioned domain with practical assignments and project.' + perf + ' We appreciate their sincere participation and wish them the best for future opportunities.';
  justified(p, F.r, 11, desc, 110, 244, W - 220, 14.5, GREY);
  // QR + meta
  const verify = `${verifyBase}/verify-certificate/?id=${encodeURIComponent(rec.certNo)}`;
  drawQR(p, verify, 48, 76, 60);
  p.drawText('Scan QR to verify', { x: 38, y: 62, size: 7.5, font: F.r, color: GREY });
  p.drawText('this certificate', { x: 42, y: 53, size: 7.5, font: F.r, color: GREY });
  p.drawText('Certificate No. :  ' + clean(rec.certNo), { x: 48, y: 185, size: 10, font: F.b, color: INK });
  p.drawText('Date of Issue    :  ' + fmtDate(rec.issueDate), { x: 48, y: 170, size: 10, font: F.r, color: INK });
  signatures(p, F, I, 168, [330, 520], 105);
  // seal
  p.drawCircle({ x: 725, y: 175, size: 30, color: rgb(0.89, 0.77, 0.42) }); p.drawCircle({ x: 725, y: 175, size: 24, borderColor: rgb(1, 1, 1), borderWidth: 1 });
  center(p, 'YUVANTARA', F.b, 6, 177, rgb(1, 1, 1), 725); center(p, 'VENTURE', F.b, 6, 169, rgb(1, 1, 1), 725);
  badges(p, I, 64, 200);
  return doc.save();
}

// ───────────── OFFER LETTER (A4 portrait, 4 pages) ─────────────
const CONDITIONS = [
  'Your acceptance of this offer by signing and returning a copy of this letter on or before {ACCEPT}.',
  'Your reporting for the internship on {START}. If you fail to report without prior written intimation, this offer stands withdrawn automatically without any further notice.',
  'Submission of the documents listed in Annexure B on or before the Start Date.',
  'The accuracy of all information and documents furnished by you. Any misrepresentation or omission of a material fact shall entitle the Company to withdraw this offer or terminate the internship at any time without notice.'
];
const TERMS = [
  ['Nature of Internship', 'This is a fixed-term, learning-based engagement for the period stated above. It does not create an employer–employee relationship and does not entitle you to employment, benefits or a pre-placement offer unless separately agreed in writing.'],
  ['Stipend', '{STIPEND}'],
  ['Reporting & Schedule', 'You will report to the Program Coordinator / Mentor nominated by the Company. Your working hours will be: {HOURS}. The Company may vary the schedule based on training or business requirements.'],
  ['Attendance & Conduct', 'You are expected to maintain a minimum of 75% attendance, complete all assigned tasks, assignments and projects on time, and follow the instructions and policies of the Company. Absence for three (3) consecutive working days without prior approval may result in termination of the internship.'],
  ['Confidentiality', 'During and after the internship you shall not disclose or misuse any confidential information of the Company or its clients, including source code, project documents, credentials, data and business plans, except as required for your assigned work.'],
  ['Intellectual Property', 'All work, code, designs, documentation and other material created by you in the course of the internship shall be the exclusive property of the Company. You shall not retain, copy or publish such material without the Company’s prior written consent.'],
  ['Use of Company Resources', 'Company systems, accounts, tools and communication channels are to be used for official purposes only and may be monitored for security and compliance. All Company assets and materials must be returned at the end of the internship.'],
  ['Assessment & Certificate', 'On successful completion of the internship, including meeting the attendance requirement and the final assessment, the Company will issue a Certificate of Internship carrying a unique certificate number and a QR code for verification.'],
  ['Termination', 'Either party may end the internship by giving 7 days’ written notice. The Company may terminate the internship immediately and without notice for misconduct, breach of confidentiality, violation of Company policies or misrepresentation.'],
  ['Data Privacy', 'You consent to the Company collecting, storing and processing your personal information for internship administration, verification and certification, and sharing it with your academic institution and legal authorities where required.'],
  ['Governing Law', 'This letter is governed by the laws of India, and any dispute arising out of it shall be subject to the exclusive jurisdiction of the courts of competent jurisdiction in India.'],
  ['Entire Understanding', 'This letter and its annexures constitute the entire understanding between you and the Company regarding the internship. Any amendment must be made in writing by the Company.']
];
const ANNEX_B = [
  'Copy of your college / university ID card and current-semester fee receipt or bonafide certificate.',
  'Copy of a government photo ID (Aadhaar / PAN / Passport / Driving Licence).',
  'Recent passport-size photograph (white background) for ID and records.',
  'Updated resume / CV.',
  'No-objection or training-permission letter from your institution, if required by your institution.',
  'Signed copy of this Offer Letter and its annexures.'
];
const addDaysIso = (iso, n) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);

async function offerLetter(rec0) {
  const rec = Object.assign({}, rec0, { startDate: rec0.offerStart || rec0.startDate, endDate: rec0.offerEnd || rec0.endDate });
  { const w = Math.max(1, Math.round((Date.parse(rec.endDate) - Date.parse(rec.startDate)) / 604800000)); rec.durationLabel = rec0.offerStart ? w + (w === 1 ? ' Week' : ' Weeks') : rec.durationLabel; }
  const { doc, F, I } = await newDoc('Internship Offer Letter - ' + clean(rec.name), { issueDate: rec.offerDate || rec.issueDate });
  const W = 595.28, H = 841.89, M = 54, TW = W - 2 * M;
  const name = clean(rec.name), domain = clean(rec.domain), mode = clean(rec.mode || 'Online');
  const dur = clean(rec.durationLabel || (rec.weeks + ' Weeks')), start = fmtDash(rec.startDate), end = fmtDash(rec.endDate);
  const accept = fmtDash(rec.acceptBy || addDaysIso(rec.offerDate || rec.issueDate, 7));
  const hours = clean(rec.hours || 'As per the internship schedule shared at onboarding');
  const stipend = rec.stipend ? 'A stipend of ' + clean(rec.stipend) + ' is payable as communicated in writing by the Company.' : 'No stipend or remuneration is payable for this internship unless communicated in writing by the Company.';
  const location = clean(rec.location || (/offline/i.test(mode) ? 'Company office / designated training venue' : 'Online (remote)'));
  const fill = t => t.replace('{ACCEPT}', accept).replace('{START}', start).replace('{STIPEND}', stipend).replace('{HOURS}', hours);
  const frame = n => {
    const p = doc.addPage([W, H]);
    p.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: BLUE }); p.drawRectangle({ x: 0, y: H - 9, width: W, height: 3, color: GOLDL });
    p.drawImage(I['logo-full'], { x: M, y: H - 68, width: 38, height: 38 * I['logo-full'].height / I['logo-full'].width });
    p.drawText('YUVANTARA VENTURE', { x: M + 48, y: H - 46, size: 16, font: F.b, color: BLUE });
    p.drawText('Offer Letter – Internship', { x: M + 48, y: H - 60, size: 9, font: F.r, color: GREY });
    p.drawLine({ start: { x: M, y: H - 76 }, end: { x: W - M, y: H - 76 }, thickness: 0.8, color: GOLDL });
    const ww = 300; p.drawImage(I['logo-watermark'], { x: (W - ww) / 2, y: 250, width: ww, height: ww * I['logo-watermark'].height / I['logo-watermark'].width, opacity: 0.15 });
    p.drawLine({ start: { x: M, y: 48 }, end: { x: W - M, y: 48 }, thickness: 0.5, color: PALE });
    p.drawText('Strictly Private & Confidential', { x: M, y: 34, size: 8, font: F.r, color: GREY });
    center(p, `Page ${n} of 4`, F.r, 8, 34, GREY);
    const t = 'Candidate initials: ________'; p.drawText(t, { x: W - M - F.r.widthOfTextAtSize(t, 8), y: 34, size: 8, font: F.r, color: GREY });
    return p;
  };
  const SZ = 9.4, LD = 12.4;
  let p = frame(1), y = H - 98;
  const para = (t, x, w, f, c) => { y = justified(p, f || F.r, SZ, t, x == null ? M : x, y, w || TW, LD, c || INK); };
  const numbered = (items, withHead) => items.forEach((it, i) => {
    const txt = withHead ? `${i + 1}. ${it[0]}: ` : `${i + 1}. `, body = fill(withHead ? it[1] : it);
    const lines = wrap(F.r, SZ, txt + body, TW - 14);
    // bold lead-in (heading) drawn over first line
    let first = true;
    lines.forEach((ln, li) => {
      const x = M + (li === 0 ? 0 : 14);
      if (withHead && li === 0) { const hw = F.b.widthOfTextAtSize(txt, SZ); p.drawText(txt, { x, y, size: SZ, font: F.b, color: INK }); drawJ(p, F.r, SZ, ln.slice(txt.length), x + hw, y, TW - 14 - hw + (li === 0 ? 14 : 0) - 14 + 14 - 14 + 0, lines.length === 1, INK); }
      else drawJ(p, F.r, SZ, ln, x, y, TW - (li === 0 ? 0 : 14), li === lines.length - 1, INK);
      y -= LD;
    });
    y -= 3;
  });
  function drawJ(page, font, size, ln, x, yy, w, last, color) {
    const words = ln.trim().split(' ');
    if (last || words.length < 2) return page.drawText(ln.trim(), { x, y: yy, size, font, color });
    const tw = words.reduce((a, s) => a + font.widthOfTextAtSize(s, size), 0), gap = (w - tw) / (words.length - 1); let cx = x;
    for (const s of words) { page.drawText(s, { x: cx, y: yy, size, font, color }); cx += font.widthOfTextAtSize(s, size) + gap; }
  }
  p.drawText('Ref. No.: ' + clean(rec.offerRef), { x: M, y, size: 9.5, font: F.b, color: INK });
  const dt = fmtDash(rec.offerDate || rec.issueDate); p.drawText(dt, { x: W - M - F.r.widthOfTextAtSize(dt, 9.5), y, size: 9.5, font: F.r, color: INK });
  y -= 22; p.drawText(name, { x: M, y, size: 11, font: F.b, color: INK });
  if (rec.rollNo) { y -= 13; p.drawText('University Roll No: ' + clean(rec.rollNo), { x: M, y, size: 9.5, font: F.r, color: GREY }); }
  y -= 20; p.drawText(`Dear ${name},`, { x: M, y, size: 10, font: F.r, color: INK });
  y -= 20; { const h = 'Offer Letter for Internship – ' + domain; p.drawText(h, { x: M, y, size: fit(F.b, h, 13, TW), font: F.b, color: BLUE }); }
  y -= 18;
  para(`Congratulations! With reference to your application and subsequent interactions with us, we are pleased to offer you an internship with Yuvantara Venture (the “Company”) in the domain of ${domain}. We believe your skills and enthusiasm will be a valuable addition to our programs.`); y -= 4;
  para(`We would like to welcome you to our team as an Intern – ${domain} for a period of ${dur} (${mode}), from ${start} to ${end}. The details are set out in Annexure A.`); y -= 4;
  para('This offer is valid subject to and conditioned upon the following:'); y -= 1;
  numbered(CONDITIONS.map(fill), false);
  y -= 4; p.drawText('TERMS & CONDITIONS OF INTERNSHIP', { x: M, y, size: 10, font: F.b, color: BLUE }); y -= 15;
  para('You will be governed by the policies of the Company applicable to interns. The Company may amend its policies from time to time and will communicate such changes appropriately.'); y -= 3;
  const page1Terms = TERMS.slice(0, 6), page2Terms = TERMS.slice(6);
  const termsAt = (list, off) => list.forEach((t, i) => {
    const txt = `${off + i + 1}. ${t[0]}: `, body = fill(t[1]), lines = wrap(F.r, SZ, txt + body, TW - 14);
    lines.forEach((ln, li) => {
      const x = M + (li === 0 ? 0 : 14), w = TW - (li === 0 ? 0 : 14), last = li === lines.length - 1;
      if (li === 0) { const hw = F.b.widthOfTextAtSize(txt, SZ); p.drawText(txt, { x, y, size: SZ, font: F.b, color: INK }); drawJ(p, F.r, SZ, ln.slice(txt.length), x + hw + 2, y, w - hw - 2, last, INK); }
      else drawJ(p, F.r, SZ, ln, x, y, w, last, INK);
      y -= LD;
    }); y -= 3;
  });
  termsAt(page1Terms, 0);
  // page 2
  p = frame(2); y = H - 98;
  termsAt(page2Terms, 6);
  y -= 6; para(`Please acknowledge your acceptance of this offer and its terms and conditions by signing the duplicate copy of this letter and the annexures and returning it to us on or before ${accept}.`); y -= 4;
  para('We welcome you to Yuvantara Venture and wish you a rewarding learning experience.'); y -= 6;
  p.drawText('Thanking you,', { x: M, y, size: SZ + 0.6, font: F.r, color: INK }); y -= 13; p.drawText('Yours faithfully,', { x: M, y, size: SZ + 0.6, font: F.r, color: INK }); y -= 13; p.drawText('Yuvantara Venture', { x: M, y, size: SZ + 0.6, font: F.b, color: INK });
  signatures(p, F, I, Math.max(y - 62, 232), [M + 105, W - M - 115], 105);
  const by = 70; p.drawRectangle({ x: M, y: by, width: TW, height: 96, borderColor: BLUE, borderWidth: 0.8 });
  p.drawText('CANDIDATE’S ACCEPTANCE', { x: M + 10, y: by + 78, size: 10, font: F.b, color: BLUE });
  justified(p, F.r, 9, `I, ${name}, have read and understood this letter and its annexures and accept the offer on the stated terms.`, M + 10, by + 62, TW - 20, 12, INK);
  p.drawText('Signature: ______________________', { x: M + 10, y: by + 30, size: 9.5, font: F.r, color: INK });
  p.drawText('Date: ____ / ____ / ________', { x: M + 270, y: by + 30, size: 9.5, font: F.r, color: INK });
  p.drawText('Name of Intern: ' + name, { x: M + 10, y: by + 10, size: 9.5, font: F.r, color: INK });
  // page 3
  p = frame(3); y = H - 100;
  p.drawText('Annexure A', { x: M, y, size: 14, font: F.b, color: BLUE }); y -= 16; p.drawText('INTERNSHIP DETAILS SHEET', { x: M, y, size: 9.5, font: F.b, color: GREY }); y -= 18;
  const rows = [['Name', name], ['University Roll No', rec.rollNo || '—'], ['Institution', rec.institution || '—'], ['Designation', 'Intern – ' + domain], ['Domain', domain],
    ['Mode', mode], ['Work Location', location], ['Start Date', start], ['End Date', end], ['Duration', dur], ['Working Hours', hours],
    ['Reporting To', clean(rec.reportingTo || 'Program Coordinator / Mentor nominated by the Company')], ['Stipend', rec.stipend ? clean(rec.stipend) : 'Not applicable'], ['Minimum Attendance', clean(rec.minAttendance || '75%')], ['Completion Certificate', 'Issued on successful completion (QR-verifiable)']];
  rows.forEach(([k, v], i) => {
    const rh = 28; p.drawRectangle({ x: M, y: y - rh + 8, width: TW, height: rh, color: i % 2 ? rgb(1, 1, 1) : rgb(0.95, 0.96, 0.98), borderColor: PALE, borderWidth: 0.5 });
    p.drawText(k, { x: M + 10, y: y - 10, size: 9.5, font: F.b, color: INK });
    const vv = clean(v); p.drawText(vv, { x: M + 180, y: y - 10, size: fit(F.r, vv, 9.5, TW - 190), font: F.r, color: INK }); y -= rh;
  });
  y -= 14; justified(p, F.r, 9, 'Note: The Company may revise the schedule, mentor or location for operational reasons and will inform you in writing.', M, y, TW, 12, GREY);
  // page 4
  p = frame(4); y = H - 100;
  p.drawText('Annexure B', { x: M, y, size: 14, font: F.b, color: BLUE }); y -= 16; p.drawText('ON-BOARDING DOCUMENTATION', { x: M, y, size: 9.5, font: F.b, color: GREY }); y -= 22;
  p.drawText('On or before the Start Date, the following documents should be submitted to the Company:', { x: M, y, size: 10, font: F.r, color: INK }); y -= 20;
  for (const t of ANNEX_B) { const ls = wrap(F.r, 10, t, TW - 22); p.drawText('•', { x: M + 4, y, size: 10, font: F.b, color: GOLD }); ls.forEach(l => { p.drawText(l, { x: M + 18, y, size: 10, font: F.r, color: INK }); y -= 14; }); y -= 6; }
  badges(p, I, 90, 150);
  return doc.save();
}

// ───────────── INVOICE (A4 portrait) ─────────────
async function invoice(rec) {
  const { doc, F, I } = await newDoc('Invoice - ' + clean(rec.invoiceNo), { issueDate: rec.paidDate || rec.issueDate });
  const W = 595.28, H = 841.89, M = 56, TW = W - 2 * M, p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: BLUE }); p.drawRectangle({ x: 0, y: H - 9, width: W, height: 3, color: GOLDL });
  p.drawImage(I['logo-full'], { x: M, y: H - 70, width: 40, height: 40 * I['logo-full'].height / I['logo-full'].width });
  p.drawText('YUVANTARA VENTURE', { x: M + 50, y: H - 48, size: 16, font: F.b, color: BLUE });
  p.drawText('Patna, Bihar, India  |  yuvantaraventure.com', { x: M + 50, y: H - 62, size: 9, font: F.r, color: GREY });
  p.drawText('INVOICE', { x: W - M - F.b.widthOfTextAtSize('INVOICE', 22), y: H - 50, size: 22, font: F.b, color: GOLD });
  p.drawLine({ start: { x: M, y: H - 82 }, end: { x: W - M, y: H - 82 }, thickness: 0.8, color: GOLDL });
  p.drawImage(I['logo-watermark'], { x: (W - 300) / 2, y: 250, width: 300, height: 300 * I['logo-watermark'].height / I['logo-watermark'].width, opacity: 0.15 });
  let y = H - 112; const kv = (k, v, x) => { p.drawText(k, { x, y, size: 9, font: F.r, color: GREY }); p.drawText(clean(v), { x, y: y - 13, size: 10.5, font: F.b, color: INK }); };
  kv('Invoice No.', rec.invoiceNo, M); kv('Invoice Date', fmtLong(rec.paidDate || rec.issueDate), M + 190); kv('Payment Status', 'PAID', M + 380);
  y -= 42; p.drawText('Billed To', { x: M, y, size: 9, font: F.r, color: GREY }); p.drawText(clean(rec.name), { x: M, y: y - 14, size: 12, font: F.b, color: INK }); p.drawText(clean(rec.email), { x: M, y: y - 28, size: 10, font: F.r, color: GREY });
  y -= 64; p.drawRectangle({ x: M, y: y - 6, width: TW, height: 24, color: BLUE });
  p.drawText('Description', { x: M + 10, y: y + 2, size: 10, font: F.b, color: rgb(1, 1, 1) }); const h2 = 'Amount (INR)'; p.drawText(h2, { x: W - M - 10 - F.b.widthOfTextAtSize(h2, 10), y: y + 2, size: 10, font: F.b, color: rgb(1, 1, 1) });
  const total = Number(rec.amount) || 236, base = Math.round(total / 1.18 * 100) / 100, gst = Math.round((total - base) * 100) / 100, f2 = n => n.toFixed(2);
  const row = (a, b, bold) => { y -= 26; p.drawText(a, { x: M + 10, y, size: 10, font: bold ? F.b : F.r, color: INK }); const t = String(b); p.drawText(t, { x: W - M - 10 - (bold ? F.b : F.r).widthOfTextAtSize(t, 10), y, size: 10, font: bold ? F.b : F.r, color: INK }); p.drawLine({ start: { x: M, y: y - 8 }, end: { x: W - M, y: y - 8 }, thickness: 0.4, color: PALE }); };
  row('Internship enrolment & documentation fee' + (rec.domain ? ' - ' + clean(rec.domain) : ''), f2(base)); row('GST @ 18% (incl.)', f2(gst)); row('Total paid', 'Rs. ' + f2(total), true);
  y -= 44; p.drawText('Payment details', { x: M, y, size: 11, font: F.b, color: BLUE });
  [['Payment ID', rec.paymentId], ['Order ID', rec.orderId], ['Payment method', 'Razorpay (online)'], ['Paid on', fmtLong(rec.paidDate || rec.issueDate)]].forEach(([k, v]) => { y -= 16; p.drawText(k, { x: M, y, size: 9.5, font: F.r, color: GREY }); p.drawText(clean(v || '-'), { x: M + 120, y, size: 9.5, font: F.b, color: INK }); });
  y -= 36; justified(p, F.r, 9, 'This is a computer-generated invoice and does not require a signature. For queries, write to the email address you received this from, quoting the invoice number.', M, y, TW, 12, GREY);
  p.drawLine({ start: { x: M, y: 48 }, end: { x: W - M, y: 48 }, thickness: 0.5, color: PALE }); p.drawText('Yuvantara Venture - Thank you for learning with us.', { x: M, y: 34, size: 8, font: F.r, color: GREY });
  return doc.save();
}

module.exports = { certificate, offerLetter, invoice };
