// fix_logo_final.js
// Ganti SVG placeholder dengan logo_jatim.png asli (resized 200x200)
// + embed base64 sebagai onerror fallback agar tidak bergantung server
const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// Baca PNG yang sudah di-resize
const imgBuf = fs.readFileSync('d:/absen pkl update/android/app/src/main/assets/public/img/logo_jatim.png');
const b64 = imgBuf.toString('base64');
const fallbackUri = 'data:image/png;base64,' + b64;

console.log('PNG:', imgBuf.length, 'bytes | Base64:', b64.length, 'chars');

// Sekarang content memiliki data:image/svg+xml;base64,... (SVG placeholder)
// Ganti kembali ke img/logo_jatim.png dengan onerror menggunakan base64 PNG asli

// Cari pola: src="data:image/svg+xml;base64,..." (semua occurrence di dalam img tag)
// dan ganti dengan src="img/logo_jatim.png" onerror="this.src='[base64PNG]'"

// Temukan semua occurrence SVG data URI
const svgPattern = /data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+/g;
const matches = content.match(svgPattern) || [];
console.log('SVG data URIs found:', matches.length);

if (matches.length === 0) {
  console.error('No SVG data URIs found — file may already be patched or different state');
  process.exit(1);
}

// Semua SVG URI panjangnya sama (sama-sama logo_jatim placeholder)
// Ganti semua dengan img/logo_jatim.png
let newContent = content;

// Strategy: replace setiap SVG data URI dengan img/logo_jatim.png
// Untuk setiap occurrence di img tag, kita juga perlu update onerror

// Pattern dalam template literal (baris 9721, 9817, 10114, 10191):
// src="[SVG_URI]" \n onerror="this.onerror=null;..." alt="Logo Resmi..."
// Pattern dalam string concat (baris 11031):
// '<img src="[SVG_URI]" ' + 'onerror=...'

// Ganti SVG URI dengan path file — gunakan base64 PNG sebagai onerror fallback
const onerrorAttr = `this.onerror=null; this.src='${fallbackUri}';`;

// Sederhananya: replace semua SVG data URI dengan img/logo_jatim.png
// onerror sudah ada di markup, tinggal update nilai onerror-nya
newContent = newContent.replace(svgPattern, 'img/logo_jatim.png');
console.log('Replaced all SVG URIs with img/logo_jatim.png');

// Sekarang update onerror yang ada (masih mengarah ke Wikimedia) dengan base64 fallback
const oldOnerror1 = `onerror="this.onerror=null; this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Coat_of_arms_of_East_Java.svg/500px-Coat_of_arms_of_East_Java.svg.png';"`;
const newOnerror1 = `onerror="this.onerror=null; this.src='${fallbackUri}';"`;

const count1 = (newContent.match(/onerror="this\.onerror=null; this\.src='https:\/\/upload\.wikimedia/g) || []).length;
console.log('Wikimedia onerror found:', count1);
newContent = newContent.split(oldOnerror1).join(newOnerror1);

// String concat version (baris 11031)
const oldOnerror2 = `'onerror="this.onerror=null; this.src=\\'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Coat_of_arms_of_East_Java.svg/500px-Coat_of_arms_of_East_Java.svg.png\\';" ' +`;
const newOnerror2 = `'onerror="${onerrorAttr}" ' +`;
if (newContent.includes(oldOnerror2)) {
  newContent = newContent.replace(oldOnerror2, newOnerror2);
  console.log('Updated string-concat onerror');
} else {
  console.log('String-concat onerror not found (may have different format, skipping)');
}

// Verifikasi
const remaining = (newContent.match(svgPattern) || []).length;
const logoCount = (newContent.match(/img\/logo_jatim\.png/g) || []).length;
console.log('SVG URIs remaining:', remaining);
console.log('img/logo_jatim.png count:', logoCount);

fs.writeFileSync('d:/absen pkl update/js/app.js', newContent, 'utf8');
console.log('SAVED OK — file size:', newContent.length, 'chars');
