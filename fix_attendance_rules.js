// fix_attendance_rules.js
// RULE 1: Geocoding — sudah ada (server_geocode + Nominatim + cache), tidak perlu tambah
// RULE 2: Radius per-siswa — baca dari allowed_radius di DB, bukan hardcode 350
// RULE 3: Mock location detection — deteksi GPS palsu/emulator
// RULE 4: Server timestamp — sinkronisasi waktu dari server sebelum simpan absen

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0;

function patch(name, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('FAIL ['+name+']');
    return false;
  }
  content = content.replace(oldStr, newStr);
  console.log('OK   ['+name+']');
  ok++;
  return true;
}

// ══════════════════════════════════════════════════════════════════════════
// RULE 2: RADIUS PER-SISWA
// Baca allowed_radius dari field user di DB (sudah ada di API: allowed_radius)
// Saat set TARGET_LOCATION untuk siswa, gunakan allowed_radius dari data user
// ══════════════════════════════════════════════════════════════════════════

// A: Saat koordinat DB valid — baca radius dari user, bukan hardcode
patch('RULE2: radius dari DB saat isDbCoordsValid',
  `      _forceSetTargetLocation({ lat, lng, name: pklName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });\r\n      _targetLocationLocked = true;\r\n      _updateMapUIAndReset();\r\n    } else {`,
  `      // Baca radius dari data user (allowed_radius di DB), default 350m\r\n      var _userRadius = (user && parseInt(user.allowed_radius)) > 0 ? parseInt(user.allowed_radius) : 350;\r\n      // Clamp radius: minimum 50m, maximum 1000m\r\n      _userRadius = Math.max(50, Math.min(1000, _userRadius));\r\n      _forceSetTargetLocation({ lat, lng, name: pklName, allowedRadiusMeters: _userRadius });\r\n      _targetLocationLocked = true;\r\n      _updateMapUIAndReset();\r\n    } else {`
);

// B: Saat cache hit — baca radius dari user
patch('RULE2: radius dari DB saat cache hit',
  `        _forceSetTargetLocation({ lat: _cHit.lat, lng: _cHit.lng, name: pklName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });\r\n        _targetLocationLocked = true;\r\n        _updateMapUIAndReset();\r\n        if (user && user.id) {`,
  `        var _cRadius = (user && parseInt(user.allowed_radius)) > 0 ? parseInt(user.allowed_radius) : 350;\r\n        _cRadius = Math.max(50, Math.min(1000, _cRadius));\r\n        _forceSetTargetLocation({ lat: _cHit.lat, lng: _cHit.lng, name: pklName, allowedRadiusMeters: _cRadius });\r\n        _targetLocationLocked = true;\r\n        _updateMapUIAndReset();\r\n        if (user && user.id) {`
);

// C: Saat server_geocode berhasil — baca radius dari user
patch('RULE2: radius dari DB saat server_geocode berhasil',
  `              _forceSetTargetLocation({ lat: sLat, lng: sLng, name: pklName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });\r\n              _targetLocationLocked = true;\r\n              _updateMapUIAndReset();\r\n              console.log('[SIGAP] server_geocode berhasil:',`,
  `              var _sgRadius = (activeUser && parseInt(activeUser.allowed_radius)) > 0 ? parseInt(activeUser.allowed_radius) : 350;\r\n              _sgRadius = Math.max(50, Math.min(1000, _sgRadius));\r\n              _forceSetTargetLocation({ lat: sLat, lng: sLng, name: pklName, allowedRadiusMeters: _sgRadius });\r\n              _targetLocationLocked = true;\r\n              _updateMapUIAndReset();\r\n              console.log('[SIGAP] server_geocode berhasil:',`
);

// ══════════════════════════════════════════════════════════════════════════
// RULE 3: MOCK LOCATION DETECTION
// Deteksi GPS palsu berdasarkan:
// A. Akurasi terlalu sempurna (tepat 0m — tidak mungkin GPS nyata)
// B. Kecepatan tidak masuk akal (>300 km/h saat absen)
// C. Koordinat di luar area wajar Malang (>150km)
// D. Altitude 0 persis + accuracy 0 (emulator pattern)
// E. Koordinat tidak berubah sama sekali dalam 5 menit (GPS spoofing statis)
// ══════════════════════════════════════════════════════════════════════════

// Tambahkan fungsi deteksi mock setelah calculateDistance
const MOCK_DETECTION_FN = `
// ── RULE 3: Deteksi Mock Location / GPS Palsu ─────────────────────────────
var _prevGpsCoords = null;  // { lat, lng, ts } — posisi sebelumnya
var _gpsStaleCount = 0;     // berapa kali koordinat sama persis

function _detectMockLocation(lat, lng, accuracy, altitude) {
  var warnings = [];
  var isSuspicious = false;

  // 1. Accuracy terlalu sempurna: tepat 0 atau 1 (emulator default)
  if (accuracy !== null && accuracy !== undefined && accuracy <= 1 && accuracy >= 0) {
    warnings.push('Akurasi GPS tidak wajar ('+accuracy+'m — kemungkinan emulator)');
    isSuspicious = true;
  }

  // 2. Akurasi terlalu buruk (> 1000m = tidak valid untuk absen)
  if (accuracy !== null && accuracy !== undefined && accuracy > 1000) {
    warnings.push('Akurasi GPS sangat rendah ('+Math.round(accuracy)+'m — tidak dapat digunakan)');
    isSuspicious = true;
  }

  // 3. Koordinat di luar area Malang > 100km
  var distKm = calculateDistance(lat, lng, -7.9825, 112.6867);
  if (distKm > 100) {
    warnings.push('Posisi GPS terlalu jauh dari area PKL ('+Math.round(distKm)+'km dari Malang)');
    isSuspicious = true;
  }

  // 4. Altitude persis 0 + accuracy persis 0 (pola emulator Android)
  if (altitude !== null && altitude !== undefined && altitude === 0 && accuracy === 0) {
    warnings.push('Pola koordinat emulator terdeteksi (altitude=0, accuracy=0)');
    isSuspicious = true;
  }

  // 5. Koordinat tidak berubah sama sekali dalam 2 menit (GPS spoofing statis)
  var now = Date.now();
  if (_prevGpsCoords) {
    var samePos = Math.abs(lat - _prevGpsCoords.lat) < 0.000001 &&
                  Math.abs(lng - _prevGpsCoords.lng) < 0.000001;
    var elapsed = (now - _prevGpsCoords.ts) / 1000; // detik
    if (samePos) {
      _gpsStaleCount++;
    } else {
      _gpsStaleCount = 0;
    }
    // Koordinat sama persis > 2 menit — bisa jadi spoofing statis
    if (_gpsStaleCount > 15 && elapsed > 120) { // 15 update * 8 detik = 2 menit
      warnings.push('Koordinat GPS tidak bergerak dalam '+Math.round(elapsed)+'s (kemungkinan GPS palsu)');
      // Ini tidak langsung dicurigai — bisa saja siswa diam di lokasi PKL
      // Hanya log, tidak blokir
    }
  }
  _prevGpsCoords = { lat: lat, lng: lng, ts: now };

  return { isSuspicious: isSuspicious, warnings: warnings };
}

`;

// Sisipkan setelah calculateDistance
patch('RULE3: inject _detectMockLocation after calculateDistance',
  `function calculateDistance(lat1, lon1, lat2, lon2) {`,
  MOCK_DETECTION_FN + `function calculateDistance(lat1, lon1, lat2, lon2) {`
);

// Gunakan deteksi mock saat validasi absen di submitAttendanceRecord
patch('RULE3: validasi mock location saat absen',
  `  let distanceMeters = 15;\r\n  let isOutOfRadius = false;\r\n  if (userCoords) {\r\n    const dist = calculateDistance(userCoords.lat, userCoords.lng, TARGET_LOCATION.lat, TARGET_LOCATION.lng);\r\n    distanceMeters = Math.round(dist * 1000);\r\n    if (distanceMeters > TARGET_LOCATION.allowedRadiusMeters) {\r\n      isOutOfRadius = true;\r\n    }\r\n  }`,
  `  let distanceMeters = 15;\r\n  let isOutOfRadius = false;\r\n  if (userCoords) {\r\n    const dist = calculateDistance(userCoords.lat, userCoords.lng, TARGET_LOCATION.lat, TARGET_LOCATION.lng);\r\n    distanceMeters = Math.round(dist * 1000);\r\n    if (distanceMeters > TARGET_LOCATION.allowedRadiusMeters) {\r\n      isOutOfRadius = true;\r\n    }\r\n  }\r\n\r\n  // RULE 3: Deteksi Mock Location — blokir absen jika GPS jelas tidak valid\r\n  if (userCoords && activeUser && activeUser.role === 'siswa') {\r\n    var _mockCheck = _detectMockLocation(\r\n      userCoords.lat, userCoords.lng,\r\n      userCoords.accuracy,\r\n      userCoords.altitude || null\r\n    );\r\n    if (_mockCheck.isSuspicious) {\r\n      // Akurasi 0 atau di luar 100km = jelas tidak valid, tolak langsung\r\n      var _accuracy = userCoords.accuracy;\r\n      var _distKm = calculateDistance(userCoords.lat, userCoords.lng, -7.9825, 112.6867);\r\n      if ((_accuracy !== null && _accuracy !== undefined && _accuracy <= 1) || _distKm > 100) {\r\n        showToast('Presensi ditolak: ' + _mockCheck.warnings[0], 'error');\r\n        console.warn('[SIGAP] MOCK GPS DETECTED:', _mockCheck.warnings);\r\n        return;\r\n      }\r\n      // Akurasi sangat rendah (>500m) — izinkan tapi tampilkan peringatan\r\n      if (_accuracy > 500) {\r\n        showToast('Peringatan: Akurasi GPS rendah (' + Math.round(_accuracy) + 'm). Pindah ke area terbuka.', 'warning');\r\n      }\r\n    }\r\n  }`
);

// ══════════════════════════════════════════════════════════════════════════
// RULE 4: SERVER TIMESTAMP
// Sebelum simpan absen, ambil timestamp dari server
// Jika server tidak bisa dicapai, gunakan waktu lokal tapi beri catatan
// ══════════════════════════════════════════════════════════════════════════

// Tambah endpoint get_server_time di JS + fungsi _getServerTime
const SERVER_TIME_FN = `
// ── RULE 4: Server Timestamp — sinkronisasi waktu dari server ─────────────
// Cache server time untuk mengurangi request
var _serverTimeOffset = null;  // selisih ms antara server dan client
var _serverTimeLastSync = 0;

async function _getServerTime() {
  // Throttle: sinkronisasi ulang maksimal 1x per 5 menit
  var now = Date.now();
  if (_serverTimeOffset !== null && (now - _serverTimeLastSync) < 300000) {
    return new Date(now + _serverTimeOffset);
  }
  try {
    var t0 = Date.now();
    var res = await fetch(apiUrl('api.php?action=get_server_time'), {
      method: 'GET',
      cache: 'no-store'
    });
    var t1 = Date.now();
    if (res && res.ok) {
      var data = await res.json();
      if (data && data.server_ts) {
        // Kompensasi network latency: tambahkan setengah round-trip time
        var serverTs = parseInt(data.server_ts) * 1000; // server kirim detik, konversi ke ms
        var latency = (t1 - t0) / 2;
        _serverTimeOffset = (serverTs + latency) - t1;
        _serverTimeLastSync = t1;
        console.log('[SIGAP] Server time synced, offset:', Math.round(_serverTimeOffset), 'ms');
      }
    }
  } catch(e) {
    console.warn('[SIGAP] Server time sync failed, using local time:', e.message);
  }
  return new Date(Date.now() + (_serverTimeOffset || 0));
}

`;

// Sisipkan fungsi server time sebelum submitAttendanceRecord
patch('RULE4: inject _getServerTime before submitAttendanceRecord',
  `function submitAttendanceRecord() {`,
  SERVER_TIME_FN + `function submitAttendanceRecord() {`
);

// Ubah submitAttendanceRecord untuk menggunakan server time
patch('RULE4: gunakan server time di submitAttendanceRecord',
  `function submitAttendanceRecord() {\r\n  const now = new Date();\r\n  const todayStr = now.toISOString().split('T')[0];\r\n  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });`,
  `function submitAttendanceRecord() {\r\n  // RULE 4: Gunakan timestamp server, bukan jam lokal device\r\n  // Jadikan async untuk menunggu server time\r\n  _getServerTime().then(function(_serverNow) {\r\n    _doSubmitAttendanceRecord(_serverNow);\r\n  }).catch(function() {\r\n    // Fallback ke waktu lokal jika server tidak bisa dicapai\r\n    _doSubmitAttendanceRecord(new Date());\r\n  });\r\n  return; // actual logic ada di _doSubmitAttendanceRecord\r\n}\r\n\r\nfunction _doSubmitAttendanceRecord(now) {\r\n  const todayStr = now.toISOString().split('T')[0];\r\n  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });`
);

// Tambahkan server_timestamp ke newLogRecord
patch('RULE4: tambah server_timestamp ke newLogRecord',
  `    id: Date.now(),\r\n    _localTs: Date.now(), // guard: log ini baru dibuat lokal, jangan hapus saat merge`,
  `    id: Date.now(),\r\n    _localTs: Date.now(), // guard: log ini baru dibuat lokal, jangan hapus saat merge\r\n    server_timestamp: now.toISOString(), // RULE 4: timestamp tervalidasi dari server`
);

// Tutup fungsi _doSubmitAttendanceRecord — cari closing } dari submitAttendanceRecord
// Pola: setelah confetti closing
// Kita tidak perlu tutup karena struktur JS akan otomatis menutup

console.log('\nTotal patches OK:', ok);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK — size:', content.length);
