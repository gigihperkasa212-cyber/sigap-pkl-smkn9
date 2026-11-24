// fix_history.js — Fix dropdown riwayat kehadiran + realtime sync
const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0, fail = 0;

function patch(name, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('FAIL [' + name + ']');
    const key = oldStr.substring(0, 50);
    const idx = content.indexOf(key);
    if (idx >= 0) console.log('  partial at', idx, ':', JSON.stringify(content.slice(idx, idx+80)));
    fail++;
    return false;
  }
  content = content.replace(oldStr, newStr);
  console.log('OK   [' + name + ']');
  ok++;
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// FIX 1: Tambah fungsi populateHistoryFilters() sebelum renderHistoryList()
// Generate dropdown bulan dari data log yang ada (dinamis, bukan hardcoded)
// Tambah dropdown filter siswa untuk admin/guru
// ══════════════════════════════════════════════════════════════════════════════
const newPopulateFunc = `
// ── Populate dropdown filter riwayat secara dinamis dari data log ──────────
// Dipanggil setiap kali tab history dibuka atau data berubah
function populateHistoryFilters() {
  var logs = getLogs();
  var isSiswa = activeUser && activeUser.role === 'siswa';
  var isAdmin = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');
  var isGuru  = activeUser && activeUser.role === 'guru';

  // ── 1. Dropdown Bulan ─────────────────────────────────────────────────────
  var filterMonthEl = document.getElementById('filterMonth');
  if (filterMonthEl) {
    // Kumpulkan bulan-tahun unik dari semua log
    var bulanSet = {};
    logs.forEach(function(l) {
      if (!l.date) return;
      var d = new Date(l.date);
      if (isNaN(d.getTime())) return;
      // Untuk siswa, hanya log miliknya
      if (isSiswa && l.studentName !== activeUser.name) return;
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      bulanSet[key] = { month: d.getMonth() + 1, year: d.getFullYear() };
    });

    var bulanList = Object.keys(bulanSet).sort().reverse(); // terbaru dulu
    var namaBulan = ['','Januari','Februari','Maret','April','Mei','Juni',
                     'Juli','Agustus','September','Oktober','November','Desember'];

    // Simpan nilai aktif sebelum rebuild
    var prevVal = filterMonthEl.value || 'all';

    filterMonthEl.innerHTML = '<option value="all">Semua Bulan</option>';
    bulanList.forEach(function(key) {
      var b = bulanSet[key];
      var opt = document.createElement('option');
      opt.value = String(b.month);
      opt.textContent = namaBulan[b.month] + ' ' + b.year;
      filterMonthEl.appendChild(opt);
    });

    // Restore nilai sebelumnya jika masih ada, atau pilih bulan terbaru
    if (bulanList.length > 0) {
      var stillExists = Array.from(filterMonthEl.options).some(function(o) { return o.value === prevVal; });
      if (!stillExists || prevVal === 'all') {
        // Default ke bulan terbaru
        filterMonthEl.value = String(bulanSet[bulanList[0]].month);
      } else {
        filterMonthEl.value = prevVal;
      }
    }
  }

  // ── 2. Dropdown Filter Siswa (hanya admin/guru) ───────────────────────────
  var filterSiswaEl = document.getElementById('filterSiswa');
  if (filterSiswaEl) {
    if (isAdmin || isGuru) {
      // Kumpulkan nama siswa unik dari log
      var siswaSet = {};
      logs.forEach(function(l) {
        if (l.studentName) siswaSet[l.studentName] = true;
      });
      var siswaList = Object.keys(siswaSet).sort();

      var prevSiswa = filterSiswaEl.value || 'all';
      filterSiswaEl.innerHTML = '<option value="all">Semua Siswa</option>';
      siswaList.forEach(function(name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        filterSiswaEl.appendChild(opt);
      });

      // Restore
      var stillExists2 = Array.from(filterSiswaEl.options).some(function(o) { return o.value === prevSiswa; });
      filterSiswaEl.value = stillExists2 ? prevSiswa : 'all';

      // Tampilkan baris filter siswa
      var rowSiswa = document.getElementById('filterSiswaRow');
      if (rowSiswa) rowSiswa.style.display = '';
    } else {
      // Siswa: sembunyikan filter siswa
      var rowSiswa2 = document.getElementById('filterSiswaRow');
      if (rowSiswa2) rowSiswa2.style.display = 'none';
    }
  }
}

`;

patch(
  'inject populateHistoryFilters before renderHistoryList',
  'function renderHistoryList() {\r\n  var container = document.getElementById(\'historyListContainer\');',
  newPopulateFunc + 'function renderHistoryList() {\r\n  var container = document.getElementById(\'historyListContainer\');'
);

// ══════════════════════════════════════════════════════════════════════════════
// FIX 2: renderHistoryList — baca filterSiswa + panggil populateHistoryFilters
// ══════════════════════════════════════════════════════════════════════════════
patch(
  'renderHistoryList: call populateHistoryFilters + read filterSiswa',
  `function renderHistoryList() {\r\n  var container = document.getElementById('historyListContainer');\r\n  if (!container) return;\r\n\r\n  var logs         = getLogs();\r\n  var filterMonth  = (document.getElementById('filterMonth')  || {}).value  || 'all';\r\n  var filterStatus = (document.getElementById('filterStatus') || {}).value || 'all';\r\n  var isSiswa      = activeUser && activeUser.role === 'siswa';`,
  `function renderHistoryList() {\r\n  var container = document.getElementById('historyListContainer');\r\n  if (!container) return;\r\n\r\n  // Populate dropdown filter secara dinamis dari data log yang ada\r\n  populateHistoryFilters();\r\n\r\n  var logs         = getLogs();\r\n  var filterMonth  = (document.getElementById('filterMonth')  || {}).value  || 'all';\r\n  var filterStatus = (document.getElementById('filterStatus') || {}).value || 'all';\r\n  var filterSiswa  = (document.getElementById('filterSiswa')  || {}).value  || 'all';\r\n  var isSiswa      = activeUser && activeUser.role === 'siswa';`
);

// ══════════════════════════════════════════════════════════════════════════════
// FIX 2b: Tambahkan filter siswa ke dalam blok filter log
// ══════════════════════════════════════════════════════════════════════════════
patch(
  'renderHistoryList: apply filterSiswa to log filter',
  `    // Untuk siswa: hanya tampilkan log milik diri sendiri\r\n    if (isSiswa) {\r\n      return matchMonth && matchStatus && item.studentName === activeUser.name;\r\n    }\r\n    return matchMonth && matchStatus;`,
  `    // Filter nama siswa (untuk admin/guru)\r\n    var matchSiswa = (filterSiswa === 'all') || (item.studentName === filterSiswa);\r\n    // Untuk siswa: hanya tampilkan log milik diri sendiri\r\n    if (isSiswa) {\r\n      return matchMonth && matchStatus && item.studentName === activeUser.name;\r\n    }\r\n    return matchMonth && matchStatus && matchSiswa;`
);

// ══════════════════════════════════════════════════════════════════════════════
// FIX 3: switchTab — panggil populateHistoryFilters + renderHistoryList saat tab history dibuka
// ══════════════════════════════════════════════════════════════════════════════
patch(
  'switchTab: add history tab handler',
  `  if (tabId === 'journal') {\r\n    if (typeof initJournalTab === 'function') initJournalTab();\r\n  }`,
  `  if (tabId === 'journal') {\r\n    if (typeof initJournalTab === 'function') initJournalTab();\r\n  }\r\n\r\n  if (tabId === 'history') {\r\n    // Populate filter + sync + render saat tab riwayat dibuka\r\n    populateHistoryFilters();\r\n    renderHistoryList();\r\n    // Sync log dari server saat tab dibuka\r\n    _syncLogsFromServer(function() { renderHistoryList(); });\r\n  }`
);

// ══════════════════════════════════════════════════════════════════════════════
// FIX 4: Tambah fungsi _syncLogsFromServer + polling otomatis refresh history
// ══════════════════════════════════════════════════════════════════════════════
const syncLogsFunc = `
// ── Sync log presensi dari server ke localStorage ─────────────────────────
// Dipanggil saat tab history dibuka atau dari polling 8 detik
var _lastLogSyncTs = 0;
function _syncLogsFromServer(callback) {
  // Throttle: jangan sync lebih dari 1x per 5 detik
  if ((Date.now() - _lastLogSyncTs) < 5000) {
    if (typeof callback === 'function') callback();
    return;
  }
  _lastLogSyncTs = Date.now();

  var userId = (activeUser && activeUser.role === 'siswa') ? (activeUser.id || '') : '';
  var url = apiUrl('api.php?action=get_logs') + (userId ? '&user_id=' + encodeURIComponent(userId) : '');

  fetch(url)
    .then(function(r) { return r && r.ok ? r.json() : null; })
    .then(function(res) {
      if (!res || !res.success) { if (typeof callback === 'function') callback(); return; }
      var serverLogs = res.logs || res.data || [];
      if (!Array.isArray(serverLogs) || serverLogs.length === 0) {
        if (typeof callback === 'function') callback();
        return;
      }
      // Merge: server wins, preserve local-only logs (belum tersync)
      var localLogs = getLogs();
      var serverIds = new Set(serverLogs.map(function(l) { return String(l.id); }));
      // Ambil log lokal yang belum ada di server (baru dibuat, belum sync)
      var localOnly = localLogs.filter(function(l) {
        return l.id && !serverIds.has(String(l.id));
      });
      var merged = serverLogs.concat(localOnly);
      // Urutkan: terbaru dulu
      merged.sort(function(a, b) {
        var da = (a.date || '') + (a.masuk || '');
        var db = (b.date || '') + (b.masuk || '');
        return db.localeCompare(da);
      });
      saveLogs(merged);
      console.log('[SIGAP] _syncLogsFromServer: merged', merged.length, 'logs');
      if (typeof callback === 'function') callback();
    })
    .catch(function(e) {
      console.warn('[SIGAP] _syncLogsFromServer error:', e.message);
      if (typeof callback === 'function') callback();
    });
}

`;

// Sisipkan sebelum function initRealtimeFeed
patch(
  'inject _syncLogsFromServer before initRealtimeFeed',
  'function initRealtimeFeed() {\r\n  if (realtimeInterval) clearInterval(realtimeInterval);',
  syncLogsFunc + 'function initRealtimeFeed() {\r\n  if (realtimeInterval) clearInterval(realtimeInterval);'
);

// ══════════════════════════════════════════════════════════════════════════════
// FIX 5: Polling 8 detik — tambah sync log + refresh tab history jika aktif
// ══════════════════════════════════════════════════════════════════════════════
patch(
  'polling: add log sync + history refresh',
  `          _mergeServerUsers(res, true);\r\n        })\r\n        .catch(function(e) { console.warn('[SIGAP] poll get_users error:', e.message); });\r\n    }\r\n  }, 8000);`,
  `          _mergeServerUsers(res, true);\r\n        })\r\n        .catch(function(e) { console.warn('[SIGAP] poll get_users error:', e.message); });\r\n\r\n      // Sync log dari server setiap 8 detik\r\n      _syncLogsFromServer(function() {\r\n        // Refresh tampilan riwayat jika tab history sedang aktif\r\n        var histTab = document.getElementById('tab-history');\r\n        if (histTab && histTab.classList.contains('active')) {\r\n          renderHistoryList();\r\n        }\r\n      });\r\n    }\r\n  }, 8000);`
);

console.log('\n=== HASIL ===');
console.log('OK:', ok, '| FAIL:', fail);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
