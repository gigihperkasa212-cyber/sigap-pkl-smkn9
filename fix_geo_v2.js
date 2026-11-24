// fix_geo_v2.js — Fix geofencing siswa (koordinat DB tidak sesuai) + guru (tidak stabil)

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0, fail = 0;

function patch(name, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('FAIL [' + name + ']');
    const key = oldStr.replace(/\r\n/g,' ').substring(0,60);
    const idx = content.indexOf(key.substring(0,30));
    if(idx>=0) console.log('  context:', JSON.stringify(content.slice(idx,idx+100)));
    fail++;
    return false;
  }
  content = content.replace(oldStr, newStr);
  console.log('OK   [' + name + ']');
  ok++;
  return true;
}

// ══════════════════════════════════════════════════════════════════════════
// FIX 1: applyTargetLocationFromUser — SISWA dengan koordinat 0,0 di DB
// Masalah: 207 siswa koordinatnya 0,0 → geocode Nominatim dipanggil
//          Nama PKL panjang (alamat lengkap) → Nominatim tidak akurat
// Solusi:  Cek geocodeNameCache dulu, jika tidak ada baru geocode
//          Geocode menggunakan nama PKL yang dibersihkan (ambil nama bisnis saja)
//          + Simpan hasil geocode langsung ke server via update_pkl_location
// ══════════════════════════════════════════════════════════════════════════
patch(
  'applyTargetLocationFromUser: siswa koordinat 0 - improved geocode',
  `    } else {
      // Koordinat belum valid — geocode, akan dikunci setelah selesai \ufffddgeocode dari nama
      geocodeLocationName(pklName, user);
    }
    return;`,
  `    } else {
      // Koordinat belum valid — coba dari geocode cache dulu, baru Nominatim
      // Ambil nama bisnis saja dari pklName yang panjang (sebelum koma/alamat lengkap)
      var _cleanPklName = pklName;
      // Jika nama PKL mengandung koma (kemungkinan alamat lengkap), ambil bagian pertama saja
      if (pklName.indexOf(',') > 5) {
        _cleanPklName = pklName.split(',')[0].trim();
      }
      // Cek cache dengan nama asli dulu, kemudian nama bersih
      var _cacheKey1 = pklName.toLowerCase().trim();
      var _cacheKey2 = _cleanPklName.toLowerCase().trim();
      if (_geocodeNameCache[_cacheKey1] || _geocodeNameCache[_cacheKey2]) {
        // Cache hit: langsung set TARGET_LOCATION tanpa Nominatim
        var _cached = _geocodeNameCache[_cacheKey1] || _geocodeNameCache[_cacheKey2];
        _forceSetTargetLocation({ lat: _cached.lat, lng: _cached.lng, name: pklName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });
        _targetLocationLocked = true;
        _updateMapUIAndReset();
        // Update koordinat user juga
        if (user && user.id) {
          user.latitude_pkl = _cached.lat; user.longitude_pkl = _cached.lng;
          var _us = getUsers(); var _ui = _us.findIndex(function(u){return u.id===user.id||u.username===user.username;});
          if(_ui!==-1){_us[_ui].latitude_pkl=_cached.lat;_us[_ui].longitude_pkl=_cached.lng;saveUsers(_us);}
          fetch(apiUrl('api.php?action=update_pkl_location'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:user.id,user_id:user.id,pklLocation:pklName,latitude_pkl:_cached.lat,longitude_pkl:_cached.lng})}).catch(function(){});
        }
      } else {
        // Tidak ada cache — geocode dengan nama bersih agar lebih akurat
        geocodeLocationName(_cleanPklName !== pklName ? _cleanPklName : pklName, user);
      }
    }
    return;`
);

// ══════════════════════════════════════════════════════════════════════════
// FIX 2: applyTargetLocationFromUser — tambahkan deteksi koordinat generic
//         -7.9437,112.6136 adalah koordinat default yang sering muncul
//         dari geocode yang tidak akurat (18 siswa sama persis)
// ══════════════════════════════════════════════════════════════════════════
patch(
  'isDbCoordsValid: tambahkan deteksi koordinat generic lainnya',
  `  const isCenterMalang = !isNaN(lat) && !isNaN(lng) && Math.abs(lat - (-7.9700)) < 0.001 && Math.abs(lng - 112.6326) < 0.001;
  const isDefaultSMKN9 = !isNaN(lat) && !isNaN(lng) && Math.abs(lat - (-7.9825)) < 0.001 && Math.abs(lng - 112.6867) < 0.001;`,
  `  const isCenterMalang = !isNaN(lat) && !isNaN(lng) && Math.abs(lat - (-7.9700)) < 0.001 && Math.abs(lng - 112.6326) < 0.001;
  const isDefaultSMKN9 = !isNaN(lat) && !isNaN(lng) && Math.abs(lat - (-7.9825)) < 0.001 && Math.abs(lng - 112.6867) < 0.001;
  // Koordinat -7.9437, 112.6136 = default yang sering keluar dari geocode tidak akurat
  // -8.0028, 112.6571 juga muncul banyak (18+ siswa) — keduanya ditolak sebagai generic
  const isKnownBadCoords = (!isNaN(lat) && !isNaN(lng)) && (
    (Math.abs(lat - (-7.9437)) < 0.0005 && Math.abs(lng - 112.6136) < 0.0005) ||
    (Math.abs(lat - (-7.9797)) < 0.0005 && Math.abs(lng - 112.6304) < 0.0005) ||
    (Math.abs(lat - (-8.0028)) < 0.0005 && Math.abs(lng - 112.6571) < 0.0005) ||
    (Math.abs(lat - (-8.0007)) < 0.0005 && Math.abs(lng - 112.6157) < 0.0005)
  );`
);

patch(
  'isDbCoordsValid: pakai isKnownBadCoords',
  `  const isGenericDefault = (isCenterMalang || (isDefaultSMKN9 && !pklIsAtSMKN9));
  const isDbCoordsValid = !isNaN(lat) && !isNaN(lng)
    && lat !== 0 && lng !== 0 && !isOldJakartaCoords && !isGenericDefault && distFromMalang < 1000;`,
  `  const isGenericDefault = (isCenterMalang || (isDefaultSMKN9 && !pklIsAtSMKN9) || isKnownBadCoords);
  const isDbCoordsValid = !isNaN(lat) && !isNaN(lng)
    && lat !== 0 && lng !== 0 && !isOldJakartaCoords && !isGenericDefault && distFromMalang < 1000;`
);

// ══════════════════════════════════════════════════════════════════════════
// FIX 3: _applyGuruTargetFromStudent — guru HANYA menampilkan siswa bimbingan
//         Masalah: jika koordinat siswa 0,0 atau generic, peta guru jatuh ke SMKN9
//         lalu geocode async selesai → peta berubah → tidak stabil
//         Fix: saat koordinat siswa tidak valid, ambil dari geocode cache DULU
//              Jika tidak ada di cache, tampilkan nama PKL tanpa mengubah koordinat peta
//              (sehingga peta tetap stabil di posisi terakhir)
// ══════════════════════════════════════════════════════════════════════════
patch(
  '_applyGuruTargetFromStudent: gunakan cache sebelum geocode',
  `  if (isValid) {
    TARGET_LOCATION = { lat, lng, name: pklName, allowedRadiusMeters: 350 };
    // Kunci target guru setelah koordinat valid diset
    _guruTargetStudentId = student.id || student.username;
    _guruTargetLocked = true;
    _updateMapUIAndReset();
  } else if (pklName) {
    // Koordinat belum valid — geocode dari nama, tapi tidak simpan ke user siswa
    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: pklName, allowedRadiusMeters: 350 };
    // Kunci target guru sementara (akan diupdate geocode selesai)
    _guruTargetStudentId = student.id || student.username;
    _guruTargetLocked = true;
    _updateMapUIAndReset();
    geocodeLocationName(pklName, null); // null = jangan simpan ke DB siswa dari akun guru
  } else {
    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: 'SMK Negeri 9 Malang', allowedRadiusMeters: 350 };
    _guruTargetStudentId = null;
    _guruTargetLocked = false;
    _updateMapUIAndReset();
  }`,
  `  // Set target lokasi dan kunci
  _guruTargetStudentId = student.id || student.username;
  _guruTargetLocked = true;

  if (isValid) {
    // Koordinat DB valid — langsung pakai, kunci, render
    _forceSetTargetLocation({ lat: lat, lng: lng, name: pklName, allowedRadiusMeters: 350 });
    _updateMapUIAndReset();
  } else if (pklName) {
    // Koordinat tidak valid — cek geocode cache dulu
    var _gk = pklName.toLowerCase().trim();
    // Nama bersih (sebelum koma)
    var _gkClean = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim().toLowerCase() : _gk;
    var _gCached = _geocodeNameCache[_gk] || _geocodeNameCache[_gkClean];
    if (_gCached && _gCached.lat && _gCached.lng) {
      // Cache hit — langsung pakai koordinat yang sudah di-geocode sebelumnya
      _forceSetTargetLocation({ lat: _gCached.lat, lng: _gCached.lng, name: pklName, allowedRadiusMeters: 350 });
      _updateMapUIAndReset();
      console.log('[SIGAP] Guru target dari cache:', pklName, _gCached.lat, _gCached.lng);
    } else {
      // Tidak ada di cache — tampilkan nama PKL dengan koordinat 0 (peta tidak bergerak)
      // Geocode async di background, hasil akan masuk cache tapi TIDAK mengubah TARGET_LOCATION guru
      // karena _guruTargetLocked = true sudah dipasang di atas
      TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: pklName + ' (koordinat belum tersedia)', allowedRadiusMeters: 350 };
      _updateMapUIAndReset();
      // Geocode di background tanpa callback — hanya isi cache, tidak ubah peta
      geocodeLocationName(_gkClean !== _gk ? _gkClean : pklName, null);
      console.log('[SIGAP] Guru target geocoding background:', pklName);
    }
  } else {
    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: 'SMK Negeri 9 Malang', allowedRadiusMeters: 350 };
    _guruTargetStudentId = null;
    _guruTargetLocked = false;
    _updateMapUIAndReset();
  }`
);

// ══════════════════════════════════════════════════════════════════════════
// FIX 4: APK post-login sync — koordinat dari server harus lebih kuat dari default geocode
//         Tambahkan pengecekan koordinat "known bad" sebelum apply dari server
// ══════════════════════════════════════════════════════════════════════════
patch(
  'APK sync: tambahkan pengecekan known bad coords',
  `              var hasValid = !isNaN(sLat) && sLat !== 0 && !isNaN(sLng) && sLng !== 0;`,
  `              // Periksa koordinat server bukan yang "known bad" (default geocode generik)
              var sDistMalang = (!isNaN(sLat)&&!isNaN(sLng)) ? Math.sqrt(Math.pow(sLat-(-7.9825),2)+Math.pow(sLng-112.6867,2))*111 : 9999;
              var sIsKnownBad = (!isNaN(sLat)&&!isNaN(sLng)) && (
                (Math.abs(sLat-(-7.9437))<0.0005&&Math.abs(sLng-112.6136)<0.0005) ||
                (Math.abs(sLat-(-7.9797))<0.0005&&Math.abs(sLng-112.6304)<0.0005) ||
                (Math.abs(sLat-(-8.0028))<0.0005&&Math.abs(sLng-112.6571)<0.0005)
              );
              var hasValid = !isNaN(sLat) && sLat !== 0 && !isNaN(sLng) && sLng !== 0 && !sIsKnownBad;`
);

console.log('\n=== HASIL ===');
console.log('OK:', ok, '| FAIL:', fail);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
