// fix_logo_embed.js — embed logo sebagai base64 di _finalizeCetakLengkap
// dan juga fix logo untuk cetak statistik/rekap yang pakai template literal

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

const imgBuf = fs.readFileSync('d:/absen pkl update/android/app/src/main/assets/public/img/logo_jatim.png');
const b64 = imgBuf.toString('base64');
const dataUri = 'data:image/png;base64,' + b64;
console.log('Logo size:', imgBuf.length, 'bytes');

// Cari semua kemunculan "logo_jatim.png" dan replace dengan dataUri
// Format yang ditemukan: src="img/logo_jatim.png"
let count = 0;
content = content.split('img/logo_jatim.png').map((part, idx, arr) => {
  if (idx === arr.length - 1) return part; // last part, no replacement
  count++;
  return part + dataUri;
}).join('');

console.log('Replaced', count, 'occurrences of logo_jatim.png');

// Hapus onerror yang tidak diperlukan (yang sekarang kosong/spasi saja)
// karena logo sudah embedded — tidak perlu fallback
content = content.replace(/ onerror="this\.onerror=null;" /g, ' ');
content = content.replace(/'onerror="this\.onerror=null;" ' \+/g, "'' +");
console.log('Cleaned up onerror fallbacks');

fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK — size:', content.length);
