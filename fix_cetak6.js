// fix_cetak6.js — final comprehensive fix untuk cetak lengkap
// Strategi: tulis ulang HANYA fungsi exportCetakLengkap + _doExportCetakLengkap + _finalizeCetakLengkap
// dengan mencari batas yang tepat dan menggantinya sekaligus

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// Temukan batas fungsi exportCetakLengkap (awal)
const FUNC_START = '\nfunction exportCetakLengkap() {';
const startIdx = content.indexOf(FUNC_START);
if (startIdx < 0) { console.error('exportCetakLengkap not found'); process.exit(1); }
console.log('exportCetakLengkap at offset:', startIdx);

// Temukan batas akhir: "window.exportCetakLengkap = exportCetakLengkap;"
const FUNC_END = '\nwindow.exportCetakLengkap = exportCetakLengkap;';
const endIdx = content.indexOf(FUNC_END, startIdx);
if (endIdx < 0) { console.error('window.exportCetakLengkap not found'); process.exit(1); }
console.log('window.exportCetakLengkap at offset:', endIdx);

// Ambil konten asli untuk debug
const originalBlock = content.slice(startIdx, endIdx + FUNC_END.length);
console.log('original block length:', originalBlock.length, 'chars');

// Simpan seluruh data yang diperlukan dari block asli
// (school settings, kop surat, TTD, dll sudah ada di sana)
// Kita akan replace dengan versi yang dipecah menjadi async

// Temukan blok kop surat dan bagian HTML builder
const htmlBuilderStart = originalBlock.indexOf("  var html = '<!DOCTYPE html>");
console.log('html builder start in block:', htmlBuilderStart);

// Ambil dua bagian:
// 1. Bagian setup (sebelum allCards/html builder) 
// 2. Bagian html builder (dari var html = sampai _printAsPDF)

const partBefore = originalBlock.slice(0, htmlBuilderStart);
const partHtml   = originalBlock.slice(htmlBuilderStart, originalBlock.lastIndexOf('\nwindow.exportCetakLengkap'));

console.log('partBefore length:', partBefore.length);
console.log('partHtml length:', partHtml.length);

// Buat versi baru yang async chunked
// partBefore berisi: exportCetakLengkap(), _doExportCetakLengkap() dengan setup vars
// partHtml berisi: var html = ... _printAsPDF ... showToast

// Cari titik split di partBefore: setelah "monitoringSection = ... }" (sebelum allCards)
// yang seharusnya sudah ada komentar atau code "return;" dari patch sebelumnya
const returnIdx = partBefore.indexOf('  return; // lanjutan di _finalizeCetakLengkap');
const hasReturn = returnIdx >= 0;
console.log('has return marker:', hasReturn, 'at:', returnIdx);

// Buat replacement block yang bersih
// Ganti variabel partHtml dengan parameter nama pendek
const htmlBody = partHtml
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
  .replace(/\bpdfFileName\b/g, 'fpn')
  .trim();

// Temukan di partBefore bagian setelah "return;" atau setelah allCards marker
// Kita ambil partBefore sampai "return;" saja, sisanya dibuang
let partSetup;
if (hasReturn) {
  partSetup = partBefore.slice(0, returnIdx + '  return; // lanjutan di _finalizeCetakLengkap'.length);
} else {
  // Fallback: ambil sampai marker async chunked
  const asyncMarker = '  // Proses 8 siswa per tick';
  const asyncIdx = partBefore.indexOf(asyncMarker);
  if (asyncIdx >= 0) {
    // Ambil sampai setelah blok _nextCardChunk
    const retIdx2 = partBefore.indexOf('  return;', asyncIdx);
    if (retIdx2 >= 0) {
      partSetup = partBefore.slice(0, retIdx2 + '  return;'.length);
    } else {
      partSetup = partBefore;
    }
  } else {
    partSetup = partBefore;
  }
}

const newBlock = partSetup.trimEnd() + '\n}\n\n' +
  '// Dipanggil setelah semua kartu selesai dibangun secara async chunked\n' +
  'function _finalizeCetakLengkap(allCards, fa, ft, ftn, fsc, fc, fs2, fpd, fgh, fgi, fgs, fga, ftl, fpn, guruMonLogs, monitoringSection) {\n' +
  htmlBody + '\n' +
  '}\n' +
  FUNC_END;

// Replace di content
content = content.slice(0, startIdx) + newBlock + content.slice(endIdx + FUNC_END.length);

console.log('Replacement done. New block length:', newBlock.length);
console.log('Has _finalizeCetakLengkap:', content.includes('function _finalizeCetakLengkap'));

fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK — file size:', content.length);
