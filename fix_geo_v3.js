// fix_geo_v3.js — patch remaining 3 yang gagal dengan exact strings dari file
const fs = require('fs');
let c = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0;

function patch(name, oldStr, newStr) {
  if (!c.includes(oldStr)) { console.error('FAIL ['+name+']'); return; }
  c = c.replace(oldStr, newStr);
  console.log('OK   ['+name+']'); ok++;
}

// FIX 1: siswa koordinat 0 — gunakan cache dulu, baru geocode dengan nama bersih
const OLD1 = "} else {\r\n      // Koordinat belum valid \u2014 geocode, akan dikunci setelah selesai \ufffd geocode dari nama\r\n      geocodeLocationName(pklName, user);\r\n    }\r\n    return;";
const NEW1 = `} else {
      // Koordinat belum valid — cek cache dulu, baru geocode dengan nama yang dibersihkan
      // Ambil nama bisnis saja (sebelum koma) agar geocode lebih akurat
      var _cleanName = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim() : pklName;
      var _ck1 = pklName.toLowerCase().trim();
      var _ck2 = _cleanName.toLowerCase().trim();
      var _hit = _geocodeNameCache[_ck1] || (_ck2 !== _ck1 && _geocodeNameCache[_ck2]);
      if (_hit) {
        // Cache hit: langsung pakai tanpa geocode ulang
        _forceSetTargetLocation({ lat: _hit.lat, lng: _hit.lng, name: pklName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });
        _targetLocationLocked = true;
        _updateMapUIAndReset();
        if (user && user.id) {
          user.latitude_pkl = _hit.lat; user.longitude_pkl = _hit.lng;
          var _lu = getUsers(); var _li = _lu.findIndex(function(u){return u.id===user.id||u.username===user.username;});
          if (_li !== -1) { _lu[_li].latitude_pkl = _hit.lat; _lu[_li].longitude_pkl = _hit.lng; saveUsers(_lu); }
          fetch(apiUrl('api.php?action=update_pkl_location'), { method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id: user.id, user_id: user.id, pklLocation: pklName, latitude_pkl: _hit.lat, longitude_pkl: _hit.lng })
          }).catch(function(){});
        }
      } else {
        // Geocode dengan nama bersih agar lebih akurat
        geocodeLocationName(_ck2 !== _ck1 ? _cleanName : pklName, user);
      }
    }
    return;`.replace(/\n/g, '\r\n');

patch('siswa koordinat 0: cache dulu baru geocode nama bersih', OLD1, NEW1);

// FIX 2: _applyGuruTargetFromStudent — gunakan cache, guru TIDAK geocode peta
const OLD2 =
`  if (isValid) {\r\n    TARGET_LOCATION = { lat, lng, name: pklName, allowedRadiusMeters: 350 };\r\n    // Kunci target guru setelah koordinat valid diset\r\n    _guruTargetStudentId = student.id || student.username;\r\n    _guruTargetLocked = true;\r\n    _updateMapUIAndReset();\r\n  } else if (pklName) {\r\n    // Koordinat belum valid \u2014 geocode dari nama, tapi tidak simpan ke user siswa\r\n    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: pklName, allowedRadiusMeters: 350 };\r\n    // Kunci target guru sementara (akan diupdate geocode selesai)\r\n    _guruTargetStudentId = student.id || student.username;\r\n    _guruTargetLocked = true;\r\n    _updateMapUIAndReset();\r\n    geocodeLocationName(pklName, null); // null = jangan simpan ke DB siswa dari akun guru\r\n  } else {\r\n    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: 'SMK Negeri 9 Malang', allowedRadiusMeters: 350 };\r\n    _guruTargetStudentId = null;\r\n    _guruTargetLocked = false;\r\n    _updateMapUIAndReset();\r\n  }`;

const NEW2 =
`  // Kunci guru target terlebih dahulu — cegah polling reset peta
  _guruTargetStudentId = student.id || student.username;
  _guruTargetLocked = true;

  if (isValid) {
    // Koordinat DB valid — langsung set dan kunci
    _forceSetTargetLocation({ lat: lat, lng: lng, name: pklName, allowedRadiusMeters: 350 });
    _updateMapUIAndReset();
    console.log('[SIGAP] Guru target:', pklName, lat, lng);
  } else if (pklName) {
    // Koordinat tidak valid — cek cache geocode dulu agar peta tidak flash ke SMKN9
    var _gkFull  = pklName.toLowerCase().trim();
    var _gkClean = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim().toLowerCase() : _gkFull;
    var _gHit    = _geocodeNameCache[_gkFull] || _geocodeNameCache[_gkClean];
    if (_gHit && _gHit.lat && _gHit.lng) {
      // Cache hit: gunakan koordinat yang sudah ada
      _forceSetTargetLocation({ lat: _gHit.lat, lng: _gHit.lng, name: pklName, allowedRadiusMeters: 350 });
      _updateMapUIAndReset();
      console.log('[SIGAP] Guru target (cache):', pklName, _gHit.lat, _gHit.lng);
    } else {
      // Tidak ada di cache: tampilkan nama saja tanpa mengubah koordinat peta (stabil)
      // Geocode di background — hasilnya masuk cache TAPI tidak langsung update peta guru
      // (karena _guruTargetLocked sudah true, geocode tidak akan override TARGET_LOCATION)
      TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: pklName, allowedRadiusMeters: 350 };
      _updateMapUIAndReset();
      // Geocode background: isi cache agar lain kali langsung dari cache
      if (_gkClean && _gkClean.length > 3) {
        geocodeLocationName(_gkClean !== _gkFull ? pklName.split(',')[0].trim() : pklName, null);
      }
      console.log('[SIGAP] Guru target (geocoding bg):', pklName);
    }
  } else {
    // Tidak ada nama PKL — default SMKN9
    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: 'SMK Negeri 9 Malang', allowedRadiusMeters: 350 };
    _guruTargetStudentId = null;
    _guruTargetLocked = false;
    _updateMapUIAndReset();
  }`.replace(/\n/g, '\r\n');

patch('_applyGuruTargetFromStudent: cache sebelum geocode, peta stabil', OLD2, NEW2);

console.log('\nTotal OK:', ok);
fs.writeFileSync('d:/absen pkl update/js/app.js', c, 'utf8');
console.log('SAVED');
