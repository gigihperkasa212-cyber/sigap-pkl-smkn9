// fix_cetak_final.js — perbaikan total bersih
// 1. Hapus duplikat _finalizeCetakLengkap yang kosong
// 2. Tambahkan deklarasi guruMonLogs + monitoringSection sebelum return di _doExportCetakLengkap
// 3. Fix logo: embed base64 PNG langsung ke HTML (tidak bergantung path relatif)

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// ── FIX 1: Hapus _finalizeCetakLengkap yang kedua (kosong) ─────────────────
const emptyFinalizeMarker = '\n// Dipanggil setelah semua card selesai dibangun secara async\nfunction _finalizeCetakLengkap(allCards, fa, ft, ftn, fsc, fc, fs2, fpd, fgh, fgi, fgs, fga, ftl, fpn, guruMonLogs, monitoringSection) {\n}\n';
if (content.includes(emptyFinalizeMarker)) {
  content = content.replace(emptyFinalizeMarker, '\n');
  console.log('OK: removed duplicate empty _finalizeCetakLengkap');
} else {
  console.log('SKIP: empty _finalizeCetakLengkap not found (may already be removed)');
}

// ── FIX 2: Tambahkan guruMonLogs + monitoringSection sebelum return ─────────
// Setelah _nextCardChunk dibuat tapi sebelum return, harus ada:
// - var guruMonLogs = ...
// - var monitoringSection = ...
// Ini agar bisa di-pass ke _finalizeCetakLengkap

const returnMarker = '  setTimeout(_nextCardChunk,0);\n  return; // lanjutan di _finalizeCetakLengkap\n}';
const newReturn = `  // Hitung guruMonLogs dan monitoringSection sebelum pass ke _finalizeCetakLengkap
  var guruMonLogs = logs.filter(function(l) {
    return l.isGuruMonitoring === true && activeUser && (l.studentName === activeUser.name);
  }).sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); });

  var monitoringSection = '';
  if (guruMonLogs.length > 0) {
    var monRowsHtml = guruMonLogs.map(function(l, ri) {
      var rowBg = ri % 2 === 0 ? '#fff' : '#f0fdf4';
      var fotoCell = (l.image && l.image.length > 20)
        ? '<img src="' + l.image + '" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;" onerror="this.style.display=\\'none\\'">'
        : '<span style="color:#cbd5e1;">—</span>';
      return '<tr style="background:' + rowBg + ';">' +
        '<td style="padding:8px 10px;border:1px solid #e2e8f0;">' + (l.date||'-') + '</td>' +
        '<td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;">' + (l.masuk||'-') + '</td>' +
        '<td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:11px;color:#475569;max-width:200px;">' + (l.monitoringTarget||'-').substring(0,80) + '</td>' +
        '<td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:11px;color:#475569;max-width:160px;">' + (l.location||'-').substring(0,70) + '</td>' +
        '<td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;">' + fotoCell + '</td>' +
        '</tr>';
    }).join('');
    monitoringSection = '<div style="page-break-inside:avoid;border:1px solid #a7f3d0;border-radius:12px;padding:20px;margin-bottom:32px;background:#fff;">' +
      '<h3 style="font-size:14px;color:#065f46;margin:0 0 14px;border-bottom:2px solid #a7f3d0;padding-bottom:8px;">' +
      '🔍 Log Kunjungan Monitoring: ' + teacherName + ' (' + guruMonLogs.length + ' kunjungan)</h3>' +
      '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">' +
      '<thead><tr style="background:#065f46;color:#fff;">' +
      '<th style="padding:9px 10px;text-align:left;border:1px solid #047857;">Tanggal</th>' +
      '<th style="padding:9px 10px;text-align:center;border:1px solid #047857;">Jam</th>' +
      '<th style="padding:9px 10px;text-align:left;border:1px solid #047857;">Lokasi PKL Dimonitoring</th>' +
      '<th style="padding:9px 10px;text-align:left;border:1px solid #047857;">Keterangan GPS</th>' +
      '<th style="padding:9px 10px;text-align:center;border:1px solid #047857;">Foto</th>' +
      '</tr></thead><tbody>' + monRowsHtml + '</tbody></table></div></div>';
  }

  setTimeout(_nextCardChunk,0);
  return; // lanjutan di _finalizeCetakLengkap
}`;

if (!content.includes(returnMarker)) {
  console.error('FAIL: returnMarker not found');
  // Debug
  const altIdx = content.indexOf('setTimeout(_nextCardChunk,0);\n  return;');
  console.log('alt found:', altIdx >= 0, altIdx >= 0 ? 'at line ' + content.slice(0,altIdx).split('\n').length : '');
} else {
  content = content.replace(returnMarker, newReturn);
  console.log('OK: guruMonLogs + monitoringSection added before return');
}

// ── FIX 3: Logo — embed PNG sebagai base64 data URI ────────────────────────
// Cara paling andal: embed logo langsung di HTML, tidak bergantung path relatif
// Path relatif 'img/logo_jatim.png' tidak resolved di blob: URL yang digunakan _printAsPDF

const imgBuf = fs.readFileSync('d:/absen pkl update/android/app/src/main/assets/public/img/logo_jatim.png');
const logoB64 = imgBuf.toString('base64');
const logoDataUri = 'data:image/png;base64,' + logoB64;
console.log('Logo PNG:', imgBuf.length, 'bytes | base64:', logoB64.length, 'chars');

// Di _finalizeCetakLengkap, ganti src="img/logo_jatim.png" dengan data URI
// Tapi HANYA di dalam fungsi _finalizeCetakLengkap (tidak mengubah di tempat lain)
// Cari _finalizeCetakLengkap body
const finalizeStart = content.indexOf('function _finalizeCetakLengkap(allCards,');
const finalizeEnd = content.indexOf('\nwindow.exportCetakLengkap', finalizeStart);
if (finalizeStart < 0 || finalizeEnd < 0) {
  console.error('FAIL: cannot find _finalizeCetakLengkap bounds');
} else {
  const before = content.slice(0, finalizeStart);
  const finBody = content.slice(finalizeStart, finalizeEnd);
  const after = content.slice(finalizeEnd);
  // Ganti img/logo_jatim.png di dalam finBody saja
  const finBodyFixed = finBody.split("'img/logo_jatim.png'").join("'" + logoDataUri + "'");
  const changed = finBody !== finBodyFixed;
  content = before + finBodyFixed + after;
  console.log('OK: logo embedded in _finalizeCetakLengkap, changed:', changed);
}

fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK — size:', content.length);
