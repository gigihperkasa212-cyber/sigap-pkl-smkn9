// fix_cetak_lengkap.js
// Fix: cetak lengkap hang saat admin (banyak siswa)
// Strategi:
// 1. Ubah _doExportCetakLengkap menjadi async chunked — proses 10 siswa per tick
// 2. Tampilkan progress toast selama proses
// 3. makeMapIframe: jika jumlah siswa > 20, skip tile OSM (render link saja)
//    karena ratusan tile request membekukan WebView Capacitor

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0, fail = 0;

function patch(name, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('FAIL [' + name + ']');
    const key = oldStr.substring(0, 60).replace(/\r\n/g, ' ');
    console.log('  looking for:', key);
    fail++;
    return false;
  }
  content = content.replace(oldStr, newStr);
  console.log('OK   [' + name + ']');
  ok++;
  return true;
}

// ── FIX 1: Tambah variabel _useSimpleMap di awal _doExportCetakLengkap ────────
// Jika > 20 siswa, skip tile OSM di makeMapIframe untuk performa
patch(
  'add _useSimpleMap flag',
  `  if (targetSiswa.length === 0) {\r\n    showToast('Tidak ada data siswa untuk dicetak.', 'error');\r\n    return;\r\n  }`,
  `  if (targetSiswa.length === 0) {\r\n    showToast('Tidak ada data siswa untuk dicetak.', 'error');\r\n    return;\r\n  }\r\n\r\n  // Jika > 20 siswa: skip tile OSM (ratusan HTTP request) — tampilkan link saja\r\n  var _useSimpleMap = (targetSiswa.length > 20);`
);

// ── FIX 2: makeMapIframe — tambah early return jika _useSimpleMap ─────────────
// Ganti isi fungsi: jika _useSimpleMap (dari closure), skip tile render
patch(
  'makeMapIframe: simple mode for many students',
  `  function makeMapIframe(lat, lng, label, w, h) {\r\n    if (!lat || !lng || lat === 0 || lng === 0) {\r\n      return '<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;' +\r\n        'padding:12px;text-align:center;color:#94a3b8;font-size:11px;">' +\r\n        '📍 Koordinat belum tersedia</div>';\r\n    }`,
  `  function makeMapIframe(lat, lng, label, w, h) {\r\n    if (!lat || !lng || lat === 0 || lng === 0) {\r\n      return '<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;' +\r\n        'padding:12px;text-align:center;color:#94a3b8;font-size:11px;">' +\r\n        '\uD83D\uDCCD Koordinat belum tersedia</div>';\r\n    }\r\n\r\n    // Mode ringan: jika banyak siswa, skip tile OSM — hanya tampilkan link + koordinat\r\n    var gmapLinkS = 'https://www.google.com/maps?q=' + lat + ',' + lng + '&z=16&label=' + encodeURIComponent(label || '');\r\n    var gpsTextS  = lat.toFixed(5) + ', ' + lng.toFixed(5);\r\n    if (_useSimpleMap) {\r\n      return '<div style="margin-bottom:8px;padding:8px 12px;background:#f0f9ff;border:1px solid #bae6fd;' +\r\n        'border-radius:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +\r\n        '<span style="font-size:18px;">\uD83D\uDCCD</span>' +\r\n        '<div style="flex:1;">' +\r\n          '<div style="font-size:11px;font-weight:700;color:#0369a1;">' + (label||'Lokasi PKL').substring(0,60) + '</div>' +\r\n          '<div style="font-size:10px;color:#64748b;">GPS: ' + gpsTextS + '</div>' +\r\n        '</div>' +\r\n        '<a href="' + gmapLinkS + '" target="_blank" rel="noopener" ' +\r\n          'style="background:#4285f4;color:#fff;padding:5px 12px;border-radius:6px;' +\r\n          'font-size:11px;font-weight:700;text-decoration:none;">\uD83D\uDDFA\uFE0F Lihat di Maps</a>' +\r\n      '</div>';\r\n    }`
);

// ── FIX 3: Ubah allCards dari sinkron map ke async chunked ────────────────────
// Ganti baris: var allCards = targetSiswa.map(...).join('')
// Dan blok setelahnya sampai _printAsPDF menjadi async chunked function
const oldSync = `  // ── Kartu per siswa ───────────────────────────────────────────────
  var allCards = targetSiswa.map(function(s, i) { return buildSiswaSection(s, i); }).join('');`;

const newAsync = `  // ── Kartu per siswa: async chunked agar tidak freeze UI ─────────────
  // Proses 8 siswa per setTimeout tick — browser bisa breathe antara batch
  var _CHUNK = 8;
  var _cardChunks = [];
  var _cardIdx = 0;

  function _processNextChunk() {
    var end = Math.min(_cardIdx + _CHUNK, targetSiswa.length);
    for (var ci = _cardIdx; ci < end; ci++) {
      _cardChunks.push(buildSiswaSection(targetSiswa[ci], ci));
    }
    _cardIdx = end;

    // Update progress
    var pct = Math.round((_cardIdx / targetSiswa.length) * 100);
    showToast('Menyiapkan laporan... ' + _cardIdx + '/' + targetSiswa.length + ' siswa (' + pct + '%)', 'info');

    if (_cardIdx < targetSiswa.length) {
      // Ada sisa — lanjut di tick berikutnya
      setTimeout(_processNextChunk, 0);
    } else {
      // Semua selesai — lanjut ke render HTML
      _finalizeCetakLengkap(_cardChunks.join(''));
    }
  }

  setTimeout(_processNextChunk, 0);
}

// Dipanggil setelah semua card selesai dibangun
function _finalizeCetakLengkap(allCards) {
  var users    = getUsers();
  var logs     = getLogs();
  var perms    = getPermissions();
  var settings = getSchoolSettings();
  var now      = new Date();
  var isAdminUser = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');
  var teacherName   = activeUser ? activeUser.name : 'Guru Pembimbing';
  var teacherNip    = activeUser ? (activeUser.nomor_induk || '-') : '-';
  var schoolName    = settings.schoolName    || 'SMK Negeri 9 Malang';
  var cityName      = settings.cityName      || 'Malang';
  var principalName = settings.principalName || '_________________________';
  var principalNip  = settings.principalNip  || '-';
  var printDate     = now.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  var targetSiswa   = users.filter(function(u) { return u.role === 'siswa'; });
  if (!isAdminUser && activeUser && activeUser.role === 'guru') {
    var myStudents2 = getSupervisedStudentsOnly();
    var myIds2 = new Set(myStudents2.map(function(s) { return String(s.id); }));
    targetSiswa = targetSiswa.filter(function(u) { return myIds2.has(String(u.id)); });
  }`;

patch('allCards: async chunked', oldSync, newAsync);

// ── FIX 4: Sambungkan _finalizeCetakLengkap — pindah var guruMonLogs ke sana ─
// Setelah var allCards diganti, blok guruMonLogs sudah ada di _finalizeCetakLengkap
// Tapi kita perlu pastikan var yang dibutuhkan tersedia
// Cek: grandHadir,grandIzin,grandSakit,grandAlpa harus dihitung ulang di _finalizeCetakLengkap

// Cari blok hitung grand stats dan pindahkan ke _finalizeCetakLengkap
// Ini sudah di atas allCards — perlu dihitung ulang di _finalizeCetakLengkap
const oldGrand = `  // ── Kartu per siswa: async chunked agar tidak freeze UI ─────────────`;
// Grand stats ada sebelum allCards — pastikan ada di _finalizeCetakLengkap juga
// Sebenarnya sudah ada di body _doExportCetakLengkap sebelum allCards
// Kita perlu re-hitung di _finalizeCetakLengkap
// Tambahkan re-komputasi grand stats di awal _finalizeCetakLengkap

patch(
  'add grand stats recompute in _finalizeCetakLengkap',
  `  var targetSiswa   = users.filter(function(u) { return u.role === 'siswa'; });\r\n  if (!isAdminUser && activeUser && activeUser.role === 'guru') {\r\n    var myStudents2 = getSupervisedStudentsOnly();\r\n    var myIds2 = new Set(myStudents2.map(function(s) { return String(s.id); }));\r\n    targetSiswa = targetSiswa.filter(function(u) { return myIds2.has(String(u.id)); });\r\n  }`,
  `  var targetSiswa   = users.filter(function(u) { return u.role === 'siswa'; });\r\n  if (!isAdminUser && activeUser && activeUser.role === 'guru') {\r\n    var myStudents2 = getSupervisedStudentsOnly();\r\n    var myIds2 = new Set(myStudents2.map(function(s) { return String(s.id); }));\r\n    targetSiswa = targetSiswa.filter(function(u) { return myIds2.has(String(u.id)); });\r\n  }\r\n\r\n  // Re-hitung grand stats\r\n  var _logsIdx2 = {};\r\n  logs.forEach(function(l) {\r\n    var n = l.studentName || '';\r\n    if (!_logsIdx2[n]) _logsIdx2[n] = [];\r\n    _logsIdx2[n].push(l);\r\n  });\r\n  var grandHadir = 0, grandIzin = 0, grandSakit = 0, grandAlpa = 0;\r\n  targetSiswa.forEach(function(s) {\r\n    var sl = _logsIdx2[s.name] || [];\r\n    sl.forEach(function(l) {\r\n      var st = (l.status||'').toLowerCase();\r\n      if (st === 'hadir' || st.includes('hadir')) grandHadir++;\r\n      else if (st === 'izin')  grandIzin++;\r\n      else if (st === 'sakit') grandSakit++;\r\n      else if (st === 'alpa')  grandAlpa++;\r\n    });\r\n  });`
);

console.log('\n=== HASIL ===');
console.log('OK:', ok, '| FAIL:', fail);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
