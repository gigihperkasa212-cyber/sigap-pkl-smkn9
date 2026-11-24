// fix_logo_restore.js
// Kembalikan semua img logo ke src="img/logo_jatim.png"
// dengan onerror yang aman (tanpa base64 yang menyebabkan syntax error)
// File logo_jatim.png sudah ada di assets (200x200, 53KB)

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// Hapus semua data URI base64 PNG yang salah di onerror
// Pattern: onerror="this.onerror=null; this.src='data:image/png;base64,...';"
// Ganti dengan string kosong (hapus onerror — file sudah ada, tidak perlu fallback)

// Hitung occurrences
const oldLogoCount = (content.match(/img\/logo_jatim\.png/g) || []).length;
console.log('img/logo_jatim.png count:', oldLogoCount);

// Cari dan hapus onerror yang berisi base64 PNG panjang
// (ini yang menyebabkan syntax error)
const base64OnerrorPattern = /\s*onerror="this\.onerror=null;\s*this\.src='data:image\/png;base64,[^'"]+';"\s*/g;
const matches = content.match(base64OnerrorPattern) || [];
console.log('Base64 onerror patterns found:', matches.length);
if (matches.length > 0) {
  console.log('First match length:', matches[0].length);
}

// Ganti onerror base64 dengan onerror yang aman (fallback ke teks saja)
// Untuk template literal (attr HTML di JS string)
content = content.replace(base64OnerrorPattern, ' ');

// Cek apakah masih ada syntax error dengan mencari 'data:image/png;base64,' di onerror
const remaining = (content.match(/onerror.*data:image\/png;base64/g) || []).length;
console.log('Remaining base64 onerror:', remaining);

// Juga cari pola string concat di baris 11031:
// 'onerror="this.onerror=null; this.src=\'data:image/png;base64,...\';" ' +
const base64Onerror2 = /'onerror="this\.onerror=null; this\.src=\\'data:image\/png;base64,[^']+\\';"\s*' \+/g;
const matches2 = content.match(base64Onerror2) || [];
console.log('String-concat base64 onerror found:', matches2.length);
if (matches2.length > 0) {
  content = content.replace(base64Onerror2, "'onerror=\"this.onerror=null;\" ' +");
}

fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
