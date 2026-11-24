// fix_geo_lock_final.js
// SOLUSI PERMANEN: geofencing siswa harus terkunci setelah login
// 1. Coba server_geocode (PHP server yang query Nominatim + simpan ke DB)
// 2. Jika server_geocode berhasil → lock dengan koordinat baru
// 3. Jika server_geocode gagal → lock dengan koordinat SMKN9 sebagai fallback
//    (lebih baik stabil di SMKN9 daripada terus berputar)
// 4. Tambah flag _geocodeAttempted per user agar tidak retry terus

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// Tambah variabel _geocodeAttemptedFor setelah _guruTargetStudentId
const OLD_VARS =
  'var _guruTargetStudentId = null; // ID/username siswa yang sedang dipilih guru';
const NEW_VARS =
  'var _guruTargetStudentId = null; // ID/username siswa yang sedang dipilih guru\r\n' +
  'var _geocodeAttemptedFor = null; // ID siswa yang sudah dicoba geocode (cegah retry terus)';

if (!content.includes(OLD_VARS)) {
  console.error('FAIL: _guruTargetStudentId var not found');
  process.exit(1);
}
content = content.replace(OLD_VARS, NEW_VARS);
console.log('OK: _geocodeAttemptedFor var added');

// Reset _geocodeAttemptedFor saat login/logout
const OLD_LOGIN_RESET =
  '_guruTargetLocked = false;     // Reset guru target lock saat login baru\r\n  _guruTargetStudentId = null;';
const NEW_LOGIN_RESET =
  '_guruTargetLocked = false;     // Reset guru target lock saat login baru\r\n  _guruTargetStudentId = null;\r\n  _geocodeAttemptedFor = null; // Reset geocode attempt flag saat login baru';

if (!content.includes(OLD_LOGIN_RESET)) {
  console.error('FAIL: login reset not found');
} else {
  content = content.replace(OLD_LOGIN_RESET, NEW_LOGIN_RESET);
  console.log('OK: login reset updated');
}

const OLD_LOGOUT_RESET =
  '_guruTargetLocked = false;\r\n  _guruTargetStudentId = null;';
// Hanya yang di handleLogout (ada dua occurrence, ambil yang kedua — setelah "Reset lock saat logout")
const logoutIdx = content.indexOf('_guruTargetLocked = false;\r\n  _guruTargetStudentId = null;',
  content.indexOf('_targetLocationLocked = false; // Reset lock saat logout'));
if (logoutIdx < 0) {
  console.error('FAIL: logout reset not found');
} else {
  const before = content.slice(0, logoutIdx);
  const after = content.slice(logoutIdx + OLD_LOGOUT_RESET.length);
  content = before + OLD_LOGOUT_RESET + '\r\n  _geocodeAttemptedFor = null;' + after;
  console.log('OK: logout reset updated');
}

// Ganti blok "else geocode" di applyTargetLocationFromUser dengan logika baru:
// 1. Jika sudah pernah dicoba geocode untuk user ini, lock dengan SMKN9 (stabil)
// 2. Coba server_geocode → jika berhasil, lock dengan koordinat server
// 3. Jika server_geocode gagal, coba client-side geocode
// 4. Jika client geocode juga gagal (timeout), lock dengan SMKN9

const OLD_ELSE_GEOCODE =
  '      } else {\r\n        // Geocode dengan nama bersih (sebelum koma) agar lebih akurat\r\n        geocodeLocationName(_ck2 !== _ck1 ? _cName : pklName, user);\r\n      }';

const NEW_ELSE_GEOCODE =
  '      } else {\r\n' +
  '        // Cek apakah geocode sudah pernah dicoba untuk user ini\r\n' +
  '        var _userId = user.id || user.username;\r\n' +
  '        if (_geocodeAttemptedFor === _userId) {\r\n' +
  '          // Sudah pernah dicoba dan gagal — lock dengan SMKN9 sebagai fallback stabil\r\n' +
  '          // Lebih baik stabil di SMKN9 daripada terus berputar tanpa hasil\r\n' +
  '          _forceSetTargetLocation({ lat: -7.9825, lng: 112.6867, name: pklName || \'SMK Negeri 9 Malang\', allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });\r\n' +
  '          _targetLocationLocked = true;\r\n' +
  '          _updateMapUIAndReset();\r\n' +
  '          console.log(\'[SIGAP] Geocode gagal, lock dengan SMKN9 fallback untuk:\', pklName);\r\n' +
  '          return;\r\n' +
  '        }\r\n' +
  '        // Tandai sudah dicoba untuk user ini\r\n' +
  '        _geocodeAttemptedFor = _userId;\r\n' +
  '        var _geocodeName = _ck2 !== _ck1 ? _cName : pklName;\r\n' +
  '        // Coba server_geocode dulu (server PHP query Nominatim — lebih andal)\r\n' +
  '        if (user.id && typeof activeUser !== \'undefined\' && activeUser && String(user.id) === String(activeUser.id)) {\r\n' +
  '          fetch(apiUrl(\'api.php?action=server_geocode\'), {\r\n' +
  '            method: \'POST\', headers: {\'Content-Type\': \'application/json\'},\r\n' +
  '            body: JSON.stringify({ user_id: user.id, pklLocation: pklName })\r\n' +
  '          })\r\n' +
  '          .then(function(r){ return r && r.ok ? r.json() : null; })\r\n' +
  '          .then(function(res){\r\n' +
  '            if (res && res.success && res.lat && res.lng && !_targetLocationLocked) {\r\n' +
  '              var sLat = parseFloat(res.lat), sLng = parseFloat(res.lng);\r\n' +
  '              // Update activeUser dan localStorage\r\n' +
  '              if (activeUser) { activeUser.latitude_pkl = sLat; activeUser.longitude_pkl = sLng; }\r\n' +
  '              var _lus2 = getUsers(); var _li2 = _lus2.findIndex(function(u){return u.id===user.id||u.username===user.username;});\r\n' +
  '              if (_li2 !== -1) { _lus2[_li2].latitude_pkl = sLat; _lus2[_li2].longitude_pkl = sLng; saveUsers(_lus2); }\r\n' +
  '              // Lock dengan koordinat dari server\r\n' +
  '              _forceSetTargetLocation({ lat: sLat, lng: sLng, name: pklName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });\r\n' +
  '              _targetLocationLocked = true;\r\n' +
  '              _updateMapUIAndReset();\r\n' +
  '              console.log(\'[SIGAP] server_geocode berhasil:\', pklName, sLat, sLng);\r\n' +
  '            } else if (!_targetLocationLocked) {\r\n' +
  '              // server_geocode gagal — coba client geocode\r\n' +
  '              geocodeLocationName(_geocodeName, user);\r\n' +
  '            }\r\n' +
  '          })\r\n' +
  '          .catch(function(){\r\n' +
  '            // Fetch error — fallback ke client geocode\r\n' +
  '            if (!_targetLocationLocked) geocodeLocationName(_geocodeName, user);\r\n' +
  '          });\r\n' +
  '        } else {\r\n' +
  '          // Bukan siswa aktif — geocode client biasa\r\n' +
  '          geocodeLocationName(_geocodeName, user);\r\n' +
  '        }\r\n' +
  '      }';

if (!content.includes(OLD_ELSE_GEOCODE)) {
  console.error('FAIL: else geocode block not found');
  process.exit(1);
}
content = content.replace(OLD_ELSE_GEOCODE, NEW_ELSE_GEOCODE);
console.log('OK: else geocode replaced with server_geocode + fallback lock');

// Juga: saat geocode client-side gagal total (tidak ada koordinat),
// lock dengan SMKN9 agar tidak loop — cari di geocodeLocationName blok "else" terakhir
// (kamus lokal fallback → _updateMapUIAndReset) — tambahkan lock jika siswa aktif
const OLD_KAMUS_UPD = 'if (!_targetLocationLocked) _updateMapUIAndReset();';
if (!content.includes(OLD_KAMUS_UPD)) {
  console.error('INFO: kamus update already different or not found — skipping');
} else {
  const NEW_KAMUS_UPD =
    'if (!_targetLocationLocked) {\r\n' +
    '    // Geocode semua cara gagal — lock dengan koordinat kamus (mungkin 0,0 = SMKN9 fallback)\r\n' +
    '    // Ini mencegah loop tak berujung jika Nominatim tidak bisa temukan lokasi\r\n' +
    '    if (typeof user !== \'undefined\' && user && user.role === \'siswa\' && typeof activeUser !== \'undefined\' && activeUser &&\r\n' +
    '        (String(user.id) === String(activeUser.id) || user.username === activeUser.username)) {\r\n' +
    '      _targetLocationLocked = true; // lock untuk siswa aktif\r\n' +
    '      console.log(\'[SIGAP] geocode kamus — lock untuk siswa:\', user.pklLocation || \'\');\r\n' +
    '    }\r\n' +
    '    _updateMapUIAndReset();\r\n' +
    '  }';
  content = content.replace(OLD_KAMUS_UPD, NEW_KAMUS_UPD);
  console.log('OK: kamus fallback updated with lock');
}

const finalSize = content.length;
console.log('\nFile size:', finalSize);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
