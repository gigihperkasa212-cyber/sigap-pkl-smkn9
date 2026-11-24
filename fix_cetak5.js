// fix_cetak5.js
// Pindahkan blok HTML builder + _printAsPDF ke dalam _finalizeCetakLengkap
// Dan ganti semua variabel lama dengan parameter fungsi

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// Cari batas: 
// START = awal "var html = '<!DOCTYPE"  (setelah block summary bar, sebelum allCards)
// END   = "showToast('Laporan Lengkap berhasil dibuka!'..." + "}\n"
// Ini semua HARUS masuk ke dalam _finalizeCetakLengkap

// Temukan posisi "var html = '<!DOCTYPE html"
const htmlVarMarker = "  var html = '<!DOCTYPE html><html lang=\"id\"><head>'";
const htmlVarIdx = content.indexOf(htmlVarMarker);
if (htmlVarIdx < 0) {
  // Coba versi lain
  console.error('htmlVarMarker not found, searching alternatives...');
  const idx2 = content.indexOf("var html = '<!DOCTYPE html");
  console.log('alt search:', idx2);
  if(idx2>=0) console.log(JSON.stringify(content.slice(idx2, idx2+80)));
  process.exit(1);
}
console.log('htmlVar at offset:', htmlVarIdx);

// Temukan closing "showToast('Laporan Lengkap berhasil dibuka!...\n}"
const showToastMarker = "    showToast('Laporan Lengkap berhasil dibuka!', 'success');\r\n}";
const showToastIdx = content.indexOf(showToastMarker, htmlVarIdx);
if (showToastIdx < 0) {
  console.error('showToast closing not found');
  process.exit(1);
}
console.log('showToast at offset:', showToastIdx);

// Ambil blok HTML builder
const htmlBuilderBlock = content.slice(htmlVarIdx, showToastIdx + showToastMarker.length);
console.log('htmlBuilderBlock length:', htmlBuilderBlock.length);

// Sekarang: ganti variabel lama dengan parameter _finalizeCetakLengkap
// Parameters: allCards, fa, ft, ftn, fsc, fc, fs2, fpd, fgh, fgi, fgs, fga, ftl, fpn, guruMonLogs, monitoringSection
// Mapping:
//   isAdminUser → fa
//   teacherName → ft
//   teacherNip  → ftn
//   schoolName  → fsc
//   cityName    → fc
//   settings    → fs2
//   printDate   → fpd
//   grandHadir  → fgh
//   grandIzin   → fgi
//   grandSakit  → fgs
//   grandAlpa   → fga
//   targetSiswa.length → ftl
//   pdfFileName → fpn
// guruMonLogs, monitoringSection sudah menjadi parameter

let body = htmlBuilderBlock
  .replace(/\bisAdminUser\b/g, 'fa')
  .replace(/\bteacherName\b/g, 'ft')
  .replace(/\bteacherNip\b/g, 'ftn')
  .replace(/\bschoolName\b/g, 'fsc')
  .replace(/\bcityName\b/g, 'fc')
  .replace(/\bsettings\b/g, 'fs2')
  .replace(/\bprintDate\b/g, 'fpd')
  .replace(/\bgrandHadir\b/g, 'fgh')
  .replace(/\bgrandIzin\b/g, 'fgi')
  .replace(/\bgrandSakit\b/g, 'fgs')
  .replace(/\bgrandAlpa\b/g, 'fga')
  .replace(/targetSiswa\.length/g, 'ftl')
  .replace(/\bpdfFileName\b/g, 'fpn');

// Pindahkan body ke _finalizeCetakLengkap (yang sekarang kosong)
const emptyFinalize = "function _finalizeCetakLengkap(allCards, fa, ft, ftn, fsc, fc, fs2, fpd, fgh, fgi, fgs, fga, ftl, fpn, guruMonLogs, monitoringSection) {\r\n\r\n}";
const newFinalize = "function _finalizeCetakLengkap(allCards, fa, ft, ftn, fsc, fc, fs2, fpd, fgh, fgi, fgs, fga, ftl, fpn, guruMonLogs, monitoringSection) {\r\n" + body.trimEnd() + "\r\n}";

if (!content.includes(emptyFinalize)) {
  // Coba dengan LF only
  const emptyFinalizeLF = "function _finalizeCetakLengkap(allCards, fa, ft, ftn, fsc, fc, fs2, fpd, fgh, fgi, fgs, fga, ftl, fpn, guruMonLogs, monitoringSection) {\n\n}";
  if (!content.includes(emptyFinalizeLF)) {
    console.error('emptyFinalize not found');
    // Debug
    const fi = content.indexOf('function _finalizeCetakLengkap');
    console.log(JSON.stringify(content.slice(fi, fi+200)));
    process.exit(1);
  }
  content = content.replace(emptyFinalizeLF, "function _finalizeCetakLengkap(allCards, fa, ft, ftn, fsc, fc, fs2, fpd, fgh, fgi, fgs, fga, ftl, fpn, guruMonLogs, monitoringSection) {\n" + body.trimEnd() + "\n}");
} else {
  content = content.replace(emptyFinalize, newFinalize);
}
console.log('_finalizeCetakLengkap body inserted');

// Hapus blok HTML builder dari lokasi aslinya (sudah duplikat)
// Ganti dengan comment saja
content = content.replace(htmlBuilderBlock, '  // HTML builder dipindahkan ke _finalizeCetakLengkap (async chunked)\r\n');
console.log('Original HTML builder block removed');

fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK - file size:', content.length);
