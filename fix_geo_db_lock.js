// fix_geo_db_lock.js
// Ubah applyTargetLocationFromUser untuk siswa:
// SELALU fetch dari get_student_pkl_location dulu → jika valid, lock langsung
// Jika tidak valid di DB → server_geocode → geocode client → lock SMKN9 fallback
// Ini menjamin TARGET_LOCATION = koordinat dari database, bukan hasil geocode acak

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// Cari blok siswa dalam applyTargetLocationFromUser
// Dari "if (user.role === 'siswa' && pklName) {" sampai "return;" di akhir blok
const SISWA_START = "  if (user.role === 'siswa' && pklName) {\r\n    if (isDbCoordsValid) {";
const SISWA_END   = "    return;\r\n  }\r\n\r\n  // Untuk guru/admin";

const startIdx = content.indexOf(SISWA_START);
const endIdx   = content.indexOf(SISWA_END, startIdx);

if (startIdx < 0 || endIdx < 0) {
  console.error('FAIL: siswa block bounds not found', startIdx, endIdx);
  process.exit(1);
}

const endPos = endIdx + SISWA_END.length;
const oldBlock = content.slice(startIdx, endPos);
console.log('Old siswa block: ' + oldBlock.length + ' chars');
console.log('Start:', JSON.stringify(oldBlock.substring(0, 60)));

// Blok baru: UTAMAKAN fetch dari DB via get_student_pkl_location
// Alur: DB fetch → jika valid lock | jika tidak → cache → server_geocode → nominatim → SMKN9
const NEW_SISWA_BLOCK =
`  if (user.role === 'siswa' && pklName) {\r\n` +
`    // ── PRIORITAS UTAMA: Fetch koordinat dari database server ──────────────\r\n` +
`    // Endpoint get_student_pkl_location mengembalikan koordinat langsung dari DB\r\n` +
`    // Ini adalah sumber kebenaran tunggal — bukan hasil geocode acak\r\n` +
`    var _siswaId = user.id || user.username;\r\n` +
`    if (_siswaId && typeof activeUser !== 'undefined' && activeUser &&\r\n` +
`        (String(user.id) === String(activeUser.id) || user.username === activeUser.username)) {\r\n` +
`      // Fetch dari DB dulu — async, tidak blokir UI\r\n` +
`      fetch(apiUrl('api.php?action=get_student_pkl_location&user_id=' + encodeURIComponent(_siswaId)))\r\n` +
`        .then(function(r){ return r && r.ok ? r.json() : null; })\r\n` +
`        .then(function(res){\r\n` +
`          if (_targetLocationLocked) return; // sudah dikunci di tempat lain\r\n` +
`          if (res && res.success && res.ready_to_lock && res.lat && res.lng) {\r\n` +
`            // ✅ Koordinat VALID di database → lock langsung, tidak perlu geocode\r\n` +
`            var dbLat = parseFloat(res.lat);\r\n` +
`            var dbLng = parseFloat(res.lng);\r\n` +
`            var dbRadius = (res.radius && res.radius > 0) ? parseInt(res.radius) : 350;\r\n` +
`            dbRadius = Math.max(50, Math.min(1000, dbRadius));\r\n` +
`            // Update activeUser dengan koordinat DB terbaru\r\n` +
`            if (activeUser) { activeUser.latitude_pkl = dbLat; activeUser.longitude_pkl = dbLng; }\r\n` +
`            // Update localStorage\r\n` +
`            var _lu = getUsers();\r\n` +
`            var _li = _lu.findIndex(function(u){ return u.id===user.id||u.username===user.username; });\r\n` +
`            if (_li !== -1) { _lu[_li].latitude_pkl = dbLat; _lu[_li].longitude_pkl = dbLng; saveUsers(_lu); }\r\n` +
`            // Force-set dan lock — ini koordinat resmi dari database\r\n` +
`            _forceSetTargetLocation({ lat: dbLat, lng: dbLng, name: res.name || pklName, allowedRadiusMeters: dbRadius });\r\n` +
`            _targetLocationLocked = true;\r\n` +
`            _geocodeAttemptedFor = null; // reset flag karena sudah dapat dari DB\r\n` +
`            _updateMapUIAndReset();\r\n` +
`            console.log('[SIGAP] ✅ TARGET LOCKED dari DB:', res.name, dbLat, dbLng, 'radius:', dbRadius + 'm');\r\n` +
`          } else if (res && res.success && !res.ready_to_lock) {\r\n` +
`            // ⚠️ Koordinat di DB tidak valid (0 atau generic) → geocode\r\n` +
`            console.log('[SIGAP] DB koordinat tidak valid, mulai geocode:', pklName);\r\n` +
`            _applyGeocodeForSiswa(user, pklName);\r\n` +
`          } else {\r\n` +
`            // Fetch gagal (offline/error) → coba dari data lokal\r\n` +
`            _applyFromLocalData(user, pklName, isDbCoordsValid, lat, lng);\r\n` +
`          }\r\n` +
`        })\r\n` +
`        .catch(function(){\r\n` +
`          // Offline → gunakan data lokal\r\n` +
`          _applyFromLocalData(user, pklName, isDbCoordsValid, lat, lng);\r\n` +
`        });\r\n` +
`      return; // tunggu async fetch, jangan teruskan eksekusi sinkron\r\n` +
`    } else {\r\n` +
`      // Bukan siswa aktif (misalnya dari polling untuk user lain)\r\n` +
`      _applyFromLocalData(user, pklName, isDbCoordsValid, lat, lng);\r\n` +
`    }\r\n` +
`    return;\r\n` +
`  }\r\n` +
`\r\n` +
`  // Untuk guru/admin`;

content = content.slice(0, startIdx) + NEW_SISWA_BLOCK + content.slice(endPos - '  // Untuk guru/admin'.length);
console.log('Siswa block replaced');

// Tambahkan fungsi helper _applyFromLocalData dan _applyGeocodeForSiswa
// sebelum applyTargetLocationFromUser
const HELPER_FNS =
`// ── Helper: terapkan koordinat dari data lokal (offline / non-siswa aktif) ─\r\n` +
`function _applyFromLocalData(user, pklName, isDbCoordsValid, lat, lng) {\r\n` +
`  if (_targetLocationLocked) return;\r\n` +
`  if (isDbCoordsValid) {\r\n` +
`    var _r = (user && parseInt(user.allowed_radius)) > 0 ? parseInt(user.allowed_radius) : 350;\r\n` +
`    _r = Math.max(50, Math.min(1000, _r));\r\n` +
`    _forceSetTargetLocation({ lat: lat, lng: lng, name: pklName, allowedRadiusMeters: _r });\r\n` +
`    _targetLocationLocked = true;\r\n` +
`    _updateMapUIAndReset();\r\n` +
`  } else {\r\n` +
`    _applyGeocodeForSiswa(user, pklName);\r\n` +
`  }\r\n` +
`}\r\n` +
`\r\n` +
`// ── Helper: geocode untuk siswa yang koordinat DB tidak valid ──────────────\r\n` +
`function _applyGeocodeForSiswa(user, pklName) {\r\n` +
`  if (_targetLocationLocked) return;\r\n` +
`  var _ck1 = pklName.toLowerCase().trim();\r\n` +
`  var _cName = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim() : pklName;\r\n` +
`  var _ck2 = _cName.toLowerCase().trim();\r\n` +
`  var _cHit = _geocodeNameCache[_ck1] || (_ck2 !== _ck1 ? _geocodeNameCache[_ck2] : null);\r\n` +
`  if (_cHit && _cHit.lat && _cHit.lng) {\r\n` +
`    var _cR = (user && parseInt(user.allowed_radius)) > 0 ? parseInt(user.allowed_radius) : 350;\r\n` +
`    _cR = Math.max(50, Math.min(1000, _cR));\r\n` +
`    _forceSetTargetLocation({ lat: _cHit.lat, lng: _cHit.lng, name: pklName, allowedRadiusMeters: _cR });\r\n` +
`    _targetLocationLocked = true;\r\n` +
`    _updateMapUIAndReset();\r\n` +
`    return;\r\n` +
`  }\r\n` +
`  var _userId = user.id || user.username;\r\n` +
`  if (_geocodeAttemptedFor === _userId) {\r\n` +
`    // Sudah dicoba, gagal — lock SMKN9 sebagai fallback\r\n` +
`    _forceSetTargetLocation({ lat: -7.9825, lng: 112.6867, name: pklName, allowedRadiusMeters: 350 });\r\n` +
`    _targetLocationLocked = true;\r\n` +
`    _updateMapUIAndReset();\r\n` +
`    return;\r\n` +
`  }\r\n` +
`  _geocodeAttemptedFor = _userId;\r\n` +
`  // Coba server_geocode dulu\r\n` +
`  if (user.id && typeof activeUser !== 'undefined' && activeUser && String(user.id) === String(activeUser.id)) {\r\n` +
`    fetch(apiUrl('api.php?action=server_geocode'), {\r\n` +
`      method: 'POST', headers: {'Content-Type':'application/json'},\r\n` +
`      body: JSON.stringify({ user_id: user.id, pklLocation: pklName })\r\n` +
`    }).then(function(r){ return r && r.ok ? r.json() : null; })\r\n` +
`    .then(function(res){\r\n` +
`      if (res && res.success && res.lat && res.lng && !_targetLocationLocked) {\r\n` +
`        var sLat = parseFloat(res.lat), sLng = parseFloat(res.lng);\r\n` +
`        var sR = (activeUser && parseInt(activeUser.allowed_radius)) > 0 ? parseInt(activeUser.allowed_radius) : 350;\r\n` +
`        sR = Math.max(50, Math.min(1000, sR));\r\n` +
`        if (activeUser) { activeUser.latitude_pkl = sLat; activeUser.longitude_pkl = sLng; }\r\n` +
`        _forceSetTargetLocation({ lat: sLat, lng: sLng, name: pklName, allowedRadiusMeters: sR });\r\n` +
`        _targetLocationLocked = true;\r\n` +
`        _updateMapUIAndReset();\r\n` +
`        console.log('[SIGAP] server_geocode berhasil:', pklName, sLat, sLng);\r\n` +
`      } else if (!_targetLocationLocked) {\r\n` +
`        geocodeLocationName(_ck2 !== _ck1 ? _cName : pklName, user);\r\n` +
`      }\r\n` +
`    }).catch(function(){\r\n` +
`      if (!_targetLocationLocked) geocodeLocationName(_ck2 !== _ck1 ? _cName : pklName, user);\r\n` +
`    });\r\n` +
`  } else {\r\n` +
`    geocodeLocationName(_ck2 !== _ck1 ? _cName : pklName, user);\r\n` +
`  }\r\n` +
`}\r\n` +
`\r\n`;

// Sisipkan sebelum applyTargetLocationFromUser
const OLD_ATLU_HDR = 'function applyTargetLocationFromUser(user) {\r\n';
if (!content.includes(OLD_ATLU_HDR)) {
  console.error('FAIL: cannot find applyTargetLocationFromUser header');
  process.exit(1);
}
content = content.replace(OLD_ATLU_HDR, HELPER_FNS + OLD_ATLU_HDR);
console.log('Helper functions injected');

// Hapus duplikat blok lama (geocode logic yang sekarang di _applyGeocodeForSiswa)
// di applyTargetLocationFromUser — cari dan hapus blok else yang lama
// Blok lama dimulai dari "    } else {" yang mengandung "_geocodeAttemptedFor"
const OLD_ELSE_GEOCODE =
`    } else {\r\n` +
`      // Cek apakah geocode sudah pernah dicoba untuk user ini\r\n` +
`      var _userId = user.id || user.username;\r\n`;
if (content.includes(OLD_ELSE_GEOCODE)) {
  // Cari sampai akhir else block (closing brace sebelum "return;")
  const oldElseStart = content.indexOf(OLD_ELSE_GEOCODE);
  // Blok ini berakhir sebelum "    return;\n  }" pattern setelah blok siswa
  // Cari pattern yang unik untuk akhir blok ini
  const endMarker = `      }\r\n    }\r\n    return;\r\n  }\r\n\r\n  // Untuk guru/admin`;
  const endMarkerIdx = content.indexOf(endMarker, oldElseStart);
  if (endMarkerIdx >= 0) {
    const oldElseBlock = content.slice(oldElseStart, endMarkerIdx + endMarker.length);
    console.log('Old else block found:', oldElseBlock.length, 'chars');
    // Ganti dengan versi bersih yang hanya panggil helper
    const newElseBlock = `    } else {\r\n      _applyGeocodeForSiswa(user, pklName);\r\n    }\r\n    return;\r\n  }\r\n\r\n  // Untuk guru/admin`;
    content = content.replace(oldElseBlock, newElseBlock);
    console.log('Old else block simplified');
  } else {
    console.log('SKIP: else block end not found, skipping cleanup');
  }
}

// Verifikasi
const checks = [
  ['get_student_pkl_location call', content.includes('get_student_pkl_location')],
  ['ready_to_lock check', content.includes('ready_to_lock')],
  ['_applyFromLocalData fn', content.includes('function _applyFromLocalData')],
  ['_applyGeocodeForSiswa fn', content.includes('function _applyGeocodeForSiswa')],
  ['TARGET LOCKED dari DB log', content.includes('TARGET LOCKED dari DB:')],
];
checks.forEach(([n,v]) => console.log((v?'OK':'MISS')+' '+n));

fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK — size:', content.length);
