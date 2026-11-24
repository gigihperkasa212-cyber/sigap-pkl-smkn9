const fs = require('fs');
let c = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// Cari exact batas fungsi _applyGuruTargetFromStudent
const START = c.indexOf('function _applyGuruTargetFromStudent(student) {');
if (START < 0) { console.error('function not found'); process.exit(1); }

// Cari blok if(isValid) { ... } sampai penutup } di akhir blok
// Kita tahu dari debug: mulai dari "  if (isValid) {" di dalam fungsi
const ifStart = c.indexOf('  if (isValid) {', START);
if (ifStart < 0) { console.error('isValid block not found'); process.exit(1); }

// Cari "}\n}" yang menutup else { ... } — akhir dari blok if/else
// Setelah blok ini ada blank line lalu comment "// -- Dipanggil saat guru ganti"
const afterBlock = c.indexOf('\n// -- Dipanggil saat guru ganti', ifStart);
if (afterBlock < 0) { console.error('end of block not found'); process.exit(1); }

const OLD_BLOCK = c.slice(ifStart, afterBlock);
console.log('OLD block length:', OLD_BLOCK.length);
console.log('OLD start:', JSON.stringify(OLD_BLOCK.substring(0,80)));
console.log('OLD end:', JSON.stringify(OLD_BLOCK.substring(OLD_BLOCK.length-80)));

const NEW_BLOCK = `  // Kunci guru target dulu \u2014 cegah polling reset peta saat koordinat diset
  _guruTargetStudentId = student.id || student.username;
  _guruTargetLocked = true;

  if (isValid) {
    // Koordinat DB valid \u2014 langsung force-set dan kunci
    _forceSetTargetLocation({ lat: lat, lng: lng, name: pklName, allowedRadiusMeters: 350 });
    _updateMapUIAndReset();
    console.log('[SIGAP] Guru target valid:', pklName, lat, lng);
  } else if (pklName) {
    // Koordinat tidak valid \u2014 cek geocode cache dulu agar peta tidak flash ke SMKN9
    var _gkFull  = pklName.toLowerCase().trim();
    var _gkShort = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim().toLowerCase() : _gkFull;
    var _gHit    = _geocodeNameCache[_gkFull] || _geocodeNameCache[_gkShort];
    if (_gHit && _gHit.lat && _gHit.lng) {
      // Cache hit: pakai koordinat yang sudah ada, peta stabil
      _forceSetTargetLocation({ lat: _gHit.lat, lng: _gHit.lng, name: pklName, allowedRadiusMeters: 350 });
      _updateMapUIAndReset();
      console.log('[SIGAP] Guru target (cache):', pklName, _gHit.lat, _gHit.lng);
    } else {
      // Tidak di cache: tampilkan sementara di SMKN9, geocode background
      // _guruTargetLocked=true sudah dipasang \u2014 geocode background tidak override peta
      TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: pklName, allowedRadiusMeters: 350 };
      _updateMapUIAndReset();
      var _geocodeName = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim() : pklName;
      if (_geocodeName && _geocodeName.length > 3) {
        geocodeLocationName(_geocodeName, null); // null = jangan simpan ke DB siswa
      }
      console.log('[SIGAP] Guru target (geocoding bg):', pklName);
    }
  } else {
    // Tidak ada nama PKL \u2014 default SMKN9
    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: 'SMK Negeri 9 Malang', allowedRadiusMeters: 350 };
    _guruTargetStudentId = null;
    _guruTargetLocked = false;
    _updateMapUIAndReset();
  }`;

// Replace dengan CRLF sesuai file
const NEW_CRLF = NEW_BLOCK.replace(/\n/g, '\r\n');
c = c.slice(0, ifStart) + NEW_CRLF + c.slice(afterBlock);

console.log('Patched _applyGuruTargetFromStudent');
fs.writeFileSync('d:/absen pkl update/js/app.js', c, 'utf8');
console.log('SAVED OK - size:', c.length);
