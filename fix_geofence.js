const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let changeCount = 0;

// ─── FIX A: Hapus 'let TARGET_LOCATION' di baris 100 ───────────────────────
// Konflik: let TARGET_LOCATION di scope lokal vs Object.defineProperty di window
// Semua assignment TARGET_LOCATION = {...} di dalam fungsi mengubah variabel LET LOKAL,
// bukan window.TARGET_LOCATION yang ada locknya → setter/lock tidak pernah dipanggil!
const idxLetDecl = content.indexOf('let TARGET_LOCATION = {');
if (idxLetDecl < 0) {
  console.log('FIX A: let TARGET_LOCATION sudah dihapus sebelumnya, skip');
} else {
  // Cari closing brace + semicolon dari deklarasi ini
  const endBrace = content.indexOf('\r\n};', idxLetDecl);
  if (endBrace < 0) {
    console.error('FIX A: tidak bisa temukan closing brace');
  } else {
    const oldDecl = content.slice(idxLetDecl, endBrace + 4); // +4 = '\r\n};'
    const newDecl = '// [v2.1.74] let TARGET_LOCATION dihapus — pakai window.TARGET_LOCATION via Object.defineProperty\n// Deklarasi let akan shadow window.TARGET_LOCATION dan bypass lock getter/setter';
    content = content.slice(0, idxLetDecl) + newDecl + content.slice(idxLetDecl + oldDecl.length);
    console.log('FIX A applied: removed let TARGET_LOCATION, len=' + oldDecl.length);
    changeCount++;
  }
}

// ─── FIX B: geocodeLocationName — lock guard di awal ───────────────────────
// Setiap kali geocode selesai (async), hasilnya set TARGET_LOCATION tanpa cek lock
const oldGeoFn = 'async function geocodeLocationName(locationName, user) {';
const newGeoFn = `async function geocodeLocationName(locationName, user) {
  // LOCK GUARD: jika koordinat siswa sudah dikunci saat login, batalkan geocode
  // Geocode berjalan async — bisa selesai setelah lock dipasang, override koordinat valid
  if (_targetLocationLocked && user && typeof activeUser !== 'undefined' && activeUser &&
      (String(user.id) === String(activeUser.id) || user.username === activeUser.username)) {
    console.log('[SIGAP] geocodeLocationName BLOCKED by lock for:', locationName);
    return;
  }`;

if (!content.includes(oldGeoFn)) {
  console.error('FIX B: geocodeLocationName pattern not found');
} else {
  content = content.replace(oldGeoFn, newGeoFn);
  console.log('FIX B applied: geocodeLocationName lock guard');
  changeCount++;
}

// ─── FIX C: geocodeLocationName — set lock SETELAH koordinat berhasil dapat ─
// Saat ini lock dipasang di applyTargetLocationFromUser SEBELUM geocode selesai
// Jika koordinat DB tidak valid → geocode dipanggil → lock belum dipasang
// Geocode selesai → set TARGET_LOCATION → lock belum ada → bisa di-overwrite lagi oleh polling
// Fix: setelah geocode berhasil dan user === activeUser, pasang lock
const oldGeoSuccess = `  if (bestResult && !bestResult.fallback) {
    // Hasil presisi dalam radius Malang
    const { lat, lng } = bestResult;
    TARGET_LOCATION = { lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };`;
const newGeoSuccess = `  if (bestResult && !bestResult.fallback) {
    // Hasil presisi dalam radius Malang
    const { lat, lng } = bestResult;
    TARGET_LOCATION = { lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };
    // KUNCI koordinat jika ini untuk siswa yang sedang login
    if (user && typeof activeUser !== 'undefined' && activeUser &&
        (String(user.id) === String(activeUser.id) || user.username === activeUser.username) &&
        activeUser.role === 'siswa') {
      _targetLocationLocked = true;
      console.log('[SIGAP] geocode success — TARGET_LOCATION locked for:', locationName);
    }`;

if (!content.includes(oldGeoSuccess)) {
  console.error('FIX C: geocode success pattern not found');
} else {
  content = content.replace(oldGeoSuccess, newGeoSuccess);
  console.log('FIX C applied: lock after geocode success');
  changeCount++;
}

// ─── FIX D: geocodeNameCache hit — lock setelah cache hit ──────────────────
const oldCacheHit = `    _updateMapUIAndReset();
    console.log('[SIGAP] geocode CACHE HIT:', locationName, '→', lat, lng);
    return;`;
const newCacheHit = `    // KUNCI koordinat jika ini untuk siswa yang sedang login (cache hit)
    if (user && typeof activeUser !== 'undefined' && activeUser &&
        (String(user.id) === String(activeUser.id) || user.username === activeUser.username) &&
        activeUser.role === 'siswa') {
      _targetLocationLocked = true;
      console.log('[SIGAP] geocode CACHE HIT — TARGET_LOCATION locked for:', locationName);
    }
    _updateMapUIAndReset();
    console.log('[SIGAP] geocode CACHE HIT:', locationName, '→', lat, lng);
    return;`;

if (!content.includes(oldCacheHit)) {
  console.error('FIX D: cache hit pattern not found');
} else {
  content = content.replace(oldCacheHit, newCacheHit);
  console.log('FIX D applied: lock after cache hit');
  changeCount++;
}

console.log('Total fixes applied:', changeCount);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
