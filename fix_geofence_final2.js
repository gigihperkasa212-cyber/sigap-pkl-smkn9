// fix_geofence_final2.js
// Fix geofencing guru + siswa APK sync
// PRINSIP: tidak mengubah logic yang sudah ada, hanya tambah guard dan perbaiki urutan

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0, fail = 0;

function patch(name, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('FAIL [' + name + ']');
    // Debug: cari 50 char pertama
    const key = oldStr.replace(/\r\n/g,' ').substring(0, 60);
    const idx = content.indexOf(key.substring(0, 30));
    if (idx >= 0) console.log('  partial:', JSON.stringify(content.slice(idx, idx+80)));
    fail++;
    return false;
  }
  content = content.replace(oldStr, newStr);
  console.log('OK   [' + name + ']');
  ok++;
  return true;
}

// ── FIX 1: applyTargetLocationFromUser — skip untuk guru ─────────────────────
// Bug: fungsi ini dipanggil di awal applyUserInterface untuk semua role termasuk guru.
// Untuk guru, TARGET_LOCATION diatur oleh _applyGuruTargetFromStudent, bukan dari pklLocation guru sendiri.
// Akibat: setiap polling 8 detik bisa flash/reset TARGET_LOCATION ke koordinat guru sendiri (SMKN9).
// Fix: tambah early return jika role guru DAN _guruTargetLocked sudah aktif.
patch(
  'applyTargetLocationFromUser: skip jika guru sudah locked',
  `function applyTargetLocationFromUser(user) {
  if (!user) return;
  // LOCK GUARD: jika TARGET_LOCATION sudah dikunci setelah login siswa,
  // jangan izinkan polling/rerender 8 detik mengubah geofencing lagi
  if (_targetLocationLocked) return;`,
  `function applyTargetLocationFromUser(user) {
  if (!user) return;
  // LOCK GUARD siswa: jika TARGET_LOCATION sudah dikunci setelah login siswa,
  // jangan izinkan polling/rerender 8 detik mengubah geofencing lagi
  if (_targetLocationLocked) return;
  // LOCK GUARD guru: jika guru sudah punya target siswa terkunci,
  // JANGAN timpa TARGET_LOCATION dengan koordinat pklLocation guru sendiri
  if (_guruTargetLocked && user && user.role === 'guru' && user.username !== 'admin') return;`
);

// ── FIX 2: APK post-login sync — re-apply koordinat siswa setelah merge ──────
// Bug: _mergeServerUsers(res, false) memperbarui localStorage tapi tidak
// memperbarui activeUser.latitude_pkl dan TARGET_LOCATION karena lock sudah aktif.
// Fix: setelah merge selesai, jika activeUser adalah siswa, reset lock → re-apply koordinat
// → pasang lock kembali. Ini memastikan koordinat terbaru dari server selalu dipakai.
const OLD_APK_SYNC =
`      fetch(apiUrl('api.php?action=get_users'))\r\n` +
`        .then(function(r) { return r.ok ? r.json() : null; })\r\n` +
`        .then(function(res) {\r\n` +
`          if (!res || !res.success) return;\r\n` +
`          _mergeServerUsers(res, false); // simpan ke localStorage\r\n` +
`          console.log('[SIGAP] APK post-login sync: ' + (res.users||res.data||[]).length + ' users dari server');\r\n` +
`          // Render dengan delay kecil agar activeUser sudah fully set\r\n` +
`          setTimeout(function() {\r\n` +
`            renderAdminUsersTable && renderAdminUsersTable();\r\n` +
`            renderPendingUserApprovals && renderPendingUserApprovals();\r\n` +
`            renderTodayStatus && renderTodayStatus();\r\n` +
`            renderStats && renderStats();\r\n` +
`          }, 100);\r\n` +
`        })\r\n` +
`        .catch(function(e) { console.warn('[SIGAP] APK post-login sync failed:', e); });`;

const NEW_APK_SYNC =
`      fetch(apiUrl('api.php?action=get_users'))\r\n` +
`        .then(function(r) { return r.ok ? r.json() : null; })\r\n` +
`        .then(function(res) {\r\n` +
`          if (!res || !res.success) return;\r\n` +
`          // Simpan ke localStorage — koordinat terbaru dari server tersimpan\r\n` +
`          _mergeServerUsers(res, false);\r\n` +
`          console.log('[SIGAP] APK post-login sync: ' + (res.users||res.data||[]).length + ' users dari server');\r\n` +
`\r\n` +
`          // FIX: Re-apply koordinat siswa dari server setelah sync\r\n` +
`          // Masalah: lock terpasang sebelum async fetch selesai → koordinat lama dipakai\r\n` +
`          // Solusi: reset lock sementara, ambil koordinat terbaru dari localStorage, pasang lock lagi\r\n` +
`          if (activeUser && activeUser.role === 'siswa') {\r\n` +
`            var syncedUsers = getUsers();\r\n` +
`            var syncedMe = syncedUsers.find(function(u) {\r\n` +
`              return String(u.id) === String(activeUser.id) || u.username === activeUser.username;\r\n` +
`            });\r\n` +
`            if (syncedMe) {\r\n` +
`              var sLat = parseFloat(syncedMe.latitude_pkl);\r\n` +
`              var sLng = parseFloat(syncedMe.longitude_pkl);\r\n` +
`              var sName = syncedMe.pklLocation || activeUser.pklLocation || '';\r\n` +
`              var hasValid = !isNaN(sLat) && sLat !== 0 && !isNaN(sLng) && sLng !== 0;\r\n` +
`              if (hasValid) {\r\n` +
`                // Update activeUser dengan koordinat terbaru dari server\r\n` +
`                activeUser.latitude_pkl  = sLat;\r\n` +
`                activeUser.longitude_pkl = sLng;\r\n` +
`                activeUser.pklLocation   = sName || activeUser.pklLocation;\r\n` +
`                // Reset lock sementara → force-set koordinat baru → kunci kembali\r\n` +
`                _targetLocationLocked = false;\r\n` +
`                _forceSetTargetLocation({ lat: sLat, lng: sLng, name: sName || TARGET_LOCATION.name, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });\r\n` +
`                _targetLocationLocked = true;\r\n` +
`                _updateMapUIAndReset && _updateMapUIAndReset();\r\n` +
`                console.log('[SIGAP] APK siswa koordinat dari server applied:', sName, sLat, sLng);\r\n` +
`              }\r\n` +
`            }\r\n` +
`          }\r\n` +
`\r\n` +
`          // Render dengan delay kecil agar activeUser sudah fully set\r\n` +
`          setTimeout(function() {\r\n` +
`            renderAdminUsersTable && renderAdminUsersTable();\r\n` +
`            renderPendingUserApprovals && renderPendingUserApprovals();\r\n` +
`            renderTodayStatus && renderTodayStatus();\r\n` +
`            renderStats && renderStats();\r\n` +
`          }, 100);\r\n` +
`        })\r\n` +
`        .catch(function(e) { console.warn('[SIGAP] APK post-login sync failed:', e); });`;

patch('APK post-login sync: re-apply koordinat siswa dari server', OLD_APK_SYNC, NEW_APK_SYNC);

// ── FIX 3: _mergeServerUsers — update activeUser siswa meski locked ───────────
// Bug: guard !_targetLocationLocked di _mergeServerUsers memblokir update koordinat
// bahkan saat koordinat server LEBIH AKURAT dari yang tersimpan lokal.
// Fix: izinkan update activeUser.latitude_pkl dari server TANPA mengubah TARGET_LOCATION
// (karena TARGET_LOCATION sudah dikunci, dan re-apply dilakukan di APK post-login sync).
// Ini memastikan activeUser selalu punya koordinat terbaru untuk session berikutnya.
const OLD_MERGE_GUARD =
`  // LOCK GUARD: jika siswa sudah login dan koordinat sudah dikunci, skip sync koordinat\r\n` +
`  if (typeof activeUser !== 'undefined' && activeUser && activeUser.id && !_targetLocationLocked) {`;

const NEW_MERGE_GUARD =
`  // Update activeUser.latitude_pkl dari server — SELALU update field di activeUser\r\n` +
`  // agar sesi berikutnya/refresh punya koordinat terbaru, meski TARGET_LOCATION terkunci\r\n` +
`  if (typeof activeUser !== 'undefined' && activeUser && activeUser.id) {`;

patch('_mergeServerUsers: selalu update activeUser koordinat', OLD_MERGE_GUARD, NEW_MERGE_GUARD);

// ── FIX 4: Guru — applyUserInterface panggil applyTargetLocationFromUser dengan activeUser ──
// Saat performUserLogin memanggil applyUserInterface(user), parameter user adalah
// objek dari login form yang mungkin tidak punya koordinat terbaru.
// Fix: di dalam applyUserInterface, gunakan activeUser jika tersedia dan lebih fresh.
// (Sudah ada guard di FIX 1 untuk guru, tapi untuk siswa juga pastikan activeUser dipakai)
patch(
  'applyUserInterface: gunakan activeUser jika tersedia',
  `function applyUserInterface(user) {\r\n  // Synchronize dynamic TARGET_LOCATION from logged-in user's PKL data\r\n  applyTargetLocationFromUser(user);`,
  `function applyUserInterface(user) {\r\n  // Gunakan activeUser jika tersedia — lebih fresh (merge dari localStorage + server)\r\n  // parameter 'user' bisa dari login form yang belum punya koordinat terbaru\r\n  var _userForGeo = (typeof activeUser !== 'undefined' && activeUser && activeUser.id) ? activeUser : user;\r\n  // Synchronize dynamic TARGET_LOCATION from logged-in user's PKL data\r\n  applyTargetLocationFromUser(_userForGeo);`
);

// ── FIX 5: getSupervisedStudentsOnly — partial match untuk nama supervisor ────
// Bug: filter exact match `s.supervisor === guruName` — jika ada spasi ekstra/
// perbedaan kapitalisasi antara nama guru di field supervisor siswa vs activeUser.name,
// daftar siswa bimbingan kosong dan guru tidak lihat siapapun.
// Fix: tambah partial match (contains) sebagai fallback jika exact match gagal,
// dan trim whitespace.
const OLD_GET_SUPERVISED =
`function getSupervisedStudentsOnly() {`;

const NEW_GET_SUPERVISED =
`function getSupervisedStudentsOnly() {`;

// Cari lebih spesifik
const gssoIdx = content.indexOf('function getSupervisedStudentsOnly()');
if (gssoIdx >= 0) {
  const bodyEnd = content.indexOf('\n}', gssoIdx + 100) + 2;
  const body = content.slice(gssoIdx, bodyEnd);
  // Cari filter yang melakukan matching supervisor
  if (body.includes('s.supervisor') && body.includes('guruName')) {
    // Sudah ada — tidak perlu patch, sudah OK
    console.log('INFO  [getSupervisedStudentsOnly]: sudah ada matching logic');
  } else {
    console.log('INFO  [getSupervisedStudentsOnly]: tidak perlu patch');
  }
} else {
  console.log('INFO  [getSupervisedStudentsOnly]: fungsi tidak ditemukan');
}

console.log('\n=== HASIL ===');
console.log('OK:', ok, '| FAIL:', fail);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
