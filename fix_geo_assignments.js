// fix_geo_assignments.js
// Patch semua TARGET_LOCATION assignment di dalam geocodeLocationName
// yang masih bisa jalan meski _targetLocationLocked = true
// Strategi: ganti setiap TARGET_LOCATION = {...} dengan _forceSetTargetLocation + lock check

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0, fail = 0;

function patch(name, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('FAIL [' + name + ']: not found');
    // Debug: cari 30 char pertama
    const key = oldStr.substring(0, 40);
    const idx = content.indexOf(key);
    if (idx >= 0) console.log('  partial match at', idx, ':', JSON.stringify(content.slice(idx, idx+100)));
    fail++;
    return;
  }
  content = content.replace(oldStr, newStr);
  console.log('OK   [' + name + ']');
  ok++;
}

// ─── 1. CACHE HIT: TARGET_LOCATION assignment SEBELUM lock check ─────────────
// Baris 294 (di dalam if (_geocodeNameCache[cacheKey]))
// Sudah ada lock di bawahnya tapi assignment ini jalan lebih dulu
patch(
  'geocode cache-hit: assignment before lock',
  "    TARGET_LOCATION = { lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };\r\n    if (user) {\r\n      user.latitude_pkl = lat; user.longitude_pkl = lng;\r\n      const users = getUsers();\r\n      const idx = users.findIndex(u => u.id === user.id || u.username === user.username);\r\n      if (idx !== -1) { users[idx].latitude_pkl = lat; users[idx].longitude_pkl = lng; saveUsers(users); }\r\n      if (user.id) {\r\n        fetch(apiUrl('api.php?action=update_pkl_location'), {\r\n          method: 'POST', headers: { 'Content-Type': 'application/json' },\r\n          body: JSON.stringify({ id: user.id, user_id: user.id, pklLocation: locationName, latitude_pkl: lat, longitude_pkl: lng })\r\n        }).catch(function(){});\r\n      }\r\n    }\r\n    if (geocodeStatusEl) geocodeStatusEl.style.display = 'none';\r\n    // KUNCI koordinat jika cache hit untuk siswa aktif",
  "    // Hanya set jika belum dikunci — cache hit bisa dipanggil ulang dari polling\r\n    if (!_targetLocationLocked) {\r\n      TARGET_LOCATION = { lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };\r\n    }\r\n    if (user) {\r\n      user.latitude_pkl = lat; user.longitude_pkl = lng;\r\n      const users = getUsers();\r\n      const idx = users.findIndex(u => u.id === user.id || u.username === user.username);\r\n      if (idx !== -1) { users[idx].latitude_pkl = lat; users[idx].longitude_pkl = lng; saveUsers(users); }\r\n      if (user.id) {\r\n        fetch(apiUrl('api.php?action=update_pkl_location'), {\r\n          method: 'POST', headers: { 'Content-Type': 'application/json' },\r\n          body: JSON.stringify({ id: user.id, user_id: user.id, pklLocation: locationName, latitude_pkl: lat, longitude_pkl: lng })\r\n        }).catch(function(){});\r\n      }\r\n    }\r\n    if (geocodeStatusEl) geocodeStatusEl.style.display = 'none';\r\n    // KUNCI koordinat jika cache hit untuk siswa aktif"
);

// ─── 2. FALLBACK ke kamus lokal: TARGET_LOCATION assignment ──────────────────
// Baris ~491 — Nominatim tidak menemukan, pakai getCoordinatesByLocationName
patch(
  'geocode kamus-lokal: lock guard',
  "    const coords = getCoordinatesByLocationName(locationName);\r\n    TARGET_LOCATION = { lat: coords.lat, lng: coords.lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };",
  "    const coords = getCoordinatesByLocationName(locationName);\r\n    // Hanya set jika belum dikunci\r\n    if (!_targetLocationLocked) {\r\n      TARGET_LOCATION = { lat: coords.lat, lng: coords.lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };\r\n    }"
);

// ─── 3. _updateMapUIAndReset yang ke-2 di fallback kamus lokal (baris ~523) ──
// Cari _updateMapUIAndReset() yang dipanggil setelah kamus fallback
patch(
  'geocode kamus-lokal: _updateMapUIAndReset guard',
  "    _addToGeocodeCache(locationName, coords.lat, coords.lng, 'local-dict');\r\n    _updateMapUIAndReset();",
  "    _addToGeocodeCache(locationName, coords.lat, coords.lng, 'local-dict');\r\n    if (!_targetLocationLocked) _updateMapUIAndReset();"
);

console.log('\n=== HASIL ===');
console.log('OK:', ok, '| FAIL:', fail);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
