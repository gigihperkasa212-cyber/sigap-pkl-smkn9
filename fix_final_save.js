// fix_final_save.js — apply siswa + guru patches dan FORCE SAVE
const fs = require('fs');
let c = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
const origLen = c.length;
let ok = 0;

// ── SISWA PATCH ──────────────────────────────────────────────────────────────
const elseStart = c.indexOf('    } else {\r\n      // Koordinat belum valid');
const RETURN_MARKER = '    return;\r\n  }';
const returnEnd = c.indexOf(RETURN_MARKER, elseStart);
if (elseStart < 0 || returnEnd < 0) {
  console.error('FAIL: siswa block bounds not found', elseStart, returnEnd);
} else {
  const endPos = returnEnd + RETURN_MARKER.length;
  const oldBlock = c.slice(elseStart, endPos);
  console.log('Siswa old block:', oldBlock.length, 'chars');
  if (!oldBlock.includes('geocodeLocationName(pklName, user)')) {
    console.error('SKIP: siswa block already patched or wrong');
  } else {
    const newBlock =
`    } else {\r\n      // Koordinat belum valid — cek geocode cache dulu dengan nama yang dibersihkan\r\n      var _cName = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim() : pklName;\r\n      var _ck1 = pklName.toLowerCase().trim();\r\n      var _ck2 = _cName.toLowerCase().trim();\r\n      var _cHit = _geocodeNameCache[_ck1] || (_ck2 !== _ck1 ? _geocodeNameCache[_ck2] : null);\r\n      if (_cHit && _cHit.lat && _cHit.lng) {\r\n        // Cache hit: pakai langsung tanpa Nominatim\r\n        _forceSetTargetLocation({ lat: _cHit.lat, lng: _cHit.lng, name: pklName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });\r\n        _targetLocationLocked = true;\r\n        _updateMapUIAndReset();\r\n        if (user && user.id) {\r\n          user.latitude_pkl = _cHit.lat; user.longitude_pkl = _cHit.lng;\r\n          var _lus = getUsers(); var _li = _lus.findIndex(function(u){return u.id===user.id||u.username===user.username;});\r\n          if (_li !== -1) { _lus[_li].latitude_pkl = _cHit.lat; _lus[_li].longitude_pkl = _cHit.lng; saveUsers(_lus); }\r\n          fetch(apiUrl('api.php?action=update_pkl_location'), { method: 'POST', headers: {'Content-Type':'application/json'},\r\n            body: JSON.stringify({ id: user.id, user_id: user.id, pklLocation: pklName, latitude_pkl: _cHit.lat, longitude_pkl: _cHit.lng })\r\n          }).catch(function(){});\r\n        }\r\n      } else {\r\n        // Geocode dengan nama bersih (sebelum koma) agar lebih akurat\r\n        geocodeLocationName(_ck2 !== _ck1 ? _cName : pklName, user);\r\n      }\r\n    }\r\n    return;\r\n  }`;
    c = c.slice(0, elseStart) + newBlock + c.slice(endPos);
    console.log('OK siswa patch, delta:', newBlock.length - oldBlock.length);
    ok++;
  }
}

// ── GURU PATCH ───────────────────────────────────────────────────────────────
const guruStart = c.indexOf('function _applyGuruTargetFromStudent(student) {');
const ifValidPos = c.indexOf('  if (isValid) {', guruStart);
const afterFn    = c.indexOf('\n// -- Dipanggil saat guru ganti', guruStart);
if (guruStart < 0 || ifValidPos < 0 || afterFn < 0) {
  console.error('FAIL: guru block bounds not found', guruStart, ifValidPos, afterFn);
} else {
  const oldGuruBlock = c.slice(ifValidPos, afterFn);
  if (!oldGuruBlock.includes('TARGET_LOCATION = { lat, lng, name: pklName')) {
    console.error('SKIP: guru block already patched or wrong');
  } else {
    const newGuruBlock =
`  // Kunci guru target dulu — cegah polling mereset peta\r\n  _guruTargetStudentId = student.id || student.username;\r\n  _guruTargetLocked = true;\r\n\r\n  if (isValid) {\r\n    // Koordinat DB valid — force-set langsung\r\n    _forceSetTargetLocation({ lat: lat, lng: lng, name: pklName, allowedRadiusMeters: 350 });\r\n    _updateMapUIAndReset();\r\n    console.log('[SIGAP] Guru target valid:', pklName, lat, lng);\r\n  } else if (pklName) {\r\n    // Koordinat tidak valid — cek geocode cache dulu\r\n    var _gFull  = pklName.toLowerCase().trim();\r\n    var _gShort = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim().toLowerCase() : _gFull;\r\n    var _gHit   = _geocodeNameCache[_gFull] || _geocodeNameCache[_gShort];\r\n    if (_gHit && _gHit.lat && _gHit.lng) {\r\n      // Cache hit: langsung pakai, peta stabil\r\n      _forceSetTargetLocation({ lat: _gHit.lat, lng: _gHit.lng, name: pklName, allowedRadiusMeters: 350 });\r\n      _updateMapUIAndReset();\r\n      console.log('[SIGAP] Guru target (cache):', pklName, _gHit.lat, _gHit.lng);\r\n    } else {\r\n      // Tidak di cache: tampilkan nama, set sementara ke SMKN9\r\n      // Geocode background — guruTargetLocked=true mencegah override peta\r\n      TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: pklName, allowedRadiusMeters: 350 };\r\n      _updateMapUIAndReset();\r\n      var _gName = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim() : pklName;\r\n      if (_gName && _gName.length > 3) { geocodeLocationName(_gName, null); }\r\n      console.log('[SIGAP] Guru target (geocoding bg):', pklName);\r\n    }\r\n  } else {\r\n    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: 'SMK Negeri 9 Malang', allowedRadiusMeters: 350 };\r\n    _guruTargetStudentId = null;\r\n    _guruTargetLocked = false;\r\n    _updateMapUIAndReset();\r\n  }\r\n}\r\n`;
    c = c.slice(0, ifValidPos) + newGuruBlock + c.slice(afterFn + 1);
    console.log('OK guru patch, delta:', newGuruBlock.length - oldGuruBlock.length);
    ok++;
  }
}

// ── TAMBAHKAN fix v2.1.89 yang hilang (sudah ada di server v2.1.89 tapi bukan di bak_v2188)
// FIX: applyTargetLocationFromUser — skip untuk guru
if (!c.includes('LOCK GUARD guru: jika guru sudah punya target siswa terkunci')) {
  const OLD_ATL = 'function applyTargetLocationFromUser(user) {\r\n  if (!user) return;\r\n  // LOCK GUARD: jika TARGET_LOCATION sudah dikunci setelah login siswa,\r\n  // jangan izinkan polling/rerender 8 detik mengubah geofencing lagi\r\n  if (_targetLocationLocked) return;';
  const NEW_ATL = 'function applyTargetLocationFromUser(user) {\r\n  if (!user) return;\r\n  // LOCK GUARD siswa: jika TARGET_LOCATION sudah dikunci setelah login siswa,\r\n  // jangan izinkan polling/rerender 8 detik mengubah geofencing lagi\r\n  if (_targetLocationLocked) return;\r\n  // LOCK GUARD guru: jika guru sudah punya target siswa terkunci,\r\n  // JANGAN timpa TARGET_LOCATION dengan koordinat pklLocation guru sendiri\r\n  if (_guruTargetLocked && user && user.role === \'guru\' && user.username !== \'admin\') return;';
  if (c.includes(OLD_ATL)) {
    c = c.replace(OLD_ATL, NEW_ATL);
    console.log('OK applyTargetLocFromUser guru guard');
    ok++;
  } else {
    console.log('SKIP applyTargetLocFromUser (already patched or different format)');
  }
}

// FIX: _mergeServerUsers update activeUser always
const OLD_MRG = '  // LOCK GUARD: jika siswa sudah login dan koordinat sudah dikunci, skip sync koordinat\r\n  if (typeof activeUser !== \'undefined\' && activeUser && activeUser.id && !_targetLocationLocked) {';
const NEW_MRG = '  // Update activeUser.latitude_pkl dari server — SELALU update field di activeUser\r\n  // agar sesi berikutnya punya koordinat terbaru, meski TARGET_LOCATION terkunci\r\n  if (typeof activeUser !== \'undefined\' && activeUser && activeUser.id) {';
if (!c.includes('SELALU update field di activeUser') && c.includes(OLD_MRG)) {
  c = c.replace(OLD_MRG, NEW_MRG);
  console.log('OK mergeServerUsers always update');
  ok++;
}

// FIX: applyUserInterface pakai _userForGeo
if (!c.includes('_userForGeo')) {
  const OLD_UI = 'function applyUserInterface(user) {\r\n  // Synchronize dynamic TARGET_LOCATION from logged-in user\'s PKL data\r\n  applyTargetLocationFromUser(user);';
  const NEW_UI = 'function applyUserInterface(user) {\r\n  // Gunakan activeUser jika tersedia — lebih fresh dari parameter\r\n  var _userForGeo = (typeof activeUser !== \'undefined\' && activeUser && activeUser.id) ? activeUser : user;\r\n  // Synchronize dynamic TARGET_LOCATION from logged-in user\'s PKL data\r\n  applyTargetLocationFromUser(_userForGeo);';
  if (c.includes(OLD_UI)) {
    c = c.replace(OLD_UI, NEW_UI);
    console.log('OK applyUserInterface _userForGeo');
    ok++;
  }
}

console.log('\n=== TOTAL OK:', ok, '===');
console.log('File size:', c.length, '(was', origLen, ')');
fs.writeFileSync('d:/absen pkl update/js/app.js', c, 'utf8');
console.log('SAVED OK');
