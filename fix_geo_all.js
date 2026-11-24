// fix_geo_all.js — ALL geofencing fixes, safe (tidak memotong file)
const fs = require('fs');
let c = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0, fail = 0;
const origLen = c.length;

function patch(name, oldStr, newStr) {
  if (!c.includes(oldStr)) {
    console.error('FAIL ['+name+'] pattern not found');
    fail++;
    return false;
  }
  const before = c.length;
  c = c.replace(oldStr, newStr);
  const after = c.length;
  console.log('OK   ['+name+'] delta='+(after-before));
  ok++;
  return true;
}

// ── FIX 1: isKnownBadCoords ─────────────────────────────────────────────────
patch('isKnownBadCoords detection',
`  const isCenterMalang = !isNaN(lat) && !isNaN(lng) && Math.abs(lat - (-7.9700)) < 0.001 && Math.abs(lng - 112.6326) < 0.001;\r\n  const isDefaultSMKN9 = !isNaN(lat) && !isNaN(lng) && Math.abs(lat - (-7.9825)) < 0.001 && Math.abs(lng - 112.6867) < 0.001;`,
`  const isCenterMalang = !isNaN(lat) && !isNaN(lng) && Math.abs(lat - (-7.9700)) < 0.001 && Math.abs(lng - 112.6326) < 0.001;\r\n  const isDefaultSMKN9 = !isNaN(lat) && !isNaN(lng) && Math.abs(lat - (-7.9825)) < 0.001 && Math.abs(lng - 112.6867) < 0.001;\r\n  // Koordinat generik dari geocode tidak akurat (banyak siswa punya koordinat sama persis)\r\n  const isKnownBadCoords = (!isNaN(lat) && !isNaN(lng)) && (\r\n    (Math.abs(lat - (-7.9437)) < 0.0005 && Math.abs(lng - 112.6136) < 0.0005) ||\r\n    (Math.abs(lat - (-7.9797)) < 0.0005 && Math.abs(lng - 112.6304) < 0.0005) ||\r\n    (Math.abs(lat - (-8.0028)) < 0.0005 && Math.abs(lng - 112.6571) < 0.0005) ||\r\n    (Math.abs(lat - (-8.0007)) < 0.0005 && Math.abs(lng - 112.6157) < 0.0005)\r\n  );`
);

// ── FIX 2: isGenericDefault pakai isKnownBadCoords ──────────────────────────
patch('isGenericDefault include isKnownBadCoords',
`  const isGenericDefault = (isCenterMalang || (isDefaultSMKN9 && !pklIsAtSMKN9));`,
`  const isGenericDefault = (isCenterMalang || (isDefaultSMKN9 && !pklIsAtSMKN9) || isKnownBadCoords);`
);

// ── FIX 3: Siswa koordinat invalid — cek cache + nama bersih ────────────────
// Cari exact string dari file
const elseSiswaStart = c.indexOf('    } else {\r\n      // Koordinat belum valid');
if (elseSiswaStart < 0) {
  console.error('FAIL [siswa else block] not found');
  fail++;
} else {
  // Cari ujung blok: "    return;\n  }" setelah else
  const returnEnd = c.indexOf('    return;\r\n  }', elseSiswaStart);
  if (returnEnd < 0) { console.error('FAIL [siswa else: return end not found]'); fail++; }
  else {
    const endPos = returnEnd + '    return;\r\n  }'.length;
    const oldBlock = c.slice(elseSiswaStart, endPos);
    // Verifikasi blok benar
    if (!oldBlock.includes('geocodeLocationName(pklName, user)')) {
      console.error('FAIL [siswa else: wrong block]', JSON.stringify(oldBlock.substring(0,60)));
      fail++;
    } else {
      const newBlock =
`    } else {
      // Koordinat belum valid — cek geocode cache dulu dengan nama yang dibersihkan
      var _cName = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim() : pklName;
      var _ck1 = pklName.toLowerCase().trim();
      var _ck2 = _cName.toLowerCase().trim();
      var _cHit = _geocodeNameCache[_ck1] || (_ck2 !== _ck1 ? _geocodeNameCache[_ck2] : null);
      if (_cHit && _cHit.lat && _cHit.lng) {
        // Cache hit: pakai langsung tanpa Nominatim
        _forceSetTargetLocation({ lat: _cHit.lat, lng: _cHit.lng, name: pklName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });
        _targetLocationLocked = true;
        _updateMapUIAndReset();
        if (user && user.id) {
          user.latitude_pkl = _cHit.lat; user.longitude_pkl = _cHit.lng;
          var _lus = getUsers(); var _li = _lus.findIndex(function(u){return u.id===user.id||u.username===user.username;});
          if (_li !== -1) { _lus[_li].latitude_pkl = _cHit.lat; _lus[_li].longitude_pkl = _cHit.lng; saveUsers(_lus); }
          fetch(apiUrl('api.php?action=update_pkl_location'), { method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id: user.id, user_id: user.id, pklLocation: pklName, latitude_pkl: _cHit.lat, longitude_pkl: _cHit.lng })
          }).catch(function(){});
        }
      } else {
        // Geocode dengan nama bersih (sebelum koma) agar lebih akurat
        geocodeLocationName(_ck2 !== _ck1 ? _cName : pklName, user);
      }
    }
    return;
  }`.replace(/\n/g, '\r\n');
      c = c.slice(0, elseSiswaStart) + newBlock + c.slice(endPos);
      console.log('OK   [siswa cache+clean geocode] delta='+(newBlock.length-oldBlock.length));
      ok++;
    }
  }
}

// ── FIX 4: _applyGuruTargetFromStudent — cache + stabil ─────────────────────
const guruFnStart = c.indexOf('function _applyGuruTargetFromStudent(student) {');
if (guruFnStart < 0) { console.error('FAIL [guru fn not found]'); fail++; }
else {
  const ifValidStart = c.indexOf('  if (isValid) {', guruFnStart);
  // Cari ujung blok: komentar setelah fungsi
  const afterGuruFn = c.indexOf('\n// -- Dipanggil saat guru ganti', guruFnStart);
  if (ifValidStart < 0 || afterGuruFn < 0) { console.error('FAIL [guru fn bounds]'); fail++; }
  else {
    const oldGuruBlock = c.slice(ifValidStart, afterGuruFn);
    const newGuruBlock =
`  // Kunci guru target dulu — cegah polling mereset peta saat set koordinat
  _guruTargetStudentId = student.id || student.username;
  _guruTargetLocked = true;

  if (isValid) {
    // Koordinat DB valid — force-set langsung
    _forceSetTargetLocation({ lat: lat, lng: lng, name: pklName, allowedRadiusMeters: 350 });
    _updateMapUIAndReset();
    console.log('[SIGAP] Guru target valid:', pklName, lat, lng);
  } else if (pklName) {
    // Koordinat tidak valid — cek geocode cache dulu (jangan langsung geocode, peta bisa flash)
    var _gFull  = pklName.toLowerCase().trim();
    var _gShort = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim().toLowerCase() : _gFull;
    var _gHit   = _geocodeNameCache[_gFull] || _geocodeNameCache[_gShort];
    if (_gHit && _gHit.lat && _gHit.lng) {
      // Cache hit: langsung pakai, peta stabil
      _forceSetTargetLocation({ lat: _gHit.lat, lng: _gHit.lng, name: pklName, allowedRadiusMeters: 350 });
      _updateMapUIAndReset();
      console.log('[SIGAP] Guru target (cache):', pklName, _gHit.lat, _gHit.lng);
    } else {
      // Tidak di cache: tampilkan nama, set koordinat SMKN9 sementara
      // Geocode BACKGROUND — _guruTargetLocked=true sudah mencegah override peta
      TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: pklName, allowedRadiusMeters: 350 };
      _updateMapUIAndReset();
      var _gName = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim() : pklName;
      if (_gName && _gName.length > 3) { geocodeLocationName(_gName, null); }
      console.log('[SIGAP] Guru target (geocoding bg):', pklName);
    }
  } else {
    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: 'SMK Negeri 9 Malang', allowedRadiusMeters: 350 };
    _guruTargetStudentId = null;
    _guruTargetLocked = false;
    _updateMapUIAndReset();
  }
}

`.replace(/\n/g, '\r\n');
    c = c.slice(0, ifValidStart) + newGuruBlock + c.slice(afterGuruFn + 1);
    console.log('OK   [guru target cache+stable] delta='+(newGuruBlock.length-oldGuruBlock.length));
    ok++;
  }
}

// ── FIX 5: APK sync — skip known bad coords dari server ─────────────────────
patch('APK sync skip known bad coords',
`              var hasValid = !isNaN(sLat) && sLat !== 0 && !isNaN(sLng) && sLng !== 0;`,
`              var _sBad = (!isNaN(sLat)&&!isNaN(sLng)) && (\r\n                (Math.abs(sLat-(-7.9437))<0.0005&&Math.abs(sLng-112.6136)<0.0005)||\r\n                (Math.abs(sLat-(-7.9797))<0.0005&&Math.abs(sLng-112.6304)<0.0005)||\r\n                (Math.abs(sLat-(-8.0028))<0.0005&&Math.abs(sLng-112.6571)<0.0005));\r\n              var hasValid = !isNaN(sLat) && sLat !== 0 && !isNaN(sLng) && sLng !== 0 && !_sBad;`
);

// Verify tidak ada data yang hilang
console.log('\n=== HASIL ===');
console.log('OK:', ok, '| FAIL:', fail);
console.log('File size:', c.length, '(was', origLen + ')');

if (fail === 0) {
  fs.writeFileSync('d:/absen pkl update/js/app.js', c, 'utf8');
  console.log('SAVED OK');
} else {
  console.error('TIDAK SAVE karena ada ' + fail + ' patch yang gagal');
}
