#!/usr/bin/env node
// Replaces the publicly visible seed passwords in assets/db.js with freshly generated random ones.
// Only the SHA-256 hashes are written into db.js. The plain passwords are written ONCE to a private file
// that you must store in a password manager and then delete.
//
// Usage (from project root):  node tools/rotate-admin-passwords.js [output-file]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, '..', 'assets', 'db.js');
const OUT_FILE = process.argv[2] || path.join(__dirname, '..', '..', 'PRIVATE_admin_credentials.txt');
const SALT = 'YUVANTARA_DEFENSE_PROD_SALT_@2026_PATNA#';   // must match assets/db.js

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%&*-_';
function randomPassword(len) {
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;   // ASCII only: the in-browser hash function is ASCII-based
}
function hash(pw) { return 'SHA256$' + crypto.createHash('sha256').update(SALT + pw + SALT).digest('hex'); }

let src = fs.readFileSync(DB_FILE, 'utf8');
const re = /(email:\s*'([^']+)',\s*\n\s*passwordHash:\s*)hashPassword\('([^']*)'\)/g;
const creds = [];
src = src.replace(re, (m, head, email) => {
  const pw = randomPassword(18);
  creds.push({ email, pw });
  return head + "'" + hash(pw) + "'";
});
if (!creds.length) { console.error('No hashPassword(...) seed entries found - already rotated?'); process.exit(1); }
fs.writeFileSync(DB_FILE, src);

const adminLines = creds.filter(c => /@admin$|@supper$/.test(c.email)).map(c => `${c.email.padEnd(20)} ${c.pw}`);
fs.writeFileSync(OUT_FILE,
  'YUVANTARA ADMIN LOGINS - generated ' + new Date().toISOString() + '\n' +
  'Store these in a password manager, then DELETE this file. Never commit it.\n\n' +
  'Admin login page: /admin_login_777/\n\n' + adminLines.join('\n') + '\n');
console.log('Rotated ' + creds.length + ' seed passwords. Admin logins written to: ' + OUT_FILE);
