// fix_map_stable.js
// Fix geofencing APK tidak stabil:
// 1. Jangan hapus marker sebelum cek lock — marker yang sudah benar tidak perlu dihapus
// 2. Tambahkan debounce _updateMapUIAndReset agar tidak dipanggil terlalu sering
// 3. Skip total jika locked dan koordinat sama persis

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// Temukan fungsi _updateMapUIAndReset
const funcStart = content.indexOf('function _updateMapUIAndReset() {');
if (funcStart < 0) { console.error('_updateMapUIAndReset not found'); process.exit(1); }

// Cari "// Hapus marker lama saja" — ini yang perlu dipatch
const old_removeMarker = 
`  if (typeof leafletMap !== 'undefined' && leafletMap) {
    // Hapus marker lama saja
    if (targetMarker) { try { leafletMap.removeLayer(targetMarker); } catch(e) {} targetMarker = null; }
    if (geofenceCircle) { try { leafletMap.removeLayer(geofenceCircle); } catch(e) {} geofenceCircle = null; }
    if (distanceLine) { try { leafletMap.removeLayer(distanceLine); } catch(e) {} distanceLine = null; }
    // Pindahkan center ke TARGET_LOCATION baru — HANYA jika target berubah atau belum locked
    if (!_targetLocationLocked) {
      leafletMap.panTo([TARGET_LOCATION.lat, TARGET_LOCATION.lng], { animate: true });
      // Reset flag agar fitBounds jalan sekali lagi dengan posisi target baru
      mapFittedOnce = false;
    }
    // Rebuild marker baru — skip jika locked dan marker sudah ada
    if (_targetLocationLocked && targetMarker && geofenceCircle) {
      // Target sudah dikunci dan marker sudah ada — hanya update posisi siswa
      if (userCoords) applyLocationUpdate(userCoord`;

// Perlu cari lebih teliti
const removeMarkerIdx = content.indexOf('    // Hapus marker lama saja', funcStart);
const endGuard = content.indexOf('// Target sudah dikunci dan marker sudah ada', funcStart);
if (removeMarkerIdx < 0 || endGuard < 0) {
  console.error('Marker removal pattern not found, checking...');
  const body = content.slice(funcStart, funcStart + 2500);
  console.log('body sample:', JSON.stringify(body.slice(600, 900)));
  process.exit(1);
}

// Cari exact: dari "// Hapus marker lama saja" sampai "// Target sudah dikunci dan marker sudah ada"
const beforeRemove = content.slice(funcStart, removeMarkerIdx);
const afterGuard = content.indexOf('\n', endGuard);

// Ganti blok remove+panTo dengan versi yang:
// 1. Jika locked DAN marker sudah ada → skip remove, langsung update posisi
// 2. Jika tidak locked → remove seperti biasa
const ctxBefore = content.slice(funcStart + beforeRemove.length - 50, funcStart + beforeRemove.length);

// Cari exact start: "    // Hapus marker lama saja\r\n"
const removeStart = content.indexOf('    // Hapus marker lama saja\r\n', funcStart);
// Cari exact end: line setelah "// Target sudah dikunci dan marker sudah ada"
const guardLine = content.indexOf('    // Target sudah dikunci dan marker sudah ada', funcStart);
const guardLineEnd = content.indexOf('\r\n', guardLine) + 2; // include CRLF

if (removeStart < 0 || guardLine < 0) {
  console.error('Pattern bounds not found');
  console.log('removeStart:', removeStart, 'guardLine:', guardLine);
  process.exit(1);
}

const OLD_BLOCK = content.slice(removeStart, guardLineEnd);
console.log('OLD_BLOCK length:', OLD_BLOCK.length);
console.log('OLD_BLOCK:', JSON.stringify(OLD_BLOCK.substring(0, 200)));

const NEW_BLOCK = 
`    // LOCK GUARD: jika target sudah dikunci dan marker ada, skip rebuild — hanya update posisi siswa\r\n` +
`    if (_targetLocationLocked && targetMarker && geofenceCircle) {\r\n` +
`      if (userCoords) applyLocationUpdate(userCoords.lat, userCoords.lng, userCoords.accuracy || 0);\r\n` +
`      return;\r\n` +
`    }\r\n` +
`    // Hapus marker lama (hanya saat target berubah / belum locked)\r\n` +
`    if (targetMarker) { try { leafletMap.removeLayer(targetMarker); } catch(e) {} targetMarker = null; }\r\n` +
`    if (geofenceCircle) { try { leafletMap.removeLayer(geofenceCircle); } catch(e) {} geofenceCircle = null; }\r\n` +
`    if (distanceLine) { try { leafletMap.removeLayer(distanceLine); } catch(e) {} distanceLine = null; }\r\n` +
`    // Pindahkan center ke TARGET_LOCATION baru\r\n` +
`    leafletMap.panTo([TARGET_LOCATION.lat, TARGET_LOCATION.lng], { animate: false });\r\n` +
`    mapFittedOnce = false;\r\n` +
`    // (lanjut rebuild marker di bawah)\r\n` +
`    if (false) {\r\n` +
`      // Target sudah dikunci dan marker sudah ada\r\n`;

content = content.slice(0, removeStart) + NEW_BLOCK + content.slice(guardLineEnd);
console.log('Marker guard applied');

// Tambahkan debounce di awal _updateMapUIAndReset
// Jika dipanggil dalam 200ms terakhir, skip
const funcBody = content.indexOf('function _updateMapUIAndReset() {\r\n', funcStart);
if (funcBody < 0) {
  // Try LF only
  const funcBodyLF = content.indexOf('function _updateMapUIAndReset() {\n', funcStart);
  console.log('funcBodyLF:', funcBodyLF);
}

const DEBOUNCE_VAR = 'var _updateMapDebounceTs = 0;\r\n';
const DEBOUNCE_CHECK = 
`function _updateMapUIAndReset() {\r\n` +
`  // Debounce: skip jika dipanggil dalam 150ms (mencegah flood di APK)\r\n` +
`  var _now = Date.now();\r\n` +
`  if ((_now - _updateMapDebounceTs) < 150) return;\r\n` +
`  _updateMapDebounceTs = _now;\r\n`;

// Sisipkan debounce var sebelum fungsi, dan check di awal fungsi
const funcSignature = 'function _updateMapUIAndReset() {';
const funcIdx = content.indexOf(funcSignature, funcStart);
if (funcIdx >= 0) {
  content = content.slice(0, funcIdx) + DEBOUNCE_VAR + DEBOUNCE_CHECK + content.slice(funcIdx + funcSignature.length + 2);
  console.log('Debounce added');
} else {
  console.warn('Could not add debounce');
}

fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK — size:', content.length);
