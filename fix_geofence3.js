const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let changeCount = 0;

// ─── FIX E: lock setelah geocode fallback berhasil ──────────────────────────
// Ini blok "bestResult.fallback" — koordinat di luar radius Malang tapi tetap dipakai
const oldE = "  } else if (bestResult && bestResult.fallback) {\r\n    // Hasil ditemukan tapi di luar radius Malang - tetap pakai tanpa toast (silent)\r\n    const { lat, lng } = bestResult;\r\n    TARGET_LOCATION = { lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };";
const newE = "  } else if (bestResult && bestResult.fallback) {\r\n    // Hasil ditemukan tapi di luar radius Malang - tetap pakai tanpa toast (silent)\r\n    const { lat, lng } = bestResult;\r\n    TARGET_LOCATION = { lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };\r\n    // KUNCI koordinat jika fallback geocode untuk siswa aktif\r\n    if (user && typeof activeUser !== 'undefined' && activeUser &&\r\n        (String(user.id) === String(activeUser.id) || user.username === activeUser.username) &&\r\n        activeUser.role === 'siswa') {\r\n      _forceSetTargetLocation({ lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });\r\n      _targetLocationLocked = true;\r\n      console.log('[SIGAP] geocode fallback selesai — TARGET_LOCATION locked:', locationName, lat, lng);\r\n    }";

if (!content.includes(oldE)) {
  console.error('FIX E: fallback pattern not found');
  // Debug
  const idx = content.indexOf('bestResult && bestResult.fallback');
  if (idx >= 0) console.log('context:', JSON.stringify(content.slice(idx-5, idx+200)));
} else {
  content = content.replace(oldE, newE);
  console.log('FIX E applied: lock after geocode fallback');
  changeCount++;
}

// ─── FIX F: baris 581 - geocodeLocationName dari resync manual ──────────────
// Fungsi resync koordinat siswa memanggil geocode tanpa cek lock
const oldF = "  // Geocode ulang dari nama\r\n  await geocodeLocationName(pklName, activeUser);";
const newF = "  // Geocode ulang dari nama (hanya jika belum locked)\r\n  if (!_targetLocationLocked) {\r\n    await geocodeLocationName(pklName, activeUser);\r\n  } else {\r\n    console.log('[SIGAP] resync geocode BLOCKED — koordinat sudah dikunci');\r\n  }";

if (!content.includes(oldF)) {
  console.error('FIX F: resync geocode pattern not found');
} else {
  content = content.replace(oldF, newF);
  console.log('FIX F applied: guard geocode di resync manual');
  changeCount++;
}

// ─── FIX G: baris 2631, 4695, 4715 — geocode dari bulk user update ──────────
// Ini dipanggil saat admin update user, bukan untuk siswa aktif — dibiarkan tetapi
// pastikan fungsi geocodeLocationName sudah punya lock guard (sudah di FIX B)
console.log('FIX G: sudah di-cover oleh FIX B (lock guard di awal geocodeLocationName)');

console.log('Total new fixes applied:', changeCount);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');
