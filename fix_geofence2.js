const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let changeCount = 0;

// Verify FIX A & B sudah diterapkan
console.log('FIX A check (let removed):', !content.includes('let TARGET_LOCATION = {'));
console.log('FIX B check (geocode guard):', content.includes('geocodeLocationName BLOCKED by lock'));

// ─── FIX C: lock setelah geocode berhasil (presisi) ─────────────────────────
const oldC = "    TARGET_LOCATION = { lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };\r\n\r\n    // Simpan ke database user agar tidak geocode ula";
const newC = "    TARGET_LOCATION = { lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };\r\n    // KUNCI koordinat jika geocode berhasil untuk siswa aktif\r\n    if (user && typeof activeUser !== 'undefined' && activeUser &&\r\n        (String(user.id) === String(activeUser.id) || user.username === activeUser.username) &&\r\n        activeUser.role === 'siswa') {\r\n      _forceSetTargetLocation({ lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });\r\n      _targetLocationLocked = true;\r\n      console.log('[SIGAP] geocode presisi selesai — TARGET_LOCATION locked:', locationName, lat, lng);\r\n    }\r\n\r\n    // Simpan ke database user agar tidak geocode ula";

if (!content.includes(oldC)) {
  console.error('FIX C: pattern not found');
} else {
  content = content.replace(oldC, newC);
  console.log('FIX C applied: lock after geocode presisi');
  changeCount++;
}

// ─── FIX D: lock setelah cache hit ──────────────────────────────────────────
const oldD = "    if (geocodeStatusEl) geocodeStatusEl.style.display = 'none';\r\n    _updateMapUIAndReset();\r\n    console.log('[SIGAP] geocode CACHE HIT:', locationName, '\u2192', lat, lng);\r\n    return;";
const newD = "    if (geocodeStatusEl) geocodeStatusEl.style.display = 'none';\r\n    // KUNCI koordinat jika cache hit untuk siswa aktif\r\n    if (user && typeof activeUser !== 'undefined' && activeUser &&\r\n        (String(user.id) === String(activeUser.id) || user.username === activeUser.username) &&\r\n        activeUser.role === 'siswa') {\r\n      _forceSetTargetLocation({ lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });\r\n      _targetLocationLocked = true;\r\n      console.log('[SIGAP] geocode CACHE HIT — TARGET_LOCATION locked:', locationName);\r\n    }\r\n    _updateMapUIAndReset();\r\n    console.log('[SIGAP] geocode CACHE HIT:', locationName, '\u2192', lat, lng);\r\n    return;";

if (!content.includes(oldD)) {
  // Coba tanpa arrow character
  const altIdx = content.indexOf("console.log('[SIGAP] geocode CACHE HIT:'");
  if (altIdx >= 0) {
    const chunk = content.slice(Math.max(0,altIdx-120), altIdx+100);
    console.log('FIX D alt context:', JSON.stringify(chunk));
  }
  console.error('FIX D: pattern not found');
} else {
  content = content.replace(oldD, newD);
  console.log('FIX D applied: lock after cache hit');
  changeCount++;
}

console.log('Total new fixes applied:', changeCount);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
