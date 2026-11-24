// fix_sync_logs.js — perbaiki _syncLogsFromServer agar pakai get_presensi + transform benar
const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

const oldSync = `function _syncLogsFromServer(callback) {
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
}`;

const newSync = `function _syncLogsFromServer(callback) {
  // Throttle: jangan sync lebih dari 1x per 5 detik
  if ((Date.now() - _lastLogSyncTs) < 5000) {
    if (typeof callback === 'function') callback();
    return;
  }
  _lastLogSyncTs = Date.now();

  // Gunakan endpoint get_presensi yang sudah ada di server
  // Filter per user_id untuk siswa agar lebih cepat
  var userId = (activeUser && activeUser.role === 'siswa') ? (activeUser.id || '') : '';
  var url = apiUrl('api.php?action=get_presensi') + (userId ? '&user_id=' + encodeURIComponent(userId) : '');

  fetch(url)
    .then(function(r) { return r && r.ok ? r.json() : null; })
    .then(function(res) {
      if (!res || !res.success) { if (typeof callback === 'function') callback(); return; }
      var serverRows = res.logs || res.data || [];
      if (!Array.isArray(serverRows) || serverRows.length === 0) {
        if (typeof callback === 'function') callback();
        return;
      }

      // ── Transform: server rows (per type) → format log lokal (1 record per hari per siswa) ──
      // DB menyimpan masuk & pulang sebagai baris terpisah — gabungkan per tanggal+user
      var dayMap = {}; // key: "userId_date"
      serverRows.forEach(function(row) {
        // Normalise date: ambil bagian YYYY-MM-DD dari timestamp
        var rawDate = row.timestamp || row.date || '';
        var dateStr = rawDate.substring(0, 10); // "2026-08-15"
        var timeStr = rawDate.length > 10 ? rawDate.substring(11, 16) : ''; // "07:30"
        if (row.pulang_time) timeStr = row.pulang_time; // override jika ada field khusus

        var uid = row.user_id || row.userId || '';
        var key = uid + '_' + dateStr;

        if (!dayMap[key]) {
          dayMap[key] = {
            id: row.id,
            date: dateStr,
            studentName: row.name || row.studentName || '',
            userId: uid,
            masuk: '-',
            pulang: '-',
            status: row.status || 'Hadir',
            location: row.location || '',
            image: row.foto || row.image || null,
            pulang_image: row.foto_pulang || row.pulang_image || null,
            catatan: row.catatan || row.notes || '',
            latitude: row.latitude || row.lat || 0,
            longitude: row.longitude || row.lng || 0,
            distance: row.distance_meters || row.distance || 0
          };
        }

        var type = (row.type || '').toLowerCase();
        if (type === 'masuk') {
          // Ambil jam dari timestamp
          var tsMasuk = row.timestamp || '';
          dayMap[key].masuk = tsMasuk.length > 15 ? tsMasuk.substring(11, 16) : timeStr;
          dayMap[key].image = row.foto || row.image || dayMap[key].image;
          dayMap[key].id = row.id; // pakai ID masuk sebagai ID record
        } else if (type === 'pulang') {
          var tsPulang = row.pulang_time || row.timestamp || '';
          dayMap[key].pulang = tsPulang.length > 15 ? tsPulang.substring(11, 16) : (tsPulang.length === 5 ? tsPulang : timeStr);
          dayMap[key].pulang_image = row.foto_pulang || row.foto || dayMap[key].pulang_image;
        } else if (type === 'izin' || type === 'sakit' || type === 'alpa') {
          dayMap[key].status = row.status || (type.charAt(0).toUpperCase() + type.slice(1));
        }

        // Update status jika lebih spesifik
        if (row.status && row.status !== 'Hadir') {
          dayMap[key].status = row.status;
        }
      });

      var serverLogs = Object.values(dayMap);

      // ── Merge dengan log lokal ──────────────────────────────────────────────
      var localLogs = getLogs();
      // Buat map lokal per key (userId_date) untuk dedup
      var localMap = {};
      localLogs.forEach(function(l) {
        var uid2 = l.userId || l.user_id || '';
        var key2 = uid2 + '_' + (l.date || '');
        localMap[key2] = l;
      });

      // Server wins untuk semua yang ada di server
      serverLogs.forEach(function(sl) {
        var uid2 = sl.userId || '';
        var key2 = uid2 + '_' + (sl.date || '');
        // Preserve foto lokal jika server tidak punya
        var existing = localMap[key2];
        if (existing) {
          if (!sl.image && existing.image) sl.image = existing.image;
          if (!sl.pulang_image && existing.pulang_image) sl.pulang_image = existing.pulang_image;
        }
        localMap[key2] = sl;
      });

      var merged = Object.values(localMap);
      // Urutkan: terbaru dulu
      merged.sort(function(a, b) {
        return (b.date || '').localeCompare(a.date || '');
      });

      saveLogs(merged);
      console.log('[SIGAP] _syncLogsFromServer: merged', merged.length, 'records from', serverRows.length, 'server rows');
      if (typeof callback === 'function') callback();
    })
    .catch(function(e) {
      console.warn('[SIGAP] _syncLogsFromServer error:', e.message);
      if (typeof callback === 'function') callback();
    });
}`;

if (!content.includes(oldSync)) {
  console.error('FAIL: _syncLogsFromServer pattern not found');
  process.exit(1);
}
content = content.replace(oldSync, newSync);
console.log('OK: _syncLogsFromServer updated');
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
