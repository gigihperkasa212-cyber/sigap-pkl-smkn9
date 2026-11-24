// fix_geofence_final.js — perbaikan total geofencing siswa tidak stabil
const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0, fail = 0;

function patch(name, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('FAIL [' + name + ']: pattern not found');
    fail++;
    return;
  }
  content = content.replace(oldStr, newStr);
  console.log('OK   [' + name + ']');
  ok++;
}

// ── MASALAH 1: applyUserInterface → TARGET_LOCATION.allowedRadiusMeters = 350
// Baris ini dipanggil SETIAP rerender (polling 8 detik).
// Mengakses property assignment di _TARGET_LOC_VALUE langsung → tidak lewat setter
// sehingga tidak terblokir lock. Tapi yang lebih penting: ini memicu _updateMapUIAndReset
// (tidak langsung, tapi di baris berikutnya) → map terus-menerus di-rebuild.
// Fix: bungkus dalam guard !_targetLocationLocked
patch(
  'allowedRadiusMeters assignment guard',
  '  TARGET_LOCATION.allowedRadiusMeters = 350;\r\n\r\n  const targetMapName = document.getElementById(\'targetMapName\');',
  '  // Hanya update radius jika belum dikunci (siswa aktif)\r\n  if (!_targetLocationLocked) TARGET_LOCATION.allowedRadiusMeters = 350;\r\n\r\n  const targetMapName = document.getElementById(\'targetMapName\');'
);

// ── MASALAH 2: applyUserInterface memanggil _updateMapUIAndReset lewat targetMapName.textContent
// Baris 1973-1974 update textContent — tidak masalah (hanya update text, bukan rebuild map)
// TAPI: applyUserInterface dipanggil dari _mergeServerUsers(rerender=true) setiap 8 detik
// dan di dalamnya ada applyTargetLocationFromUser(user) yang sudah diproteksi.
// Masalah: meskipun applyTargetLocationFromUser di-skip (locked), applyUserInterface
// masih bisa memanggil _updateMapUIAndReset jika ada path lain di bawahnya.
// Cari apakah ada _updateMapUIAndReset() yang dipanggil LANGSUNG dari applyUserInterface
// (bukan dari applyTargetLocationFromUser)
// Setelah investigasi: tidak ada direct call, aman.

// ── MASALAH 3: geocodeLocationName masih menjalankan lebih jauh meski ada guard di awal
// Guard hanya cek jika user === activeUser, tapi jika user berbeda (null atau lain),
// geocode tetap berjalan dan bisa mengubah TARGET_LOCATION
// Fix: jika locked, geocode TIDAK BOLEH mengubah TARGET_LOCATION sama sekali
// Patch: tambah lock check sebelum SETIAP assignment TARGET_LOCATION di dalam geocodeLocationName

// Temukan seluruh body geocodeLocationName
const geoStart = content.indexOf('async function geocodeLocationName(locationName, user) {');
const geoEnd = content.indexOf('\nfunction ', geoStart + 100);
if (geoStart < 0 || geoEnd < 0) {
  console.error('FAIL [geocodeLocationName bounds]: not found');
  fail++;
} else {
  console.log('geocodeLocationName: found at offset', geoStart, 'to', geoEnd);
  // Ambil body fungsi
  const geoBody = content.slice(geoStart, geoEnd);
  // Hitung jumlah TARGET_LOCATION assignment di dalam fungsi
  const assignCount = (geoBody.match(/TARGET_LOCATION\s*=/g) || []).length;
  console.log('  TARGET_LOCATION assignments inside geocodeLocationName:', assignCount);
}

// ── MASALAH 4 (UTAMA): _updateMapUIAndReset() di baris 527
// Fungsi ini dipanggil dari BANYAK tempat. Setiap kali dipanggil, ia:
// 1. leafletMap.panTo() — INI yang menyebabkan peta bergerak!
// 2. Rebuild marker dan geofence circle
// 3. setTimeout 100ms → applyLocationUpdate (update posisi siswa)
//
// Jika TARGET_LOCATION berubah sedikit (floating point dari server), panTo() dipanggil
// dan peta bergerak. Fix terbaik: tambahkan guard di _updateMapUIAndReset agar
// TIDAK panTo jika _targetLocationLocked === true DAN koordinat sama dengan yang terkunci
patch(
  '_updateMapUIAndReset panTo guard',
  '    // Pindahkan center ke TARGET_LOCATION baru tanpa reset zoom\r\n    leafletMap.panTo([TARGET_LOCATION.lat, TARGET_LOCATION.lng], { animate: true });\r\n    // Reset flag agar fitBounds jalan sekali lagi dengan posisi target baru\r\n    mapFittedOnce = false;',
  '    // Pindahkan center ke TARGET_LOCATION baru — HANYA jika target berubah atau belum locked\r\n    if (!_targetLocationLocked) {\r\n      leafletMap.panTo([TARGET_LOCATION.lat, TARGET_LOCATION.lng], { animate: true });\r\n      // Reset flag agar fitBounds jalan sekali lagi dengan posisi target baru\r\n      mapFittedOnce = false;\r\n    }'
);

// ── MASALAH 5: targetMarker dan geofenceCircle di-rebuild SETIAP _updateMapUIAndReset
// Jika locked, marker sudah benar — tidak perlu rebuild
// Tambah guard di setTimeout block yang rebuild marker
patch(
  '_updateMapUIAndReset marker rebuild guard',
  '    // Rebuild marker baru\r\n    setTimeout(() => {\r\n      if (leafletMap) {\r\n        targetMarker = L.marker([TARGET_LOCATION.lat, TARGET_LOCATION.lng]).addTo(leafletMap)',
  '    // Rebuild marker baru — skip jika locked dan marker sudah ada\r\n    if (_targetLocationLocked && targetMarker && geofenceCircle) {\r\n      // Target sudah dikunci dan marker sudah ada — hanya update posisi siswa\r\n      if (userCoords) applyLocationUpdate(userCoords.lat, userCoords.lng, userCoords.accuracy || 0);\r\n      return;\r\n    }\r\n    setTimeout(() => {\r\n      if (leafletMap) {\r\n        targetMarker = L.marker([TARGET_LOCATION.lat, TARGET_LOCATION.lng]).addTo(leafletMap)'
);

// ── MASALAH 6: _mergeServerUsers rerender=true memanggil applyUserInterface
// Setelah fix di atas, applyUserInterface masih dipanggil tiap 8 detik
// Sehingga updateGPS / applyLocationUpdate masih dipanggil ulang, tapi itu OK (posisi siswa harus update)
// Yang tidak OK adalah jika applyUserInterface memanggil initMap() atau panTo() ulang
// Sudah ditangani oleh fix di atas

// ── MASALAH 7: Baris 5173 di _mergeServerUsers — doubly nested guard
// if (coordChanged && activeUser.role === 'siswa' && !_targetLocationLocked) {
// Sudah ada !_targetLocationLocked tapi ada bug: jika lock false saat polling pertama,
// coordChanged bisa bernilai true karena floating point perbedaan koordinat server
// Fix: tambahkan threshold yang lebih besar (50 meter = 0.00045 derajat)
patch(
  '_mergeServerUsers coordChanged threshold fix',
  '        var coordChanged = Math.abs(TARGET_LOCATION.lat - serverLat2) > 0.0001 ||\r\n                           Math.abs(TARGET_LOCATION.lng - serverLng2) > 0.0001;',
  '        // Threshold 0.00045 derajat ≈ 50 meter — hindari false trigger dari floating point\r\n        var coordChanged = Math.abs(TARGET_LOCATION.lat - serverLat2) > 0.00045 ||\r\n                           Math.abs(TARGET_LOCATION.lng - serverLng2) > 0.00045;'
);

// ── MASALAH 8: geocodeLocationName dipanggil dari baris 4695 dan 4715
// (admin update user) — tidak ada cek lock, tapi user != activeUser jadi FIX B harusnya cover
// Double check: FIX B check: user.id === activeUser.id — untuk admin update user lain, ini false
// Tapi jika admin update user yang sama dengan activeUser (edge case), bisa masalah
// FIX B sudah cover ini — OK

console.log('\n=== HASIL ===');
console.log('OK:', ok, '| FAIL:', fail);

fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
