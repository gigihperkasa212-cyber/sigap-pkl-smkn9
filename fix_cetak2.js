// fix_cetak2.js — patch 2 yang gagal
const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0, fail = 0;

function patch(name, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('FAIL [' + name + ']');
    fail++;
    return false;
  }
  content = content.replace(oldStr, newStr);
  console.log('OK   [' + name + ']');
  ok++;
  return true;
}

// ── FIX 3: Ubah allCards sinkron → async chunked ─────────────────────────────
const oldAllCards =
  "  // \u2500\u2500 Kartu per siswa \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n  var allCards = targetSiswa.map(function(s, i) { return buildSiswaSection(s, i); }).join('');";

const newAllCards =
  "  // \u2500\u2500 Kartu per siswa: async chunked agar tidak freeze UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n  // Proses 8 siswa per setTimeout tick sehingga browser tidak freeze\r\n  var _CHUNK_SIZE = 8;\r\n  var _builtCards = [];\r\n  var _siswaIdx   = 0;\r\n  // Capture nilai yang diperlukan oleh _finalizeCetakLengkap\r\n  var _f_isAdmin   = isAdminUser;\r\n  var _f_teacher   = teacherName;\r\n  var _f_teachNip  = teacherNip;\r\n  var _f_school    = schoolName;\r\n  var _f_city      = cityName;\r\n  var _f_settings  = settings;\r\n  var _f_printDate = printDate;\r\n  var _f_grandH = grandHadir, _f_grandI = grandIzin, _f_grandS = grandSakit, _f_grandA = grandAlpa;\r\n  var _f_targetLen = targetSiswa.length;\r\n  var _f_pdfName   = 'Laporan_Lengkap_PKL_' + (activeUser ? activeUser.name.replace(/[^a-zA-Z0-9]/g,'_') : 'Admin') + '_' + new Date().toISOString().split('T')[0] + '.pdf';\r\n\r\n  function _nextCardChunk() {\r\n    var end = Math.min(_siswaIdx + _CHUNK_SIZE, targetSiswa.length);\r\n    for (var ci = _siswaIdx; ci < end; ci++) {\r\n      _builtCards.push(buildSiswaSection(targetSiswa[ci], ci));\r\n    }\r\n    _siswaIdx = end;\r\n    var pct = Math.round((_siswaIdx / targetSiswa.length) * 100);\r\n    showToast('\u23F3 Menyiapkan laporan... ' + _siswaIdx + '/' + targetSiswa.length + ' siswa (' + pct + '%)', 'info');\r\n    if (_siswaIdx < targetSiswa.length) {\r\n      setTimeout(_nextCardChunk, 0); // yield ke browser\r\n    } else {\r\n      setTimeout(function() { _finalizeCetakLengkap(_builtCards.join(''), _f_isAdmin, _f_teacher, _f_teachNip, _f_school, _f_city, _f_settings, _f_printDate, _f_grandH, _f_grandI, _f_grandS, _f_grandA, _f_targetLen, _f_pdfName, guruMonLogs, monitoringSection); }, 0);\r\n    }\r\n  }\r\n  setTimeout(_nextCardChunk, 0);\r\n  return; // _doExportCetakLengkap selesai di sini — lanjutan di _finalizeCetakLengkap\r\n  var allCards = ''; // unreachable — hanya agar variable capture di bawah tidak error";

patch('allCards: async chunked', oldAllCards, newAllCards);

// ── FIX 4: Ubah bagian setelah allCards sampai _printAsPDF menjadi fungsi terpisah ─
// Ganti "allCards + monitoringSection" dan seterusnya sampai showToast success
// menjadi isi fungsi _finalizeCetakLengkap

const oldFinalize =
  "    // Kartu per siswa + log monitoring guru\r\n    allCards + monitoringSection +\r\n    '</div></body></html>';\r\n\r\n    // Tanda Tangan \u2014 pakai helper _buildTtdHtml\r\n    // Admin: Waka Humas | Kepala Sekolah | Ketua Pokja PKL\r\n    // Guru : Waka Humas | Kepala Sekolah | Guru Pembimbing PKL\r\n    var ttdHtml = _buildTtdHtml(isAdminUser, settings, cityName, printDate, teacherName, teacherNip, 65);\r\n    html = html.replace('</div></body></html>', ttdHtml + '</div></body></html>');\r\n\r\n  // Gunakan _printAsPDF() \u2014 modal in-page, identik dengan Cetak Statistik dan Cetak Rekap\r\n  var pdfFileName = 'Laporan_Lengkap_PKL_' + (activeUser ? activeUser.name.replace(/[^a-zA-Z0-9]/g,'_') : 'Admin') + '_' + new Date().toISOString().split('T')[0] + '.pdf';\r\n  _printAsPDF(html, pdfFileName);\r\n  showToast('Laporan Lengkap berhasil dibuka!', 'success');\r\n}";

// Verifikasi exact match
if (!content.includes(oldFinalize)) {
  console.error('FAIL [finalize block]: checking partial...');
  // Cari potongan unik
  const p1 = content.indexOf('Kartu per siswa + log monitoring guru');
  const p2 = content.indexOf('window.exportCetakLengkap = exportCetakLengkap');
  if(p1>=0) console.log('found "Kartu per siswa" at offset', p1);
  if(p2>=0) console.log('found "window.exportCetakLengkap" at offset', p2);
  // Print area
  if(p1>=0) console.log(JSON.stringify(content.slice(p1, p1+400)));
  fail++;
} else {
  const newFinalize =
    "    // Kartu per siswa + log monitoring guru\r\n    allCards + monitoringSection +\r\n    '</div></body></html>';\r\n\r\n    // Tanda Tangan\r\n    var ttdHtml = _buildTtdHtml(fa, fs2, fc, fpd, ft, ftn, 65);\r\n    html = html.replace('</div></body></html>', ttdHtml + '</div></body></html>');\r\n    _printAsPDF(html, fpn);\r\n    showToast('Laporan Lengkap berhasil dibuka!', 'success');\r\n}\r\n\r\n// Dipanggil setelah semua card selesai dibangun secara async\r\nfunction _finalizeCetakLengkap(allCards, fa, ft, ftn, fsc, fc, fs2, fpd, fgh, fgi, fgs, fga, ftl, fpn, guruMonLogs, monitoringSection) {";
  content = content.replace(oldFinalize, newFinalize);
  console.log('OK   [finalize block]');
  ok++;
}

console.log('\n=== HASIL ===');
console.log('OK:', ok, '| FAIL:', fail);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
