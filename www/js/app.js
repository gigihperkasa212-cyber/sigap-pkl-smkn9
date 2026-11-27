/**
 * SIGAP PKL SMKN 9 Official - Android Student & PKL Attendance Logic (Dynamic Geofencing GPS per PKL Location & Template Synchronization)
 */

// -- Server config --
(function(){
  // APK pakai domain dengan SSL valid (Let's Encrypt via sigap.smkn9malang.sch.id)
  var _base = 'https://sigap.smkn9malang.sch.id';
  window._SERVER_HTTPS = _base;
  window._SSE_URL = _base + '/api.php?action=sse_events';
})();

// -- Helper: resolusi URL API � browser pakai relatif, APK Capacitor pakai absolut --
function apiUrl(path) {
  var proto = window.location.protocol;
  var host  = window.location.hostname;
  var isCap = proto === 'capacitor:' || proto === 'ionic:' || host === 'localhost' || host === '127.0.0.1';
  var base  = isCap ? window._SERVER_HTTPS : '';
  // path boleh dengan atau tanpa leading slash
  return base + (path.startsWith('/') ? path : '/' + path);
}

// -- Capacitor App plugin � diinisialisasi setelah DOM ready --
var _CapacitorApp = null;

// ================= APP CONFIG & DYNAMIC LOCATION DICTIONARY =================
const KNOWN_PKL_LOCATIONS = {
  // -- SMK & Sekolah --
  "SMK Negeri 9 Malang":          { lat: -7.9825, lng: 112.6867 },
  "SMK Negeri 1 Malang":          { lat: -7.9656, lng: 112.6185 },
  "SMK Negeri 4 Malang":          { lat: -7.9731, lng: 112.6164 },
  "SMK Negeri 5 Malang":          { lat: -7.9550, lng: 112.6141 },
  "SMK Negeri 8 Malang":          { lat: -7.9476, lng: 112.6175 },
  "SMA Negeri 1 Malang":          { lat: -7.9660, lng: 112.6174 },

  // -- Kantor Pemerintah Malang --
  "Kantor Walikota Malang":       { lat: -7.9721, lng: 112.6308 },
  "Dinas Pendidikan Kota Malang": { lat: -7.9648, lng: 112.6178 },
  "Balai Kota Malang":            { lat: -7.9721, lng: 112.6308 },
  "BPS Kota Malang":              { lat: -7.9615, lng: 112.6199 },

  // -- Rumah Sakit Malang --
  "RS Saiful Anwar":              { lat: -7.9659, lng: 112.6400 },
  "RS Panti Nirmala":             { lat: -7.9721, lng: 112.6147 },
  "RS Lavalette":                 { lat: -7.9634, lng: 112.6148 },
  "Puskesmas":                    { lat: -7.9825, lng: 112.6867 },

  // -- Perbankan & Keuangan Malang --
  "Bank Jatim Malang":            { lat: -7.9810, lng: 112.6320 },
  "Bank BRI Malang":              { lat: -7.9793, lng: 112.6299 },
  "Bank BNI Malang":              { lat: -7.9782, lng: 112.6297 },
  "Bank Mandiri Malang":          { lat: -7.9770, lng: 112.6280 },
  "BCA Malang":                   { lat: -7.9801, lng: 112.6312 },
  "Bank BTN Malang":              { lat: -7.9803, lng: 112.6295 },

  // -- IT & Teknologi Malang --
  "PT. Telkom Indonesia Malang":  { lat: -7.9826, lng: 112.6311 },
  "Telkom Indonesia":             { lat: -7.9826, lng: 112.6311 },
  "PT. Telkom":                   { lat: -7.9826, lng: 112.6311 },
  "Telkom":                       { lat: -7.9826, lng: 112.6311 },
  "PT. Tech Solution":            { lat: -7.9556, lng: 112.6116 },
  "PT. Tech Solution Indonesia":  { lat: -7.9556, lng: 112.6116 },
  "PT. Infomedia Nusantara":      { lat: -7.9836, lng: 112.6308 },
  "PT. Inti":                     { lat: -7.9750, lng: 112.6300 },

  // -- Industri & Manufaktur Malang --
  "PT. Astra International":      { lat: -7.9825, lng: 112.6867 },
  "PT. Astra":                    { lat: -7.9825, lng: 112.6867 },
  "Astra":                        { lat: -7.9825, lng: 112.6867 },
  "PT. Malang Indah":             { lat: -7.9601, lng: 112.6044 },
  "Pabrik Rokok Malang":          { lat: -7.9700, lng: 112.6100 },

  // -- Media & Percetakan --
  "Malang Post":                  { lat: -7.9780, lng: 112.6312 },
  "Radar Malang":                 { lat: -7.9814, lng: 112.6295 },

  // -- Mall & Pusat Perbelanjaan --
  "Malang Town Square":           { lat: -7.9478, lng: 112.6119 },
  "Matos":                        { lat: -7.9478, lng: 112.6119 },
  "MOG Malang":                   { lat: -7.9756, lng: 112.6353 },
  "Malang Olympic Garden":        { lat: -7.9756, lng: 112.6353 },
  "Transmart Malang":             { lat: -7.9537, lng: 112.6232 },
  "Hypermart Malang":             { lat: -7.9493, lng: 112.6124 },

  // -- Kantor Pos & Logistik --
  "Kantor Pos Malang":            { lat: -7.9793, lng: 112.6315 },
  "JNE Malang":                   { lat: -7.9700, lng: 112.6200 },

  // -- Kecamatan Malang --
  "Klojen":                       { lat: -7.9797, lng: 112.6304 },
  "Blimbing":                     { lat: -7.9410, lng: 112.6397 },
  "Sukun":                        { lat: -8.0007, lng: 112.6157 },
  "Lowokwaru":                    { lat: -7.9437, lng: 112.6136 },
  "Kedungkandang":                { lat: -8.0028, lng: 112.6571 },

  // -- Default fallback --
  "Malang":                       { lat: -7.9825, lng: 112.6867 }
};

// [v2.1.74] let TARGET_LOCATION dihapus — pakai window.TARGET_LOCATION via Object.defineProperty
// Deklarasi let akan shadow window.TARGET_LOCATION dan bypass lock getter/setter


// ── TARGET_LOCATION getter/setter dengan lock ───────────────────────────────
// Semua assignment TARGET_LOCATION = {...} secara otomatis dicegah jika sudah dikunci
// Tidak perlu ubah setiap titik assignment — setter menangani semuanya
var _targetLocationLocked = false;
var _lastTodayStatusRender = 0; // throttle renderTodayStatus di polling
var _guruTargetLocked = false; // Lock target guru: mencegah polling reset ke siswa pertama
var _guruTargetStudentId = null; // ID/username siswa yang sedang dipilih guru
var _geocodeAttemptedFor = null; // ID siswa yang sudah dicoba geocode (cegah retry terus)
var _mapNeedsRebuildAfterLock = false; // Flag: rebuild peta sekali setelah lock dari DB
var _TARGET_LOC_VALUE = { lat: -7.9825, lng: 112.6867, name: "SMK Negeri 9 Malang", allowedRadiusMeters: 350 };

Object.defineProperty(window, "TARGET_LOCATION", {
  get: function() { return _TARGET_LOC_VALUE; },
  set: function(v) {
    if (_targetLocationLocked) {
      // Terkunci — hanya izinkan perubahan minor (allowedRadiusMeters, nama sama)
      if (v && v.lat === _TARGET_LOC_VALUE.lat && v.lng === _TARGET_LOC_VALUE.lng) {
        _TARGET_LOC_VALUE = v; // update nama/radius saja, koordinat sama — OK
      }
      // Koordinat berbeda saat locked — DIABAIKAN
      return;
    }
    _TARGET_LOC_VALUE = v;
  },
  configurable: true
});

// Force-set TARGET_LOCATION melewati lock (untuk login pertama / resync manual)
function _forceSetTargetLocation(locObj) {
  _TARGET_LOC_VALUE = locObj;
  _mapNeedsRebuildAfterLock = true; // tandai perlu rebuild marker di posisi baru
}
// Diisi dari: (1) user yang sudah punya koordinat valid di DB/localStorage
//             (2) hasil Nominatim geocoding saat runtime
// Format: { 'nama lokasi lowercase': { lat, lng, source } }
// Bertahan selama session browser (tidak hilang saat tab refresh karena ada inisialisasi ulang)
var _geocodeNameCache = {};
var _GEOCACHE_STORAGE_KEY = 'SIGAP_PKL_K9_geocache_v1';

function _initGeocodeCache() {
  // Reset in-memory cache sebelum populate ulang (penting setelah reset database)
  _geocodeNameCache = {};

  // Load dari localStorage (persisten antar session, bertahan setelah reset database)
  try {
    var stored = localStorage.getItem(_GEOCACHE_STORAGE_KEY);
    if (stored) {
      var parsed = JSON.parse(stored);
      // Hanya load cache yang tidak lebih dari 30 hari
      var now = Date.now();
      Object.keys(parsed).forEach(function(k) {
        if (parsed[k] && parsed[k].ts && (now - parsed[k].ts) < 30 * 24 * 3600 * 1000) {
          _geocodeNameCache[k] = parsed[k];
        }
      });
    }
  } catch(e) {}

  // Tambah dari semua user yang sudah punya koordinat valid (dari localStorage users)
  try {
    var users = getUsers();
    var SMKN9_LAT = -7.9825, SMKN9_LNG = 112.6867;
    var CTR_LAT   = -7.9700, CTR_LNG   = 112.6326;
    users.forEach(function(u) {
      if (!u.pklLocation || !u.latitude_pkl || !u.longitude_pkl) return;
      var lat = parseFloat(u.latitude_pkl), lng = parseFloat(u.longitude_pkl);
      if (isNaN(lat) || lat === 0 || isNaN(lng) || lng === 0) return;
      if (Math.abs(lat - SMKN9_LAT) < 0.001 && Math.abs(lng - SMKN9_LNG) < 0.001) return;
      if (Math.abs(lat - CTR_LAT)   < 0.001 && Math.abs(lng - CTR_LNG)   < 0.001) return;
      var key = u.pklLocation.toLowerCase().trim();
      if (!_geocodeNameCache[key]) {
        _geocodeNameCache[key] = { lat: lat, lng: lng, source: 'db', ts: Date.now() };
      }
    });
  } catch(e) {}
  console.log('[SIGAP] Geocode cache init:', Object.keys(_geocodeNameCache).length, 'lokasi');
}

function _saveGeocodeCache() {
  try {
    localStorage.setItem(_GEOCACHE_STORAGE_KEY, JSON.stringify(_geocodeNameCache));
  } catch(e) {}
}

function _addToGeocodeCache(locationName, lat, lng, source) {
  if (!locationName || !lat || !lng || lat === 0 || lng === 0) return;
  var key = locationName.toLowerCase().trim();
  _geocodeNameCache[key] = { lat: lat, lng: lng, source: source || 'nominatim', ts: Date.now() };
  _saveGeocodeCache();
  console.log('[SIGAP] Cache tambah:', locationName, '->', lat, lng, '(' + (source||'nominatim') + ')');
}

function getCoordinatesByLocationName(locName) {
  if (!locName) return { lat: -7.9825, lng: 112.6867 };
  const nameLower = locName.toLowerCase().trim();

  // 1) Cek cache dinamis dulu (hasil geocode Nominatim yang sudah pernah dijalankan)
  if (_geocodeNameCache && _geocodeNameCache[nameLower]) {
    return _geocodeNameCache[nameLower];
  }

  // 2) Exact match di kamus statis
  for (let key in KNOWN_PKL_LOCATIONS) {
    if (key.toLowerCase() === nameLower) {
      return KNOWN_PKL_LOCATIONS[key];
    }
  }
  // 3) Partial match di kamus statis
  for (let key in KNOWN_PKL_LOCATIONS) {
    if (nameLower.includes(key.toLowerCase()) || key.toLowerCase().includes(nameLower)) {
      return KNOWN_PKL_LOCATIONS[key];
    }
  }
  // 4) Default: 0,0 agar geocode Nominatim dipanggil (bukan SMKN9 default)
  return { lat: 0, lng: 0 };
}

// Set TARGET_LOCATION dari data siswa yang login � auto sync saat login
// ── Helper: terapkan koordinat dari data lokal (offline / non-siswa aktif) ─
function _applyFromLocalData(user, pklName, isDbCoordsValid, lat, lng) {
  if (_targetLocationLocked) return;
  if (isDbCoordsValid) {
    var _r = (user && parseInt(user.allowed_radius)) > 0 ? parseInt(user.allowed_radius) : 350;
    _r = Math.max(50, Math.min(1000, _r));
    _forceSetTargetLocation({ lat: lat, lng: lng, name: pklName, allowedRadiusMeters: _r });
    _targetLocationLocked = true;
    _updateMapUIAndReset();
  } else {
    _applyGeocodeForSiswa(user, pklName);
  }
}

// ── Helper: geocode untuk siswa yang koordinat DB tidak valid ──────────────
function _applyGeocodeForSiswa(user, pklName) {
  if (_targetLocationLocked) return;
  var _ck1 = pklName.toLowerCase().trim();
  var _cName = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim() : pklName;
  var _ck2 = _cName.toLowerCase().trim();
  var _cHit = _geocodeNameCache[_ck1] || (_ck2 !== _ck1 ? _geocodeNameCache[_ck2] : null);
  if (_cHit && _cHit.lat && _cHit.lng) {
    var _cR = (user && parseInt(user.allowed_radius)) > 0 ? parseInt(user.allowed_radius) : 350;
    _cR = Math.max(50, Math.min(1000, _cR));
    _forceSetTargetLocation({ lat: _cHit.lat, lng: _cHit.lng, name: pklName, allowedRadiusMeters: _cR });
    _targetLocationLocked = true;
    _updateMapUIAndReset();
    return;
  }
  var _userId = user.id || user.username;
  if (_geocodeAttemptedFor === _userId) {
    // Sudah dicoba, gagal — JANGAN override TARGET_LOCATION dengan SMKN9
    // Biarkan koordinat terakhir yang valid tetap di peta
    // Hanya tampilkan warning dan card ajukan koordinat
    console.warn('[SIGAP] Koordinat PKL belum tersedia:', pklName);
    _showAjukanKoordWarning(pklName);
    return;
  }
  _geocodeAttemptedFor = _userId;
  // Coba server_geocode dulu
  if (user.id && typeof activeUser !== 'undefined' && activeUser && String(user.id) === String(activeUser.id)) {
    fetch(apiUrl('api.php?action=server_geocode'), {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ user_id: user.id, pklLocation: pklName })
    }).then(function(r){ return r && r.ok ? r.json() : null; })
    .then(function(res){
      if (res && res.success && res.lat && res.lng && !_targetLocationLocked) {
        var sLat = parseFloat(res.lat), sLng = parseFloat(res.lng);
        var sR = (activeUser && parseInt(activeUser.allowed_radius)) > 0 ? parseInt(activeUser.allowed_radius) : 350;
        sR = Math.max(50, Math.min(1000, sR));
        if (activeUser) { activeUser.latitude_pkl = sLat; activeUser.longitude_pkl = sLng; }
        _forceSetTargetLocation({ lat: sLat, lng: sLng, name: pklName, allowedRadiusMeters: sR });
        _targetLocationLocked = true;
        _updateMapUIAndReset();
        console.log('[SIGAP] server_geocode berhasil:', pklName, sLat, sLng);
      } else if (!_targetLocationLocked) {
        geocodeLocationName(_ck2 !== _ck1 ? _cName : pklName, user);
      }
    }).catch(function(){
      if (!_targetLocationLocked) geocodeLocationName(_ck2 !== _ck1 ? _cName : pklName, user);
    });
  } else {
    geocodeLocationName(_ck2 !== _ck1 ? _cName : pklName, user);
  }
}

function applyTargetLocationFromUser(user) {
  if (!user) return;
  // LOCK GUARD siswa: jika TARGET_LOCATION sudah dikunci setelah login siswa,
  // jangan izinkan polling/rerender 8 detik mengubah geofencing lagi
  if (_targetLocationLocked) return;
  // LOCK GUARD guru: jika guru sudah punya target siswa terkunci,
  // JANGAN timpa TARGET_LOCATION dengan koordinat pklLocation guru sendiri
  if (_guruTargetLocked && user && user.role === 'guru' && user.username !== 'admin') return;

  const pklName = user.pklLocation || '';
  let lat = parseFloat(user.latitude_pkl);
  let lng = parseFloat(user.longitude_pkl);

  // Deteksi koordinat Jakarta lama yang salah
  const isOldJakartaCoords = !isNaN(lat) && !isNaN(lng) &&
    lat > -7.5 && lat < -5.0 && lng > 106.0 && lng < 107.5;

  const haversineKm = (la1, lo1, la2, lo2) => {
    const R = 6371, dLa = (la2-la1)*Math.PI/180, dLo = (lo2-lo1)*Math.PI/180;
    const a = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };
  const distFromMalang = (!isNaN(lat) && !isNaN(lng)) ? haversineKm(-7.9825, 112.6867, lat, lng) : 9999;

  // Koordinat DB valid = ada, bukan 0, bukan Jakarta, dalam radius valid
  // Catatan: isCenterMalang dan isDefaultSMKN9 hanya ditolak jika nama PKL BUKAN SMKN9
  // (koordinat SMKN9 valid jika siswa memang PKL di area tersebut)
  const isCenterMalang = !isNaN(lat) && !isNaN(lng) && Math.abs(lat - (-7.9700)) < 0.001 && Math.abs(lng - 112.6326) < 0.001;
  const isDefaultSMKN9 = !isNaN(lat) && !isNaN(lng) && Math.abs(lat - (-7.9825)) < 0.001 && Math.abs(lng - 112.6867) < 0.001;
  const isKnownBadCoords = (!isNaN(lat) && !isNaN(lng)) && (
    (Math.abs(lat - (-7.9437)) < 0.0005 && Math.abs(lng - 112.6136) < 0.0005) ||
    (Math.abs(lat - (-7.9797)) < 0.0005 && Math.abs(lng - 112.6304) < 0.0005) ||
    (Math.abs(lat - (-8.0028)) < 0.0005 && Math.abs(lng - 112.6571) < 0.0005) ||
    (Math.abs(lat - (-8.0007)) < 0.0005 && Math.abs(lng - 112.6157) < 0.0005)
  );
  // Hanya tolak koordinat SMKN9/pusat Malang jika nama PKL tidak mengandung "smk" atau "9 malang"
  // (artinya itu koordinat default placeholder, bukan koordinat presisi)
  const pklNameLow = pklName.toLowerCase();
  const pklIsAtSMKN9 = pklNameLow.includes('smk') || pklNameLow.includes('smkn') || pklNameLow.includes('9 malang');
  const isGenericDefault = (isCenterMalang || (isDefaultSMKN9 && !pklIsAtSMKN9) || isKnownBadCoords);
  const isDbCoordsValid = !isNaN(lat) && !isNaN(lng)
    && lat !== 0 && lng !== 0 && !isOldJakartaCoords && !isGenericDefault && distFromMalang < 1000;
  if (user.role === 'siswa' && pklName) {
    // ── PRIORITAS UTAMA: Fetch koordinat dari database server ──────────────
    // Endpoint get_student_pkl_location mengembalikan koordinat langsung dari DB
    // Ini adalah sumber kebenaran tunggal — bukan hasil geocode acak
    var _siswaId = user.id || user.username;
    if (_siswaId && typeof activeUser !== 'undefined' && activeUser &&
        (String(user.id) === String(activeUser.id) || user.username === activeUser.username)) {
      // Fetch dari DB dulu — async, tidak blokir UI
      fetch(apiUrl('api.php?action=get_student_pkl_location&user_id=' + encodeURIComponent(_siswaId)))
        .then(function(r){ return r && r.ok ? r.json() : null; })
        .then(function(res){
          if (_targetLocationLocked) return; // sudah dikunci di tempat lain
          if (res && res.success && res.ready_to_lock && res.lat && res.lng) {
            // ✅ Koordinat VALID di database → lock langsung, tidak perlu geocode
            var dbLat = parseFloat(res.lat);
            var dbLng = parseFloat(res.lng);
            var dbRadius = (res.radius && res.radius > 0) ? parseInt(res.radius) : 350;
            dbRadius = Math.max(50, Math.min(1000, dbRadius));
            // Update activeUser dengan koordinat DB terbaru
            if (activeUser) { activeUser.latitude_pkl = dbLat; activeUser.longitude_pkl = dbLng; }
            // Update localStorage
            var _lu = getUsers();
            var _li = _lu.findIndex(function(u){ return u.id===user.id||u.username===user.username; });
            if (_li !== -1) { _lu[_li].latitude_pkl = dbLat; _lu[_li].longitude_pkl = dbLng; saveUsers(_lu); }
            // Force-set dan lock — ini koordinat resmi dari database
            _forceSetTargetLocation({ lat: dbLat, lng: dbLng, name: res.name || pklName, allowedRadiusMeters: dbRadius });
            _targetLocationLocked = true;
            _geocodeAttemptedFor = null; // reset flag karena sudah dapat dari DB
            _updateMapUIAndReset();
            console.log('[SIGAP] ✅ TARGET LOCKED dari DB:', res.name, dbLat, dbLng, 'radius:', dbRadius + 'm');
          } else if (res && res.success && !res.ready_to_lock) {
            // ⚠️ Koordinat di DB tidak valid (0 atau generic) → geocode
            console.log('[SIGAP] DB koordinat tidak valid, mulai geocode:', pklName);
            _applyGeocodeForSiswa(user, pklName);
          } else {
            // Fetch gagal (offline/error) → coba dari data lokal
            _applyFromLocalData(user, pklName, isDbCoordsValid, lat, lng);
          }
        })
        .catch(function(){
          // Offline → gunakan data lokal
          _applyFromLocalData(user, pklName, isDbCoordsValid, lat, lng);
        });
      return; // tunggu async fetch, jangan teruskan eksekusi sinkron
    } else {
      // Bukan siswa aktif (misalnya dari polling untuk user lain)
      _applyFromLocalData(user, pklName, isDbCoordsValid, lat, lng);
    }
    return;
  }

  // Untuk guru/admin  // Untuk guru/admin
  if (isDbCoordsValid) {
    TARGET_LOCATION = { lat, lng, name: pklName || 'Lokasi PKL', allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };
  } else if (pklName) {
    const coords = getCoordinatesByLocationName(pklName);
    TARGET_LOCATION = { lat: coords.lat, lng: coords.lng, name: pklName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };
  }
  _updateMapUIAndReset();
}

// Geocoding via Nominatim (OpenStreetMap) � gratis, tanpa API key
// Strategi: coba 3 query berbeda dengan tingkat spesifisitas menurun,
// pilih hasil yang paling dekat Malang (dalam radius 80km)
async function geocodeLocationName(locationName, user) {
  // LOCK GUARD: jika koordinat siswa sudah dikunci saat login, batalkan geocode
  // Geocode berjalan async — bisa selesai setelah lock dipasang, override koordinat valid
  if (_targetLocationLocked && user && typeof activeUser !== 'undefined' && activeUser &&
      (String(user.id) === String(activeUser.id) || user.username === activeUser.username)) {
    console.log('[SIGAP] geocodeLocationName BLOCKED by lock for:', locationName);
    return;
  }
  const geocodeStatusEl = document.getElementById('geocodeStatusBadge');

  // ── CEK CACHE DULU ──────────────────────────────────────────────────────
  // Jika nama lokasi sudah pernah di-geocode, langsung pakai tanpa Nominatim
  const cacheKey = (locationName || '').toLowerCase().trim();
  if (_geocodeNameCache[cacheKey]) {
    const cached = _geocodeNameCache[cacheKey];
    const lat = cached.lat, lng = cached.lng;
    // Hanya set jika belum dikunci — cache hit bisa dipanggil ulang dari polling
    if (!_targetLocationLocked) {
      TARGET_LOCATION = { lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };
    }
    if (user) {
      user.latitude_pkl = lat; user.longitude_pkl = lng;
      const users = getUsers();
      const idx = users.findIndex(u => u.id === user.id || u.username === user.username);
      if (idx !== -1) { users[idx].latitude_pkl = lat; users[idx].longitude_pkl = lng; saveUsers(users); }
      if (user.id) {
        fetch(apiUrl('api.php?action=update_pkl_location'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, user_id: user.id, pklLocation: locationName, latitude_pkl: lat, longitude_pkl: lng })
        }).catch(function(){});
      }
    }
    if (geocodeStatusEl) geocodeStatusEl.style.display = 'none';
    // KUNCI koordinat jika cache hit untuk siswa aktif
    if (!_targetLocationLocked && user && typeof activeUser !== 'undefined' && activeUser &&
        (String(user.id) === String(activeUser.id) || user.username === activeUser.username) &&
        activeUser.role === 'siswa') {
      _forceSetTargetLocation({ lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });
      _targetLocationLocked = true;
      console.log('[SIGAP] geocode CACHE HIT — TARGET_LOCATION locked:', locationName);
    }
    _updateMapUIAndReset();
    console.log('[SIGAP] geocode CACHE HIT:', locationName, '→', lat, lng);
    return;
  }

  if (geocodeStatusEl) {
    geocodeStatusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mencari koordinat "${locationName}"...`;
    geocodeStatusEl.style.display = 'flex';
  }

  // Koordinat pusat Malang sebagai referensi filter
  const MALANG_LAT = -7.9825, MALANG_LNG = 112.6867;
  const MAX_DIST_KM = 500; // cakup seluruh Jawa Timur (~500km dari Malang)

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Susun query dari paling spesifik ke paling umum
  const nameLow = locationName.toLowerCase();
  const hasMalang = nameLow.includes('malang');

  // Ekstrak kata kunci utama: hapus kata generik seperti "malang", "pt.", "cv.", "ud.", dll
  const stripped = locationName
    .replace(/\b(pt\.?|cv\.?|ud\.?|tb\.?|toko|kantor|dinas|instansi|cabang|pusat)\b/gi, '')
    .replace(/\b(malang|kota|kabupaten|jawa timur|jatim|indonesia)\b/gi, '')
    .replace(/\s+/g, ' ').trim();

  const queries = [
    // Query 1: nama asli + Malang + Jawa Timur (paling presisi)
    hasMalang
      ? `${locationName}, Jawa Timur, Indonesia`
      : `${locationName}, Malang, Jawa Timur, Indonesia`,
    // Query 2: nama asli + Indonesia
    `${locationName}, Indonesia`,
    // Query 3: kata kunci utama + Malang (tanpa prefiks PT/CV/dll)
    stripped && stripped !== locationName
      ? `${stripped}, Malang, Jawa Timur, Indonesia`
      : `${locationName}, Jawa Timur`,
    // Query 4: kata kunci utama saja
    stripped || locationName
  ];

  let bestResult = null;

  for (const query of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=id`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'id', 'User-Agent': 'SIGAP-PKL-App/1.0' }
      });
      const results = await response.json();

      if (results && results.length > 0) {
        // Dari semua hasil, pilih yang paling dekat Malang
        let best = null;
        let bestDist = Infinity;
        for (const r of results) {
          const rlat = parseFloat(r.lat), rlng = parseFloat(r.lon);
          const dist = haversineKm(MALANG_LAT, MALANG_LNG, rlat, rlng);
          if (dist < bestDist) {
            bestDist = dist;
            best = r;
          }
        }

        // Terima jika dalam radius MAX_DIST_KM dari Malang
        if (best && bestDist <= MAX_DIST_KM) {
          bestResult = { lat: parseFloat(best.lat), lng: parseFloat(best.lon), distKm: bestDist, query };
          break; // ketemu � hentikan loop query
        }

        // Kalau tidak ada yang dalam radius, simpan sebagai candidate terakhir
        if (!bestResult && best) {
          bestResult = { lat: parseFloat(best.lat), lng: parseFloat(best.lon), distKm: bestDist, query, fallback: true };
        }
      }
    } catch(e) {
      // network error � lanjut ke query berikutnya
    }
  }

  if (bestResult && !bestResult.fallback) {
    // Hasil presisi dalam radius Malang
    const { lat, lng } = bestResult;
    // Cek lock sebelum set — async Nominatim bisa selesai setelah DB lock sudah aktif
    if (_targetLocationLocked) {
      console.log('[SIGAP] geocode presisi BLOCKED by lock (DB fetch sudah selesai lebih dulu):', locationName);
      return;
    }
    TARGET_LOCATION = { lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };
    // KUNCI koordinat jika geocode berhasil untuk siswa aktif
    if (user && typeof activeUser !== 'undefined' && activeUser &&
        (String(user.id) === String(activeUser.id) || user.username === activeUser.username) &&
        activeUser.role === 'siswa') {
      _forceSetTargetLocation({ lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });
      _targetLocationLocked = true;
      console.log('[SIGAP] geocode presisi selesai — TARGET_LOCATION locked:', locationName, lat, lng);
    }

    // Simpan ke database user agar tidak geocode ulang saat login berikutnya
    if (user) {
      user.latitude_pkl = lat;
      user.longitude_pkl = lng;
      const users = getUsers();
      const idx = users.findIndex(u => u.id === user.id || u.username === user.username);
      if (idx !== -1) {
        users[idx].latitude_pkl = lat;
        users[idx].longitude_pkl = lng;
        saveUsers(users);
      // Kirim koordinat hasil Nominatim ke server agar semua perangkat sinkron
      if (user && user.id) {
        fetch(apiUrl('api.php?action=update_pkl_location'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, user_id: user.id, pklLocation: locationName, latitude_pkl: lat, longitude_pkl: lng })
        }).then(function(r){ return r&&r.ok?r.json():null; })
          .then(function(rd){ if(rd&&rd.success){ user._localGeocodedTs = Date.now(); console.log('[SIGAP] update_pkl_location presisi OK:', locationName); } })
          .catch(function(){}); }
      }
      try {
        if (localStorage.getItem(STORAGE_KEY_AUTH)) {
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
        } else if (sessionStorage.getItem(STORAGE_KEY_AUTH)) {
          sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
        }
      } catch(e) {}
    }

    if (geocodeStatusEl) {
      geocodeStatusEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Koordinat presisi: ${lat.toFixed(5)}, ${lng.toFixed(5)} (~${bestResult.distKm.toFixed(1)}km dari Malang)`;
      geocodeStatusEl.style.background = 'rgba(16,185,129,0.2)';
      geocodeStatusEl.style.color = '#34d399';
      geocodeStatusEl.style.borderColor = 'rgba(16,185,129,0.4)';
      setTimeout(() => { if (geocodeStatusEl) geocodeStatusEl.style.display = 'none'; }, 5000);
    }
    showToast(`?? Titik target "${locationName}" ditemukan (${bestResult.distKm.toFixed(1)}km dari Malang)`, 'success');
    // Simpan ke cache agar siswa lain dengan nama PKL sama tidak perlu Nominatim
    _addToGeocodeCache(locationName, lat, lng, 'nominatim-presisi');

  } else if (bestResult && bestResult.fallback) {
    // Hasil ditemukan tapi di luar radius Malang - tetap pakai tanpa toast (silent)
    const { lat, lng } = bestResult;
    // Cek lock sebelum set
    if (_targetLocationLocked) {
      console.log('[SIGAP] geocode fallback BLOCKED by lock:', locationName);
      return;
    }
    TARGET_LOCATION = { lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };
    // KUNCI koordinat jika fallback geocode untuk siswa aktif
    if (user && typeof activeUser !== 'undefined' && activeUser &&
        (String(user.id) === String(activeUser.id) || user.username === activeUser.username) &&
        activeUser.role === 'siswa') {
      _forceSetTargetLocation({ lat, lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 });
      _targetLocationLocked = true;
      console.log('[SIGAP] geocode fallback selesai — TARGET_LOCATION locked:', locationName, lat, lng);
    }
    if (user) {
      user.latitude_pkl = lat; user.longitude_pkl = lng;
      const users = getUsers();
      const idx = users.findIndex(u => u.id === user.id || u.username === user.username);
      if (idx !== -1) { users[idx].latitude_pkl = lat; users[idx].longitude_pkl = lng; saveUsers(users); }
      // Kirim koordinat fallback Nominatim ke server
      if (user && user.id) {
        fetch(apiUrl('api.php?action=update_pkl_location'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, user_id: user.id, pklLocation: locationName, latitude_pkl: lat, longitude_pkl: lng })
        }).then(function(r){ return r&&r.ok?r.json():null; })
          .then(function(rd){ if(rd&&rd.success){ user._localGeocodedTs = Date.now(); console.log('[SIGAP] update_pkl_location fallback OK:', locationName); } })
          .catch(function(){}); }
      try { localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user)); } catch(e) {}
    }
    if (geocodeStatusEl) { geocodeStatusEl.style.display = 'none'; }
    console.warn('[SIGAP] geocode fallback: nama PKL tidak presisi, pakai koordinat terdekat');
    _addToGeocodeCache(locationName, lat, lng, 'nominatim-fallback');

  } else {
    // Nominatim tidak menemukan — fallback ke kamus koordinat lokal (silent, tanpa toast error)
    const coords = getCoordinatesByLocationName(locationName);
    // Hanya set jika belum dikunci
    if (!_targetLocationLocked) {
      TARGET_LOCATION = { lat: coords.lat, lng: coords.lng, name: locationName, allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350 };
    }

    // Simpan koordinat fallback ke user agar tidak geocode ulang terus
    if (user) {
      user.latitude_pkl = coords.lat;
      user.longitude_pkl = coords.lng;
      const users = getUsers();
      const idx = users.findIndex(u => u.id === user.id || u.username === user.username);
      if (idx !== -1) {
        users[idx].latitude_pkl = coords.lat;
        users[idx].longitude_pkl = coords.lng;
        saveUsers(users);
      // Kirim koordinat kamus lokal ke server
      if (user && user.id) {
        fetch(apiUrl('api.php?action=update_pkl_location'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, user_id: user.id, pklLocation: locationName, latitude_pkl: coords.lat, longitude_pkl: coords.lng })
        }).then(function(r){ return r&&r.ok?r.json():null; })
          .then(function(rd){ if(rd&&rd.success){ user._localGeocodedTs = Date.now(); console.log('[SIGAP] update_pkl_location kamus OK:', locationName); } })
          .catch(function(){}); }
    if (coords && coords.lat && coords.lat !== 0) { _addToGeocodeCache(locationName, coords.lat, coords.lng, 'kamus'); }
      }
    }

    if (geocodeStatusEl) {
      geocodeStatusEl.style.display = 'none'; // sembunyikan badge status
    }
    // Tidak tampilkan toast error — cukup log ke console
    console.warn(`[SIGAP] geocode: "${locationName}" tidak ditemukan Nominatim, pakai koordinat perkiraan (${coords.lat}, ${coords.lng})`);
  }

  // Hanya rebuild map jika koordinat belum dikunci
  if (!_targetLocationLocked) {
    // Geocode semua cara gagal — lock dengan koordinat kamus (mungkin 0,0 = SMKN9 fallback)
    // Ini mencegah loop tak berujung jika Nominatim tidak bisa temukan lokasi
    if (typeof user !== 'undefined' && user && user.role === 'siswa' && typeof activeUser !== 'undefined' && activeUser &&
        (String(user.id) === String(activeUser.id) || user.username === activeUser.username)) {
      _targetLocationLocked = true; // lock untuk siswa aktif
      console.log('[SIGAP] geocode kamus — lock untuk siswa:', user.pklLocation || '');
    }
    _updateMapUIAndReset();
  }
}

// Update semua UI dan reset map setelah TARGET_LOCATION berubah
var _updateMapDebounceTs = 0;
function _updateMapUIAndReset() {
  // Debounce: skip jika dipanggil dalam 150ms (mencegah flood di APK)
  var _now = Date.now();
  if ((_now - _updateMapDebounceTs) < 150) return;
  _updateMapDebounceTs = _now;
  const targetMapName = document.getElementById('targetMapName');
  const radiusMetersText = document.getElementById('radiusMetersText');
  const targetLocationName = document.getElementById('targetLocationName');
  const targetPklName = document.getElementById('targetPklName');
  const targetLatValue = document.getElementById('targetLatValue');
  const targetLngValue = document.getElementById('targetLngValue');
  const targetRadiusValue = document.getElementById('targetRadiusValue');
  const googleMapsTargetLink = document.getElementById('googleMapsTargetLink');

  if (targetMapName) targetMapName.textContent = TARGET_LOCATION.name;
  if (radiusMetersText) radiusMetersText.textContent = `${TARGET_LOCATION.allowedRadiusMeters} Meter`;
  if (targetLocationName) targetLocationName.textContent = TARGET_LOCATION.name;
  if (targetPklName) targetPklName.textContent = TARGET_LOCATION.name;
  if (targetLatValue) targetLatValue.textContent = TARGET_LOCATION.lat.toFixed(6);
  if (targetLngValue) targetLngValue.textContent = TARGET_LOCATION.lng.toFixed(6);
  if (targetRadiusValue) targetRadiusValue.textContent = `${TARGET_LOCATION.allowedRadiusMeters} m`;
  if (googleMapsTargetLink) {
    googleMapsTargetLink.href = `https://www.google.com/maps?q=${TARGET_LOCATION.lat},${TARGET_LOCATION.lng}&label=${encodeURIComponent(TARGET_LOCATION.name)}`;
  }

  // Update marker tanpa destroy map � zoom tetap terjaga
  if (typeof leafletMap !== 'undefined' && leafletMap) {
    // LOCK GUARD: jika target sudah dikunci dan marker ada, skip rebuild — hanya update posisi siswa
    // Pengecualian: jika _mapNeedsRebuildAfterLock=true, koordinat baru baru saja di-lock dari DB
    // → paksa rebuild marker sekali agar peta berpindah ke lokasi PKL yang benar
    if (_targetLocationLocked && targetMarker && geofenceCircle && !_mapNeedsRebuildAfterLock) {
      if (userCoords) applyLocationUpdate(userCoords.lat, userCoords.lng, userCoords.accuracy || 0);
      return;
    }
    _mapNeedsRebuildAfterLock = false; // reset flag setelah rebuild dilakukan
    // Hapus marker lama (hanya saat target berubah / belum locked)
    if (targetMarker) { try { leafletMap.removeLayer(targetMarker); } catch(e) {} targetMarker = null; }
    if (geofenceCircle) { try { leafletMap.removeLayer(geofenceCircle); } catch(e) {} geofenceCircle = null; }
    if (distanceLine) { try { leafletMap.removeLayer(distanceLine); } catch(e) {} distanceLine = null; }
    // Pindahkan center ke TARGET_LOCATION baru
    leafletMap.panTo([TARGET_LOCATION.lat, TARGET_LOCATION.lng], { animate: false });
    mapFittedOnce = false;
    // (lanjut rebuild marker di bawah)
    if (false) {
      // Target sudah dikunci dan marker sudah ada
      if (userCoords) applyLocationUpdate(userCoords.lat, userCoords.lng, userCoords.accuracy || 0);
      return;
    }
    setTimeout(() => {
      if (leafletMap) {
        targetMarker = L.marker([TARGET_LOCATION.lat, TARGET_LOCATION.lng]).addTo(leafletMap)
          .bindPopup(`<b>${TARGET_LOCATION.name}</b><br>Lokasi Presensi Target`).openPopup();
        geofenceCircle = L.circle([TARGET_LOCATION.lat, TARGET_LOCATION.lng], {
          color: '#4f46e5', fillColor: '#6366f1', fillOpacity: 0.2,
          radius: TARGET_LOCATION.allowedRadiusMeters
        }).addTo(leafletMap);
        if (userCoords) applyLocationUpdate(userCoords.lat, userCoords.lng, userCoords.accuracy || 0);
      }
    }, 100);
    return;
  }

  // Map belum ada � init baru
  setTimeout(() => {
    initMap();
    if (userCoords) applyLocationUpdate(userCoords.lat, userCoords.lng, userCoords.accuracy || 0);
  }, 100);
}

// Re-sync koordinat PKL dari Maps � force reset koordinat lama dulu lalu geocode ulang
async function resyncLocationFromGoogleMaps() {
  if (!activeUser) return;
  const pklName = activeUser.pklLocation;
  if (!pklName) {
    showToast('Data lokasi PKL belum diisi. Hubungi admin.', 'error');
    return;
  }
  const icon = document.getElementById('resyncIcon');
  if (icon) icon.className = 'fa-solid fa-rotate fa-spin';

  // Force reset koordinat di DB agar geocode tidak skip
  activeUser.latitude_pkl = 0;
  activeUser.longitude_pkl = 0;
  const users = getUsers();
  const idx = users.findIndex(u => u.id === activeUser.id || u.username === activeUser.username);
  if (idx !== -1) {
    users[idx].latitude_pkl = 0;
    users[idx].longitude_pkl = 0;
    saveUsers(users);
  }
  try {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(activeUser));
  } catch(e) {}

  // Geocode ulang dari nama (hanya jika belum locked)
  if (!_targetLocationLocked) {
    await geocodeLocationName(pklName, activeUser);
  } else {
    console.log('[SIGAP] resync geocode BLOCKED — koordinat sudah dikunci');
  }

  if (icon) icon.className = 'fa-solid fa-rotate';
}

// ── AJUKAN KOORDINAT PKL — siswa self-report GPS ─────────────────────────────

var _ajukanKoordMap = null;
var _ajukanKoordMarker = null;
var _ajukanKoordLat = 0;
var _ajukanKoordLng = 0;
var _ajukanKoordAccuracy = 0;

// Tampilkan card warning di profil saat geocode gagal
function _showAjukanKoordWarning(pklName) {
  var card = document.getElementById('ajukanKoordCard');
  var desc = document.getElementById('ajukanKoordDesc');
  if (!card) return;
  var shortName = (pklName && pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim() : pklName;
  if (desc) desc.textContent = 'Sistem tidak dapat menemukan koordinat GPS untuk "' + shortName + '". ' +
    'Jika Anda sedang di lokasi PKL, ajukan titik koordinat untuk diverifikasi admin.';
  card.classList.remove('hidden');
  // Tampilkan juga revisi card saat profil dibuka (untuk siswa yang sudah punya koordinat tapi tidak akurat)
  var revCard = document.getElementById('revisiKoordCard');
  if (revCard) revCard.classList.add('hidden'); // sembunyikan revisi jika warning sudah tampil
  // Tampilkan notifikasi di beranda juga
  var homeNotice = document.getElementById('homeKoordNotice');
  if (homeNotice) homeNotice.classList.remove('hidden');
}

// Tampilkan revisi card di profil untuk siswa yang sudah punya koordinat
function _showRevisiKoordCard() {
  var revCard = document.getElementById('revisiKoordCard');
  var warnCard = document.getElementById('ajukanKoordCard');
  if (revCard) revCard.classList.remove('hidden');
  if (warnCard) warnCard.classList.add('hidden');
}

function openAjukanKoordModal() {
  var modal = document.getElementById('ajukanKoordModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  // Isi nama PKL dari activeUser
  var pklNameEl = document.getElementById('ajukanKoordPklName');
  if (pklNameEl && activeUser) pklNameEl.textContent = activeUser.pklLocation || '(nama PKL tidak diketahui)';
  // Reset status
  var statusEl = document.getElementById('ajukanKoordModalStatus');
  if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }
  var btnKirim = document.getElementById('btnKirimKoord');
  if (btnKirim) { btnKirim.disabled = true; btnKirim.style.opacity = '0.5'; }
  _ajukanKoordLat = 0; _ajukanKoordLng = 0;
  // Mulai deteksi GPS
  _deteksiGpsAjukan();
}

function closeAjukanKoordModal() {
  var modal = document.getElementById('ajukanKoordModal');
  if (modal) modal.classList.add('hidden');
  // Hapus map agar tidak memory leak
  if (_ajukanKoordMap) {
    try { _ajukanKoordMap.remove(); } catch(e) {}
    _ajukanKoordMap = null; _ajukanKoordMarker = null;
  }
}

function deteksiUlangGpsAjukan() { _deteksiGpsAjukan(); }

function _deteksiGpsAjukan() {
  var statusEl  = document.getElementById('ajukanKoordGpsStatus');
  var valueEl   = document.getElementById('ajukanKoordGpsValue');
  var accEl     = document.getElementById('ajukanKoordGpsAccuracy');
  var mapBox    = document.getElementById('ajukanKoordMapBox');
  var btnKirim  = document.getElementById('btnKirimKoord');
  if (statusEl) { statusEl.style.display = ''; statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mendeteksi GPS...'; statusEl.style.color = '#f59e0b'; }
  if (valueEl)  valueEl.style.display = 'none';
  if (accEl)    accEl.style.display   = 'none';
  if (!navigator.geolocation) {
    if (statusEl) { statusEl.textContent = 'GPS tidak didukung di perangkat ini.'; statusEl.style.color = '#ef4444'; }
    return;
  }
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      _ajukanKoordLat      = pos.coords.latitude;
      _ajukanKoordLng      = pos.coords.longitude;
      _ajukanKoordAccuracy = pos.coords.accuracy || 0;
      if (statusEl) { statusEl.textContent = '✅ GPS berhasil dideteksi'; statusEl.style.color = '#34d399'; }
      if (valueEl)  { valueEl.textContent  = _ajukanKoordLat.toFixed(6) + ', ' + _ajukanKoordLng.toFixed(6); valueEl.style.display = ''; }
      if (accEl)    { accEl.textContent    = 'Akurasi: ±' + Math.round(_ajukanKoordAccuracy) + ' meter'; accEl.style.display = ''; }
      if (btnKirim) { btnKirim.disabled = false; btnKirim.style.opacity = '1'; }
      // Tampilkan mini map
      if (mapBox) { mapBox.style.display = ''; }
      setTimeout(function() { _renderAjukanMiniMap(_ajukanKoordLat, _ajukanKoordLng); }, 100);
    },
    function(err) {
      if (statusEl) { statusEl.textContent = '❌ GPS gagal: ' + (err.message || 'Tidak dapat mengakses lokasi'); statusEl.style.color = '#ef4444'; }
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

function _renderAjukanMiniMap(lat, lng) {
  if (typeof L === 'undefined') return;
  if (_ajukanKoordMap) {
    _ajukanKoordMap.setView([lat, lng], 17);
    if (_ajukanKoordMarker) _ajukanKoordMarker.setLatLng([lat, lng]);
    else _ajukanKoordMarker = L.circleMarker([lat,lng],{color:'#f59e0b',fillColor:'#fbbf24',fillOpacity:0.9,radius:9,weight:2}).addTo(_ajukanKoordMap);
    try { _ajukanKoordMap.invalidateSize(); } catch(e){}
    return;
  }
  _ajukanKoordMap = L.map('ajukanKoordMap', { zoomControl: false, dragging: false, scrollWheelZoom: false }).setView([lat, lng], 17);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(_ajukanKoordMap);
  _ajukanKoordMarker = L.circleMarker([lat,lng],{color:'#f59e0b',fillColor:'#fbbf24',fillOpacity:0.9,radius:9,weight:2})
    .addTo(_ajukanKoordMap).bindPopup('📍 Posisi Anda Saat Ini').openPopup();
  setTimeout(function(){ if(_ajukanKoordMap) _ajukanKoordMap.invalidateSize(); }, 200);
}

function submitKoordPKL() {
  if (!activeUser) return;
  if (_ajukanKoordLat === 0 || _ajukanKoordLng === 0) {
    showToast('Deteksi GPS belum selesai. Tunggu atau klik Deteksi Ulang.', 'error');
    return;
  }
  var btnKirim  = document.getElementById('btnKirimKoord');
  var statusEl  = document.getElementById('ajukanKoordModalStatus');
  var catatan   = (document.getElementById('ajukanKoordCatatan') || {}).value || '';
  if (btnKirim) { btnKirim.disabled = true; btnKirim.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...'; }
  fetch(apiUrl('api.php?action=submit_pkl_coords'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id:       activeUser.id,
      lat:           _ajukanKoordLat,
      lng:           _ajukanKoordLng,
      accuracy:      _ajukanKoordAccuracy,
      location_name: activeUser.pklLocation || '',
      catatan:       catatan
    })
  }).then(function(r){ return r && r.ok ? r.json() : null; })
  .then(function(res) {
    if (res && res.success) {
      showToast('✅ Pengajuan koordinat berhasil dikirim! Menunggu persetujuan admin.', 'success');
      if (statusEl) { statusEl.style.display=''; statusEl.style.color='#34d399'; statusEl.textContent = '✅ Pengajuan terkirim, menunggu persetujuan admin.'; }
      // Update localStorage agar badge pending muncul
      var users = getUsers();
      var idx = users.findIndex(function(u){ return u.id == activeUser.id || u.username === activeUser.username; });
      if (idx !== -1) {
        users[idx].status = 'pending_edit_pkl';
        users[idx].proposed_latitude_pkl  = _ajukanKoordLat;
        users[idx].proposed_longitude_pkl = _ajukanKoordLng;
        users[idx].proposed_pkl_location  = activeUser.pklLocation || '';
        users[idx].edit_requested_by = 'Siswa (self-report GPS)';
        saveUsers(users);
      }
      // Tutup modal setelah 2 detik
      setTimeout(function() { closeAjukanKoordModal(); }, 2000);
      // Sembunyikan card warning, tampilkan status pending
      var warnCard = document.getElementById('ajukanKoordCard');
      if (warnCard) {
        var statusPend = document.getElementById('ajukanKoordStatus');
        if (statusPend) { statusPend.style.display=''; statusPend.textContent='⏳ Pengajuan dikirim, menunggu persetujuan admin.'; }
      }
    } else {
      showToast('Gagal mengirim pengajuan: ' + ((res && res.message) || 'Error jaringan'), 'error');
      if (btnKirim) { btnKirim.disabled = false; btnKirim.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Pengajuan'; }
    }
  }).catch(function() {
    showToast('Gagal mengirim pengajuan (offline?)', 'error');
    if (btnKirim) { btnKirim.disabled = false; btnKirim.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Pengajuan'; }
  });
}

// ── Expose ke window untuk onclick di HTML ────────────────────────────────────
window.openAjukanKoordModal  = openAjukanKoordModal;
window.closeAjukanKoordModal = closeAjukanKoordModal;
window.deteksiUlangGpsAjukan = deteksiUlangGpsAjukan;
window.submitKoordPKL        = submitKoordPKL;

const DEFAULT_USERS_LIST = [
  {
    id: 3,
    username: "admin",
    nomor_induk: "00000000",
    password: "sampurna01",
    role: "admin",
    name: "Master Administrator",
    subtext: "Master Admin Sekolah",
    school: "SMK Negeri 9 Malang",
    pklLocation: "SMK Negeri 9 Malang",
    latitude_pkl: -7.9825,
    longitude_pkl: 112.6867,
    supervisor: "Administrator Utama",
    avatar: "img/admin_avatar.jpg"
  },
  {
    id: 1,
    username: "guru1",
    nomor_induk: "19841031201101001",
    password: "guru123",
    role: "guru",
    name: "Guru Pembimbing 1",
    subtext: "Guru Pembimbing PKL",
    school: "SMK Negeri 9 Malang",
    pklLocation: "SMK Negeri 9 Malang",
    latitude_pkl: -7.9825,
    longitude_pkl: 112.6867,
    supervisor: "",
    avatar: ""
  },
  {
    id: 2,
    username: "guru2",
    nomor_induk: "19850215201102002",
    password: "guru123",
    role: "guru",
    name: "Guru Pembimbing 2",
    subtext: "Guru Pembimbing PKL",
    school: "SMK Negeri 9 Malang",
    pklLocation: "SMK Negeri 9 Malang",
    latitude_pkl: -7.9825,
    longitude_pkl: 112.6867,
    supervisor: "",
    avatar: ""
  }
];

let activeUser = null;
let currentLoginRole = 'siswa';
let currentStream = null;
let activeCameraType = 'masuk';
let capturedImageData = null;
let userCoords = null;
let leafletMap = null;
let mapFittedOnce = false; // flag: fitBounds hanya sekali saat GPS pertama kali dapat posisi
let userMarker = null;
let targetMarker = null;
let geofenceCircle = null;
let distanceLine = null;
let studentPklMarkers = []; // marker semua titik PKL siswa bimbingan (untuk guru)
let attendanceChartInstance = null;
let chartInstanceH1 = null;
let chartInstanceH = null;
let chartInstanceCompBar = null;
let realtimeInterval = null;

const STORAGE_KEY_AUTH = 'SIGAP PKL SMKN 9 Official_active_session_v6';
const STORAGE_KEY_USERS = 'SIGAP PKL SMKN 9 Official_users';
const STORAGE_KEY_ATTENDANCE = 'SIGAP PKL SMKN 9 Official_attendance';
const STORAGE_KEY_PERMISSIONS = 'SIGAP PKL SMKN 9 Official_permissions';
const STORAGE_KEY_APPROVAL_REPORTS = 'SIGAP PKL SMKN 9 Official_approval_reports';
const STORAGE_KEY_JOURNAL = 'SIGAP PKL SMKN 9 Official_journals_v1'; // Jurnal Harian Siswa PKL

const INITIAL_LOGS = [];
const INITIAL_PERMISSIONS = [];

document.addEventListener('DOMContentLoaded', () => {
  // ── INSTALL GUARD: paksa login ulang jika APK baru diinstal ───────────────
  // Setiap install baru akan menghasilkan STORAGE_KEY_INSTALL kosong.
  // Jika tidak cocok dengan versi saat ini → hapus sesi lama → paksa login.
  (function() {
    var APP_INSTALL_KEY = 'SIGAP_PKL_K9_install_token_v1';
    var APP_BUILD       = 'v2.1.73-build-' + (new Date('2026-09-02').getTime());
    var storedToken     = localStorage.getItem(APP_INSTALL_KEY);

    if (!storedToken) {
      // Install baru atau data baru saja dihapus — hapus semua sesi
      localStorage.removeItem('SIGAP PKL SMKN 9 Official_active_session_v6');
      sessionStorage.removeItem('SIGAP PKL SMKN 9 Official_active_session_v6');
      localStorage.removeItem('SIGAP PKL SMKN 9 Official_remembered_credentials');
      // Tandai sudah terinisialisasi
      localStorage.setItem(APP_INSTALL_KEY, APP_BUILD);
      console.log('[SIGAP] Fresh install detected — session cleared, login required');
    } else if (storedToken !== APP_BUILD) {
      // Update version — pertahankan sesi yang ada (auto-login diizinkan)
      localStorage.setItem(APP_INSTALL_KEY, APP_BUILD);
      console.log('[SIGAP] App updated: ' + storedToken + ' → ' + APP_BUILD);
    }
    // storedToken === APP_BUILD: install biasa, lanjutkan normal
  })();
  // ──────────────────────────────────────────────────────────────────────────

  initStorage();
  checkAuthSession();
  updateRememberMeAutocompleteState();
  startLiveClock();
  initGeolocation();
  initRealtimeFeed();

  // Inisialisasi cache koordinat PKL dari localStorage + data user yang sudah ada
  // Dipanggil setelah getUsers() tersedia agar bisa langsung populate cache dari DB lokal
  setTimeout(function() { _initGeocodeCache(); }, 500);

  // Startup sync � pull dari server, retry 3x jika gagal atau kosong
  (function _startupSync(attempt) {
    attempt = attempt || 1;
    var _base = (function() {
      var p = window.location.protocol; var h = window.location.hostname;
      return (p === 'capacitor:' || p === 'ionic:' || h === 'localhost' || h === '127.0.0.1') ? window._SERVER_HTTPS : '';
    })();
    fetch(_base + '/api.php?action=get_users')
      .then(function(r) { return r && r.ok ? r.json() : null; })
      .then(function(res) {
        var users = res ? (res.users || res.data || []) : [];
        if (users.length > 0) {
          _mergeServerUsers(res, true);
          // Refresh cache koordinat setelah dapat data terbaru dari server
          setTimeout(function() { _initGeocodeCache(); }, 200);
          console.log('[SIGAP] Startup sync OK attempt=' + attempt + ', users=' + users.length);
        } else if (attempt < 4) {
          console.warn('[SIGAP] Startup sync attempt ' + attempt + ' got 0 users, retry in 2s...');
          setTimeout(function() { _startupSync(attempt + 1); }, 2000);
        } else {
          console.warn('[SIGAP] Startup sync failed after 3 attempts');
        }
      })
      .catch(function(e) {
        console.warn('[SIGAP] Startup sync error attempt=' + attempt + ':', e.message);
        if (attempt < 4) setTimeout(function() { _startupSync(attempt + 1); }, 2000);
      });
  })(1);

  const todayStr = new Date().toISOString().split('T')[0];
  const startDateInput = document.getElementById('permStartDate');
  const endDateInput = document.getElementById('permEndDate');
  if (startDateInput) startDateInput.value = todayStr;
  if (endDateInput) endDateInput.value = todayStr;
});

function getUsers() {
  let users = null;
  try {
    const data = localStorage.getItem(STORAGE_KEY_USERS);
    if (data !== null) {
      users = JSON.parse(data);
    }
  } catch(e) {
    console.warn('[SIGAP] getUsers: JSON parse error', e);
    users = [];
  }

  // Jika localStorage kosong (belum sync dari server), kembalikan array kosong
  // Server akan mengisi via syncDataFromServer() � jangan inject DEFAULT hardcoded
  if (!Array.isArray(users) || users.length === 0) {
    return [];
  }

  // Migration: ensure all siswa have kelas field
  let needsSave = false;
  users.forEach(u => {
    if (u && u.role === 'siswa' && u.kelas === undefined) {
      u.kelas = '';
      needsSave = true;
    }
    if (u && u.role === 'siswa') {
      const lat = parseFloat(u.latitude_pkl), lng = parseFloat(u.longitude_pkl);
      const isOldCoords = !isNaN(lat) && !isNaN(lng) && lat > -7.5 && lat < -5.0 && lng > 106.0 && lng < 107.5;
      if (isOldCoords) { u.latitude_pkl = 0; u.longitude_pkl = 0; needsSave = true; }
    }
    if (u && (u.role === 'admin' || u.username === 'admin')) {
      const lat = parseFloat(u.latitude_pkl), lng = parseFloat(u.longitude_pkl);
      const isOldCoords = !isNaN(lat) && !isNaN(lng) && lat > -7.5 && lat < -5.0 && lng > 106.0 && lng < 107.5;
      if (isOldCoords) { u.latitude_pkl = -7.9825; u.longitude_pkl = 112.6867; needsSave = true; }
    }
  });
  if (needsSave) saveUsers(users);
  return users;
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

// ── In-memory cache untuk getLogs dan getJournals ─────────────────────────
// Menghindari JSON.parse localStorage berulang yang lambat untuk data besar
var _logsCache     = null;
var _logsCacheDirty = true;
var _journalCache  = null;
var _journalCacheDirty = true;

function _invalidateLogsCache()    { _logsCacheDirty = true;    _logsCache    = null; }
function _invalidateJournalCache() { _journalCacheDirty = true; _journalCache = null; }

function getLogs() {
  if (!_logsCacheDirty && _logsCache !== null) return _logsCache;
  try {
    _logsCache     = JSON.parse(localStorage.getItem(STORAGE_KEY_ATTENDANCE)) || [];
    _logsCacheDirty = false;
    return _logsCache;
  } catch(e) { _logsCache = []; _logsCacheDirty = false; return _logsCache; }
}

function saveLogs(logs) {
  _logsCache      = logs;
  _logsCacheDirty  = false;
  localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(logs));
}

function getPermissions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PERMISSIONS)) || [];
  } catch(e) { return []; }
}

function savePermissions(perms) {
  localStorage.setItem(STORAGE_KEY_PERMISSIONS, JSON.stringify(perms));
}

function getApprovalReports() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_APPROVAL_REPORTS)) || [];
  } catch(e) { return []; }
}

function saveApprovalReports(reports) {
  localStorage.setItem(STORAGE_KEY_APPROVAL_REPORTS, JSON.stringify(reports));
}

// ── JURNAL HARIAN ─────────────────────────────────────────────────────────
// Struktur objek jurnal:
// { id, studentName, supervisor, date, time, narasi, image, createdAt }
function getJournals() {
  if (!_journalCacheDirty && _journalCache !== null) return _journalCache;
  try {
    _journalCache     = JSON.parse(localStorage.getItem(STORAGE_KEY_JOURNAL)) || [];
    _journalCacheDirty = false;
    return _journalCache;
  } catch(e) { _journalCache = []; _journalCacheDirty = false; return _journalCache; }
}

function saveJournals(journals) {
  _journalCache      = journals;
  _journalCacheDirty  = false;
  localStorage.setItem(STORAGE_KEY_JOURNAL, JSON.stringify(journals));
}

function getJournalsByStudent(studentName) {
  return getJournals().filter(function(j) { return j.studentName === studentName; });
}

function getTodayJournal(studentName) {
  var today = new Date().toISOString().split('T')[0];
  return getJournals().find(function(j) {
    return j.studentName === studentName && j.date === today;
  }) || null;
}
// ──────────────────────────────────────────────────────────────────────────

function recordApprovalReport(report) {
  const reports = getApprovalReports();
  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  reports.unshift({
    id: Date.now(),
    time: timeStr,
    date: dateStr,
    requested_by: report.requested_by || 'Guru Pembimbing',
    studentName: report.studentName || 'Siswa',
    title: report.title,
    actionStatus: report.actionStatus, // 'Disetujui' or 'Ditolak'
    details: report.details || '',
    approver: activeUser ? activeUser.name : 'Master Admin'
  });

  saveApprovalReports(reports);
  renderGuruApprovalReports();
  renderAdminApprovalReportsHistory();
}

// --- DATABASE VERSION GUARD ---------------------------------------------------
const DB_SCHEMA_VERSION = '4'; // v4: DB cleaned, only admin remains, fresh sync required
const STORAGE_KEY_DB_VERSION = 'SIGAP PKL SMKN 9 Official_db_schema_version';

function initStorage() {
  // Server adalah sumber kebenaran untuk daftar user.
  // initStorage hanya setup skeleton data non-user (logs, permissions).
  // User data SELALU diisi oleh syncDataFromServer(), bukan hardcoded.

  const savedVersion = localStorage.getItem(STORAGE_KEY_DB_VERSION);

  // Jika versi berubah ? hapus cache user lama agar server overwrite bersih
  // KECUALI: jika sudah ada sesi login � jangan wipe, biarkan sync dari server yang update
  if (savedVersion !== DB_SCHEMA_VERSION) {
    const hasAuth = localStorage.getItem(STORAGE_KEY_AUTH) || sessionStorage.getItem(STORAGE_KEY_AUTH);
    if (!hasAuth) {
      // Hanya wipe jika fresh install (belum pernah login)
      localStorage.removeItem(STORAGE_KEY_USERS);
      console.log('[SIGAP] Fresh install � user cache cleared for v' + DB_SCHEMA_VERSION);
    } else {
      console.log('[SIGAP] Version migration with active session � keeping user cache, server will overwrite');
    }
    localStorage.setItem(STORAGE_KEY_DB_VERSION, DB_SCHEMA_VERSION);
  }

  // Setup skeleton kosong untuk data non-user (tidak hapus yang sudah ada)
  if (!localStorage.getItem(STORAGE_KEY_ATTENDANCE)) {
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEY_PERMISSIONS)) {
    localStorage.setItem(STORAGE_KEY_PERMISSIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEY_APPROVAL_REPORTS)) {
    localStorage.setItem(STORAGE_KEY_APPROVAL_REPORTS, JSON.stringify([]));
  }

  // MIGRASI: bersihkan koordinat lama yang di luar radius 80km dari Malang
  // agar siswa tidak terjebak pakai koordinat salah dari sesi sebelumnya
  try {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
    if (Array.isArray(users)) {
      let changed = false;
      const haversineKm = (la1, lo1, la2, lo2) => {
        const R=6371, dLa=(la2-la1)*Math.PI/180, dLo=(lo2-lo1)*Math.PI/180;
        const a=Math.sin(dLa/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
        return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
      };
      users.forEach(u => {
        if (!u || u.role !== 'siswa') return;
        const lat = parseFloat(u.latitude_pkl), lng = parseFloat(u.longitude_pkl);
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;
        const dist = haversineKm(-7.9825, 112.6867, lat, lng);
        if (dist > 500) {
          // Koordinat tidak masuk akal untuk PKL di Jawa Timur � reset ke 0 agar geocode ulang
          console.warn(`[SIGAP] Reset koordinat siswa "${u.name}" (${lat},${lng}) � ${dist.toFixed(0)}km dari Malang`);
          u.latitude_pkl = 0;
          u.longitude_pkl = 0;
          changed = true;
        }
      });
      if (changed) localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }
  } catch(e) {}

  // Hapus duplikat user di localStorage berdasarkan ID
  try {
    const allUsers = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
    if (Array.isArray(allUsers)) {
      const dedupMap = new Map();
      allUsers.forEach(u => { if (u && u.id) dedupMap.set(String(u.id), u); });
      const deduped = Array.from(dedupMap.values());
      if (deduped.length !== allUsers.length) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(deduped));
        console.log('[SIGAP] Dedup: ' + (allUsers.length - deduped.length) + ' duplikat dihapus dari localStorage');
      }
    }
  } catch(e) {}

  console.log('[SIGAP] Storage init OK. DB Version:', savedVersion || DB_SCHEMA_VERSION, '| Users:', getUsers().length, '| Logs:', getLogs().length);
}

async function syncDataFromServer() {
  // Tentukan base URL: APK pakai HTTPS absolut, browser pakai relatif
  var _syncBase = (function() {
    var proto = window.location.protocol;
    var host  = window.location.hostname;
    var isCap = proto === 'capacitor:' || proto === 'ionic:' || host === 'localhost' || host === '127.0.0.1';
    return isCap ? window._SERVER_HTTPS : '';
  })();

  try {
    const rUsers = await fetch(_syncBase + '/api.php?action=get_users').catch(() => null);
    if (rUsers && rUsers.ok) {
      const resU = await rUsers.json();
      const userList = resU.data || resU.users;
      if (resU.success && Array.isArray(userList) && userList.length > 0) {
        // Server adalah sumber kebenaran � gunakan _mergeServerUsers
        // yang hanya preserve password lokal, semua field lain ikut server
        _mergeServerUsers(resU, false); // rerender=false, dilakukan di bawah
      }
    }
  } catch(e) { console.warn('[SIGAP] syncDataFromServer users error:', e); }

  try {
    const rLogs = await fetch(_syncBase + '/api.php?action=get_presensi').catch(() => null);
    if (rLogs && rLogs.ok) {
      const resL = await rLogs.json();
      const logsList = resL.data || resL.logs;
      if (resL.success && Array.isArray(logsList) && logsList.length > 0) {
        const localLogs = getLogs();
        const localMap = new Map(localLogs.map(l => [String(l.id), l]));
        const serverIds = new Set(logsList.map(sl => String(sl.id)));
        // Merge: update yang sudah ada + tambah yang baru dari server
        logsList.forEach(function(sl) {
          var existing = localMap.get(String(sl.id));
          // Preserve foto/image lokal karena server mungkin tidak simpan base64 besar
          var localImg = existing && existing.image ? existing.image : null;
          // Jika studentName kosong di server, coba ambil dari users lokal via user_id
          if (!sl.studentName && sl.user_id) {
            var allUsers = getUsers();
            var matchUser = allUsers.find(function(u) {
              return String(u.id) === String(sl.user_id) || u.username === sl.username;
            });
            if (matchUser) sl.studentName = matchUser.name;
          }
          localMap.set(String(sl.id), Object.assign({}, existing || {}, sl, {
            image: localImg || sl.image || sl.foto || null
          }));
        });
        // Pertahankan log lokal yang belum sampai ke server (baru dibuat < 5 menit)
        localLogs.forEach(function(ll) {
          if (serverIds.has(String(ll.id))) return; // sudah di server, skip
          var localTs = ll._localTs || 0;
          if ((Date.now() - localTs) < 300000) { // 5 menit grace period
            localMap.set(String(ll.id), ll); // pertahankan
          }
          // Lewat 5 menit dan tidak ada di server → kemungkinan gagal kirim, hapus
        });
        const merged = Array.from(localMap.values())
          .sort(function(a, b) { return new Date(b.date||0) - new Date(a.date||0); });
        saveLogs(merged);
      }
    }
  } catch(e) {}

  try {
    const rPerms = await fetch(_syncBase + '/api.php?action=get_permissions').catch(() => null);
    if (rPerms && rPerms.ok) {
      const resP = await rPerms.json();
      const permsList = resP.data || resP.permissions;
      if (resP.success && Array.isArray(permsList)) {
        // Merge server permissions ke lokal - tambahkan yang belum ada
        const localPerms = getPermissions();
        const serverIds = new Set(permsList.map(p => String(p.id)));
        // Update status permission yang sudah ada di server
        const merged = localPerms.map(function(lp) {
          const sp = permsList.find(function(x) { return String(x.id) === String(lp.id); });
          if (!sp) return lp;

          var localFinal  = lp.status === 'Disetujui' || lp.status === 'Ditolak';
          var serverFinal = sp.status === 'Disetujui' || sp.status === 'Ditolak';

          // ATURAN 1: Jika lokal sudah final DAN server juga sudah final -> ikut server
          //           (server = sumber kebenaran untuk status yang sudah dikonfirmasi)
          if (localFinal && serverFinal) {
            return Object.assign({}, lp, { status: sp.status });
          }

          // ATURAN 2: Jika lokal sudah final TAPI server masih Pending
          //           -> SELALU pertahankan status lokal (server belum commit / SSE terlambat)
          //           Ini fix utama: tidak ada batas waktu, status final tidak pernah mundur ke Pending
          if (localFinal && !serverFinal) return lp;

          // ATURAN 3: Lokal masih Pending, server sudah final -> ikut server
          if (!localFinal && serverFinal) {
            return Object.assign({}, lp, {
              status: sp.status,
              startDate: sp.startDate || sp.tanggal || lp.startDate,
              endDate: sp.endDate || sp.tanggal || lp.endDate,
              type: sp.type || lp.type,
              reason: sp.reason || sp.alasan || lp.reason,
              studentName: sp.studentName || sp.name || lp.studentName,
              supervisor: sp.supervisor || lp.supervisor
            });
          }

          // ATURAN 4: Keduanya Pending -> merge data terbaru dari server
          return Object.assign({}, lp, {
            status: sp.status || lp.status,
            startDate: sp.startDate || sp.tanggal || lp.startDate,
            endDate: sp.endDate || sp.tanggal || lp.endDate,
            type: sp.type || lp.type,
            reason: sp.reason || sp.alasan || lp.reason,
            studentName: sp.studentName || sp.name || lp.studentName,
            supervisor: sp.supervisor || lp.supervisor
          });
        });
                // Tambah permission dari server yang belum ada di lokal
        permsList.forEach(function(sp) {
          if (!merged.some(function(lp) { return String(lp.id) === String(sp.id); })) {
            merged.unshift({
              id: sp.id,
              type: sp.type || 'izin',
              startDate: sp.startDate || sp.tanggal || sp.created_at,
              endDate: sp.endDate || sp.tanggal || sp.created_at,
              reason: sp.reason || sp.alasan || '',
              status: sp.status || 'Pending',
              studentName: sp.studentName || sp.name || '',
              supervisor: sp.supervisor || ''
            });
          }
        });
        // Hapus permission lokal yang tidak ada di server (sudah dihapus/direset admin)
        // Server adalah sumber kebenaran untuk permissions
        const finalPerms = permsList.length === 0
          ? []  // Server kosong = admin reset → hapus semua lokal
          : merged.filter(function(lp) {
              // Pertahankan hanya yang ada di server atau baru dibuat lokal (< 60 detik)
              const inServer = serverIds.has(String(lp.id));
              const localTs = lp._localTs || 0;
              const isNew = (Date.now() - localTs) < 60000;
              return inServer || isNew;
            });
        savePermissions(finalPerms);
      }
    }
  } catch(e) {}

  // Auto-alpa: tandai siswa yang tidak absen di hari kerja lalu
  try { if (typeof _runAutoAlpa === 'function') _runAutoAlpa(); } catch(e) {}

  renderTodayStatus();
  renderStats();
  renderHistoryList();
  renderPermissionList();
  // Refresh jurnal dari server untuk siswa
  try {
    var _jBase = (function() {
      var proto=window.location.protocol,host=window.location.hostname;
      var isCap=proto==='capacitor:'||proto==='ionic:'||host==='localhost'||host==='127.0.0.1';
      return isCap ? window._SERVER_HTTPS : '';
    })();
    if (activeUser && activeUser.role === 'siswa') {
      fetch(_jBase + '/api.php?action=get_journals&user_id=' + encodeURIComponent(activeUser.id||'') + '&student_name=' + encodeURIComponent(activeUser.name||''))
        .then(function(r){ return r&&r.ok?r.json():null; })
        .then(function(res){
          if (!res || !res.success) return;
          var sj = res.journals || res.data || [];
          if (!Array.isArray(sj) || sj.length === 0) return;
          var local = getJournals();
          var lmap = new Map(local.map(function(j){ return [String(j.id), j]; }));
          sj.forEach(function(s){
            var ex = lmap.get(String(s.id));
            lmap.set(String(s.id), Object.assign({}, s, { image: (ex&&ex.image)||s.image||null }));
          });
          saveJournals(Array.from(lmap.values()).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); }));
          if (typeof renderJournalTab === 'function') renderJournalTab();
          if (typeof renderHistoryList === 'function') renderHistoryList();
        }).catch(function(){});
    }
  } catch(e) {}  // Selalu refresh tabel user � bukan hanya saat tab admin aktif
  if (typeof renderAdminUsersTable === 'function') renderAdminUsersTable();
  if (typeof renderPendingUserApprovals === 'function') renderPendingUserApprovals();
  // Refresh tab persetujuan izin untuk guru dan admin
  if (typeof renderGuruApprovalTab === 'function') renderGuruApprovalTab();
  if (document.getElementById('tab-admin')?.classList.contains('active')) {
    renderAdminDashboard();
  }

  // Auto-alpa setelah sync selesai — pastikan data sudah fresh dari server
  setTimeout(function() {
    try { if (typeof _runAutoAlpa === 'function') _runAutoAlpa(); } catch(e) {}
  }, 300);
}

async function refreshGuruTabFeed() {
  showToast('Memperbarui feed presensi dari server...', 'info');
  await syncDataFromServer();
  renderGuruLogPresensiTab();
  showToast('Feed Log Presensi berhasil diperbarui!', 'success');
}

async function refreshAdminDashboardFeed() {
  showToast('Memperbarui data dashboard real-time...', 'info');
  await syncDataFromServer();
  renderAdminDashboard();
  showToast('Data Dashboard berhasil diperbarui!', 'success');
}

async function refreshPermissionApprovalsFeed() {
  showToast('Memindai & memperbarui pengajuan izin siswa...', 'info');

  try {
    let rPerms = await fetch(apiUrl('api.php?action=get_permissions')).catch(() => null);
    if (!rPerms || !rPerms.ok) {
      rPerms = await fetch('/api/permissions').catch(() => null);
    }

    if (rPerms && rPerms.ok) {
      const resP = await rPerms.json();
      const serverPerms = resP.permissions || resP.data || [];
      if (Array.isArray(serverPerms) && serverPerms.length > 0) {
        const localPerms = getPermissions();
        serverPerms.forEach(sp => {
          const idx = localPerms.findIndex(lp => lp.id === sp.id || (lp.studentName === sp.studentName && lp.startDate === sp.startDate && lp.type === sp.type));
          if (idx !== -1) {
            if (sp.status && s(p.status || '').toLowerCase() !== 'pending') {
              localPerms[idx].status = sp.status;
            }
          } else {
            localPerms.push(sp);
          }
        });
        savePermissions(localPerms);
      }
    }
  } catch(e) {
    console.warn('Refresh permissions failed:', e);
  }

  renderGuruLogPresensiTab();
  renderAdminDashboard();
  renderPendingUserApprovals();
  showToast('Daftar pengajuan izin pending berhasil diperbarui!', 'success');
}

async function refreshStudentPermissionFeed() {
  showToast('Memindai status pengajuan izin/sakit dari server...', 'info');

  try {
    let rPerms = await fetch('/api/permissions').catch(() => null);
    if (!rPerms || !rPerms.ok) {
      rPerms = await fetch('api.php?action=get_permissions').catch(() => null);
    }

    if (rPerms && rPerms.ok) {
      const resP = await rPerms.json();
      const serverPerms = resP.permissions || resP.data || [];
      if (Array.isArray(serverPerms) && serverPerms.length > 0) {
        const localPerms = getPermissions();
        serverPerms.forEach(sp => {
          const idx = localPerms.findIndex(lp => lp.id === sp.id || (lp.studentName === sp.studentName && lp.startDate === sp.startDate && lp.type === sp.type));
          if (idx !== -1) {
            localPerms[idx] = sp;
          } else {
            localPerms.push(sp);
          }
        });
        savePermissions(localPerms);
      }
    }
  } catch(e) {
    console.warn('Student refresh permissions failed:', e);
  }

  renderPermissionList();
  showToast('Status pengajuan izin/sakit terbaru berhasil dimuat!', 'success');
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
  const appContent = document.querySelector('.app-content');
  if (appContent) appContent.scrollTop = 0;
  const appElem = document.getElementById('app');
  if (appElem) appElem.scrollTop = 0;
  const mainElem = document.querySelector('.main-content');
  if (mainElem) mainElem.scrollTop = 0;
}

function checkAuthSession() {
  var loginOverlay = document.getElementById('loginScreen');
  try {
    var savedUser = localStorage.getItem(STORAGE_KEY_AUTH);

    // Cek apakah sesi localStorage ini dari user yang memilih "Ingat Saya"
    // Jika tidak ada flag remember, sesi localStorage dianggap tidak valid untuk auto-login
    if (savedUser && !localStorage.getItem('SIGAP_PKL_K9_remember_v1')) {
      // Pindahkan ke sessionStorage agar tetap valid di tab ini saja, bukan auto-login di tab baru
      try {
        sessionStorage.setItem(STORAGE_KEY_AUTH, savedUser);
        localStorage.removeItem(STORAGE_KEY_AUTH);
      } catch(e) {}
      savedUser = null; // jangan auto-login dari localStorage tanpa flag remember
    }

    if (!savedUser) savedUser = sessionStorage.getItem(STORAGE_KEY_AUTH);

    if (savedUser) {
      var parsedUser = null;
      try { parsedUser = JSON.parse(savedUser); } catch(e) {}

      if (parsedUser && (parsedUser.id || parsedUser.username)) {
        // Sembunyikan login sementara, tampilkan splash
        if (loginOverlay) { loginOverlay.classList.add('hidden'); loginOverlay.style.display = 'none'; }
        var loadingEl = document.getElementById('splashScreen');
        if (loadingEl) {
          loadingEl.classList.remove('hide');
          loadingEl.style.opacity = '1'; loadingEl.style.visibility = 'visible'; loadingEl.style.pointerEvents = 'auto';
        }

        var _authBase = (function() {
          var p = window.location.protocol; var h = window.location.hostname;
          return (p === 'capacitor:' || p === 'ionic:' || h === 'localhost' || h === '127.0.0.1') ? window._SERVER_HTTPS : '';
        })();
        var _ctrl = new AbortController();
        var _tid = setTimeout(function() {
          _ctrl.abort();
          // Timeout — izinkan login offline dengan data lokal
          _proceedWithLocalSession(parsedUser, loginOverlay, loadingEl);
        }, 4000); // 4 detik cukup untuk endpoint ringan

        // Pakai endpoint verify_user (ringan: hanya SELECT 5 kolom, bukan get_users 300+ record)
        var _verifyUrl = _authBase + '/api.php?action=verify_user';
        fetch(_verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: parsedUser.id, username: parsedUser.username }),
          signal: _ctrl.signal
        })
          .then(function(r) { clearTimeout(_tid); return r && r.ok ? r.json() : null; })
          .then(function(res) {
            if (res && res.success && res.valid) {
              // Akun valid & aktif — lanjutkan dengan data lokal
              _proceedWithLocalSession(parsedUser, loginOverlay, loadingEl);
            } else if (res && !res.success) {
              // Server eksplisit menolak (akun nonaktif/tidak ditemukan) — paksa login ulang
              localStorage.removeItem(STORAGE_KEY_AUTH);
              sessionStorage.removeItem(STORAGE_KEY_AUTH);
              localStorage.removeItem('SIGAP_PKL_K9_remember_v1');
              activeUser = null;
              if (loadingEl) {
                loadingEl.classList.add('hide');
                loadingEl.style.pointerEvents = 'none';
                loadingEl.style.display = 'none';
                loadingEl.style.visibility = 'hidden';
                loadingEl.style.opacity = '0';
              }
              clearLoginForm();
              if (loginOverlay) { loginOverlay.classList.remove('hidden'); loginOverlay.style.display = 'flex'; }
              console.warn('[SIGAP] Session rejected: user inactive or not found on server');
            } else {
              // res = null → server tidak bisa dihubungi — fallback ke sesi lokal (offline mode)
              console.warn('[SIGAP] verify_user returned null — using local session (offline)');
              _proceedWithLocalSession(parsedUser, loginOverlay, loadingEl);
            }
          })
          .catch(function(e) {
            clearTimeout(_tid);
            console.warn('[SIGAP] Auth check error:', e && e.message, '— using local session');
            _proceedWithLocalSession(parsedUser, loginOverlay, loadingEl);
          });
        return;
      }
    }
  } catch(e) { console.warn('[SIGAP] checkAuthSession exception:', e); }

  clearLoginForm();
  if (loginOverlay) { loginOverlay.classList.remove('hidden'); loginOverlay.style.display = 'flex'; }
}

function _proceedWithLocalSession(user, loginOverlay, loadingEl) {
  activeUser = user;
  if (localStorage.getItem(STORAGE_KEY_AUTH)) {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
  } else {
    sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
  }
  if (loadingEl) {
    loadingEl.classList.add('hide');
    // KRITIS: reset inline style agar splash tidak tetap memblokir klik
    // style.pointerEvents='auto' yang di-set sebelumnya mengalahkan class CSS
    loadingEl.style.pointerEvents = 'none';
    loadingEl.style.display = 'none';
    loadingEl.style.visibility = 'hidden';
    loadingEl.style.opacity = '0';
  }
  if (loginOverlay) { loginOverlay.classList.add('hidden'); loginOverlay.style.display = 'none'; }
  applyUserInterface(activeUser);
  switchTab('home');
  scrollToTop();
  setTimeout(_ensureMonitoringBtn, 400);
  setTimeout(_ensureMonitoringBtn, 1500);
  setTimeout(function() { if (typeof _startMonitoringBtnWatch === 'function') _startMonitoringBtnWatch(); }, 500);
}

function unlockAppSystem() {
  try {
    document.body.style.overflow = 'auto';
    document.body.style.pointerEvents = 'auto';

    ['cameraModal', 'qrScannerModal', 'imagePreviewModal'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      }
    });

    const loginOverlay = document.getElementById('loginScreen');
    let savedUser = localStorage.getItem(STORAGE_KEY_AUTH);
    if (!savedUser) {
      savedUser = sessionStorage.getItem(STORAGE_KEY_AUTH);
    }
    if (savedUser) {
      try {
        activeUser = JSON.parse(savedUser);
        if (activeUser && (activeUser.id || activeUser.username)) {
          if (loginOverlay) {
            loginOverlay.classList.add('hidden');
            loginOverlay.style.display = 'none';
          }
          applyUserInterface(activeUser);
          switchTab('home');
          scrollToTop();
          setTimeout(_ensureMonitoringBtn, 400);
          setTimeout(_ensureMonitoringBtn, 1500);
          setTimeout(function() { if (typeof _startMonitoringBtnWatch === 'function') _startMonitoringBtnWatch(); }, 500);
        }
      } catch(e) {}
    } else {
      clearLoginForm();
      if (loginOverlay) {
        loginOverlay.classList.remove('hidden');
        loginOverlay.style.display = 'flex';
      }
    }

    showToast('Fitur & Layar Aplikasi Berhasil Diberdayakan / Di-Unlock!', 'success');
  } catch(e) {
    console.error('Unlock error:', e);
  }
}
window.unlockAppSystem = unlockAppSystem;

function resetAdminPassword(newPassword = 'sampurna01') {
  const users = getUsers();
  const adminIdx = users.findIndex(u => u && (u.role === 'admin' || u.username === 'admin'));
  if (adminIdx !== -1) {
    users[adminIdx].password = newPassword;
  } else {
    users.push({
      id: 3,
      username: "admin",
      nomor_induk: "00000000",
      password: newPassword,
      role: "admin",
      name: "Master Administrator",
      subtext: "Master Admin Sekolah",
      school: "SMK Negeri 9 Malang",
      pklLocation: "SMK Negeri 9 Malang",
      latitude_pkl: -6.1668,
      longitude_pkl: 106.8340,
      supervisor: "Administrator Utama",
      avatar: "img/admin_avatar.jpg"
    });
  }
  saveUsers(users);
  showToast(`Password Master Admin berhasil di-reset ke: "${newPassword}"`, 'success');
  console.log(`? Admin password reset to: ${newPassword}`);
  return true;
}
window.resetAdminPassword = resetAdminPassword;

function setLoginRole(role) {
  currentLoginRole = role;
  const tabSiswa = document.getElementById('tabLoginSiswa');
  const tabGuru = document.getElementById('tabLoginGuru');
  const lblUsername = document.getElementById('lblUsername');
  const inputUsername = document.getElementById('loginUsername');

  if (role === 'guru') {
    if (tabGuru) tabGuru.classList.add('active');
    if (tabSiswa) tabSiswa.classList.remove('active');
    if (lblUsername) lblUsername.innerHTML = `<i class="fa-solid fa-id-card"></i> NIP / Username Guru / Admin`;
    if (inputUsername) inputUsername.placeholder = "Contoh: guru (Pak Gigih) atau ahmad (Pak Ahmad)";
  } else {
    if (tabSiswa) tabSiswa.classList.add('active');
    if (tabGuru) tabGuru.classList.remove('active');
    if (lblUsername) lblUsername.innerHTML = `<i class="fa-solid fa-id-card"></i> NISN / Username Siswa`;
    if (inputUsername) inputUsername.placeholder = "Contoh: budi, siti, rudi, dewi, eko";
  }
}

function togglePasswordVisibility() {
  const pwdInput = document.getElementById('loginPassword');
  const eyeIcon = document.getElementById('pwdEyeIcon');
  if (pwdInput) {
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye-slash';
    } else {
      pwdInput.type = 'password';
      if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye';
    }
  }
}

function fillDemoCredentials(usernameKey, role = 'guru') {
  if (role) setLoginRole(role);
  const inputUsername = document.getElementById('loginUsername');
  const inputPassword = document.getElementById('loginPassword');

  if (inputUsername) inputUsername.value = usernameKey;
  if (inputPassword) inputPassword.value = (usernameKey === 'admin') ? 'sampurna01' : '123';
}

function quickDemoLogin(usernameKey, role = 'guru') {
  fillDemoCredentials(usernameKey, role);
  
  const users = getUsers();
  let user = users.find(u => u.username === usernameKey || (u.name && u.name.toLowerCase().includes(usernameKey)));
  if (!user) {
    if (usernameKey === 'admin') user = DEFAULT_USERS_LIST[2];
    else if (usernameKey === 'guru') user = DEFAULT_USERS_LIST[1];
    else if (usernameKey === 'ahmad') user = DEFAULT_USERS_LIST[5];
    else if (usernameKey === 'budi') user = DEFAULT_USERS_LIST[0];
  }

  if (user) {
    performUserLogin(user);
  } else {
    handleLoginSubmit(new Event('submit'));
  }
}

async function handleLoginSubmit(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }

  const inputUserEl = document.getElementById('loginUsername');
  const inputPassEl = document.getElementById('loginPassword');
  const submitBtn = document.querySelector('#loginForm button[type="submit"]');

  const usernameVal = inputUserEl ? inputUserEl.value.trim() : '';
  const passwordVal = inputPassEl ? inputPassEl.value.trim() : '';

  if (!usernameVal || !passwordVal) {
    showToast('Mohon isi Username / NISN / NIP dan Kata Sandi!', 'error');
    return false;
  }

  // Visual loading feedback
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses Login...`;
  }

  const restoreBtn = () => {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  };

  const usernameLower = usernameVal.toLowerCase();
  const inputClean = usernameLower.replace(/\s+/g, '');

  // 1. Instantly check Master Admin & Local Storage for zero-latency login
  const users = getUsers();
  let foundUser = users.find(u => {
    if (!u) return false;
    const uName = (u.username || '').toString().toLowerCase();
    const uNip = (u.nomor_induk || '').toString().toLowerCase().replace(/\s+/g, '');
    const uFullName = (u.name || '').toString().toLowerCase();

    const matchUser = (uName === usernameLower || uName === inputClean);
    const matchNIP = (uNip === inputClean || uNip === usernameLower || (u.nomor_induk && u.nomor_induk.toString().toLowerCase() === usernameLower));
    const matchName = uFullName && usernameLower.length > 2 && (uFullName.includes(usernameLower) || usernameLower.includes(uFullName));

    const isGuruAlias = (usernameLower === 'guru' || usernameLower === 'pembimbing') && u.role === 'guru';
    const isAdminAlias = (usernameLower === 'admin' || usernameLower === 'administrator') && u.role === 'admin';
    const isSiswaAlias = (usernameLower === 'siswa' || usernameLower === 'murid') && u.role === 'siswa';

    return (matchUser || matchNIP || matchName || isGuruAlias || isAdminAlias || isSiswaAlias);
  });

  if (!foundUser && (usernameLower === 'admin' || inputClean === 'admin' || usernameLower === 'administrator')) {
    foundUser = DEFAULT_USERS_LIST[0]; // Master Administrator fallback
  }

  // Fast-track Master Admin or valid local password
  if (foundUser) {
    // Password validation based on role
    let validPwd = foundUser.password || '123';
    let isPassValid = false;
    
    if (foundUser.username === 'admin' || foundUser.role === 'admin') {
      // ADMIN: Hanya password 'sampurna01' yang berlaku
      validPwd = 'sampurna01';
      isPassValid = (passwordVal === 'sampurna01');
    } else {
      // Siswa & Guru: cek password lokal, tapi jika tidak cocok langsung lanjut ke server
      // (jangan shortcut dengan '123'/'123456' agar password yang diubah admin langsung berlaku)
      isPassValid = (
        passwordVal === validPwd
      );
    }

    // Jika siswa/guru dan password lokal tidak cocok, skip local fast-track
    // dan biarkan kode jatuh ke server API login di bawah
    // (password di localStorage mungkin sudah diupdate server tapi belum tersync lokal)
    if (!isPassValid && foundUser && foundUser.role !== 'admin' && foundUser.username !== 'admin') {
      // fall-through ke server API (tidak return di sini)
    } else if (isPassValid) {
      // Validasi role sesuai tab login — admin bisa login dari tab manapun
      const userRole = foundUser.role || 'siswa';
      const isAdminUser = (userRole === 'admin' || foundUser.username === 'admin');

      if (!isAdminUser && currentLoginRole === 'siswa' && userRole === 'guru') {
        restoreBtn();
        showToast(`Login ditolak! Akun Guru tidak dapat login di tab Siswa. Silakan pilih tab "Guru / Pembimbing".`, 'error');
        return false;
      }

      if (!isAdminUser && currentLoginRole === 'guru' && userRole === 'siswa') {
        restoreBtn();
        showToast(`Login ditolak! Akun Siswa tidak dapat login di tab Guru. Silakan pilih tab "Siswa".`, 'error');
        return false;
      }
      
      if (foundUser.status === 'pending') {
        restoreBtn();
        showToast(`Akun Anda (${foundUser.name}) masih dalam status Menunggu Persetujuan Master Admin.`, 'warning');
        return false;
      }
      restoreBtn();
      performUserLogin(foundUser);
      return false;
    }
  }

  // 2. Server API login attempt with 4s timeout fallback
  try {
    const fetchApi = async (url) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameVal, password: passwordVal }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) return await res.json();
      } catch (e) {
        clearTimeout(timeoutId);
      }
      return null;
    };

    const isPyServer = location.port === '8000' || location.port === '8088';
    const primaryUrl = isPyServer ? '/api/login' : apiUrl('api.php?action=login');
    const secondaryUrl = isPyServer ? apiUrl('api.php?action=login') : '/api/login';

    let data = await fetchApi(primaryUrl);
    if (!data) {
      data = await fetchApi(secondaryUrl);
    }

    if (data && data.success && data.user) {
      // Validasi role — admin bisa login dari tab manapun
      const userRole = data.user.role || 'siswa';
      const isAdminUser = (userRole === 'admin' || data.user.username === 'admin');

      if (!isAdminUser && currentLoginRole === 'siswa' && userRole === 'guru') {
        restoreBtn();
        showToast(`Login ditolak! Akun Guru tidak dapat login di tab Siswa. Silakan pilih tab "Guru / Pembimbing".`, 'error');
        return false;
      }

      if (!isAdminUser && currentLoginRole === 'guru' && userRole === 'siswa') {
        restoreBtn();
        showToast(`Login ditolak! Akun Siswa tidak dapat login di tab Guru. Silakan pilih tab "Siswa".`, 'error');
        return false;
      }
      
      const currentUsers = getUsers();
      const uIdx = currentUsers.findIndex(u => u.username === data.user.username || u.nomor_induk === data.user.nomor_induk || u.id === data.user.id);
      if (uIdx !== -1) {
        // Simpan password yang berhasil login agar offline login tetap bisa
        currentUsers[uIdx] = Object.assign({}, currentUsers[uIdx], data.user, {
          password: passwordVal
        });
      } else {
        currentUsers.push(Object.assign({}, data.user, { password: passwordVal }));
      }
      saveUsers(currentUsers);
      restoreBtn();
      performUserLogin(data.user);
      return false;
    } else if (data && data.message) {
      restoreBtn();
      showToast(data.message, 'error');
      return false;
    }
  } catch (err) {
    console.warn('API login failed:', err);
  }

  restoreBtn();

  if (foundUser) {
    const userRole = foundUser.role || 'siswa';
    if (userRole === 'admin') {
      showToast('Kata Sandi salah! Password Admin yang benar: sampurna01', 'error');
    } else {
      showToast('Kata Sandi salah! Periksa password Anda atau hubungi Master Admin.', 'error');
    }
  } else {
    showToast('Pengguna tidak ditemukan! Periksa NIP / NISN / Username Guru & Admin Anda.', 'error');
  }
  return false;
}

function updateRememberMeAutocompleteState() {
  const rememberMeEl = document.getElementById('rememberMe');
  const loginForm = document.getElementById('loginForm');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');

  if (!loginForm || !loginUsername || !loginPassword) return;

  const isChecked = rememberMeEl ? rememberMeEl.checked : false;

  if (isChecked) {
    loginForm.setAttribute('autocomplete', 'on');
    loginUsername.setAttribute('autocomplete', 'username');
    loginUsername.setAttribute('name', 'username');
    loginUsername.removeAttribute('data-lpignore');
    loginUsername.removeAttribute('data-form-type');

    loginPassword.setAttribute('autocomplete', 'current-password');
    loginPassword.setAttribute('name', 'password');
    loginPassword.removeAttribute('data-lpignore');
    loginPassword.removeAttribute('data-form-type');
  } else {
    loginForm.setAttribute('autocomplete', 'off');
    loginUsername.setAttribute('autocomplete', 'off');
    loginUsername.setAttribute('name', 'loginUsername_off');
    loginUsername.setAttribute('data-lpignore', 'true');
    loginUsername.setAttribute('data-form-type', 'other');

    loginPassword.setAttribute('autocomplete', 'new-password');
    loginPassword.setAttribute('name', 'loginPassword_off');
    loginPassword.setAttribute('data-lpignore', 'true');
    loginPassword.setAttribute('data-form-type', 'other');

    loginUsername.value = '';
    loginPassword.value = '';
  }
}

function clearLoginForm() {
  updateRememberMeAutocompleteState();
}

function performUserLogin(user, rememberMeOverride) {
  _targetLocationLocked = false; // Reset lock saat login baru dimulai
  _guruTargetLocked = false;     // Reset guru target lock saat login baru
  _guruTargetStudentId = null;
  _geocodeAttemptedFor = null; // Reset geocode attempt flag saat login baru
  if (!user) return;

  // Always re-fetch fresh user data from users list to ensure all fields (kelas, etc.) are current
  const freshUsers = getUsers();
  const freshUser = freshUsers.find(u => u.id === user.id || u.username === user.username);
  if (freshUser) {
    activeUser = Object.assign({}, freshUser, {
      password: freshUser.password
    });
  } else {
    activeUser = user;
  }

  // Bersihkan proposed_* fields jika status sudah kembali approved (pengajuan pernah ditolak admin)
  // Ini mencegah geofencing acak saat login ulang setelah pengajuan ditolak
  if (activeUser.role === 'siswa' && activeUser.status === 'approved') {
    var _hadProposed = activeUser.proposed_latitude_pkl || activeUser.proposed_longitude_pkl;
    if (_hadProposed) {
      delete activeUser.proposed_pkl_location;
      delete activeUser.proposed_latitude_pkl;
      delete activeUser.proposed_longitude_pkl;
      delete activeUser.edit_requested_by;
      delete activeUser.gps_accuracy;
      // Update localStorage agar bersih
      var _lu2 = getUsers();
      var _li2 = _lu2.findIndex(function(u){ return u.id === activeUser.id || u.username === activeUser.username; });
      if (_li2 !== -1) {
        delete _lu2[_li2].proposed_pkl_location;
        delete _lu2[_li2].proposed_latitude_pkl;
        delete _lu2[_li2].proposed_longitude_pkl;
        delete _lu2[_li2].edit_requested_by;
        delete _lu2[_li2].gps_accuracy;
        saveUsers(_lu2);
      }
      console.log('[SIGAP] Login: proposed_* fields dibersihkan dari localStorage (pengajuan sudah tidak pending)');
    }
  }

  const rememberMeEl = document.getElementById('rememberMe');
  const isRemember = (typeof rememberMeOverride === 'boolean') ? rememberMeOverride : (rememberMeEl ? rememberMeEl.checked : false);

  try {
    if (isRemember) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
      localStorage.setItem('SIGAP_PKL_K9_remember_v1', '1');  // tandai: user memilih "ingat saya"
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
    } else {
      sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem('SIGAP_PKL_K9_remember_v1');  // hapus flag agar tidak auto-login
    }
    localStorage.removeItem('SIGAP PKL SMKN 9 Official_remembered_credentials');
  } catch(e) {}

  clearLoginForm();

  const loginOverlay = document.getElementById('loginScreen');
  if (loginOverlay) {
    loginOverlay.classList.add('hidden');
    loginOverlay.style.display = 'none';
  }

  try {
    applyUserInterface(user);
  } catch(e) {
    console.error('UI apply error:', e);
  }

  showToast(`Selamat Datang, ${user.name || user.username || 'User'}!`, 'success');

  // Auto-alpa: cek hari kerja yang belum ada absensi
  setTimeout(function() { if (typeof _runAutoAlpa === 'function') _runAutoAlpa(); }, 2000);

  // Reconnect SSE setelah login
  try {
    if (sseEventSource) { sseEventSource.close(); sseEventSource = null; }
    setTimeout(connectRealtimeSSE, 1000);
  } catch(e) {}

  // Paksa sync data dari server setelah login agar dashboard selalu fresh
  // Di APK: tunggu sync selesai dulu sebelum render (pakai setTimeout sebagai non-blocking)
  try {
    var _isCapLogin = (function() {
      var p = window.location.protocol; var h = window.location.hostname;
      return p === 'capacitor:' || p === 'ionic:' || h === 'localhost' || h === '127.0.0.1';
    })();
    if (_isCapLogin) {
      // APK: fetch users dari server, merge via _mergeServerUsers, lalu render ulang
      fetch(apiUrl('api.php?action=get_users'))
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(res) {
          if (!res || !res.success) return;
          _mergeServerUsers(res, false); // simpan ke localStorage
          console.log('[SIGAP] APK post-login sync: ' + (res.users||res.data||[]).length + ' users dari server');
          // Render dengan delay kecil agar activeUser sudah fully set
          setTimeout(function() {
            renderAdminUsersTable && renderAdminUsersTable();
            renderPendingUserApprovals && renderPendingUserApprovals();
            renderTodayStatus && renderTodayStatus();
            renderStats && renderStats();
          }, 100);
        })
        .catch(function(e) { console.warn('[SIGAP] APK post-login sync failed:', e); });
    } else {
      syncDataFromServer();
    }
  } catch(e) {}

  try {
    switchTab('home');
    scrollToTop();
    // Pastikan tombol & label sesuai role - multi-delay untuk APK timing
    setTimeout(_ensureMonitoringBtn, 200);
    setTimeout(_ensureMonitoringBtn, 500);
    setTimeout(_ensureMonitoringBtn, 1000);
    setTimeout(_ensureMonitoringBtn, 2000);
    setTimeout(_ensureMonitoringBtn, 3500);
    // Interval watch: terus check sampai tombol confirmed ada
    setTimeout(function() { if (typeof _startMonitoringBtnWatch === 'function') _startMonitoringBtnWatch(); }, 300);
  } catch(e) {
    console.error('Tab switch error:', e);
  }
}

function handleLogout() {
  try {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    sessionStorage.removeItem(STORAGE_KEY_AUTH);
    localStorage.removeItem('SIGAP PKL SMKN 9 Official_remembered_credentials');
    localStorage.removeItem('SIGAP_PKL_K9_remember_v1');  // hapus flag remember saat logout
  } catch(e) {}
  activeUser = null;
  _targetLocationLocked = false; // Reset lock saat logout
  _guruTargetLocked = false;
  _guruTargetStudentId = null;
  _geocodeAttemptedFor = null;
  TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: 'SMK Negeri 9 Malang', allowedRadiusMeters: 350 }; // Reset ke default
  // Reset data-role agar tombol absen disembunyikan saat logout
  document.body.removeAttribute('data-role');

  clearLoginForm();

  const loginOverlay = document.getElementById('loginScreen');
  if (loginOverlay) {
    loginOverlay.classList.remove('hidden');
    loginOverlay.style.display = '';
  }
  showToast('Anda telah keluar dari aplikasi', 'info');
}

// -- Helper: terapkan TARGET_LOCATION dari objek siswa (untuk guru) ---------
function _applyGuruTargetFromStudent(student) {
  if (!student) return;

  const pklName = student.pklLocation || 'Lokasi PKL';
  const lat = parseFloat(student.latitude_pkl);
  const lng = parseFloat(student.longitude_pkl);

  const haversineKm = (la1, lo1, la2, lo2) => {
    const R = 6371, dLa=(la2-la1)*Math.PI/180, dLo=(lo2-lo1)*Math.PI/180;
    const a = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };
  const distFromMalang = (!isNaN(lat) && !isNaN(lng)) ? haversineKm(-7.9825, 112.6867, lat, lng) : 9999;
  const isValid = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && distFromMalang < 500;

  // Kunci guru target dulu — cegah polling mereset peta
  _guruTargetStudentId = student.id || student.username;
  _guruTargetLocked = true;

  if (isValid) {
    // Koordinat DB valid — force-set langsung
    _forceSetTargetLocation({ lat: lat, lng: lng, name: pklName, allowedRadiusMeters: 350 });
    _updateMapUIAndReset();
    console.log('[SIGAP] Guru target valid:', pklName, lat, lng);
  } else if (pklName) {
    // Koordinat tidak valid — cek geocode cache dulu
    var _gFull  = pklName.toLowerCase().trim();
    var _gShort = (pklName.indexOf(',') > 5) ? pklName.split(',')[0].trim().toLowerCase() : _gFull;
    var _gHit   = _geocodeNameCache[_gFull] || _geocodeNameCache[_gShort];
    if (_gHit && _gHit.lat && _gHit.lng) {
      // Cache hit: langsung pakai, peta stabil
      _forceSetTargetLocation({ lat: _gHit.lat, lng: _gHit.lng, name: pklName, allowedRadiusMeters: 350 });
      _updateMapUIAndReset();
      console.log('[SIGAP] Guru target (cache):', pklName, _gHit.lat, _gHit.lng);
    } else {
      // Tidak di cache: tampilkan nama, set sementara ke SMKN9
      // Geocode background — guruTargetLocked=true mencegah override peta
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
// -- Dipanggil saat guru ganti pilihan siswa di dropdown ----------------------
function switchGuruTargetStudent(studentIdOrUsername) {
  if (!studentIdOrUsername) return;
  // Reset lock agar _applyGuruTargetFromStudent bisa set target baru
  _guruTargetLocked = false;
  _guruTargetStudentId = null;

  const users = getUsers();
  const student = users.find(u =>
    String(u.id) === String(studentIdOrUsername) ||
    u.username === studentIdOrUsername
  );

  if (!student) {
    showToast('Siswa tidak ditemukan.', 'error');
    return;
  }

  _applyGuruTargetFromStudent(student);
  showToast(`?? Titik target: ${student.pklLocation || student.name}`, 'info');
}

function applyUserInterface(user) {
  // Gunakan activeUser jika tersedia — lebih fresh dari parameter
  var _userForGeo = (typeof activeUser !== 'undefined' && activeUser && activeUser.id) ? activeUser : user;
  // Synchronize dynamic TARGET_LOCATION from logged-in user's PKL data
  applyTargetLocationFromUser(_userForGeo);

  if (user.role === 'guru' && user.username !== 'admin') {
    const supervisedStudents = getSupervisedStudentsOnly();

    // Tampilkan / sembunyikan dropdown selector siswa
    const selectorDiv = document.getElementById('guruStudentTargetSelector');
    const selectorEl  = document.getElementById('selectGuruTargetStudent');

    if (supervisedStudents.length > 0 && selectorDiv && selectorEl) {
      // Isi dropdown dengan daftar siswa bimbingan
      selectorEl.innerHTML = '';
      supervisedStudents.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id || s.username;
        const kelasInfo = s.kelas ? ` � ${s.kelas}` : '';
        const pklInfo   = s.pklLocation ? ` � ${s.pklLocation}` : '';
        opt.textContent = `${s.name}${kelasInfo}${pklInfo}`;
        selectorEl.appendChild(opt);
      });

      // Tampilkan dropdown (hanya untuk guru)
      selectorDiv.style.display = 'block';

      // LOCK GUARD: jika guru sudah punya target terkunci, jangan reset dari polling
      if (_guruTargetLocked && _guruTargetStudentId) {
        // Restore dropdown ke pilihan guru yang sudah dikunci
        selectorEl.value = _guruTargetStudentId;
        // Jangan panggil _applyGuruTargetFromStudent — target sudah terkunci
      } else {
        // Login pertama kali: set ke siswa pertama lalu kunci
        const firstStudent = supervisedStudents[0];
        selectorEl.value = firstStudent.id || firstStudent.username;
        _applyGuruTargetFromStudent(firstStudent);
      }

    } else if (selectorDiv) {
      // Guru tanpa siswa bimbingan � sembunyikan dropdown, pakai SMKN9
      selectorDiv.style.display = 'none';
      TARGET_LOCATION = {
        lat: -7.9825, lng: 112.6867,
        name: 'SMK Negeri 9 Malang',
        allowedRadiusMeters: 350
      };
      showToast('Belum ada siswa dalam kelompok bimbingan Anda.', 'info');
    }
  } else {
    // Siswa / admin � sembunyikan dropdown
    const selectorDiv = document.getElementById('guruStudentTargetSelector');
    if (selectorDiv) selectorDiv.style.display = 'none';
  }

  // Hanya update radius jika belum dikunci (siswa aktif)
  if (!_targetLocationLocked) TARGET_LOCATION.allowedRadiusMeters = 350;

  const targetMapName = document.getElementById('targetMapName');
  const radiusMetersText = document.getElementById('radiusMetersText');
  if (targetMapName) targetMapName.textContent = TARGET_LOCATION.name;
  if (radiusMetersText) radiusMetersText.textContent = `${TARGET_LOCATION.allowedRadiusMeters} Meter`;

  const headerAvatarImg = document.getElementById('headerAvatarImg');
  const userName = document.getElementById('userName');
  const userSubtext = document.getElementById('userSubtext');
  const adminNavBtn = document.getElementById('adminNavBtn');

  if (!user.avatar) {
    user.avatar = (user.username === 'admin' || user.role === 'admin') ? 'img/admin_avatar.jpg' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250';
  }

  if (headerAvatarImg) headerAvatarImg.src = user.avatar;
  if (userName) userName.textContent = user.name;

  if (userSubtext) {
    if (user.username === 'admin' || user.role === 'admin') {
      userSubtext.innerHTML = `<i class="fa-solid fa-user-gear"></i> Master Administrator`;
    } else if (user.role === 'guru') {
      userSubtext.innerHTML = `<i class="fa-solid fa-user-tie"></i> NIP: ${user.nomor_induk} � Guru Pembimbing`;
    } else {
      userSubtext.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${user.subtext || 'Siswa PKL'}`;
    }
  }

  const profileAvatarImg = document.getElementById('profileAvatarImg');
  const profileName = document.getElementById('profileName');
  const profileSubText = document.getElementById('profileSubText');
  const profileSchool = document.getElementById('profileSchool');
  const profileStatusBadge = document.getElementById('profileStatusBadge');

  if (profileAvatarImg) profileAvatarImg.src = user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250';
  if (profileName) profileName.textContent = user.name;

  if (profileSubText) {
    if (user.username === 'admin' || user.role === 'admin') {
      profileSubText.textContent = `Master Administrator`;
    } else if (user.role === 'guru') {
      profileSubText.textContent = `NIP: ${user.nomor_induk} � Guru Pembimbing`;
    } else {
      // Siswa: tampilkan kelas dari database (bukan hardcoded)
      const kelasText = user.kelas ? ` � ${user.kelas}` : '';
      profileSubText.textContent = `NISN: ${user.nomor_induk}${kelasText}`;
    }
  }

  if (profileSchool) profileSchool.textContent = user.school || 'SMK Negeri 9 Malang';

  const profileSupervisorItem = document.getElementById('profileSupervisorItem');
  const profileSupervisor = document.getElementById('profileSupervisor');
  const profilePklLocation = document.getElementById('profilePklLocation');

  const navPermBtn = document.getElementById('navPermBtn');
  const navHistoryBtn = document.getElementById('navHistoryBtn');
  const studentFormCard = document.getElementById('studentPermissionFormCard');
  const studentPermTitle = document.getElementById('studentPermissionTitleContainer');
  const guruLogContainer = document.getElementById('guruLogPresensiContainer');
    const adminStudentLogSection = document.getElementById('adminStudentLogSection');
  const adminApprovalSection = document.getElementById('adminApprovalSection');
  const qrScanBanner = document.getElementById('qrScanBanner');
  const summaryStatsGrid = document.getElementById('summaryStatsGrid');
  const quickPrincipalCard = document.getElementById('quickPrincipalCard');
  const btnTabPrincipal = document.getElementById('btnTabPrincipal');
  const todayStatusSection = document.getElementById('todayStatusSection');
  const geofencingMapSection = document.getElementById('geofencingMapSection');
  const locationStatus = document.getElementById('locationStatus');
  const adminHomeChartSection = document.getElementById('adminHomeChartSection');

  if (user.role === 'guru' || user.role === 'admin' || user.username === 'admin') {
    if (adminNavBtn) adminNavBtn.classList.remove('hidden');
    if (navHistoryBtn) navHistoryBtn.classList.add('hidden');
    if (qrScanBanner) qrScanBanner.classList.add('hidden');
    if (summaryStatsGrid) summaryStatsGrid.classList.add('hidden');
    if (profileSupervisorItem) profileSupervisorItem.classList.add('hidden');
    if (adminHomeChartSection) adminHomeChartSection.classList.remove('hidden');
    // Sembunyikan tab Jurnal untuk guru/admin
    var navJBtnGA = document.getElementById('navJournalBtn');
    if (navJBtnGA) navJBtnGA.style.display = 'none';
    
    // Hide monthly stats, kelas info untuk admin/guru
    const studentMonthlyStatsSection = document.getElementById('studentMonthlyStatsSection');
    if (studentMonthlyStatsSection) studentMonthlyStatsSection.classList.add('hidden');
    const profileKelasItem = document.getElementById('profileKelasItem');
    if (profileKelasItem) profileKelasItem.classList.add('hidden');
    const syncKelasCard = document.getElementById('syncKelasCard');
    if (syncKelasCard) syncKelasCard.classList.add('hidden');
    // Sembunyikan card koordinat PKL (hanya untuk siswa)
    var _ajCard = document.getElementById('ajukanKoordCard');
    var _revCard = document.getElementById('revisiKoordCard');
    if (_ajCard)  _ajCard.classList.add('hidden');
    if (_revCard) _revCard.classList.add('hidden');
    
    renderChart();

    if (todayStatusSection) todayStatusSection.classList.add('hidden');

    if (user.username === 'admin' || user.role === 'admin') {
      if (locationStatus) locationStatus.classList.add('hidden');
      if (geofencingMapSection) geofencingMapSection.classList.add('hidden');
    } else if (user.role === 'guru') {
      // Guru: sembunyikan info geofencing — tidak relevan untuk guru
      if (locationStatus) locationStatus.classList.add('hidden');
      if (geofencingMapSection) geofencingMapSection.classList.add('hidden');
    } else {
      if (locationStatus) locationStatus.classList.remove('hidden');
      if (geofencingMapSection) geofencingMapSection.classList.remove('hidden');
    }

    // Dynamic PKL locations for Guru's supervised students
    let supervisedStudents = [];
    if (user.role === 'guru' && user.username !== 'admin') {
      supervisedStudents = getSupervisedStudentsOnly();
    } else {
      supervisedStudents = getUsers().filter(u => u.role === 'siswa');
    }

    const locations = Array.from(new Set(supervisedStudents.map(s => s.pklLocation).filter(loc => loc && loc.trim())));

    if (profilePklLocation) {
      if (user.role === 'admin' || user.username === 'admin') {
        user.pklLocation = user.school || 'SMK Negeri 9 Malang';
        profilePklLocation.innerHTML = `<span style="color:#fff; font-weight:700;"><i class="fa-solid fa-school text-sky-400"></i> ${user.school || 'SMK Negeri 9 Malang'}</span>`;
      } else {
        if (locations.length === 0) {
          profilePklLocation.innerHTML = `<span style="color:#94a3b8; font-weight:normal;">Instansi Mitra Bimbingan</span>`;
        } else if (locations.length === 1) {
          profilePklLocation.innerHTML = `<span style="color:#fff; font-weight:700;"><i class="fa-solid fa-building text-indigo-400"></i> ${locations[0]}</span>`;
        } else {
          profilePklLocation.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;">
              ${locations.map(loc => `
                <span style="background:rgba(99, 102, 241, 0.18); color:#a5b4fc; border:1px solid rgba(99, 102, 241, 0.4); padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:600; display:inline-flex; align-items:center; gap:5px;">
                  <i class="fa-solid fa-building text-indigo-400" style="font-size:0.7rem;"></i> ${loc}
                </span>
              `).join('')}
            </div>
          `;
        }
      }
    }

    if (navPermBtn) {
      navPermBtn.innerHTML = `<i class="fa-solid fa-list-check"></i><span>Log Presensi</span>`;
      navPermBtn.onclick = function() { switchTab('permission'); };
    }
    if (studentFormCard) studentFormCard.classList.add('hidden');
    if (studentPermTitle) studentPermTitle.classList.add('hidden');
    if (guruLogContainer) {
      guruLogContainer.classList.remove('hidden');
      const btnTabMonitoring = document.getElementById('btnTabMonitoring');
      const btnTabUsers = document.getElementById('btnTabUsers');
      const btnTabApprovals = document.getElementById('btnTabApprovals');
      const btnTabReset = document.getElementById('btnTabReset');
      const csvImportCard = document.getElementById('csvImportCard');
      const newRoleSelect = document.getElementById('newRole');
      const guruAddUserNotice = document.getElementById('guruAddUserNotice');
      const pendingUserApprovalCard = document.getElementById('pendingUserApprovalCard');

      if (user.role === 'guru' && user.username !== 'admin') {
        if (adminStudentLogSection) adminStudentLogSection.classList.remove('hidden');
        if (adminApprovalSection) adminApprovalSection.classList.remove('hidden');
        if (quickPrincipalCard) quickPrincipalCard.classList.remove('hidden');
        if (btnTabMonitoring) btnTabMonitoring.classList.remove('hidden');
        if (btnTabMonitoring) btnTabMonitoring.classList.add('active');
        if (btnTabUsers) btnTabUsers.classList.remove('hidden');
        if (btnTabUsers) btnTabUsers.classList.remove('active');
        // Guru JUGA punya menu persetujuan untuk melihat & setujui izin siswa bimbingan
        if (btnTabApprovals) btnTabApprovals.classList.remove('hidden');
        if (btnTabReset) btnTabReset.classList.add('hidden');
        if (csvImportCard) csvImportCard.classList.add('hidden');

        // Guru: Role HANYA Siswa & tampilkan pemberitahuan persetujuan admin
        if (newRoleSelect) {
          newRoleSelect.innerHTML = `<option value="siswa">Siswa</option>`;
          newRoleSelect.value = 'siswa';
        }
        if (guruAddUserNotice) guruAddUserNotice.classList.remove('hidden');
        if (pendingUserApprovalCard) pendingUserApprovalCard.classList.add('hidden');
      } else {
        if (adminStudentLogSection) adminStudentLogSection.classList.remove('hidden');
        if (adminApprovalSection) adminApprovalSection.classList.remove('hidden');
        if (quickPrincipalCard) quickPrincipalCard.classList.remove('hidden');
        if (btnTabMonitoring) btnTabMonitoring.classList.remove('hidden'); // Admin bisa akses monitoring
        if (btnTabUsers) btnTabUsers.classList.remove('hidden');
        if (btnTabUsers) btnTabUsers.classList.add('active');
        if (btnTabApprovals) btnTabApprovals.classList.remove('hidden');
        if (btnTabReset) btnTabReset.classList.remove('hidden');
        if (csvImportCard) csvImportCard.classList.remove('hidden');

        // Admin: Role Siswa & Guru
        if (newRoleSelect) {
          newRoleSelect.innerHTML = `
            <option value="siswa">Siswa</option>
            <option value="guru">Guru / Pembimbing</option>
          `;
        }
        if (guruAddUserNotice) guruAddUserNotice.classList.add('hidden');
        if (pendingUserApprovalCard) pendingUserApprovalCard.classList.remove('hidden');
      }
    }

    if (profileStatusBadge) {
      if (user.username === 'admin' || user.role === 'admin') {
        profileStatusBadge.innerHTML = `<i class="fa-solid fa-user-gear"></i> Master Administrator`;
      } else {
        profileStatusBadge.innerHTML = `<i class="fa-solid fa-user-shield"></i> Guru Pembimbing Aktif`;
      }
    }
  } else {
    if (adminNavBtn) adminNavBtn.classList.add('hidden');
    if (navHistoryBtn) navHistoryBtn.classList.remove('hidden');
    if (qrScanBanner) qrScanBanner.classList.add('hidden');
    if (summaryStatsGrid) summaryStatsGrid.classList.add('hidden'); // hidden untuk siswa, diganti monthly stats section
    if (profileSupervisorItem) profileSupervisorItem.classList.remove('hidden');
    if (profilePklLocation) profilePklLocation.textContent = user.pklLocation || 'PT. Tech Solution Indonesia';
    if (profileSupervisor) profileSupervisor.textContent = user.supervisor || 'Gigih Perkasa, ST., M.Pd.';
    if (navPermBtn) {
      navPermBtn.innerHTML = `<i class="fa-solid fa-file-signature"></i><span>Izin/Sakit</span>`;
    }
    // Tampilkan tab Jurnal Harian untuk siswa
    var navJournalBtn = document.getElementById('navJournalBtn');
    if (navJournalBtn) navJournalBtn.style.display = '';
    if (studentFormCard) studentFormCard.classList.remove('hidden');
    if (studentPermTitle) studentPermTitle.classList.remove('hidden');
    if (guruLogContainer) guruLogContainer.classList.add('hidden');
    if (adminStudentLogSection) adminStudentLogSection.classList.add('hidden');
    if (adminApprovalSection) adminApprovalSection.classList.add('hidden');
    if (quickPrincipalCard) quickPrincipalCard.classList.add('hidden');
    if (btnTabPrincipal) btnTabPrincipal.classList.add('hidden');
    if (todayStatusSection) todayStatusSection.classList.remove('hidden');
    if (geofencingMapSection) geofencingMapSection.classList.remove('hidden');
    if (adminHomeChartSection) adminHomeChartSection.classList.add('hidden');
    if (profileStatusBadge) profileStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Status PKL: Aktif`;

    // Show monthly stats for siswa
    const studentMonthlyStatsSection = document.getElementById('studentMonthlyStatsSection');
    if (studentMonthlyStatsSection) studentMonthlyStatsSection.classList.remove('hidden');
    updateStudentMonthlyStats();

    // Sync kelas info di profil
    syncStudentKelasToProfile(user);
    // Init tab jurnal saat siswa login
    if (typeof initJournalTab === 'function') setTimeout(function() { initJournalTab(); }, 500);
  }

  const proxmoxInfoCard = document.getElementById('proxmoxInfoCard');
  const proxmoxGuideBtn = document.getElementById('proxmoxGuideBtn');
  if (user.role === 'admin' || user.username === 'admin') {
    if (proxmoxInfoCard) proxmoxInfoCard.classList.remove('hidden');
    if (proxmoxGuideBtn) proxmoxGuideBtn.classList.remove('hidden');
  } else {
    if (proxmoxInfoCard) proxmoxInfoCard.classList.add('hidden');
    if (proxmoxGuideBtn) proxmoxGuideBtn.classList.add('hidden');
  }

  renderPrincipalSettingsForm();
  populateGuruFilterDropdown();
  populateDashboardFilterDropdown();
  renderGuruApprovalReports();
  renderAdminApprovalReportsHistory();
  renderMonthlyReportsArchive();

  const actionsContainer = document.getElementById('attendanceActionsContainer');
  if (actionsContainer) {
    if (user.role === 'admin' || user.username === 'admin') {
      // Admin: set data-role, CSS akan tampilkan tombol monitoring otomatis
      document.body.setAttribute('data-role', 'admin');
      var monLabel = document.getElementById('monitoringBtnLabel');
      if (monLabel) monLabel.textContent = 'Verifikasi Kunjungan PKL';
    } else if (user.role === 'guru') {
      // Guru: set data-role, CSS akan tampilkan tombol monitoring otomatis
      document.body.setAttribute('data-role', 'guru');
      var monLabel2 = document.getElementById('monitoringBtnLabel');
      if (monLabel2) monLabel2.textContent = 'Verifikasi Lokasi PKL Siswa';
    } else {
      // Siswa: set data-role, CSS akan tampilkan tombol masuk+pulang otomatis
      document.body.setAttribute('data-role', 'siswa');
    }
  }

  renderStats();
  renderTodayStatus();
  renderHistoryList();
  renderPermissionList();
  initMap();

  switchTab('home');

  // Re-render chart setelah tema pasti sudah diterapkan (400ms = cukup untuk applyTheme selesai)
  setTimeout(function() {
    if (activeUser && (activeUser.role === 'guru' || activeUser.role === 'admin' || activeUser.username === 'admin')) {
      try { renderChart(); } catch(e) {}
    }
  }, 400);

  // Safety: pastikan tombol & label sesuai role setelah semua render selesai
  // Dipanggil berulang dengan interval pendek untuk menangani APK timing
  setTimeout(_ensureMonitoringBtn, 100);
  setTimeout(_ensureMonitoringBtn, 300);
  setTimeout(_ensureMonitoringBtn, 700);
  setTimeout(_ensureMonitoringBtn, 1500);
  setTimeout(_ensureMonitoringBtn, 3000);
}

function triggerAvatarUpload() {
  const fileInput = document.getElementById('avatarFileInput');
  if (fileInput) {
    fileInput.click();
  }
}

async function handleAvatarFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('File yang dipilih harus berupa gambar (JPG/PNG/WebP)', 'error');
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    showToast('Ukuran gambar terlalu besar (Maksimal 8MB)', 'error');
    return;
  }

  try {
    showToast('Memproses foto profil...', 'info');
    const base64Data = await resizeImageToBase64(file, 300, 300, 0.85);

    if (!activeUser) {
      showToast('Sesi pengguna tidak ditemukan. Silakan login kembali.', 'error');
      return;
    }

    activeUser.avatar = base64Data;

    const users = getUsers();
    const idx = users.findIndex(u => (u.id && u.id === activeUser.id) || u.username === activeUser.username);
    if (idx !== -1) {
      users[idx].avatar = base64Data;
      saveUsers(users);
    }

    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(activeUser));

    const headerImg = document.getElementById('headerAvatarImg');
    if (headerImg) headerImg.src = base64Data;

    const profileImg = document.getElementById('profileAvatarImg');
    if (profileImg) profileImg.src = base64Data;

    if (document.getElementById('tab-admin')?.classList.contains('active')) {
      renderAdminUsersTable();
    }

    showToast('Menyimpan foto profil ke database...', 'info');
    await Promise.all([
      fetch('/api/update_avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: activeUser.id,
          username: activeUser.username,
          avatar: base64Data
        })
      }).catch(() => null),
      fetch('api.php?action=update_avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: activeUser.id,
          username: activeUser.username,
          avatar: base64Data
        })
      }).catch(() => null)
    ]);

    showToast('Foto profil / Avatar berhasil diperbarui!', 'success');
  } catch (err) {
    console.error('Failed to update avatar:', err);
    showToast('Gagal memperbarui foto profil: ' + err.message, 'error');
  } finally {
    event.target.value = '';
  }
}

function resizeImageToBase64(file, maxWidth = 300, maxHeight = 300, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function getSupervisedStudentsOnly() {
  const users = getUsers();
  const students = users.filter(u => u.role === 'siswa');

  if (!activeUser) return students;

  if (activeUser.role === 'admin' || activeUser.username === 'admin') {
    return students;
  }

  if (activeUser.role === 'guru') {
    const guruName = (activeUser.name || '').toLowerCase().trim();
    const guruNip  = (activeUser.nomor_induk || '').toLowerCase().trim();
    return students.filter(s => {
      if (!s.supervisor) return false;
      const sup = (s.supervisor || '').toLowerCase().trim();
      // Exact match saja � tidak pakai partial/kata pertama agar tidak bocor ke guru lain
      return sup === guruName || (guruNip && sup === guruNip);
    });
  }

  return students;
}

function switchAdminSubTab(subTab, autoScroll = true) {
  const btnMon = document.getElementById('btnTabMonitoring');
  const btnUsers = document.getElementById('btnTabUsers');
  const btnApprovals = document.getElementById('btnTabApprovals');
  const btnPrincipal = document.getElementById('btnTabPrincipal');
  const btnReset = document.getElementById('btnTabReset');

  const viewMon = document.getElementById('subViewMonitoring');
  const viewUsers = document.getElementById('subViewUsers');
  const viewApprovals = document.getElementById('subViewApprovals');
  const viewPrincipal = document.getElementById('subViewPrincipal');
  const viewReset = document.getElementById('subViewReset');

  // Pastikan semua tombol sub-tab yang seharusnya visible tidak tersembunyi oleh HTML default
  if (activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin')) {
    // Admin: semua tab visible
    ['btnTabMonitoring','btnTabUsers','btnTabApprovals','btnTabReset'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });
  } else if (activeUser && activeUser.role === 'guru') {
    // Guru: monitoring, users, approvals visible; reset hidden
    ['btnTabMonitoring','btnTabUsers','btnTabApprovals'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });
    var btnR = document.getElementById('btnTabReset');
    if (btnR) btnR.classList.add('hidden');
  }

  if (btnMon) btnMon.classList.remove('active');
  if (btnUsers) btnUsers.classList.remove('active');
  if (btnApprovals) btnApprovals.classList.remove('active');
  if (btnPrincipal) btnPrincipal.classList.remove('active');
  if (btnReset) btnReset.classList.remove('active');

  if (viewMon) viewMon.classList.add('hidden');
  if (viewUsers) viewUsers.classList.add('hidden');
  if (viewApprovals) viewApprovals.classList.add('hidden');
  if (viewPrincipal) viewPrincipal.classList.add('hidden');
  if (viewReset) viewReset.classList.add('hidden');

  if (subTab === 'monitoring') {
    if (btnMon) btnMon.classList.add('active');
    if (viewMon) viewMon.classList.remove('hidden');
    renderAdminDashboard();
  } else if (subTab === 'approvals') {
    if (btnApprovals) btnApprovals.classList.add('active');
    if (viewApprovals) viewApprovals.classList.remove('hidden');
    const isAdmin = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');
    if (isAdmin) {
      // Admin: tampilkan persetujuan pengajuan akun DAN izin
      renderPendingUserApprovals();
      renderAdminDashboard();
    }
    // Guru: hanya tampilkan izin siswa bimbingan
    renderGuruApprovalTab();
    renderAdminApprovalReportsHistory && renderAdminApprovalReportsHistory();
  } else if (subTab === 'principal') {
    if (btnPrincipal) btnPrincipal.classList.add('active');
    if (viewPrincipal) viewPrincipal.classList.remove('hidden');
    renderPrincipalSettingsForm();
  } else if (subTab === 'reset') {
    const isAdmin = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');
    if (!isAdmin) {
      showToast('Sub-Tab Reset Data hanya dapat diakses oleh Master Admin!', 'error');
      switchAdminSubTab('users', autoScroll);
      return;
    }
    if (btnReset) btnReset.classList.add('active');
    if (viewReset) viewReset.classList.remove('hidden');
  } else {
    if (btnUsers) btnUsers.classList.add('active');
    if (viewUsers) viewUsers.classList.remove('hidden');
    // Render langsung dari localStorage � tidak perlu sync ke server setiap tab dibuka
    // karena SSE sudah handle real-time sync dari device lain
    renderAdminUsersTable();
    renderPrincipalSettingsForm();
    
    // Initialize form fields visibility and populate guru dropdown
    setTimeout(() => {
      toggleFormFieldsByRole();
    }, 100);
  }

  if (autoScroll) {
    setTimeout(() => {
      const subNav = document.querySelector('.admin-sub-tabs');
      if (subNav) {
        subNav.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }
}

function renderAdminUsersTable() {
  const users = getUsers();
  const isAdmin = (activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin'));
  
  let displayList = isAdmin ? users : getSupervisedStudentsOnly();

  const searchInput = document.getElementById('adminUserSearchInput');
  const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

  if (searchQuery) {
    displayList = displayList.filter(u => 
      (u.name && u.name.toLowerCase().includes(searchQuery)) ||
      (u.nomor_induk && u.nomor_induk.toLowerCase().includes(searchQuery)) ||
      (u.username && u.username.toLowerCase().includes(searchQuery)) ||
      (u.school && u.school.toLowerCase().includes(searchQuery)) ||
      (u.pklLocation && u.pklLocation.toLowerCase().includes(searchQuery)) ||
      (u.supervisor && u.supervisor.toLowerCase().includes(searchQuery))
    );
  }

  const tableBody = document.getElementById('registeredUsersTable');
  const countBadge = document.getElementById('registeredUserCount');
  const csvCardTitle = document.getElementById('csvCardTitle');
  const csvCardDesc = document.getElementById('csvCardDesc');
  const csvImportCard = document.getElementById('csvImportCard');

  if (csvImportCard) {
    if (isAdmin) {
      csvImportCard.classList.remove('hidden');
      if (csvCardTitle && csvCardDesc) {
        csvCardTitle.innerHTML = `<i class="fa-solid fa-file-csv text-emerald-400"></i> Import Data Massal Siswa & Guru (Master Admin)`;
        csvCardDesc.textContent = `Upload file .csv untuk mengimpor banyak Guru dan Siswa sekaligus beserta penetapan Guru Pembimbing & Koordinat GPS PKL.`;
      }
    } else {
      csvImportCard.classList.add('hidden');
    }
  }

  if (countBadge) {
    if (isAdmin) {
      const matchText = searchQuery ? ` (${displayList.length} Ditemukan)` : '';
      countBadge.innerHTML = `<span style="color:#6366f1;"><i class="fa-solid fa-user-gear"></i> Master Admin View: ${users.length} Total User${matchText}</span>`;
    } else {
      countBadge.innerHTML = `<span style="color:#34d399;"><i class="fa-solid fa-filter"></i> Siswa Bimbingan (${activeUser.name}): ${displayList.length} Anak</span>`;
    }
  }

  renderPendingUserApprovals();

  if (tableBody) {
    if (displayList.length === 0) {
      // Jika admin sudah login tapi data kosong, kemungkinan sedang sync dari server
      const isLoading = isAdmin && getUsers().length === 0;
      const emptyMsg = isLoading
        ? `<span style="color:#6366f1;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data dari server...</span>`
        : searchQuery
          ? `Tidak ditemukan user dengan kata kunci "<strong>${searchQuery.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>"`
          : `Tidak ada user terdaftar.`;
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:20px;">${emptyMsg}</td></tr>`;
      return;
    }

    tableBody.innerHTML = displayList.map(u => {
      let roleBadgeHtml = '';
      if (u.role === 'admin') {
        roleBadgeHtml = `<span class="status-tag alpa" style="background:#dc2626; color:#fff;"><i class="fa-solid fa-user-gear"></i> ADMIN</span>`;
      } else if (u.role === 'guru') {
        roleBadgeHtml = `<span class="status-tag izin" style="background:#4f46e5; color:#fff;"><i class="fa-solid fa-user-tie"></i> GURU</span>`;
      } else {
        roleBadgeHtml = `<span class="status-tag hadir" style="background:#059669; color:#fff;"><i class="fa-solid fa-graduation-cap"></i> SISWA</span>`;
      }

      let statusBadgeHtml = '';
      if (u.status === 'pending') {
        statusBadgeHtml = `<br><span class="status-tag sakit" style="background:#f59e0b; color:#fff; font-size:0.68rem; margin-top:3px;"><i class="fa-solid fa-clock-rotate-left"></i> Menunggu Persetujuan Akun</span>`;
      } else if (u.status === 'pending_delete') {
        statusBadgeHtml = `<br><span class="status-tag alpa" style="background:#ef4444; color:#fff; font-size:0.68rem; margin-top:3px;"><i class="fa-solid fa-user-slash"></i> Menunggu Persetujuan Hapus</span>`;
      } else if (u.status === 'pending_edit_pkl') {
        statusBadgeHtml = `<br><span class="status-tag izin" style="background:#6366f1; color:#fff; font-size:0.68rem; margin-top:3px;"><i class="fa-solid fa-location-dot"></i> Menunggu Persetujuan Edit PKL</span>`;
      }

      let supervisorHtml = '';
      if (u.role === 'siswa') {
        const kelasInfo = u.kelas ? `<i class="fa-solid fa-chalkboard"></i> <strong>Kelas:</strong> ${u.kelas}<br>` : '<i class="fa-solid fa-chalkboard" style="color:#94a3b8;"></i> <span style="color:#94a3b8;">Kelas belum diisi</span><br>';
        const lat = parseFloat(u.latitude_pkl);
        const lng = parseFloat(u.longitude_pkl);
        const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        const gpsText = hasValidCoords
          ? `<a href="https://www.google.com/maps?q=${lat},${lng}&label=${encodeURIComponent(u.pklLocation||u.name)}" target="_blank" rel="noopener" style="color:#34d399; text-decoration:none;"><i class="fa-solid fa-map-location-dot"></i> GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}</a>`
          : `<span style="color:#f59e0b;"><i class="fa-solid fa-spinner fa-spin"></i> GPS: menunggu geocode...</span>`;
        supervisorHtml = `<div style="margin-top:4px; padding:3px 8px; background:rgba(79,70,229,0.15); border-left:3px solid #6366f1; border-radius:4px; font-size:0.78rem; color:#a5b4fc;">
          ${kelasInfo}
          <i class="fa-solid fa-user-tie"></i> <strong>Pembimbing:</strong> ${u.supervisor || 'Belum Ditentukan'}<br>
          <small>${gpsText}</small>
        </div>`;
      } else if (u.role === 'guru') {
        supervisorHtml = `<div style="margin-top:4px; font-size:0.75rem; color:#34d399;">
          <i class="fa-solid fa-school-flag"></i> Instansi: ${u.school || 'SMK Negeri 9 Malang'}<br>
          <small style="color:#94a3b8;"><a href="https://www.google.com/maps?q=-7.9825,112.6867" target="_blank" rel="noopener" style="color:#94a3b8; text-decoration:none;"><i class="fa-solid fa-map-location-dot"></i> GPS: -7.9825, 112.6867</a></small>
        </div>`;
      }

      const isMasterAdminUser = (u.username && u.username.toLowerCase() === 'admin') || (u.role && u.role.toLowerCase() === 'admin');
      
      // Single Edit Data button
      const editDataBtnHtml = `
        <button class="btn-sm btn-primary" onclick="openEditUserModal('${u.id}')" title="Edit Data User">
          <i class="fa-solid fa-pen-to-square"></i> Edit Data
        </button>
      `;

      return `
        <tr>
          <td>
            <strong>${u.name}</strong><br>
            <small class="text-muted">${u.nomor_induk} (${u.username})</small>
            ${statusBadgeHtml}
          </td>
          <td>${roleBadgeHtml}</td>
          <td>
            <div style="font-size:0.8rem;">
              <strong>${u.pklLocation || u.school || '-'}</strong>
              ${supervisorHtml}
            </div>
          </td>
          <td>
            <code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:0.7rem; color:#f43f5e;">${u.password || '123'}</code>
          </td>
          <td>
            ${editDataBtnHtml}
          </td>
        </tr>
      `;
    }).join('');

    // Setelah render, panggil geocode background untuk siswa yang belum punya koordinat
    // Dibatasi max 5 per render agar tidak spam Nominatim API
    const siswaNoCoords = displayList.filter(u => {
      if (u.role !== 'siswa' || !u.pklLocation) return false;
      const lat = parseFloat(u.latitude_pkl), lng = parseFloat(u.longitude_pkl);
      return isNaN(lat) || lat === 0 || isNaN(lng) || lng === 0;
    }).slice(0, 5);

    if (siswaNoCoords.length > 0) {
      // Jalankan geocode secara berurutan dengan delay agar tidak banjir request
      let delay = 300;
      siswaNoCoords.forEach(function(u) {
        setTimeout(function() {
          const users = getUsers();
          const idx = users.findIndex(function(x) { return String(x.id) === String(u.id); });
          if (idx !== -1) {
            const latCheck = parseFloat(users[idx].latitude_pkl);
            const lngCheck = parseFloat(users[idx].longitude_pkl);
            // Cek ulang — mungkin sudah terisi dari geocode sebelumnya
            if (!isNaN(latCheck) && latCheck !== 0 && !isNaN(lngCheck) && lngCheck !== 0) return;
            geocodeLocationName(u.pklLocation, users[idx]).then(function() {
              // Re-render tabel setelah geocode agar spinner hilang
              if (typeof renderAdminUsersTable === 'function') renderAdminUsersTable();
            }).catch(function() {});
          }
        }, delay);
        delay += 1200; // jeda 1.2 detik antar request Nominatim
      });
    }
  }
}

function renderPendingUserApprovals() {
  const pendingCard = document.getElementById('pendingUserApprovalCard');
  const pendingList = document.getElementById('pendingUserApprovalList');
  if (!pendingCard || !pendingList) return;

  const users = getUsers();
  const perms = getPermissions();
  const pendingUsers = users.filter(u => u.status === 'pending' || u.status === 'pending_delete' || u.status === 'pending_edit_pkl');
  
  // Untuk guru: hitung hanya permissions siswa bimbingan, bukan semua
  let pendingPerms;
  const isAdminUser = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');
  if (isAdminUser) {
    pendingPerms = perms.filter(p => (p.status || '').toLowerCase() === 'pending');
  } else if (activeUser && activeUser.role === 'guru') {
    const myName = (activeUser.name || '').trim().toLowerCase();
    const myStudentNames = getSupervisedStudentsOnly().map(s => (s.name || '').trim().toLowerCase());
    pendingPerms = perms.filter(p => {
      if ((p.status || '').toLowerCase() !== 'pending') return false;
      const pSup = (p.supervisor || '').trim().toLowerCase();
      const pStudent = (p.studentName || '').trim().toLowerCase();
      return pSup === myName || myStudentNames.includes(pStudent);
    });
  } else {
    pendingPerms = perms.filter(p => (p.status || '').toLowerCase() === 'pending');
  }
  const totalPending = pendingUsers.length + pendingPerms.length;

  const badge = document.getElementById('pendingApprovalBadge');
  if (badge) {
    if (totalPending > 0) {
      badge.style.display = 'inline-block';
      badge.textContent = totalPending;
    } else {
      badge.style.display = 'none';
    }
  }

  const isAdmin = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');

  if (!isAdmin) {
    pendingCard.classList.add('hidden');
    return;
  }

  pendingCard.classList.remove('hidden');

  if (pendingUsers.length === 0) {
    pendingList.innerHTML = `
      <div style="padding:10px 14px; font-size:0.8rem; color:#34d399; background:rgba(52, 211, 153, 0.08); border:1px solid rgba(52, 211, 153, 0.2); border-radius:8px; display:flex; align-items:center; gap:8px;">
        <i class="fa-solid fa-circle-check text-base"></i>
        <span>Tidak ada pengajuan akun baru, reset password, hapus siswa, atau edit tempat PKL yang menunggu persetujuan.</span>
      </div>
    `;
    return;
  }

  pendingList.innerHTML = pendingUsers.map(u => {
    if (u.status === 'pending_delete') {
      return `
        <div style="background:rgba(239, 68, 68, 0.08); padding:10px 14px; border-radius:8px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; border:1px solid rgba(239, 68, 68, 0.4);">
          <div>
            <strong style="color:#f87171;"><i class="fa-solid fa-user-slash"></i> Pengajuan Hapus Siswa: ${u.name}</strong> (${u.role.toUpperCase()})
            <div style="font-size:0.75rem; color:#cbd5e1; margin-top:2px;">
              NISN: <strong>${u.nomor_induk}</strong> | Tempat PKL: <strong>${u.pklLocation}</strong> | Diajukan oleh Guru: <strong>${u.delete_requested_by || u.supervisor || 'Guru Pembimbing'}</strong>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-sm" style="background:#ef4444; color:#fff; cursor:pointer;" onclick="approveUserStatus('${u.id}', 'confirm_delete')"><i class="fa-solid fa-trash-can"></i> Setujui Hapus</button>
            <button class="btn-sm" style="background:#64748b; color:#fff; cursor:pointer;" onclick="approveUserStatus('${u.id}', 'approved')"><i class="fa-solid fa-rotate-left"></i> Batalkan</button>
          </div>
        </div>
      `;
    }

    if (u.status === 'pending_edit_pkl') {
      const isSelfReport = (u.edit_requested_by || '').includes('self-report');
      const proposedBy   = isSelfReport
        ? `<span style="color:#f59e0b;"><i class="fa-solid fa-mobile-screen-button"></i> Siswa (self-report GPS)</span>`
        : `Guru: <strong>${u.edit_requested_by || u.supervisor || 'Guru Pembimbing'}</strong>`;
      const approveAction = isSelfReport ? 'approve_pkl_coords' : 'confirm_edit_pkl';
      return `
        <div style="background:rgba(99, 102, 241, 0.08); padding:10px 14px; border-radius:8px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; border:1px solid rgba(99, 102, 241, 0.4);">
          <div>
            <strong style="color:#a5b4fc;"><i class="fa-solid fa-location-dot"></i> Pengajuan ${isSelfReport ? 'Koordinat GPS' : 'Edit Tempat'} PKL: ${u.name}</strong> (${u.role.toUpperCase()})
            <div style="font-size:0.75rem; color:#cbd5e1; margin-top:2px;">
              PKL: <strong>${u.pklLocation}</strong>${u.proposed_pkl_location && u.proposed_pkl_location !== u.pklLocation ? ` &rarr; <strong style="color:#34d399;">${u.proposed_pkl_location}</strong>` : ''}
              <br>Koordinat Diajukan: <strong style="color:#34d399;">${u.proposed_latitude_pkl || 0}, ${u.proposed_longitude_pkl || 0}</strong>
              ${u.gps_accuracy ? `<span style="color:#94a3b8;"> (akurasi ±${Math.round(u.gps_accuracy)}m)</span>` : ''}
            </div>
            <div style="font-size:0.72rem; color:#94a3b8; margin-top:2px;">Diajukan oleh: ${proposedBy}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-sm" style="background:#10b981; color:#fff; cursor:pointer;" onclick="approveUserStatus('${u.id}', '${approveAction}')"><i class="fa-solid fa-check"></i> Setujui</button>
            <button class="btn-sm" style="background:#64748b; color:#fff; cursor:pointer;" onclick="approveUserStatus('${u.id}', 'cancel_edit_pkl')"><i class="fa-solid fa-xmark"></i> Tolak</button>
          </div>
        </div>
      `;
    }

    return `
      <div style="background:rgba(255,255,255,0.05); padding:10px 14px; border-radius:8px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; border:1px solid rgba(245, 158, 11, 0.3);">
        <div>
          <strong style="color:#fbbf24;"><i class="fa-solid fa-user-clock"></i> ${u.name}</strong> (${u.role.toUpperCase()})
          <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">
            NISN/Username: <strong>${u.nomor_induk}</strong> | Pembimbing: <strong>${u.supervisor || '-'}</strong> | Password: <code>${u.password || '123'}</code>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn-sm" style="background:#10b981; color:#fff; cursor:pointer;" onclick="approveUserStatus('${u.id}', 'approved')"><i class="fa-solid fa-check"></i> Setujui</button>
          <button class="btn-sm" style="background:#ef4444; color:#fff; cursor:pointer;" onclick="approveUserStatus('${u.id}', 'rejected')"><i class="fa-solid fa-xmark"></i> Tolak</button>
        </div>
      </div>
    `;
  }).join('');
}

async function approveUserStatus(userId, statusAction) {
  const users = getUsers();
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) { showToast('User tidak ditemukan! ID: ' + userId, 'error'); return; }

  try {
    const payload = {
      user_id: userId,
      username: user.username,
      status: statusAction,
      proposed_pkl_location: user.proposed_pkl_location,
      proposed_latitude_pkl: user.proposed_latitude_pkl,
      proposed_longitude_pkl: user.proposed_longitude_pkl
    };
    // Gunakan apiUrl() agar APK pakai URL absolut
    fetch(apiUrl('api.php?action=approve_user'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function(e) { console.warn('[SIGAP] approve_user sync error:', e.message); });
  } catch(err) {
    console.warn('Approve API sync failed:', err);
  }

  if (statusAction === 'rejected' || statusAction === 'confirm_delete') {
    const updatedUsers = users.filter(u => u.id !== userId);
    saveUsers(updatedUsers);
    if (statusAction === 'confirm_delete') {
      recordApprovalReport({
        requested_by: user.delete_requested_by || user.supervisor,
        studentName: user.name,
        title: 'Pengajuan Hapus Siswa',
        actionStatus: 'Disetujui',
        details: `Akun siswa ${user.name} (${user.nomor_induk}) resmi dihapus dari sistem.`
      });
      showToast(`Pengajuan hapus akun ${user.name} disetujui & akun berhasil dihapus.`, 'info');
    } else {
      recordApprovalReport({
        requested_by: user.delete_requested_by || user.supervisor,
        studentName: user.name,
        title: 'Pengajuan Akun Siswa',
        actionStatus: 'Ditolak',
        details: `Pengajuan untuk ${user.name} (${user.nomor_induk}) ditolak oleh Master Admin.`
      });
      showToast(`Pengajuan akun ${user.name} ditolak & dihapus.`, 'info');
    }
  } else if (statusAction === 'confirm_edit_pkl' || statusAction === 'approve_pkl_coords') {
    // approve_pkl_coords = siswa self-report GPS; confirm_edit_pkl = guru ajukan via admin panel
    const newLoc = user.proposed_pkl_location || user.pklLocation;
    const newLat = user.proposed_latitude_pkl  || user.latitude_pkl;
    const newLng = user.proposed_longitude_pkl || user.longitude_pkl;

    user.pklLocation   = newLoc;
    user.latitude_pkl  = newLat;
    user.longitude_pkl = newLng;

    recordApprovalReport({
      requested_by: user.edit_requested_by || user.supervisor,
      studentName: user.name,
      title: statusAction === 'approve_pkl_coords' ? 'Persetujuan Koordinat GPS PKL (Self-Report)' : 'Pengajuan Edit Tempat PKL',
      actionStatus: 'Disetujui',
      details: `Koordinat PKL ${user.name} dikunci ke "${newLoc}" (${newLat}, ${newLng}).`
    });

    if (statusAction === 'approve_pkl_coords') {
      // Panggil endpoint approve_pkl_coords yang juga simpan ke geocode_cache
      fetch(apiUrl('api.php?action=approve_pkl_coords'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      }).catch(function(e){ console.warn('[SIGAP] approve_pkl_coords error:', e.message); });
    }

    delete user.proposed_pkl_location;
    delete user.proposed_latitude_pkl;
    delete user.proposed_longitude_pkl;
    delete user.edit_requested_by;
    delete user.gps_accuracy;
    user.status = 'approved';
    saveUsers(users);
    showToast(`Koordinat PKL ${user.name} (${newLoc}) berhasil disetujui & dikunci!`, 'success');
  } else if (statusAction === 'cancel_edit_pkl') {
    recordApprovalReport({
      requested_by: user.edit_requested_by || user.supervisor,
      studentName: user.name,
      title: 'Pengajuan Edit Tempat PKL',
      actionStatus: 'Ditolak',
      details: `Pengajuan edit lokasi PKL ${user.name} dibatalkan oleh Master Admin.`
    });

    delete user.proposed_pkl_location;
    delete user.proposed_latitude_pkl;
    delete user.proposed_longitude_pkl;
    delete user.edit_requested_by;
    user.status = 'approved';
    saveUsers(users);
    showToast(`Pengajuan edit tempat PKL ${user.name} dibatalkan.`, 'info');
  } else {
    user.status = 'approved';
    recordApprovalReport({
      requested_by: user.supervisor,
      studentName: user.name,
      title: 'Pengajuan Akun Siswa Baru',
      actionStatus: 'Disetujui',
      details: `Akun siswa ${user.name} (${user.nomor_induk}) resmi disetujui & aktif.`
    });
    delete user.delete_requested_by;
    saveUsers(users);
    showToast(`Akun ${user.name} berhasil disetujui! Siswa sekarang dapat login.`, 'success');
  }

  renderAdminUsersTable();
  renderPendingUserApprovals();
}

// Expose ke window agar bisa dipanggil dari onclick di HTML yang di-generate
window.approveUserStatus = approveUserStatus;

// ── Batch Geocode Koordinat PKL (Admin Only) ─────────────────────────────────
async function runBatchGeocode(forceAll) {
  const btn     = document.getElementById(forceAll ? 'btnBatchGeocodeAll' : 'btnBatchGeocode');
  const statusEl = document.getElementById('batchGeocodeStatus');
  if (!statusEl) return;

  const label = forceAll ? 'Geocode Ulang Semua' : 'Geocode Belum Valid';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; }
  statusEl.style.display = 'block';
  statusEl.style.color = '#94a3b8';
  statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memulai geocode batch (max 20 siswa per batch, ~1.2 detik/siswa)...';

  try {
    const url = apiUrl('api.php?action=batch_geocode_all&limit=20' + (forceAll ? '&force=1' : ''));
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();

    if (data && data.success) {
      statusEl.style.color = '#34d399';
      let msg = `<i class="fa-solid fa-circle-check"></i> <strong>${data.success} dari ${data.processed}</strong> siswa berhasil di-geocode.`;
      if (data.failed > 0) {
        msg += ` <span style="color:#f59e0b;">${data.failed} gagal</span>`;
        if (data.failed_list && data.failed_list.length > 0) {
          msg += `<br><small style="color:#64748b;">Gagal: ${data.failed_list.join(', ')}</small>`;
        }
      }
      if (data.processed === 0) {
        msg = '<i class="fa-solid fa-circle-check"></i> Semua siswa sudah punya koordinat valid!';
      }
      statusEl.innerHTML = msg;
      showToast(`Geocode selesai: ${data.success} berhasil dari ${data.processed} siswa`, 'success');
      // Refresh data user setelah geocode
      setTimeout(function() {
        fetch(apiUrl('api.php?action=get_users'))
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(res) { if (res) _mergeServerUsers(res, true); })
          .catch(function(){});
      }, 1000);
    } else {
      statusEl.style.color = '#f87171';
      statusEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Gagal: ' + (data.message || 'Error tidak diketahui');
      showToast('Geocode batch gagal', 'error');
    }
  } catch(e) {
    statusEl.style.color = '#f87171';
    statusEl.innerHTML = '<i class="fa-solid fa-wifi"></i> Koneksi gagal: ' + e.message;
    showToast('Gagal terhubung ke server', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = forceAll ? '<i class="fa-solid fa-rotate"></i> Geocode Ulang Semua' : '<i class="fa-solid fa-magnifying-glass-location"></i> Geocode Belum Valid'; }
  }
}
window.runBatchGeocode = runBatchGeocode;
function editUsernamePrompt(userId) {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    showToast('User tidak ditemukan!', 'error');
    return;
  }

  const user = users[userIndex];
  
  // Cek apakah user adalah master admin
  if (user.username === 'admin' || user.role === 'admin') {
    showToast('Username Master Admin tidak dapat diubah!', 'error');
    return;
  }

  const newUsername = prompt(
    `Edit Username untuk:\n${user.name}\n\nUsername saat ini: ${user.username}\n\nMasukkan username baru:`,
    user.username
  );

  if (newUsername === null || newUsername.trim() === '') return;

  const trimmedUsername = newUsername.trim();

  // Validasi username tidak duplicate
  const isDuplicate = users.some(u => u.id !== userId && (u.username === trimmedUsername || u.nomor_induk === trimmedUsername));
  if (isDuplicate) {
    showToast('Username sudah digunakan oleh user lain!', 'error');
    return;
  }

  // Update username
  user.username = trimmedUsername;
  
  // Sync to backend
  try {
    Promise.all([
      fetch('/api/update_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id, 
          username: trimmedUsername,
          nomor_induk: user.nomor_induk,
          name: user.name
        })
      }).catch(() => null),
      fetch('api.php?action=update_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id, 
          username: trimmedUsername,
          nomor_induk: user.nomor_induk,
          name: user.name
        })
      }).catch(() => null)
    ]);
  } catch (err) {
    console.warn('Backend sync failed:', err);
  }

  saveUsers(users);
  showToast(`Username berhasil diubah menjadi: ${trimmedUsername}`, 'success');
  renderAdminUsersTable();
}

// Edit Kelas (khusus siswa)
function editKelasPrompt(userId) {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    showToast('User tidak ditemukan!', 'error');
    return;
  }

  const user = users[userIndex];
  
  // Validasi hanya untuk siswa
  if (user.role !== 'siswa') {
    showToast('Kelas hanya bisa diubah untuk siswa!', 'error');
    return;
  }

  const newKelas = prompt(
    `Edit Kelas untuk:\n${user.name}\nNISN: ${user.nomor_induk}\n\nKelas saat ini: ${user.kelas || 'Belum Ditentukan'}\n\nMasukkan kelas baru (contoh: XII RPL 1):`,
    user.kelas || ''
  );

  if (newKelas === null) return;

  const trimmedKelas = newKelas.trim();

  // Update kelas
  const oldKelas = user.kelas;
  user.kelas = trimmedKelas;
  
  // Update subtext untuk menampilkan kelas baru
  if (trimmedKelas) {
    user.subtext = `NISN: ${user.nomor_induk} � ${trimmedKelas}`;
  } else {
    user.subtext = `NISN: ${user.nomor_induk}`;
  }
  
  // Sync to backend
  try {
    Promise.all([
      fetch('/api/update_kelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id,
          student_name: user.name,
          student_nisn: user.nomor_induk,
          old_kelas: oldKelas,
          new_kelas: trimmedKelas
        })
      }).catch(() => null),
      fetch('api.php?action=update_kelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id,
          student_name: user.name,
          student_nisn: user.nomor_induk,
          old_kelas: oldKelas,
          new_kelas: trimmedKelas
        })
      }).catch(() => null)
    ]);
  } catch (err) {
    console.warn('Backend sync failed:', err);
  }

  saveUsers(users);
  
  if (trimmedKelas) {
    showToast(`Kelas ${user.name} berhasil diubah menjadi: ${trimmedKelas}`, 'success');
  } else {
    showToast(`Kelas ${user.name} berhasil dihapus`, 'success');
  }
  
  renderAdminUsersTable();
}

// Edit Guru Pembimbing (khusus siswa) dengan Modal Dropdown
let currentEditingSupervisorUserId = null;

function editSupervisorPrompt(userId) {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    showToast('User tidak ditemukan!', 'error');
    return;
  }

  const user = users[userIndex];
  
  // Validasi hanya untuk siswa
  if (user.role !== 'siswa') {
    showToast('Guru Pembimbing hanya bisa diubah untuk siswa!', 'error');
    return;
  }

  // Get list of guru
  const guruList = users.filter(u => u.role === 'guru' || u.role === 'admin');
  
  if (guruList.length === 0) {
    showToast('Tidak ada guru pembimbing yang tersedia!', 'error');
    return;
  }

  // Set current editing user
  currentEditingSupervisorUserId = userId;

  // Populate modal dengan data siswa
  document.getElementById('supervisorModalStudentName').textContent = user.name;
  document.getElementById('supervisorModalStudentNISN').textContent = `NISN: ${user.nomor_induk}`;
  document.getElementById('supervisorModalStudentKelas').textContent = user.kelas || 'Belum Ditentukan';
  document.getElementById('supervisorModalCurrentSupervisor').textContent = user.supervisor || 'Belum Ditentukan';

  // Populate dropdown guru
  const guruSelect = document.getElementById('supervisorModalGuruSelect');
  guruSelect.innerHTML = '<option value="">-- Pilih Guru Pembimbing --</option>';
  
  guruList.forEach(guru => {
    const option = document.createElement('option');
    option.value = guru.id;
    option.textContent = `${guru.name}${guru.nomor_induk ? ' (NIP: ' + guru.nomor_induk + ')' : ''}`;
    option.dataset.guruName = guru.name;
    option.dataset.guruNip = guru.nomor_induk || '';
    
    // Pre-select jika guru ini adalah pembimbing saat ini
    if (guru.name === user.supervisor) {
      option.selected = true;
    }
    
    guruSelect.appendChild(option);
  });

  // Show modal
  openSupervisorModal();
}

function openSupervisorModal() {
  const modal = document.getElementById('supervisorModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeSupervisorModal() {
  const modal = document.getElementById('supervisorModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
  currentEditingSupervisorUserId = null;
}

async function handleSupervisorChange(e) {
  e.preventDefault();
  
  if (currentEditingSupervisorUserId === null) {
    showToast('Error: User ID tidak valid!', 'error');
    return;
  }

  const guruSelect = document.getElementById('supervisorModalGuruSelect');
  const selectedOption = guruSelect.options[guruSelect.selectedIndex];
  
  if (!selectedOption || !selectedOption.value) {
    showToast('Silakan pilih guru pembimbing!', 'error');
    return;
  }

  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentEditingSupervisorUserId);
  
  if (userIndex === -1) {
    showToast('User tidak ditemukan!', 'error');
    closeSupervisorModal();
    return;
  }

  const user = users[userIndex];
  const selectedGuruName = selectedOption.dataset.guruName;
  const selectedGuruNip = selectedOption.dataset.guruNip;
  const oldSupervisor = user.supervisor;

  // Update supervisor
  user.supervisor = selectedGuruName;
  
  // Update subtext untuk menampilkan nama guru baru (opsional)
  if (user.kelas) {
    user.subtext = `NISN: ${user.nomor_induk} � ${user.kelas}`;
  }
  
  // Sync to backend
  try {
    await Promise.all([
      fetch('/api/update_supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id,
          student_name: user.name,
          old_supervisor: oldSupervisor,
          new_supervisor: selectedGuruName,
          supervisor_nip: selectedGuruNip
        })
      }).catch(() => null),
      fetch('api.php?action=update_supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id,
          student_name: user.name,
          old_supervisor: oldSupervisor,
          new_supervisor: selectedGuruName,
          supervisor_nip: selectedGuruNip
        })
      }).catch(() => null)
    ]);
  } catch (err) {
    console.warn('Backend sync failed:', err);
  }

  saveUsers(users);
  showToast(`Guru pembimbing ${user.name} berhasil diganti menjadi: ${selectedGuruName}`, 'success');
  
  closeSupervisorModal();
  renderAdminUsersTable();
}

window.editUsernamePrompt = editUsernamePrompt;
window.editKelasPrompt = editKelasPrompt;
window.editSupervisorPrompt = editSupervisorPrompt;
window.openSupervisorModal = openSupervisorModal;
window.closeSupervisorModal = closeSupervisorModal;
window.handleSupervisorChange = handleSupervisorChange;

// Toggle Dropdown Menu
function toggleDropdown(button) {
  const dropdown = button.nextElementSibling;
  const allDropdowns = document.querySelectorAll('.dropdown-menu');
  
  // Close all other dropdowns
  allDropdowns.forEach(d => {
    if (d !== dropdown) {
      d.classList.remove('show');
    }
  });
  
  // Toggle current dropdown
  dropdown.classList.toggle('show');
  
  // Close dropdown when clicking outside
  if (dropdown.classList.contains('show')) {
    setTimeout(() => {
      document.addEventListener('click', function closeDropdown(e) {
        if (!button.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.remove('show');
          document.removeEventListener('click', closeDropdown);
        }
      });
    }, 10);
  }
}

window.toggleDropdown = toggleDropdown;

// ========== COMPREHENSIVE EDIT USER MODAL ==========
let _lastSaveTs = 0; // Timestamp terakhir kali admin save perubahan user
let _lastApproveTs = 0; // Timestamp terakhir kali guru/admin approve/tolak izin (global guard)
const _approvedPermIds = new Map(); // Guard per-item: Map<permId, timestamp> — mencegah sync overwrite per izin
let currentEditingUserId = null;
let _currentEditingSupervisor = '';

function openEditUserModal(userId) {
  // Langsung buka modal dari localStorage � tidak sync ke server dulu
  // karena sync bisa overwrite data yang baru disimpan
  _openEditUserModalImpl(userId);
}

function _openEditUserModalImpl(userId) {
  const users = getUsers();
  const user = users.find(u => String(u.id) === String(userId));
  
  if (!user) {
    showToast('User tidak ditemukan!', 'error');
    return;
  }

  currentEditingUserId = userId;
  
  // Populate user info
  document.getElementById('editUserName').textContent = user.name;
  document.getElementById('editUserRole').textContent = `${user.role.toUpperCase()} � ${user.nomor_induk}`;
  
  // Set avatar initial
  const initial = user.name.charAt(0).toUpperCase();
  document.getElementById('editUserAvatar').textContent = initial;
  
  // Populate form fields
  document.getElementById('editUsername').value = user.username || '';
  document.getElementById('editNomorInduk').value = user.nomor_induk || '';
  document.getElementById('editKelas').value = user.kelas || '';
  document.getElementById('editPklLocation').value = user.pklLocation || '';
  document.getElementById('editLatitude').value = user.latitude_pkl || '';
  document.getElementById('editLongitude').value = user.longitude_pkl || '';
  document.getElementById('editPassword').value = '';
  
  // Show/hide kelas field based on role
  const kelasGroup = document.getElementById('editKelasGroup');
  const supervisorTab = document.getElementById('editTabSupervisor');
  
  if (user.role === 'siswa') {
    kelasGroup.style.display = 'block';
    supervisorTab.style.display = 'block';
    
    // Populate supervisor dropdown
    populateSupervisorDropdown(user.supervisor);
    _currentEditingSupervisor = user.supervisor || '';
    document.getElementById('currentSupervisorName').textContent = user.supervisor || 'Belum Ditentukan';
    // Update _currentEditingSupervisor saat user pilih dari dropdown
    var supSel = document.getElementById('editSupervisor');
    if (supSel) {
      supSel.onchange = function() { _currentEditingSupervisor = this.value; };
    }
  } else {
    kelasGroup.style.display = 'none';
    supervisorTab.style.display = 'none';
  }
  
  // Hide delete button for master admin
  const deleteBtn = document.getElementById('btnDeleteFromModal');
  if (user.username === 'admin' || user.role === 'admin') {
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Data Terkunci';
    deleteBtn.style.opacity = '0.5';
    deleteBtn.style.cursor = 'not-allowed';
  } else {
    deleteBtn.disabled = false;
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Hapus User';
    deleteBtn.style.opacity = '1';
    deleteBtn.style.cursor = 'pointer';
  }
  
  // Switch to first tab
  switchEditTab('basic');
  
  // Show modal
  document.getElementById('editUserModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeEditUserModal() {
  document.getElementById('editUserModal').classList.add('hidden');
  document.body.style.overflow = '';
  currentEditingUserId = null;

  // Bersihkan field Google Maps link dan feedback
  const gmLink = document.getElementById('editGoogleMapsLink');
  const fb = document.getElementById('editGeocodeFeedback');
  if (gmLink) gmLink.value = '';
  if (fb) { fb.style.display = 'none'; fb.textContent = ''; }
}

// --- Ambil koordinat dari link Google Maps yang ditempel -------------------
function parseGoogleMapsLinkEdit() {
  const linkEl = document.getElementById('editGoogleMapsLink');
  const latEl  = document.getElementById('editLatitude');
  const lngEl  = document.getElementById('editLongitude');
  const fb     = document.getElementById('editGeocodeFeedback');
  if (!linkEl || !latEl || !lngEl) return;

  const raw = linkEl.value.trim();
  if (!raw) { showToast('Tempel dulu link atau koordinat Google Maps!', 'error'); return; }

  let lat = null, lng = null;

  // Format 1: koordinat langsung "-7.9825, 112.6867" atau "-7.9825,112.6867"
  const coordMatch = raw.match(/(-?\d{1,3}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/);
  if (coordMatch) {
    lat = parseFloat(coordMatch[1]);
    lng = parseFloat(coordMatch[2]);
  }

  // Format 2: URL maps.google.com/?q=-7.9825,112.6867
  if (!lat) {
    const qMatch = raw.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) { lat = parseFloat(qMatch[1]); lng = parseFloat(qMatch[2]); }
  }

  // Format 3: URL @-7.9825,112.6867 (Google Maps share link)
  if (!lat) {
    const atMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) { lat = parseFloat(atMatch[1]); lng = parseFloat(atMatch[2]); }
  }

  // Format 4: URL /place/.../@ format
  if (!lat) {
    const placeMatch = raw.match(/\/\@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (placeMatch) { lat = parseFloat(placeMatch[1]); lng = parseFloat(placeMatch[2]); }
  }

  if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
    latEl.value = lat.toFixed(6);
    lngEl.value = lng.toFixed(6);
    linkEl.value = '';
    if (fb) {
      fb.style.display = 'block';
      fb.style.background = 'rgba(16,185,129,0.1)';
      fb.style.borderColor = 'rgba(16,185,129,0.3)';
      fb.style.color = '#34d399';
      fb.innerHTML = `<i class="fa-solid fa-circle-check"></i> Koordinat berhasil diambil: <strong>${lat.toFixed(6)}, ${lng.toFixed(6)}</strong> � Klik Simpan untuk menyimpan.`;
    }
    showToast(`?? Koordinat diambil: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 'success');
  } else {
    if (fb) {
      fb.style.display = 'block';
      fb.style.background = 'rgba(239,68,68,0.1)';
      fb.style.borderColor = 'rgba(239,68,68,0.3)';
      fb.style.color = '#f87171';
      fb.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Format tidak dikenali. Coba salin koordinat langsung (klik kanan di Google Maps ? "Salin koordinat").`;
    }
    showToast('Format link/koordinat tidak dikenali.', 'error');
  }
}

// --- Auto-reset koordinat saat nama PKL berubah di form edit ---------------
// Saat admin mengetik nama PKL baru, koordinat lama di-reset ke 0
// agar server tahu perlu geocode ulang — dan tampilkan geocode otomatis
var _editPklNamePrev = '';
var _editGeoDebounce = null;
function onEditPklLocationChange(newName) {
  const latEl = document.getElementById('editLatitude');
  const lngEl = document.getElementById('editLongitude');
  const fb    = document.getElementById('editGeocodeFeedback');

  // Reset koordinat saat nama berubah agar server geocode ulang
  if (latEl) latEl.value = '';
  if (lngEl) lngEl.value = '';

  if (!newName || !newName.trim()) return;

  // Debounce 700ms — auto geocode saat admin berhenti mengetik
  clearTimeout(_editGeoDebounce);
  if (fb) {
    fb.style.display = 'block';
    fb.style.background = 'rgba(79,70,229,0.08)';
    fb.style.color = '#94a3b8';
    fb.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mencari koordinat...';
  }
  _editGeoDebounce = setTimeout(function() { reGeocodeEditLocation(); }, 700);
}
window.onEditPklLocationChange = onEditPklLocationChange;

// --- Geocode ulang dari nama PKL di form edit ------------------------------
async function reGeocodeEditLocation() {
  const nameEl = document.getElementById('editPklLocation');
  const latEl  = document.getElementById('editLatitude');
  const lngEl  = document.getElementById('editLongitude');
  const fb     = document.getElementById('editGeocodeFeedback');
  if (!nameEl || !nameEl.value.trim()) {
    showToast('Isi dulu nama lokasi PKL!', 'error'); return;
  }

  const locationName = nameEl.value.trim();
  if (fb) {
    fb.style.display = 'block';
    fb.style.background = 'rgba(79,70,229,0.1)';
    fb.style.borderColor = 'rgba(99,102,241,0.3)';
    fb.style.color = '#a5b4fc';
    fb.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mencari koordinat untuk "${locationName}"...`;
  }

  const MALANG_LAT = -7.9825, MALANG_LNG = 112.6867;
  function haversineKm(la1, lo1, la2, lo2) {
    const R = 6371, dLa=(la2-la1)*Math.PI/180, dLo=(lo2-lo1)*Math.PI/180;
    const a=Math.sin(dLa/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  const nameLow = locationName.toLowerCase();
  const queries = [
    nameLow.includes('malang') ? `${locationName}, Jawa Timur, Indonesia` : `${locationName}, Malang, Jawa Timur, Indonesia`,
    `${locationName}, Indonesia`,
    locationName
  ];

  let found = null;
  for (const query of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=id`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'id', 'User-Agent': 'SIGAP-PKL-App/1.0' } });
      const results = await res.json();
      if (results && results.length > 0) {
        let best = null, bestDist = Infinity;
        for (const r of results) {
          const d = haversineKm(MALANG_LAT, MALANG_LNG, parseFloat(r.lat), parseFloat(r.lon));
          if (d < bestDist) { bestDist = d; best = r; }
        }
        if (best && bestDist <= 200) {
          found = { lat: parseFloat(best.lat), lng: parseFloat(best.lon), dist: bestDist };
          break;
        }
      }
    } catch(e) {}
  }

  if (found) {
    latEl.value = found.lat.toFixed(6);
    lngEl.value = found.lng.toFixed(6);
    if (fb) {
      fb.style.background = 'rgba(16,185,129,0.1)';
      fb.style.borderColor = 'rgba(16,185,129,0.3)';
      fb.style.color = '#34d399';
      fb.innerHTML = `<i class="fa-solid fa-circle-check"></i> Ditemukan: <strong>${found.lat.toFixed(5)}, ${found.lng.toFixed(5)}</strong> (~${found.dist.toFixed(1)}km dari Malang) � Klik Simpan untuk menyimpan.`;
    }
    showToast(`? Koordinat "${locationName}" ditemukan!`, 'success');
  } else {
    if (fb) {
      fb.style.background = 'rgba(245,158,11,0.1)';
      fb.style.borderColor = 'rgba(245,158,11,0.3)';
      fb.style.color = '#fbbf24';
      fb.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Nama PKL tidak ditemukan. Coba pakai nama lebih lengkap atau tempel koordinat dari Google Maps.`;
    }
    showToast(`? "${locationName}" tidak ditemukan. Tempel koordinat manual.`, 'error');
  }
}

// --- Buka Google Maps preview dari koordinat di form edit ------------------
function openGoogleMapsPreview() {
  const latEl = document.getElementById('editLatitude');
  const lngEl = document.getElementById('editLongitude');
  const nameEl = document.getElementById('editPklLocation');
  const lat = latEl ? latEl.value.trim() : '';
  const lng = lngEl ? lngEl.value.trim() : '';
  const name = nameEl ? nameEl.value.trim() : '';

  if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
    window.open(`https://www.google.com/maps?q=${lat},${lng}&z=17&hl=id`, '_blank');
  } else if (name) {
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(name + ' Malang')}`, '_blank');
  } else {
    showToast('Isi dulu nama atau koordinat PKL!', 'error');
  }
}

function switchEditTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.edit-tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Remove active class from all buttons
  document.querySelectorAll('.edit-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  if (tabName === 'basic') {
    document.getElementById('editTabBasic').style.display = 'block';
    document.querySelector('[data-tab="basic"]').classList.add('active');
  } else if (tabName === 'location') {
    document.getElementById('editTabLocationContent').style.display = 'block';
    document.querySelector('[data-tab="location"]').classList.add('active');
  } else if (tabName === 'supervisor') {
    document.getElementById('editTabSupervisorContent').style.display = 'block';
    document.querySelector('[data-tab="supervisor"]').classList.add('active');
  } else if (tabName === 'security') {
    document.getElementById('editTabSecurityContent').style.display = 'block';
    document.querySelector('[data-tab="security"]').classList.add('active');
  }
}

function populateSupervisorDropdown(currentSupervisor) {
  const supervisorSelect = document.getElementById('editSupervisor');
  const users = getUsers();
  const guruList = users.filter(u => u.role === 'guru' && u.username !== 'admin');
  
  supervisorSelect.innerHTML = '<option value="">-- Pilih Guru Pembimbing --</option>';
  
  guruList.forEach(guru => {
    const option = document.createElement('option');
    option.value = guru.name;
    option.textContent = `${guru.name}${guru.nomor_induk ? ' (NIP: ' + guru.nomor_induk + ')' : ''}`;
    
    if (guru.name === currentSupervisor) {
      option.selected = true;
    }
    
    supervisorSelect.appendChild(option);
  });
}

function toggleEditPasswordVisibility() {
  const pwdInput = document.getElementById('editPassword');
  const eyeIcon = document.getElementById('editPwdEyeIcon');
  
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    eyeIcon.className = 'fa-solid fa-eye-slash';
  } else {
    pwdInput.type = 'password';
    eyeIcon.className = 'fa-solid fa-eye';
  }
}

async function saveAllUserChanges() {
  if (currentEditingUserId === null) {
    showToast('Error: User ID tidak valid!', 'error');
    return;
  }

  const users = getUsers();
  const userIndex = users.findIndex(u => String(u.id) === String(currentEditingUserId));
  
  if (userIndex === -1) {
    showToast('User tidak ditemukan!', 'error');
    return;
  }

  const user = users[userIndex];
  
  // Get form values
  const newUsername = document.getElementById('editUsername').value.trim();
  const newKelas = document.getElementById('editKelas').value.trim();
  const newPklLocation = document.getElementById('editPklLocation').value.trim();
  // Baca lat/lng dari form — jika kosong berarti admin baru ketik nama PKL baru
  // Kirim 0 agar server auto-geocode via sigap_geocode_nominatim
  const _rawLat = document.getElementById('editLatitude').value.trim();
  const _rawLng = document.getElementById('editLongitude').value.trim();
  let newLatitude  = _rawLat  ? parseFloat(_rawLat)  : 0;
  let newLongitude = _rawLng  ? parseFloat(_rawLng)  : 0;
  // Jika nama PKL berubah dari data asli, paksa reset koordinat ke 0
  // agar server geocode ulang — KECUALI admin sudah eksplisit input koordinat baru yang valid
  const _origPkl = user.pklLocation || '';
  const _pklChanged = newPklLocation && newPklLocation.trim().toLowerCase() !== _origPkl.trim().toLowerCase();
  if (_pklChanged) {
    const _smkn9Lat = -7.9825, _smkn9Lng = 112.6867;
    const _isStillDefault = (Math.abs(newLatitude - _smkn9Lat) < 0.0005 && Math.abs(newLongitude - _smkn9Lng) < 0.0005);
    // Koordinat dianggap "baru & valid" jika: bukan 0, bukan SMKN9 default, dalam jangkauan wajar Indonesia
    const _isValidNewCoord = newLatitude !== 0 && newLongitude !== 0
      && !_isStillDefault
      && newLatitude >= -11 && newLatitude <= 6    // batas latitude Indonesia
      && newLongitude >= 95 && newLongitude <= 141; // batas longitude Indonesia
    if (!_isValidNewCoord) {
      // Tidak ada koordinat baru yang valid — reset ke 0 agar server geocode ulang
      newLatitude  = 0;
      newLongitude = 0;
    }
    // Jika _isValidNewCoord = true: admin sudah isi koordinat baru yang valid → pakai langsung
  }
  const newPassword = document.getElementById('editPassword').value.trim();
  // Bug 1 fix: baca supervisor dari dropdown dulu (element tetap ada di DOM meski tab hidden)
  // onchange update _currentEditingSupervisor, tapi juga baca langsung dari element sebagai backup
  const _supEl = document.getElementById('editSupervisor');
  // Tampilkan tab supervisor sementara untuk force-read value, lalu sembunyikan lagi
  const _supContent = document.getElementById('editTabSupervisorContent');
  const _supWasHidden = _supContent && _supContent.style.display === 'none';
  if (_supContent && _supWasHidden) _supContent.style.display = 'block';
  const _supVal = _supEl ? _supEl.value : '';
  if (_supContent && _supWasHidden) _supContent.style.display = 'none';
  if (_supVal) _currentEditingSupervisor = _supVal;
  const newSupervisor = _currentEditingSupervisor || user.supervisor || '';
  
  // Validate username
  if (!newUsername) {
    showToast('Username tidak boleh kosong!', 'error');
    switchEditTab('basic');
    return;
  }
  
  // Check duplicate username
  const isDuplicate = users.some(u => String(u.id) !== String(currentEditingUserId) && u.username === newUsername);
  if (isDuplicate) {
    showToast('Username sudah digunakan oleh user lain!', 'error');
    switchEditTab('basic');
    return;
  }
  
  // Update user data lokal DULU dari form values � tidak tunggu server response
  users[userIndex] = Object.assign({}, users[userIndex], {
    username: newUsername,
    kelas: newKelas,
    pklLocation: newPklLocation,
    tempat_pkl: newPklLocation,
    latitude_pkl: newLatitude,
    longitude_pkl: newLongitude,
    supervisor: (users[userIndex].role === 'siswa') ? newSupervisor : users[userIndex].supervisor,
    subtext: (users[userIndex].role === 'siswa' && newKelas)
      ? `NISN: ${users[userIndex].nomor_induk} � ${newKelas}`
      : users[userIndex].subtext,
    _localEditTs: Date.now()  // timestamp edit lokal � cegah sync overwrite
  });
  if (newPassword) {
    users[userIndex].password = newPassword;
  }

  // Simpan ke localStorage SEKARANG agar tabel langsung update
  _lastSaveTs = Date.now(); // blokir sync dari server selama 30 detik
  saveUsers(users);
  console.log('[SIGAP] Saved user:', users[userIndex].username, '| supervisor:', users[userIndex].supervisor);
  showToast(`Data ${users[userIndex].name} berhasil diperbarui!`, 'success');

  // Tutup modal dan render ulang tabel SEBELUM await fetch
  closeEditUserModal();
  renderAdminUsersTable();

  // Sync ke server di background � tidak blokir UI
  (async function() {
    try {
      var payload = {
        id: users[userIndex].id,
        name: users[userIndex].name,
        username: newUsername,
        kelas: newKelas,
        pklLocation: newPklLocation,
        tempat_pkl: newPklLocation,
        latitude_pkl: newLatitude,
        longitude_pkl: newLongitude,
        supervisor: newSupervisor || users[userIndex].supervisor || '',
        subtext: users[userIndex].subtext || '',
        password: newPassword || undefined
      };
      var res = await fetch(apiUrl('api.php?action=update_user_comprehensive'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);
      if (res && res.ok) {
        var rd = await res.json().catch(() => null);
        console.log('[SIGAP] update_user_comprehensive result:', JSON.stringify(rd));
        if (!rd || !rd.success) {
          console.warn('[SIGAP] Server gagal update:', rd);
        }
      } else {
        console.warn('[SIGAP] Backend sync failed, status:', res ? res.status : 'no response');
      }
    } catch (err) {
      console.warn('[SIGAP] Backend sync error:', err);
    }
    // Setelah server konfirmasi update, pull fresh data agar semua device sync
    // Delay 2 detik beri waktu server selesai tulis ke DB
    setTimeout(function() {
      _lastSaveTs = 0; // reset guard agar sync tidak diblokir
      syncDataFromServer();
    }, 2000);
  })();
}

// Custom confirm dialog � menggantikan window.confirm() yang diblokir di APK Capacitor
function showConfirmDialog(message, onConfirm, onCancel) {
  // Hapus dialog lama jika ada
  var old = document.getElementById('_sigapConfirmDialog');
  if (old) old.remove();

  var overlay = document.createElement('div');
  overlay.id = '_sigapConfirmDialog';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';

  var box = document.createElement('div');
  box.style.cssText = 'background:#1e293b;border:1px solid rgba(99,102,241,0.5);border-radius:16px;padding:24px;max-width:340px;width:100%;color:#fff;font-family:inherit;';

  var msg = document.createElement('p');
  msg.style.cssText = 'margin:0 0 20px 0;font-size:0.95rem;line-height:1.5;white-space:pre-line;';
  msg.textContent = message;

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:12px;';

  var btnCancel = document.createElement('button');
  btnCancel.textContent = 'Batal';
  btnCancel.style.cssText = 'flex:1;padding:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#fff;cursor:pointer;font-size:0.9rem;';

  var btnOk = document.createElement('button');
  btnOk.textContent = 'Hapus';
  btnOk.style.cssText = 'flex:1;padding:10px;background:linear-gradient(135deg,#dc2626,#ef4444);border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:0.9rem;font-weight:600;';

  btnCancel.onclick = function() { overlay.remove(); if (onCancel) onCancel(); };
  btnOk.onclick = function() { overlay.remove(); if (onConfirm) onConfirm(); };

  btnRow.appendChild(btnCancel);
  btnRow.appendChild(btnOk);
  box.appendChild(msg);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function confirmDeleteUserFromModal() {
  if (currentEditingUserId === null || currentEditingUserId === undefined) {
    showToast('Error: Pilih user terlebih dahulu!', 'error');
    return;
  }
  
  const users = getUsers();
  // Gunakan String() cast agar perbandingan ID selalu konsisten (string vs number)
  const user = users.find(u => String(u.id) === String(currentEditingUserId));
  
  if (!user) {
    showToast('Error: User tidak ditemukan di data lokal!', 'error');
    console.warn('[SIGAP] confirmDeleteUserFromModal: user not found, id=', currentEditingUserId);
    return;
  }
  
  if (user.username === 'admin' || user.role === 'admin') {
    showToast('Master Admin tidak dapat dihapus!', 'error');
    return;
  }
  
  showConfirmDialog(
    `Apakah Anda yakin ingin menghapus user:\n\n${user.name}\n${user.nomor_induk}\n\nData yang dihapus tidak dapat dikembalikan!`,
    function() {
      const userIdToDelete = currentEditingUserId;
      closeEditUserModal();
      deleteUserRecord(userIdToDelete);
    }
  );
}

window.openEditUserModal = openEditUserModal;
window.closeEditUserModal = closeEditUserModal;
window.switchEditTab = switchEditTab;
window.toggleEditPasswordVisibility = toggleEditPasswordVisibility;
window.saveAllUserChanges = saveAllUserChanges;
window.confirmDeleteUserFromModal = confirmDeleteUserFromModal;

function editStudentPklLocationPrompt(userId) {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) return;

  const u = users[userIndex];
  const newPklName = prompt(`Edit Nama Tempat PKL Baru untuk Siswa:\n"${u.name}" (NISN: ${u.nomor_induk})`, u.pklLocation || '');
  if (newPklName === null) return;

  const trimmedLocation = newPklName.trim();
  if (!trimmedLocation) {
    showToast('Nama tempat PKL tidak boleh kosong!', 'error');
    return;
  }

  // Auto-determine GPS latitude & longitude based on location name
  const coords = getCoordinatesByLocationName(trimmedLocation);
  const isGuruOnly = (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin');

  let newLat = coords.lat;
  let newLng = coords.lng;

  // Master Admin can optionally customize numeric coordinates
  if (!isGuruOnly) {
    const newLatStr = prompt(`Koordinat Latitude GPS PKL Baru:`, coords.lat);
    if (newLatStr === null) return;

    const newLngStr = prompt(`Koordinat Longitude GPS PKL Baru:`, coords.lng);
    if (newLngStr === null) return;

    newLat = parseFloat(newLatStr) || coords.lat;
    newLng = parseFloat(newLngStr) || coords.lng;
  }

  if (isGuruOnly) {
    const pendingPklData = {
      user_id: u.id,
      username: u.username,
      proposed_pkl_location: trimmedLocation,
      proposed_latitude_pkl: newLat,
      proposed_longitude_pkl: newLng,
      requested_by: activeUser.name
    };

    try {
      Promise.all([
        fetch('/api/request_edit_pkl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingPklData)
        }).catch(() => null),
        fetch('api.php?action=request_edit_pkl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingPklData)
        }).catch(() => null)
      ]);
    } catch(err) {
      console.warn('Request edit PKL sync failed:', err);
    }

    users[userIndex].status = 'pending_edit_pkl';
    users[userIndex].proposed_pkl_location = trimmedLocation;
    users[userIndex].proposed_latitude_pkl = newLat;
    users[userIndex].proposed_longitude_pkl = newLng;
    users[userIndex].edit_requested_by = activeUser.name;

    saveUsers(users);
    showToast(`Pengajuan edit lokasi PKL "${u.name}" ke "${trimmedLocation}" (GPS Otomatis: ${newLat}, ${newLng}) berhasil dikirim! Menunggu persetujuan Master Admin.`, 'info');
    renderAdminUsersTable();
    renderPendingUserApprovals();
  } else {
    users[userIndex].pklLocation = trimmedLocation;
    users[userIndex].latitude_pkl = newLat;
    users[userIndex].longitude_pkl = newLng;
    saveUsers(users);

    try {
      const updateData = {
        user_id: u.id,
        username: u.username,
        pklLocation: trimmedLocation,
        latitude_pkl: newLat,
        longitude_pkl: newLng
      };
      Promise.all([
        fetch('/api/update_pkl_location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        }).catch(() => null),
        fetch('api.php?action=update_pkl_location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        }).catch(() => null)
      ]);
    } catch(err) {}

    if (activeUser && activeUser.id === userId) {
      activeUser.pklLocation = trimmedLocation;
      activeUser.latitude_pkl = newLat;
      activeUser.longitude_pkl = newLng;
      saveAuth(activeUser);
      applyUserInterface(activeUser);
    }

    renderAdminUsersTable();
    showToast(`Berhasil memperbarui lokasi PKL ${u.name} ke ${trimmedLocation}!`, 'success');
  }
}

let _pklGeoDebounce = null;
let _pklMiniMap = null;
let _pklMiniMarker = null;

function autoPopulateFormCoords(locName) {
  const infoEl = document.getElementById('coordAutoInfo');
  const icon = document.getElementById('pklSearchIcon');

  if (!locName || !locName.trim()) {
    if (infoEl) infoEl.innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Ketik nama lokasi ? koordinat GPS otomatis terdeteksi dari Google Maps`;
    document.getElementById('pklMiniMapContainer').style.display = 'none';
    return;
  }

  // Debounce 600ms agar tidak spam request
  clearTimeout(_pklGeoDebounce);
  if (infoEl) infoEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mencari lokasi "${locName.trim()}"...`;
  if (infoEl) infoEl.style.color = '#94a3b8';

  _pklGeoDebounce = setTimeout(() => {
    geocodePklLocation(locName.trim());
  }, 600);
}

async function geocodePklLocation(locName) {
  const infoEl    = document.getElementById('coordAutoInfo');
  const coordText = document.getElementById('pklMiniMapCoordText');
  const gmLink    = document.getElementById('pklGoogleMapsLink');
  const gmSearch  = document.getElementById('pklGmSearchLink');
  const manPanel  = document.getElementById('pklManualCoordPanel');

  // Sembunyikan panel manual dulu
  if (manPanel) manPanel.style.display = 'none';

  // Update Google Maps search link real-time (selalu aktif)
  const gmSearchUrl = `https://www.google.com/maps/search/${encodeURIComponent(locName + ' Malang')}`;
  if (gmSearch) gmSearch.href = gmSearchUrl;
  if (gmLink)   gmLink.href   = gmSearchUrl;

  // Strategi multi-query: dari paling spesifik ke umum
  const stripped = locName
    .replace(/\b(pt\.?|cv\.?|ud\.?|tb\.?|toko|kantor|stasiun|pom|bengkel|ahass)\b/gi, '')
    .replace(/\s+/g, ' ').trim();
  const hasCity = /malang|surabaya|batu|blitar|jawa/i.test(locName);

  const queries = [
    hasCity ? `${locName}, Jawa Timur, Indonesia`        : `${locName}, Malang, Jawa Timur, Indonesia`,
    `${locName}, Kota Malang, Jawa Timur`,
    stripped && stripped !== locName && stripped.length > 3
      ? `${stripped}, Malang, Jawa Timur, Indonesia`     : null,
    `${locName}, Jawa Timur`,
  ].filter(Boolean);

  const MALANG_LAT = -7.9825, MALANG_LNG = 112.6867;
  function hvKm(la1, lo1, la2, lo2) {
    const R=6371, dLa=(la2-la1)*Math.PI/180, dLo=(lo2-lo1)*Math.PI/180;
    const a=Math.sin(dLa/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  let bestLat=0, bestLng=0, bestDist=Infinity, found=false;

  for (const q of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1&countrycodes=id`;
      const res = await fetch(url, { headers: { 'Accept-Language':'id', 'User-Agent':'SIGAP-PKL-App/1.0' } });
      if (!res.ok) continue;
      const results = await res.json();
      if (!results || results.length === 0) continue;

      for (const r of results) {
        const rlat=parseFloat(r.lat), rlng=parseFloat(r.lon);
        if (!rlat || !rlng) continue;
        const dist = hvKm(MALANG_LAT, MALANG_LNG, rlat, rlng);
        if (dist < bestDist) { bestDist=dist; bestLat=rlat; bestLng=rlng; }
      }
      if (bestDist <= 150) { found=true; break; }
    } catch(e) { /* lanjut query berikutnya */ }
  }

  if (found && bestLat !== 0) {
    // ✅ Berhasil
    const distTxt = bestDist < 1 ? `${(bestDist*1000).toFixed(0)}m` : `${bestDist.toFixed(1)}km`;
    if (infoEl) {
      infoEl.style.color = '#34d399';
      infoEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Ditemukan (${distTxt} dari Malang): <strong>${bestLat.toFixed(6)}, ${bestLng.toFixed(6)}</strong>`;
    }
    showPklMiniMap(bestLat, bestLng, locName);
    if (gmLink)    gmLink.href   = `https://www.google.com/maps?q=${bestLat},${bestLng}&label=${encodeURIComponent(locName)}`;
    if (coordText) coordText.textContent = `${bestLat.toFixed(6)}, ${bestLng.toFixed(6)}`;

  } else {
    // ❌ Tidak ditemukan — tampilkan panel input manual + link Google Maps search
    if (infoEl) {
      infoEl.style.color = '#f59e0b';
      infoEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Tidak ditemukan otomatis. Gunakan input manual di bawah atau `
        + `<a href="${gmSearchUrl}" target="_blank" style="color:#60a5fa; font-weight:700;"><i class="fa-brands fa-google"></i> cari di Google Maps</a>.`;
    }
    // Tampilkan panel manual — peta di pusat Malang sebagai referensi
    if (manPanel) {
      manPanel.style.display = 'block';
      if (gmSearch) gmSearch.href = gmSearchUrl;
      // Reset field lat/lng manual
      const mLat = document.getElementById('pklManualLat');
      const mLng = document.getElementById('pklManualLng');
      if (mLat) mLat.value = '';
      if (mLng) mLng.value = '';
    }
    // Sembunyikan mini map lama agar tidak tampilkan koordinat salah
    const mc = document.getElementById('pklMiniMapContainer');
    if (mc) mc.style.display = 'none';
  }
}

// Terapkan koordinat yang diisi manual oleh admin
function onManualCoordInput() {
  // Preview real-time di mini map saat admin mengetik
  const mLat = parseFloat(document.getElementById('pklManualLat')?.value);
  const mLng = parseFloat(document.getElementById('pklManualLng')?.value);
  if (!isNaN(mLat) && !isNaN(mLng) && mLat !== 0 && mLng !== 0
      && mLat >= -90 && mLat <= 90 && mLng >= -180 && mLng <= 180) {
    const locName = document.getElementById('newPklLocation')?.value.trim() || 'Lokasi PKL';
    showPklMiniMap(mLat, mLng, locName);
    const ct = document.getElementById('pklMiniMapCoordText');
    if (ct) ct.textContent = `${mLat.toFixed(6)}, ${mLng.toFixed(6)}`;
    const mc = document.getElementById('pklMiniMapContainer');
    if (mc) mc.style.display = 'block';
  }
}
window.onManualCoordInput = onManualCoordInput;

function applyManualCoord() {
  const mLat = parseFloat(document.getElementById('pklManualLat')?.value);
  const mLng = parseFloat(document.getElementById('pklManualLng')?.value);
  if (isNaN(mLat) || isNaN(mLng) || mLat === 0 || mLng === 0) {
    showToast('Isi Latitude dan Longitude terlebih dahulu!', 'error');
    return;
  }
  if (mLat < -90 || mLat > 90 || mLng < -180 || mLng > 180) {
    showToast('Koordinat tidak valid! Latitude: -90~90, Longitude: -180~180', 'error');
    return;
  }
  const locName = document.getElementById('newPklLocation')?.value.trim() || 'Lokasi PKL';
  showPklMiniMap(mLat, mLng, locName);
  const ct = document.getElementById('pklMiniMapCoordText');
  if (ct) ct.textContent = `${mLat.toFixed(6)}, ${mLng.toFixed(6)}`;
  const mc = document.getElementById('pklMiniMapContainer');
  if (mc) mc.style.display = 'block';
  const mp = document.getElementById('pklManualCoordPanel');
  if (mp) mp.style.display = 'none';
  const infoEl = document.getElementById('coordAutoInfo');
  if (infoEl) {
    infoEl.style.color = '#34d399';
    infoEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Koordinat manual diterapkan: <strong>${mLat.toFixed(6)}, ${mLng.toFixed(6)}</strong>`;
  }
  showToast(`Koordinat ${locName} berhasil diterapkan!`, 'success');
}
window.applyManualCoord = applyManualCoord;

// Ambil GPS posisi admin saat ini sebagai koordinat PKL
function ambilGpsSaatIni() {
  if (!navigator.geolocation) { showToast('GPS tidak didukung di perangkat ini', 'error'); return; }
  showToast('Mendeteksi GPS...', 'info');
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      const mLat = document.getElementById('pklManualLat');
      const mLng = document.getElementById('pklManualLng');
      if (mLat) mLat.value = lat.toFixed(6);
      if (mLng) mLng.value = lng.toFixed(6);
      onManualCoordInput();
      showToast(`GPS berhasil: ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${Math.round(pos.coords.accuracy)}m)`, 'success');
    },
    function() { showToast('Gagal ambil GPS. Coba lagi atau isi manual.', 'error'); },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}
window.ambilGpsSaatIni = ambilGpsSaatIni;

function searchPklLocationOnMaps() {
  const input = document.getElementById('newPklLocation');
  if (input && input.value.trim()) {
    geocodePklLocation(input.value.trim());
  }
}

function showPklMiniMap(lat, lng, label) {
  const container = document.getElementById('pklMiniMapContainer');
  if (!container) return;
  container.style.display = 'block';

  if (!_pklMiniMap) {
    _pklMiniMap = L.map('pklMiniMap', { zoomControl: true, attributionControl: false }).setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_pklMiniMap);
  } else {
    _pklMiniMap.setView([lat, lng], 16);
  }

  if (_pklMiniMarker) _pklMiniMap.removeLayer(_pklMiniMarker);
  _pklMiniMarker = L.marker([lat, lng]).addTo(_pklMiniMap)
    .bindPopup(`<b>${label}</b>`).openPopup();

  // Radius geofence preview (350m)
  if (_pklMiniMap._geofenceCircle) _pklMiniMap.removeLayer(_pklMiniMap._geofenceCircle);
  _pklMiniMap._geofenceCircle = L.circle([lat, lng], {
    color: '#4f46e5', fillColor: '#6366f1', fillOpacity: 0.15, radius: 350
  }).addTo(_pklMiniMap);

  setTimeout(() => { if (_pklMiniMap) _pklMiniMap.invalidateSize(); }, 150);
}

// Toggle form fields based on selected role
function toggleFormFieldsByRole() {
  const roleSelect = document.getElementById('newRole');
  const siswaFields = document.getElementById('siswaFieldsGroup');
  const guruFields = document.getElementById('guruFieldsGroup');
  
  if (!roleSelect) return;
  
  const selectedRole = roleSelect.value;
  
  if (selectedRole === 'siswa') {
    // Tampilkan field siswa
    if (siswaFields) siswaFields.classList.remove('hidden');
    if (guruFields) guruFields.classList.add('hidden');
    
    // Populate dropdown guru pembimbing
    populateGuruPembimbingDropdown();
  } else {
    // Tampilkan field guru
    if (siswaFields) siswaFields.classList.add('hidden');
    if (guruFields) guruFields.classList.remove('hidden');
  }
}

// Populate dropdown guru pembimbing dari daftar user
function populateGuruPembimbingDropdown() {
  const supervisorSelect = document.getElementById('newSupervisor');
  if (!supervisorSelect) return;
  
  const users = getUsers();
  const guruList = users.filter(u => u.role === 'guru' || u.role === 'admin');
  
  // Clear existing options except first
  supervisorSelect.innerHTML = '<option value="">-- Pilih Guru Pembimbing --</option>';
  
  // Add guru options
  guruList.forEach(guru => {
    const option = document.createElement('option');
    option.value = guru.name;
    option.textContent = `${guru.name} ${guru.nomor_induk ? '(NIP: ' + guru.nomor_induk + ')' : ''}`;
    supervisorSelect.appendChild(option);
  });
  
  // Set default if only one guru
  if (guruList.length === 1) {
    supervisorSelect.value = guruList[0].name;
  }
}

// Initialize form on page load
window.toggleFormFieldsByRole = toggleFormFieldsByRole;
window.populateGuruPembimbingDropdown = populateGuruPembimbingDropdown;

async function handleCreateUserSubmit(e) {
  e.preventDefault();
  const isGuruOnly = (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin');
  const role = isGuruOnly ? 'siswa' : document.getElementById('newRole').value;
  const nomor_induk = document.getElementById('newNomorInduk').value.trim();
  const name = document.getElementById('newName').value.trim();
  const password = document.getElementById('newPassword').value.trim() || '123456';
  const school = document.getElementById('newSchool').value.trim();
  
  // Get role-specific fields
  let pklLocation = '';
  let kelas = '';
  let assignedSupervisor = '';
  let coords = { lat: -7.9825, lng: 112.6867 }; // Default: SMKN 9 Malang
  
  if (role === 'siswa') {
    // Siswa fields
    kelas = document.getElementById('newKelas') ? document.getElementById('newKelas').value.trim() : '';
    assignedSupervisor = document.getElementById('newSupervisor') ? document.getElementById('newSupervisor').value.trim() : '';
    pklLocation = document.getElementById('newPklLocation').value.trim();
    
    // Task 5: Ambil koordinat dari mini map jika sudah di-geocode (Nominatim),
    // fallback ke TARGET_LOCATION jika nama PKL sama, lalu fallback ke dictionary
    if (pklLocation) {
      // Ambil koordinat dari mini map (hasil geocode Nominatim) — sumber paling akurat
      // Fallback ke input manual koordinat jika mini map tidak ada
      if (_pklMiniMarker && _pklMiniMap) {
        const latLng = _pklMiniMarker.getLatLng();
        if (latLng && latLng.lat && latLng.lng) {
          coords = { lat: latLng.lat, lng: latLng.lng };
        } else {
          coords = { lat: 0, lng: 0 };
        }
      } else {
        // Coba baca dari panel input manual
        const mLat = parseFloat(document.getElementById('pklManualLat')?.value);
        const mLng = parseFloat(document.getElementById('pklManualLng')?.value);
        if (!isNaN(mLat) && !isNaN(mLng) && mLat !== 0 && mLng !== 0) {
          coords = { lat: mLat, lng: mLng };
        } else {
          coords = { lat: 0, lng: 0 }; // server akan geocode via Nominatim
        }
      }
    }
    
    // Set default supervisor if not selected
    if (!assignedSupervisor) {
      assignedSupervisor = isGuruOnly ? activeUser.name : 'Gigih Perkasa, ST., M.Pd.';
    }
  } else {
    // Guru fields
    pklLocation = 'SMK Negeri 9 Malang';
    assignedSupervisor = 'Administrator Sekolah';
    // Koordinat SMKN 9 Malang
    coords = { lat: -7.9825, lng: 112.6867 };
  }

  const users = getUsers();

  if (users.some(u => u.nomor_induk === nomor_induk || u.username === nomor_induk)) {
    showToast('User tersebut sudah terdaftar!', 'error');
    return;
  }

  const userStatus = isGuruOnly ? 'pending' : 'approved';
  
  // Build subtext based on role
  let subtext = '';
  if (role === 'admin') {
    subtext = `NIP: ${nomor_induk} � Administrator`;
  } else if (role === 'guru') {
    subtext = `NIP: ${nomor_induk} � Guru Pembimbing`;
  } else {
    // Task 7: subtext siswa sinkron dengan kelas yang diinput, tanpa default hardcoded
    subtext = kelas ? `NISN: ${nomor_induk} � ${kelas}` : `NISN: ${nomor_induk}`;
  }

  const newUser = {
    id: Date.now(),
    username: nomor_induk,
    nomor_induk,
    password,
    role: role.toLowerCase(),
    name,
    subtext,
    kelas: kelas || '',
    school: school || 'SMK Negeri 9 Malang',
    pklLocation: pklLocation || (role === 'guru' ? 'SMK Negeri 9 Malang' : 'PT. Tech Solution'),
    latitude_pkl: coords.lat,
    longitude_pkl: coords.lng,
    supervisor: assignedSupervisor,
    status: userStatus,
    avatar: role === 'guru' || role === 'admin' ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=250' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250'
  };

  // Sync to BOTH Backend Server APIs (Python & PHP)
  try {
    const [resPy, resPhp] = await Promise.all([
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(apiUrl('api.php?action=create_user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      }).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    const apiId = (resPy && resPy.id) || (resPhp && resPhp.id);
    if (apiId) newUser.id = apiId;
  } catch(err) {
    console.warn('Backend sync failed:', err);
  }

  // Tandai user baru dengan timestamp lokal agar tidak terhapus sync sebelum server konfirmasi
  newUser._localEditTs = Date.now();

  users.push(newUser);
  saveUsers(users);
  renderAdminUsersTable();

  // Sync ke server di background � tidak blokir UI
  // Jangan jalankan syncDataFromServer setelah create karena server mungkin belum terima
  // (terutama di APK dengan SSL issue). User tetap ada di localStorage selama _localEditTs < 60 detik.
  // Polling 8 detik akan sync dari server setelah server konfirmasi.
  console.log('[SIGAP] User baru disimpan lokal:', newUser.username, '| server sync pending');

  document.getElementById('addUserForm').reset();

  // Reset mini map PKL preview
  const pklMiniContainer = document.getElementById('pklMiniMapContainer');
  if (pklMiniContainer) pklMiniContainer.style.display = 'none';
  if (_pklMiniMap) { try { _pklMiniMap.remove(); } catch(e) {} _pklMiniMap = null; _pklMiniMarker = null; }
  // Reset panel input manual koordinat
  const manPanel = document.getElementById('pklManualCoordPanel');
  if (manPanel) manPanel.style.display = 'none';
  const mLat = document.getElementById('pklManualLat');
  const mLng = document.getElementById('pklManualLng');
  if (mLat) mLat.value = '';
  if (mLng) mLng.value = '';
  const coordInfoEl = document.getElementById('coordAutoInfo');
  if (coordInfoEl) {
    coordInfoEl.style.color = '#34d399';
    coordInfoEl.innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Ketik nama lokasi → koordinat GPS otomatis terdeteksi dari Google Maps`;
  }
  
  if (userStatus === 'pending') {
    showToast(`Pengajuan Siswa Baru ${name} berhasil dikirim! Menunggu persetujuan Master Admin.`, 'info');
  } else {
    showToast(`Pengguna ${name} (${role.toUpperCase()}) berhasil ditambahkan & aktif!`, 'success');
  }
  
  renderAdminUsersTable();
}

async function resetUserPasswordPrompt(userId) {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;

  const isGuruOnly = (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin');
  const newPwd = prompt(`Masukkan Password Baru untuk ${user.name}:`, "123456");
  if (newPwd !== null && newPwd.trim() !== "") {
    const pwdTrimmed = newPwd.trim();
    user.password = pwdTrimmed;

    if (isGuruOnly) {
      user.status = 'pending';
    }

    try {
      const payload = { user_id: user.id, username: user.username, password: pwdTrimmed, status: user.status || 'approved' };
      await Promise.all([
        fetch('/api/reset_password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null),
        fetch('api.php?action=reset_password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null)
      ]);
    } catch(err) {
      console.warn('Password sync failed:', err);
    }

    saveUsers(users);
    if (isGuruOnly) {
      showToast(`Reset password ${user.name} berhasil diajukan! Menunggu persetujuan Master Admin.`, 'info');
    } else {
      showToast(`Password ${user.name} berhasil diubah & aktif!`, 'success');
    }
    renderAdminUsersTable();
  }
}

async function deleteUserRecord(userId) {
  const users = getUsers();
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return;

  // Proteksi master admin
  if ((user.username && user.username.toLowerCase() === 'admin') || user.role === 'admin') {
    showToast('Akun Master Admin tidak dapat dihapus!', 'error');
    return;
  }

  const isGuruOnly = (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin');

  if (isGuruOnly) {
    // Guru hanya bisa ajukan hapus � butuh persetujuan admin
    // Pakai showConfirmDialog karena confirm() diblokir di APK Capacitor
    showConfirmDialog(
      `Ajukan penghapusan akun siswa:\n\n${user.name}\n${user.nomor_induk}\n\nke Master Admin?`,
      function() {
        user.status = 'pending_delete';
        user.delete_requested_by = activeUser.name;
        saveUsers(users);
        fetch(apiUrl('api.php?action=request_delete_user'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, username: user.username, requested_by: activeUser.name })
        }).catch(() => null);
        showToast(`Pengajuan hapus ${user.name} dikirim. Menunggu persetujuan Master Admin.`, 'info');
        renderAdminUsersTable();
        renderPendingUserApprovals();
      }
    );
    return;
  }

  // Master admin � langsung hapus
  const updatedUsers = users.filter(u => String(u.id) !== String(userId));
  saveUsers(updatedUsers);
  showToast(`User ${user.name} berhasil dihapus!`, 'success');
  renderAdminUsersTable();
  renderPendingUserApprovals();

  // Sync ke server di background
  fetch(apiUrl('api.php?action=delete_user'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: user.id })
  }).then(r => r.ok ? r.json() : null)
    .then(rd => {
      if (rd) console.log('[SIGAP] delete_user:', rd.message || rd);
      // Trigger sync ke semua device setelah hapus
      setTimeout(function() { syncDataFromServer(); }, 1000);
    })
    .catch(err => console.warn('[SIGAP] delete_user error:', err));
}

async function resetDatabasePrompt() {
  // Lapisan 1: cek role � hanya Master Admin
  const isAdmin = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');
  if (!isAdmin) {
    showToast('Aksi ini hanya dapat dilakukan oleh Master Admin!', 'error');
    return;
  }

  // Lapisan 2 & 3: Pakai showConfirmDialog (prompt() diblokir di APK Capacitor)
  showConfirmDialog(
    '?? RESET DATABASE\n\nAksi ini akan MENGHAPUS SELURUH:\n� Data Log Presensi\n� Permohonan Izin/Sakit\n� Seluruh Akun Siswa & Guru\n\n? Akun Master Admin tetap dipertahankan.\n\nLanjutkan reset database?',
    async function() {
      // Konfirmasi kedua � password admin
      showConfirmDialog(
        '?? Konfirmasi Akhir\n\nKetik password Master Admin untuk melanjutkan.\n\nPassword: ' + (activeUser.password || 'sampurna01') + '\n\nApakah Anda sudah yakin?',
        async function() {
          await _doResetDatabase();
        }
      );
    }
  );
}

async function _doResetDatabase() {
  try {
    showToast('Mereset seluruh data database server...', 'info');
    // Kirim reset ke server (fire-and-forget)
    fetch(apiUrl('api.php?action=reset_database'), { method: 'POST' }).catch(function(e) {
      console.warn('[SIGAP] reset_database server sync:', e);
    });

    // Keep ONLY Master Admin in Local Storage & Reset Avatar
    const adminUser = activeUser;
    let users = getUsers().filter(u => u.username === 'admin' || u.role === 'admin');
    if (users.length === 0 && adminUser) users.push(adminUser);
    if (users.length > 0) {
      users[0].avatar = 'img/admin_avatar.jpg';
    }

    if (activeUser && (activeUser.username === 'admin' || activeUser.role === 'admin')) {
      activeUser.avatar = 'img/admin_avatar.jpg';
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(activeUser));
    }

    const headerImg = document.getElementById('headerAvatarImg');
    if (headerImg) headerImg.src = 'img/admin_avatar.jpg';
    const profileImg = document.getElementById('profileAvatarImg');
    if (profileImg) profileImg.src = 'img/admin_avatar.jpg';

    saveUsers(users);
    saveLogs([]);
    savePermissions([]);
    saveApprovalReports([]);
    // Reset guard: blok sync dari server selama 60 detik
    _resetGuardUntil = Date.now() + 60000;
    _lastLogSyncTs = Date.now();

    // Refresh cache koordinat — cache in-memory dibersihkan dari entri berbasis user
    // yang sudah dihapus, tapi cache localStorage (geocache) tetap dipertahankan
    // agar import ulang siswa bisa langsung pakai koordinat yang sudah pernah dicari
    setTimeout(function() { if (typeof _initGeocodeCache === 'function') _initGeocodeCache(); }, 300);

    showToast('Database berhasil di-reset sepenuhnya! Semua data & foto profil dihapus (Akun Master Admin dipertahankan).', 'success');
  } catch (err) {
    console.error('Reset database failed:', err);
    showToast('Gagal mereset database server', 'error');
    return;
  }
  // Render di luar try agar error render tidak picu toast Gagal
  try { renderAdminUsersTable(); } catch(e) {}
  try { renderPendingUserApprovals(); } catch(e) {}
  try { renderAdminDashboard(); } catch(e) {}
  try { renderGuruLogPresensiTab(); } catch(e) {}
  try { renderGuruApprovalTab(); } catch(e) {}
  try { renderStats(); } catch(e) {}
  try { renderTodayStatus(); } catch(e) {}
  try { renderHistoryList(); } catch(e) {}
  try { renderPermissionList(); } catch(e) {}
}

async function resetStudentAttendanceStatsPrompt() {
  const isAdmin = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');
  if (!isAdmin) {
    showToast('Aksi ini hanya dapat dilakukan oleh Master Admin!', 'error');
    return;
  }

  showConfirmDialog(
    '?? RESET REKAP PRESENSI\n\nAksi ini akan MENGOSONGKAN:\n✓ Total Kehadiran, Izin, Sakit, Alpa seluruh Siswa\n✓ Log Presensi Masuk & Pulang (Riwayat Absen)\n✓ Grafik Statistik Kehadiran\n✓ Pengajuan Izin/Sakit Pending\n\n⚠ Akun Siswa & Guru TIDAK dihapus.\n\nLanjutkan reset rekap presensi?',
    async function() {
      await _doResetAttendance();
    }
  );
}

async function _doResetAttendance() {
  try {
    showToast('Mengosongkan seluruh rekap presensi, statistik & izin siswa...', 'info');
    // Kirim reset ke server (fire-and-forget)
    fetch(apiUrl('api.php?action=reset_attendance_data'), { method: 'POST' }).catch(function(e) {
      console.warn('[SIGAP] reset_attendance_data server sync:', e);
    });

    saveLogs([]);
    savePermissions([]);
    localStorage.removeItem('absensi_monthly_reports');
    // Reset guard: blok sync dari server selama 60 detik
    _resetGuardUntil = Date.now() + 60000;
    _lastLogSyncTs = Date.now();

    showToast('Seluruh data Hadir, Izin, Sakit, Alpa, Pengajuan Izin & Grafik Statistik Kehadiran berhasil dikosongkan!', 'success');
  } catch (err) {
    console.error('Reset attendance stats failed:', err);
    showToast('Gagal mereset rekap presensi', 'error');
    return;
  }
  try { renderAdminUsersTable(); } catch(e) {}
  try { renderAdminDashboard(); } catch(e) {}
  try { renderGuruLogPresensiTab(); } catch(e) {}
  try { renderGuruApprovalTab(); } catch(e) {}
  try { renderStats(); } catch(e) {}
  try { renderTodayStatus(); } catch(e) {}
  try { renderHistoryList(); } catch(e) {}
  try { renderPermissionList(); } catch(e) {}
  try { renderChart(); } catch(e) {}
  try { renderMonthlyReportsArchive(); } catch(e) {}
}

async function resetPresensiLogsOnlyPrompt() {
  const isAdmin = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');
  if (!isAdmin) {
    showToast('Aksi ini hanya dapat dilakukan oleh Master Admin!', 'error');
    return;
  }

  const confirmWord = prompt(
    "?? KONFIRMASI RESET LOG PRESENSI HARIAN!\n\n" +
    "Aksi ini akan MENGOSONGKAN SELURUH:\n" +
    "1. Riwayat Log Presensi Masuk, Pulang, Pengantaran, Monitoring, Penjemputan\n" +
    "2. Foto Selfie Presensi & Koordinat GPS\n\n" +
    "? Surat Izin / Sakit & Seluruh Akun User AKAN TETAP UTUH.\n\n" +
    "Ketik kata 'LOG' untuk mengonfirmasi:"
  );

  if (!confirmWord || confirmWord.trim().toUpperCase() !== 'LOG') {
    showToast('Proses reset log presensi dibatalkan.', 'info');
    return;
  }

  try {
    showToast('Mengosongkan seluruh riwayat log presensi harian...', 'info');

    // Kosongkan localStorage dulu (tidak perlu tunggu server)
    saveLogs([]);
    // Reset guard: blok sync dari server selama 60 detik
    _resetGuardUntil = Date.now() + 60000;
    _lastLogSyncTs = Date.now();

    // Kirim ke server secara async (tidak blocking)
    fetch(apiUrl('api.php?action=reset_presensi_logs_only'), {
      method: 'POST'
    }).catch(function(e) {
      console.warn('[SIGAP] reset_presensi_logs_only server sync failed:', e);
    });

    showToast('Seluruh riwayat log presensi harian berhasil dikosongkan!', 'success');
  } catch (err) {
    console.error('Reset presensi logs failed:', err);
    showToast('Gagal mereset log presensi harian', 'error');
    return;
  }

  // Render ulang setelah reset — di luar try agar error render tidak picu toast "Gagal"
  try { renderAdminDashboard(); } catch(e) {}
  try { renderGuruLogPresensiTab(); } catch(e) {}
  try { renderStats(); } catch(e) {}
  try { renderTodayStatus(); } catch(e) {}
  try { renderHistoryList(); } catch(e) {}
}

// Expose semua fungsi reset ke window agar bisa dipanggil dari onclick HTML
window.resetDatabasePrompt = resetDatabasePrompt;
window.resetStudentAttendanceStatsPrompt = resetStudentAttendanceStatsPrompt;
window.resetPresensiLogsOnlyPrompt = resetPresensiLogsOnlyPrompt;
window.resetPrincipalSettingsForm = resetPrincipalSettingsForm;
window.resetUserPasswordPrompt = resetUserPasswordPrompt;
window.resetAdminPassword = resetAdminPassword;

function handleCSVFileSelect(input) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const fileNamePreview = document.getElementById('csvFileNamePreview');
  if (fileNamePreview) {
    fileNamePreview.innerHTML = `<span style="color:#34d399"><i class="fa-solid fa-file-csv"></i> ${file.name} (Siap Diimpor)</span>`;
  }

  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    // Baca Excel menggunakan SheetJS
    if (typeof XLSX === 'undefined') {
      showToast('Library Excel belum siap. Coba refresh halaman lalu upload ulang.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        // Ambil sheet pertama
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Konversi ke CSV dengan delimiter tab
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t', RS: '\n' });
        parseAndImportCSV(csvOutput);
      } catch(err) {
        showToast('Gagal membaca file Excel: ' + (err.message || 'format tidak dikenali'), 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    // Baca CSV/TXT biasa sebagai teks
    const reader = new FileReader();
    reader.onload = function(e) { parseAndImportCSV(e.target.result); };
    reader.readAsText(file, 'UTF-8');
  }
}

async function parseAndImportCSV(csvText) {
  const usersList = getUsers();
  let importedSiswaCount = 0;
  let importedGuruCount = 0;
  const validationErrors = [];
  const processedNomorInduks = new Set();
  const processedUsernames = new Set();

  let rawRows = [];
  if (csvText.includes('<tr>') || csvText.includes('<td>')) {
    const doc = new DOMParser().parseFromString(csvText, 'text/html');
    const trElements = doc.querySelectorAll('tr');
    trElements.forEach(tr => {
      const cells = tr.querySelectorAll('th, td');
      if (cells.length > 0) {
        rawRows.push(Array.from(cells).map(c => c.textContent.trim()));
      }
    });
  } else {
    const lines = csvText.split(/\r\n|\n/);
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('sep=')) {
        const delimiter = trimmed.includes(';') ? ';' : (trimmed.includes('\t') ? '\t' : ',');
        const parts = trimmed.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));
        rawRows.push(parts);
      }
    });
  }

  if (rawRows.length === 0) {
    showToast('File CSV/Excel kosong atau format file tidak dapat dibaca.', 'error');
    return;
  }

  for (let rowIndex = 0; rowIndex < rawRows.length; rowIndex++) {
    const parts = rawRows[rowIndex];
    const rowNum = rowIndex + 1;

    if (!parts || parts.length === 0) continue;
    const rawRole = (parts[0] || '').toLowerCase();
    const rawName = parts[1] || '';

    // Skip header row dan baris keterangan dari template
    if (rawRole === 'role' || rawName.toLowerCase() === 'nama' || rawRole === 'peran') {
      continue;
    }
    // Skip baris keterangan template — cek seluruh isi baris
    var allCellsText = parts.join(' ').toLowerCase();
    var isKeteranganRow = (
      allCellsText.includes('kosongkan') ||
      allCellsText.includes('(kosongkan') ||
      allCellsText.includes('jika guru') ||
      allCellsText.includes('(keterangan') ||
      allCellsText.includes('contoh:') ||
      rawName.trim().startsWith('(') ||
      rawName.trim().toLowerCase().includes('kosongkan') ||
      // Baris dengan role kosong dan nama kosong = baris sub-header/keterangan
      (rawRole.trim() === '' && rawName.trim() === '') ||
      (rawRole === '' && rawName === '' && (parts[3] || '') === '')
    );
    if (isKeteranganRow) continue;

    const name = rawName;
    const nomor_induk = parts[2] || '';
    const username = parts[3] || nomor_induk;
    const password = parts[4] || '123456';
    const kelas = parts[5] || ''; // Kolom kelas baru (index 5)
    const school = parts[6] || 'SMK Negeri 9 Malang';
    const pklLocation = parts[7] || 'PT. Tech Solution';

    let latVal = NaN;
    let lngVal = NaN;
    let supervisor = '';

    // Support old format (8 kolom) dan new format (9 kolom)
    if (parts.length >= 11) {
      // Format lama dengan lat/lng eksplisit: role, nama, nomor_induk, username, password, kelas, sekolah, lokasi_pkl, lat, lng, guru_pembimbing
      latVal = parseFloat(parts[8]);
      lngVal = parseFloat(parts[9]);
      supervisor = parts[10];
    } else {
      // Format baru: role, nama, nomor_induk, username, password, kelas, sekolah, lokasi_pkl, guru_pembimbing (lat/lng auto-detect)
      supervisor = parts[8] || '';
    }

    // Validation 1: Missing Name
    if (!name) {
      validationErrors.push({
        row: rowNum,
        data: parts.join(' | ') || '(Baris Kosong)',
        issue: 'Nama Lengkap Kosong',
        suggestion: 'Isikan Nama Lengkap pengguna pada kolom ke-2.'
      });
      continue;
    }

    // Validation 2: NIP/NISN hanya untuk informasi data — login pakai username+password
    // Boleh kosong, tidak diblokir

    // Validation 3: Invalid Role
    const validRoles = ['siswa', 'guru', 'admin'];
    if (rawRole && !validRoles.includes(rawRole)) {
      validationErrors.push({
        row: rowNum,
        data: `Role: "${rawRole}" | Nama: ${name}`,
        issue: `Role "${rawRole}" Tidak Sesuai Format`,
        suggestion: 'Gunakan kata "siswa" atau "guru" pada kolom pertama (role).'
      });
      continue;
    }
    const role = rawRole === 'guru' || rawRole === 'admin' ? rawRole : 'siswa';

    // Validation 4: Duplikat NISN/NIP dalam file — hanya cek jika nomor_induk tidak kosong
    if (nomor_induk && processedNomorInduks.has(nomor_induk)) {
      validationErrors.push({
        row: rowNum,
        data: `Nama: ${name} | NISN/NIP: ${nomor_induk}`,
        issue: `Duplikasi NISN/NIP (${nomor_induk}) dalam File CSV`,
        suggestion: 'Hapus baris yang ganda pada file CSV. Pastikan NISN/NIP unik untuk tiap baris.'
      });
      continue;
    }
    if (processedUsernames.has(username)) {
      validationErrors.push({
        row: rowNum,
        data: `Nama: ${name} | Username: ${username}`,
        issue: `Duplikasi Username "${username}" dalam File CSV`,
        suggestion: 'Gunakan Username unik pada kolom ke-4 untuk setiap baris.'
      });
      continue;
    }

    // Validation 5: Already registered in Database
    // Login menggunakan username — cek duplikat hanya berdasarkan username
    const existingInDb = usersList.find(u => u.username === username);
    if (existingInDb) {
      // Jika sudah ada: jangan buat user baru, tapi update lokasi PKL + geocode jika koordinat masih 0/default
      const existLat = parseFloat(existingInDb.latitude_pkl);
      const existLng = parseFloat(existingInDb.longitude_pkl);
      const existNeedsGeocode = isNaN(existLat) || existLat === 0
        || (Math.abs(existLat - (-7.9825)) < 0.001 && Math.abs(existLng - 112.6867) < 0.001)
        || (Math.abs(existLat - (-7.9700)) < 0.001 && Math.abs(existLng - 112.6326) < 0.001);
      const locationChanged = pklLocation && pklLocation.trim() !== '' && pklLocation.trim() !== existingInDb.pklLocation;

      if (existNeedsGeocode || locationChanged) {
        // Update lokasi dan trigger geocode untuk user yang sudah ada
        const newLoc = pklLocation.trim() || existingInDb.pklLocation;
        const idxExist = usersList.indexOf(existingInDb);
        if (idxExist !== -1) {
          usersList[idxExist].pklLocation = newLoc;
          usersList[idxExist].latitude_pkl = 0;
          usersList[idxExist].longitude_pkl = 0;
        }
        // Trigger geocode dengan delay berdasarkan posisi di array
        setTimeout(function() {
          if (typeof geocodeLocationName === 'function') {
            geocodeLocationName(newLoc, existingInDb);
          }
        }, (rowIndex % 50) * 1200);
      } else {
        // Koordinat sudah valid, tidak perlu apa-apa
      }
      continue; // jangan buat user baru
    }

    // Hanya track nomor_induk jika tidak kosong (NISN/NIP boleh kosong)
    if (nomor_induk) processedNomorInduks.add(nomor_induk);
    processedUsernames.add(username);

    if (!supervisor) {
      supervisor = (activeUser?.role === 'guru') ? activeUser.name : 'Gigih Perkasa, ST., M.Pd.';
    }

    if (isNaN(latVal) || isNaN(lngVal)) {
      // Jangan pakai koordinat kamus lokal untuk dikirim ke server
      // Server akan menerima 0, lalu geocode via Nominatim akan update koordinat presisi
      latVal = 0;
      lngVal = 0;
    }

    const userStatus = (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin') ? 'pending' : 'approved';
    // Tanggal mulai PKL = hari ini saat diimport (ISO date)
    const todayImport = new Date().toISOString().split('T')[0];
    const newUserObj = {
      id: Date.now() + rowIndex,
      role,
      name,
      nomor_induk,
      username,
      password,
      kelas: role === 'siswa' ? kelas : '', // Tambahkan kelas (hanya untuk siswa)
      school,
      pklLocation,
      latitude_pkl: latVal,
      longitude_pkl: lngVal,
      supervisor,
      pkl_start_date: todayImport, // Tanggal siswa mulai PKL = tanggal diupload
      status: userStatus,
      subtext: role === 'admin' ? `NIP: ${nomor_induk} � Administrator` : role === 'guru' ? `NIP: ${nomor_induk} � Guru Pembimbing` : `NISN: ${nomor_induk}`,
      avatar: role === 'guru' || role === 'admin' ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=250' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250'
    };

    try {
      // Kirim ke server menggunakan apiUrl() yang benar (APK pakai URL absolut)
      fetch(apiUrl('api.php?action=create_user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserObj)
      }).catch(function() {});
    } catch(e) {}

    usersList.push(newUserObj);

    if (role === 'guru') importedGuruCount++;
    else importedSiswaCount++;
  }

  saveUsers(usersList);
  renderAdminUsersTable();
  renderCSVValidationReport(importedSiswaCount, importedGuruCount, validationErrors);

  // Reset koordinat siswa yang pakai koordinat default SMKN9 agar geocode ulang
  // Koordinat SMKN9 default: -7.9825, 112.6867 — jika sama persis, reset ke 0 agar geocode
  var _smkn9Lat = -7.9825, _smkn9Lng = 112.6867;
  usersList.forEach(function(u) {
    if (u.role === 'siswa' && u.pklLocation) {
      var lat = parseFloat(u.latitude_pkl), lng = parseFloat(u.longitude_pkl);
      // Jika koordinat sama persis dengan default SMKN9, reset agar geocode ulang
      if (Math.abs(lat - _smkn9Lat) < 0.0001 && Math.abs(lng - _smkn9Lng) < 0.0001) {
        u.latitude_pkl = 0; u.longitude_pkl = 0;
      }
    }
  });
  saveUsers(usersList);

  // Trigger geocode untuk semua siswa baru tanpa koordinat valid
  // Dedup per nama lokasi: jika 20 siswa punya PKL yang sama, geocode cukup 1 kali
  // Siswa lain akan otomatis dapat koordinat dari _geocodeNameCache
  var _toGeocode = usersList.filter(function(u) {
    var lat = parseFloat(u.latitude_pkl), lng = parseFloat(u.longitude_pkl);
    var _pklLow = (u.pklLocation || '').toLowerCase();
    var _pklIsSmkn9 = _pklLow.includes('smk') || _pklLow.includes('smkn') || _pklLow.includes('9 malang');
    var isDefaultSmkn9Coord = Math.abs(lat - (-7.9825)) < 0.001 && Math.abs(lng - 112.6867) < 0.001;
    return u.role === 'siswa' && u.pklLocation &&
      (isNaN(lat) || lat === 0 ||
       // Hanya geocode ulang jika koordinat = default SMKN9 DAN nama PKL bukan di SMKN9
       (isDefaultSmkn9Coord && !_pklIsSmkn9));
  });

  if (_toGeocode.length > 0) {
    // Dedup: satu perwakilan per nama lokasi (geocodeLocationName pakai cache untuk siswa berikutnya)
    var _seenLoc = {};
    var _toGeocodeDedup = _toGeocode.filter(function(u) {
      var locKey = (u.pklLocation || '').toLowerCase().trim();
      // Jika lokasi sudah ada di cache → tidak perlu kirim ke Nominatim, tapi tetap update koordinat user
      if (_geocodeNameCache[locKey]) {
        setTimeout(function() { geocodeLocationName(u.pklLocation, u); }, 100);
        return false; // tidak perlu antri Nominatim
      }
      if (_seenLoc[locKey]) return false; // nama sama sudah ada di antrian
      _seenLoc[locKey] = true;
      return true;
    });

    var needNominatim = _toGeocodeDedup.length;
    var fromCache     = _toGeocode.length - needNominatim;
    if (needNominatim > 0) {
      showToast('Geocode ' + needNominatim + ' lokasi PKL baru' + (fromCache > 0 ? ' (' + fromCache + ' dari cache)' : '') + '...', 'info');
    } else if (fromCache > 0) {
      showToast('Koordinat dari cache untuk ' + fromCache + ' siswa.', 'success');
    }

    // Batch geocode dengan delay agar tidak spam Nominatim (rate limit 1 req/detik)
    _toGeocodeDedup.forEach(function(u, idx) {
      setTimeout(function() {
        if (typeof geocodeLocationName === 'function') {
          geocodeLocationName(u.pklLocation, u);
        }
      }, idx * 1200); // 1.2 detik per request
    });
  }

  // Paksa sync ulang dari server setelah 2 detik agar data terbaru tampil
  // Ini penting karena polling 8 detik bisa menimpa data yang baru diimport
  setTimeout(function() {
    fetch(apiUrl('api.php?action=get_users'))
      .then(function(r) { return r && r.ok ? r.json() : null; })
      .then(function(res) {
        if (res && res.success) {
          _mergeServerUsers(res, true);
          console.log('[SIGAP] Post-import sync: ' + (res.users||res.data||[]).length + ' users dari server');
        }
      }).catch(function() {});
  }, 2000);

}

function renderCSVValidationReport(siswaCount, guruCount, errors) {
  const resultCard = document.getElementById('csvValidationResultCard');
  const resultTitle = document.getElementById('csvResultTitle');
  const resultSummary = document.getElementById('csvResultSummary');
  const errorsContainer = document.getElementById('csvErrorsContainer');

  if (!resultCard || !resultSummary || !errorsContainer) return;

  resultCard.classList.remove('hidden');

  if (errors.length === 0) {
    resultCard.style.borderLeft = '4px solid #10b981';
    resultTitle.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> Import Data Massal Berhasil 100%`;
    resultSummary.innerHTML = `
      <div style="color:#34d399; font-weight:bold; font-size:0.88rem;">
        ?? Seluruh data berhasil diimpor tanpa kesalahan! Total: <strong>${siswaCount} Siswa</strong> & <strong>${guruCount} Guru</strong> baru tersimpan ke Database.
      </div>
    `;
    errorsContainer.innerHTML = '';
    showToast(`Import Sukses! ${siswaCount} Siswa & ${guruCount} Guru berhasil diimpor!`, 'success');
  } else {
    resultCard.style.borderLeft = '4px solid #f59e0b';
    resultTitle.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-400"></i> Laporan Validasi Import Data Massal`;
    
    const summaryText = (siswaCount + guruCount > 0)
      ? `<span style="color:#34d399; font-weight:bold;"><i class="fa-solid fa-check"></i> ${siswaCount + guruCount} User Berhasil Diimpor (${siswaCount} Siswa, ${guruCount} Guru)</span> &nbsp;|&nbsp; <span style="color:#f87171; font-weight:bold;"><i class="fa-solid fa-circle-xmark"></i> ${errors.length} Baris Memiliki Masalah</span>`
      : `<span style="color:#f87171; font-weight:bold;"><i class="fa-solid fa-circle-xmark"></i> 0 User Diimpor (${errors.length} Baris Gagal / Membutuhkan Perbaikan)</span>`;

    resultSummary.innerHTML = summaryText;

    let rowsHtml = errors.map(err => {
      const escapedData = String(err.data || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const escapedIssue = String(err.issue || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const escapedSuggestion = String(err.suggestion || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:8px 10px; font-weight:bold; color:#a5b4fc; white-space:nowrap; text-align:center;">Baris ${err.row}</td>
          <td style="padding:8px 10px; color:#cbd5e1; font-size:0.75rem; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapedData}">${escapedData}</td>
          <td style="padding:8px 10px; color:#f87171; font-weight:bold; font-size:0.78rem;">
            <i class="fa-solid fa-circle-exclamation"></i> ${escapedIssue}
          </td>
          <td style="padding:8px 10px; color:#fde047; font-size:0.78rem; background:rgba(234,179,8,0.1); border-radius:4px;">
            ?? <strong>Saran:</strong> ${escapedSuggestion}
          </td>
        </tr>
      `;
    }).join('');

    errorsContainer.innerHTML = `
      <table class="data-table" style="font-size:0.75rem; width:100%;">
        <thead>
          <tr style="background:rgba(255,255,255,0.08); text-align:left;">
            <th style="padding:8px 10px; text-align:center; width:70px;">Baris</th>
            <th style="padding:8px 10px;">Data Input</th>
            <th style="padding:8px 10px;">Masalah Terdeteksi</th>
            <th style="padding:8px 10px;">?? Saran Penyelesaian</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    if (siswaCount + guruCount > 0) {
      showToast(`Import Selesai: ${siswaCount + guruCount} Berhasil, ${errors.length} Baris Memiliki Masalah`, 'warning');
    } else {
      showToast(`Gagal Import! Terdeteksi ${errors.length} kesalahan data pada file CSV`, 'error');
    }
  }
}

function downloadSampleExcel() {
  let sampleRowsHtml = "";
  if (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin') {
    const supervised = getSupervisedStudentsOnly();
    sampleRowsHtml += `
      <tr>
        <td style="border:1px solid #000; padding:8px 12px; background:#e0f2fe;">guru</td>
        <td style="border:1px solid #000; padding:8px 12px; font-weight:bold;">${activeUser.name}</td>
        <td style="border:1px solid #000; padding:8px 12px; mso-number-format:'\\@';">${activeUser.nomor_induk}</td>
        <td style="border:1px solid #000; padding:8px 12px;">${activeUser.username}</td>
        <td style="border:1px solid #000; padding:8px 12px;">${activeUser.password || '123'}</td>
        <td style="border:1px solid #000; padding:8px 12px; color:#94a3b8; font-style:italic;">-</td>
        <td style="border:1px solid #000; padding:8px 12px;">${activeUser.school || 'SMK Negeri 9 Malang'}</td>
        <td style="border:1px solid #000; padding:8px 12px; color:#94a3b8; font-style:italic;">kosongkan</td>
        <td style="border:1px solid #000; padding:8px 12px; color:#94a3b8; font-style:italic;">-</td>
      </tr>
    `;
    if (supervised.length > 0) {
      supervised.forEach(s => {
        sampleRowsHtml += `
          <tr>
            <td style="border:1px solid #000; padding:8px 12px; background:#f0fdf4;">siswa</td>
            <td style="border:1px solid #000; padding:8px 12px;">${s.name}</td>
            <td style="border:1px solid #000; padding:8px 12px; mso-number-format:'\\@';">${s.nomor_induk}</td>
            <td style="border:1px solid #000; padding:8px 12px;">${s.username}</td>
            <td style="border:1px solid #000; padding:8px 12px;">${s.password || '123456'}</td>
            <td style="border:1px solid #000; padding:8px 12px;">${s.kelas || 'XII RPL 1'}</td>
            <td style="border:1px solid #000; padding:8px 12px;">${s.school}</td>
            <td style="border:1px solid #000; padding:8px 12px;">${s.pklLocation}</td>
            <td style="border:1px solid #000; padding:8px 12px;">${activeUser.name}</td>
          </tr>
        `;
      });
    } else {
      sampleRowsHtml += `
        <tr>
          <td style="border:1px solid #000; padding:8px 12px; background:#f0fdf4;">siswa</td>
          <td style="border:1px solid #000; padding:8px 12px;">Siswa Bimbingan 1</td>
          <td style="border:1px solid #000; padding:8px 12px; mso-number-format:'\\@';">005990001</td>
          <td style="border:1px solid #000; padding:8px 12px;">siswa1</td>
          <td style="border:1px solid #000; padding:8px 12px;">123456</td>
          <td style="border:1px solid #000; padding:8px 12px;">XII RPL 1</td>
          <td style="border:1px solid #000; padding:8px 12px;">SMK Negeri 9 Malang</td>
          <td style="border:1px solid #000; padding:8px 12px;">PT. Tech Solution Indonesia</td>
          <td style="border:1px solid #000; padding:8px 12px;">${activeUser.name}</td>
        </tr>
      `;
    }
  } else {
    sampleRowsHtml = `
      <tr>
        <td style="border:1px solid #000; padding:8px 12px; background:#e0f2fe;">guru</td>
        <td style="border:1px solid #000; padding:8px 12px; font-weight:bold;">Gigih Perkasa, ST., M.Pd.</td>
        <td style="border:1px solid #000; padding:8px 12px; mso-number-format:'\\@';">19841031 201101 1 008</td>
        <td style="border:1px solid #000; padding:8px 12px;">gigih</td>
        <td style="border:1px solid #000; padding:8px 12px;">123456</td>
        <td style="border:1px solid #000; padding:8px 12px; color:#94a3b8; font-style:italic;">-</td>
        <td style="border:1px solid #000; padding:8px 12px;">SMK Negeri 9 Malang</td>
        <td style="border:1px solid #000; padding:8px 12px; color:#94a3b8; font-style:italic;">kosongkan</td>
        <td style="border:1px solid #000; padding:8px 12px; color:#94a3b8; font-style:italic;">-</td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:8px 12px; background:#f0fdf4;">siswa</td>
        <td style="border:1px solid #000; padding:8px 12px;">Budi Santoso</td>
        <td style="border:1px solid #000; padding:8px 12px; mso-number-format:'\\@';">0054819203</td>
        <td style="border:1px solid #000; padding:8px 12px;">budi</td>
        <td style="border:1px solid #000; padding:8px 12px;">123456</td>
        <td style="border:1px solid #000; padding:8px 12px;">XII RPL 1</td>
        <td style="border:1px solid #000; padding:8px 12px;">SMK Negeri 9 Malang</td>
        <td style="border:1px solid #000; padding:8px 12px;">PT. Tech Solution Indonesia</td>
        <td style="border:1px solid #000; padding:8px 12px;">Gigih Perkasa, ST., M.Pd.</td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:8px 12px; background:#f0fdf4;">siswa</td>
        <td style="border:1px solid #000; padding:8px 12px;">Siti Aminah</td>
        <td style="border:1px solid #000; padding:8px 12px; mso-number-format:'\\@';">0054819204</td>
        <td style="border:1px solid #000; padding:8px 12px;">siti</td>
        <td style="border:1px solid #000; padding:8px 12px;">123456</td>
        <td style="border:1px solid #000; padding:8px 12px;">XII RPL 2</td>
        <td style="border:1px solid #000; padding:8px 12px;">SMK Negeri 9 Malang</td>
        <td style="border:1px solid #000; padding:8px 12px;">PT. Tech Solution Indonesia</td>
        <td style="border:1px solid #000; padding:8px 12px;">Gigih Perkasa, ST., M.Pd.</td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:8px 12px; background:#f0fdf4;">siswa</td>
        <td style="border:1px solid #000; padding:8px 12px;">Rudi Hermawan</td>
        <td style="border:1px solid #000; padding:8px 12px; mso-number-format:'\\@';">0054819205</td>
        <td style="border:1px solid #000; padding:8px 12px;">rudi</td>
        <td style="border:1px solid #000; padding:8px 12px;">123456</td>
        <td style="border:1px solid #000; padding:8px 12px;">XII TKJ 1</td>
        <td style="border:1px solid #000; padding:8px 12px;">SMK Negeri 9 Malang</td>
        <td style="border:1px solid #000; padding:8px 12px;">PT. Astra International</td>
        <td style="border:1px solid #000; padding:8px 12px;">Gigih Perkasa, ST., M.Pd.</td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:8px 12px; background:#e0f2fe;">guru</td>
        <td style="border:1px solid #000; padding:8px 12px; font-weight:bold;">Ahmad Hidayat, S.Pd.</td>
        <td style="border:1px solid #000; padding:8px 12px; mso-number-format:'\\@';">19850515 201202 1 004</td>
        <td style="border:1px solid #000; padding:8px 12px;">ahmad</td>
        <td style="border:1px solid #000; padding:8px 12px;">123456</td>
        <td style="border:1px solid #000; padding:8px 12px; color:#94a3b8; font-style:italic;">-</td>
        <td style="border:1px solid #000; padding:8px 12px;">SMK Negeri 9 Malang</td>
        <td style="border:1px solid #000; padding:8px 12px; color:#94a3b8; font-style:italic;">SMK Negeri 9 Malang</td>
        <td style="border:1px solid #000; padding:8px 12px; color:#94a3b8; font-style:italic;">-</td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:8px 12px; background:#f0fdf4;">siswa</td>
        <td style="border:1px solid #000; padding:8px 12px;">Dewi Lestari</td>
        <td style="border:1px solid #000; padding:8px 12px; mso-number-format:'\\@';">0054819206</td>
        <td style="border:1px solid #000; padding:8px 12px;">dewi</td>
        <td style="border:1px solid #000; padding:8px 12px;">123456</td>
        <td style="border:1px solid #000; padding:8px 12px;">XII MM 1</td>
        <td style="border:1px solid #000; padding:8px 12px;">SMK Negeri 9 Malang</td>
        <td style="border:1px solid #000; padding:8px 12px;">PT. Telkom Indonesia</td>
        <td style="border:1px solid #000; padding:8px 12px;">Ahmad Hidayat, S.Pd.</td>
      </tr>
    `;
  }

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Template Siswa Guru</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; width: 100%; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
        th { background-color: #4f46e5; color: #ffffff; border: 1px solid #000000; padding: 10px 14px; font-weight: bold; text-align: center; }
        td { border: 1px solid #000000; padding: 8px 12px; vertical-align: middle; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th style="background:#4f46e5; color:#fff; border:1px solid #000; padding:10px 14px;">role</th>
            <th style="background:#4f46e5; color:#fff; border:1px solid #000; padding:10px 14px;">nama</th>
            <th style="background:#4f46e5; color:#fff; border:1px solid #000; padding:10px 14px;">nomor_induk_nisn_nip</th>
            <th style="background:#4f46e5; color:#fff; border:1px solid #000; padding:10px 14px;">username</th>
            <th style="background:#4f46e5; color:#fff; border:1px solid #000; padding:10px 14px;">password</th>
            <th style="background:#4f46e5; color:#fff; border:1px solid #000; padding:10px 14px;">kelas</th>
            <th style="background:#4f46e5; color:#fff; border:1px solid #000; padding:10px 14px;">sekolah</th>
            <th style="background:#4f46e5; color:#fff; border:1px solid #000; padding:10px 14px;">lokasi_pkl<br><small style="font-size:9pt; font-weight:normal; color:#fbbf24;">(Kosongkan jika guru)</small></th>
            <th style="background:#4f46e5; color:#fff; border:1px solid #000; padding:10px 14px;">guru_pembimbing</th>
          </tr>
        </thead>
        <tbody>
          ${sampleRowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Template_Import_Massal_Rapi_Excel_${activeUser ? activeUser.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Admin'}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadSampleCSV() {
  let content = "";
  if (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin') {
    const supervised = getSupervisedStudentsOnly();
    content = "\uFEFFsep=;\n" +
      "role;nama;nomor_induk_nisn_nip;username;password;kelas;sekolah;lokasi_pkl;guru_pembimbing\n" +
      `guru;"${activeUser.name}";"${activeUser.nomor_induk}";"${activeUser.username}";"${activeUser.password || '123'}";"-";"${activeUser.school || 'SMK Negeri 9 Malang'}";"kosongkan";"-"\n`;

    if (supervised.length > 0) {
      supervised.forEach(s => {
        content += `siswa;"${s.name}";"${s.nomor_induk}";"${s.username}";"${s.password || '123456'}";"${s.kelas || 'XII RPL 1'}";"${s.school}";"${s.pklLocation}";"${activeUser.name}"\n`;
      });
    } else {
      content += `siswa;"Siswa Bimbingan 1";005990001;siswa1;123456;"XII RPL 1";"SMK Negeri 9 Malang";"PT. Tech Solution Indonesia";"${activeUser.name}"\n`;
    }
  } else {
    content = "\uFEFFsep=;\n" +
      "role;nama;nomor_induk_nisn_nip;username;password;kelas;sekolah;lokasi_pkl;guru_pembimbing\n" +
      "guru;\"Gigih Perkasa, ST., M.Pd.\";\"19841031 201101 1 008\";gigih;123456;\"-\";\"SMK Negeri 9 Malang\";\"kosongkan\";\"-\"\n" +
      "siswa;\"Budi Santoso\";0054819203;budi;123456;\"XII RPL 1\";\"SMK Negeri 9 Malang\";\"PT. Tech Solution Indonesia\";\"Gigih Perkasa, ST., M.Pd.\"\n" +
      "siswa;\"Siti Aminah\";0054819204;siti;123456;\"XII RPL 2\";\"SMK Negeri 9 Malang\";\"PT. Tech Solution Indonesia\";\"Gigih Perkasa, ST., M.Pd.\"\n" +
      "siswa;\"Rudi Hermawan\";0054819205;rudi;123456;\"XII TKJ 1\";\"SMK Negeri 9 Malang\";\"PT. Astra International\";\"Gigih Perkasa, ST., M.Pd.\"\n" +
      "guru;\"Ahmad Hidayat, S.Pd.\";\"19850515 201202 1 004\";ahmad;123456;\"-\";\"SMK Negeri 9 Malang\";\"SMK Negeri 9 Malang\";\"-\"\n" +
      "siswa;\"Dewi Lestari\";0054819206;dewi;123456;\"XII MM 1\";\"SMK Negeri 9 Malang\";\"PT. Telkom Indonesia\";\"Ahmad Hidayat, S.Pd.\"\n" +
      "siswa;\"Eko Prasetyo\";0054819207;eko;123456;\"XII AK 1\";\"SMK Negeri 9 Malang\";\"PT. Telkom Indonesia\";\"Ahmad Hidayat, S.Pd.\"";
  }

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Template_Import_Massal_Siswa_Guru_${activeUser ? activeUser.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Admin'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

let sseEventSource = null;
let lastGpsSentTime = 0;
let _lastReverseGeoLat = null;
let _lastReverseGeoLng = null;
let _lastReverseGeoAddr = null;
let _reverseGeoPending = false;

// Helper: merge data server ke localStorage � SERVER adalah sumber kebenaran
// Server sudah return plain_password sebagai field 'password' � siap pakai untuk offline login
function _mergeServerUsers(res, rerender) {
  if (!res || !res.success) {
    console.warn('[SIGAP] _mergeServerUsers: invalid response', res);
    return;
  }
  var serverUsers = res.users || res.data || [];
  if (!Array.isArray(serverUsers) || serverUsers.length === 0) {
    console.warn('[SIGAP] _mergeServerUsers: no users in response');
    return;
  }
  // logging removed for APK performance

  // Server wins untuk semua field termasuk password (sudah plaintext dari api.php)
  // Hanya preserve password lokal jika _localEditTs < 30 detik (baru saja diubah admin, server belum update)
  var local = getUsers();
  var localMap = {};
  local.forEach(function(u) { if (u && u.id) localMap[String(u.id)] = u; });

  var merged = serverUsers.map(function(su) {
    var lu = localMap[String(su.id)];
    var localEditTs = lu ? (lu._localEditTs || 0) : 0;
    var isRecentEdit = (Date.now() - localEditTs) < 30000;
    var pwd = (isRecentEdit && lu && lu.password) ? lu.password : (su.password || '123');
    // Preserve koordinat lokal jika server kirim 0 atau null
    // (koordinat lokal = hasil geocode Nominatim yang lebih akurat dari data server)
    var localLat = lu ? parseFloat(lu.latitude_pkl) : NaN;
    var localLng = lu ? parseFloat(lu.longitude_pkl) : NaN;
    var serverLat = parseFloat(su.latitude_pkl);
    var serverLng = parseFloat(su.longitude_pkl);
    var hasLocalCoords  = !isNaN(localLat) && localLat !== 0 && !isNaN(localLng) && localLng !== 0;
    var hasServerCoords = !isNaN(serverLat) && serverLat !== 0 && !isNaN(serverLng) && serverLng !== 0;
    // Preserve koordinat lokal hasil geocoding Nominatim jika server masih kirim koordinat default SMKN9
    var SMKN9_LAT = -7.9825, SMKN9_LNG = 112.6867;
    // isServerDefault: hanya jika PKL bukan di SMKN9 (koordinat SMKN9 valid untuk PKL di area sekolah)
    var _suPklLow = (su.pklLocation || '').toLowerCase();
    var _suPklIsSmkn9 = _suPklLow.includes('smk') || _suPklLow.includes('smkn') || _suPklLow.includes('9 malang');
    var isServerDefault = hasServerCoords && !_suPklIsSmkn9 &&
      Math.abs(serverLat - SMKN9_LAT) < 0.0001 && Math.abs(serverLng - SMKN9_LNG) < 0.0001;
    var isRecentGeocode  = lu ? ((Date.now() - (lu._localGeocodedTs || 0)) < 300000) : false; // 5 menit grace
    // Jika server = default SMKN9 DAN lokal sudah punya hasil geocoding → pakai lokal
    var finalLat = (isServerDefault && hasLocalCoords && isRecentGeocode) ? localLat : (hasServerCoords && !isServerDefault ? serverLat : (hasLocalCoords ? localLat : 0));
    var finalLng = (isServerDefault && hasLocalCoords && isRecentGeocode) ? localLng : (hasServerCoords && !isServerDefault ? serverLng : (hasLocalCoords ? localLng : 0));
    if (lu && lu.username !== su.username && activeUser && String(activeUser.id) === String(su.id)) {
      setTimeout(function() {
        showToast('Username Anda telah diubah oleh Admin. Silakan login ulang.', 'warning');
        setTimeout(logoutUser, 2000);
      }, 500);
    }
    return Object.assign({}, su, { password: pwd, latitude_pkl: finalLat, longitude_pkl: finalLng });
  });

  // Tambahkan user lokal yang belum ada di server (baru dibuat, belum sempat sync)
  var serverIds = new Set(serverUsers.map(function(u) { return String(u.id); }));
  local.forEach(function(lu) {
    if (!lu || !lu.id) return;
    if (serverIds.has(String(lu.id))) return; // sudah ada di server, skip
    var localEditTs = lu._localEditTs || 0;
    if ((Date.now() - localEditTs) < 600000) {
      // Baru dibuat lokal dan belum di server � pertahankan DAN coba kirim ke server
      merged.push(lu);
      console.log('[SIGAP] Local-only user:', lu.username, '� retrying server sync');
      // Coba kirim ke server lagi (async, tidak blokir)
      setTimeout(function() {
        fetch(window._SERVER_HTTPS + '/api.php?action=create_user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lu)
        }).then(function(r) { return r && r.ok ? r.json() : null; })
          .then(function(rd) {
            if (rd && rd.success) {
              console.log('[SIGAP] Retry create_user success:', lu.username);
              // Update ID jika server beri ID baru
              if (rd.id && rd.id !== lu.id) {
                var users2 = getUsers();
                var idx2 = users2.findIndex(function(u) { return String(u.id) === String(lu.id); });
                if (idx2 !== -1) { users2[idx2].id = rd.id; saveUsers(users2); }
              }
            }
          })
          .catch(function() {});
      }, 500);
    }
  });

  // Dedup by ID
  var dm = new Map();
  merged.forEach(function(u) { if (u && u.id) dm.set(String(u.id), u); });
  var final = Array.from(dm.values());

  saveUsers(final);
  // localStorage updated (log removed for APK perf)

  // Sync activeUser koordinat PKL dari data server terbaru
  // PENTING: jangan update activeUser.latitude_pkl jika lock sudah aktif (koordinat valid terkunci)
  // Update hanya jika lock belum aktif (siswa baru login, koordinat belum terkunci)
  if (typeof activeUser !== 'undefined' && activeUser && activeUser.id && !_targetLocationLocked) {
    var updatedUser = final.find(function(u) { return String(u.id) === String(activeUser.id); });
    if (updatedUser) {
      // Jika status kembali ke 'approved' (pengajuan ditolak admin):
      // Bersihkan proposed_* fields dari activeUser lokal agar tidak mengganggu geofencing
      if (updatedUser.status === 'approved' && activeUser.status === 'pending_edit_pkl') {
        activeUser.status = 'approved';
        delete activeUser.proposed_pkl_location;
        delete activeUser.proposed_latitude_pkl;
        delete activeUser.proposed_longitude_pkl;
        delete activeUser.edit_requested_by;
        delete activeUser.gps_accuracy;
        // Reset geocode attempt agar bisa dicoba ulang dengan koordinat asli
        _geocodeAttemptedFor = null;
        // Sembunyikan card warning pengajuan di profil
        var _ajCard = document.getElementById('ajukanKoordCard');
        if (_ajCard) {
          var _stPend = document.getElementById('ajukanKoordStatus');
          if (_stPend) _stPend.style.display = 'none';
        }
        console.log('[SIGAP] Pengajuan koordinat ditolak admin — proposed_* fields dibersihkan');
      }
      var serverLat2 = parseFloat(updatedUser.latitude_pkl);
      var serverLng2 = parseFloat(updatedUser.longitude_pkl);
      var hasCoords2 = !isNaN(serverLat2) && serverLat2 !== 0 && !isNaN(serverLng2) && serverLng2 !== 0;
      if (hasCoords2) {
        // Update koordinat activeUser saja — jangan sentuh TARGET_LOCATION dari polling
        // TARGET_LOCATION untuk siswa hanya diset oleh applyTargetLocationFromUser + lock system
        // Mengubah TARGET_LOCATION dari sini menyebabkan peta berubah-ubah setiap 8 detik
        activeUser.latitude_pkl = serverLat2;
        activeUser.longitude_pkl = serverLng2;
        // Untuk admin/guru (bukan siswa), boleh update TARGET_LOCATION dari polling
        if (activeUser.role !== 'siswa') {
          var coordChanged = Math.abs(TARGET_LOCATION.lat - serverLat2) > 0.00045 ||
                             Math.abs(TARGET_LOCATION.lng - serverLng2) > 0.00045;
          if (coordChanged) {
            TARGET_LOCATION = {
              lat: serverLat2, lng: serverLng2,
              name: updatedUser.pklLocation || TARGET_LOCATION.name,
              allowedRadiusMeters: TARGET_LOCATION.allowedRadiusMeters || 350
            };
            _updateMapUIAndReset && _updateMapUIAndReset();
          }
        }
      }
    }
  }

  if (rerender) {
    renderAdminUsersTable && renderAdminUsersTable();
    renderPendingUserApprovals && renderPendingUserApprovals();
    if (document.getElementById('tab-admin')?.classList.contains('active')) {
      renderAdminDashboard && renderAdminDashboard();
    }
  }
}


// ── Sync log presensi dari server ke localStorage ─────────────────────────
// Dipanggil saat tab history dibuka atau dari polling 8 detik
var _lastLogSyncTs = 0;
// Guard: setelah reset, blok sync dari server selama 60 detik agar data lama tidak kembali
var _resetGuardUntil = 0;
function _syncLogsFromServer(callback) {
  // Cek reset guard — jangan sync jika baru saja reset
  if (_resetGuardUntil > Date.now()) {
    console.log('[SIGAP] _syncLogsFromServer: skipped (reset guard active)');
    if (typeof callback === 'function') callback();
    return;
  }
  // Throttle: jangan sync lebih dari 1x per 5 detik
  if ((Date.now() - _lastLogSyncTs) < 5000) {
    if (typeof callback === 'function') callback();
    return;
  }
  _lastLogSyncTs = Date.now();

  // Gunakan endpoint get_presensi yang sudah ada di server
  // Filter per user_id untuk siswa agar lebih cepat
  var userId = (activeUser && activeUser.role === 'siswa') ? (activeUser.id || '') : '';
  var url = apiUrl('api.php?action=get_presensi') + (userId ? '&user_id=' + encodeURIComponent(userId) : '');

  fetch(url)
    .then(function(r) { return r && r.ok ? r.json() : null; })
    .then(function(res) {
      if (!res || !res.success) { if (typeof callback === 'function') callback(); return; }
      var serverRows = res.logs || res.data || [];
      if (!Array.isArray(serverRows) || serverRows.length === 0) {
        if (typeof callback === 'function') callback();
        return;
      }

      // ── Transform: server rows (per type) → format log lokal (1 record per hari per siswa) ──
      // DB menyimpan masuk & pulang sebagai baris terpisah — gabungkan per tanggal+user
      var dayMap = {}; // key: "userId_date"
      serverRows.forEach(function(row) {
        // Normalise date: ambil bagian YYYY-MM-DD dari timestamp
        var rawDate = row.timestamp || row.date || '';
        var dateStr = rawDate.substring(0, 10); // "2026-08-15"
        var timeStr = rawDate.length > 10 ? rawDate.substring(11, 16) : ''; // "07:30"
        if (row.pulang_time) timeStr = row.pulang_time; // override jika ada field khusus

        var uid = row.user_id || row.userId || '';
        var key = uid + '_' + dateStr;

        if (!dayMap[key]) {
          dayMap[key] = {
            id: row.id,
            date: dateStr,
            studentName: row.name || row.studentName || '',
            userId: uid,
            masuk: '-',
            pulang: '-',
            status: row.status || 'Hadir',
            location: row.location || '',
            image: row.foto || row.image || null,
            pulang_image: row.foto_pulang || row.pulang_image || null,
            catatan: row.catatan || row.notes || '',
            latitude: row.latitude || row.lat || 0,
            longitude: row.longitude || row.lng || 0,
            distance: row.distance_meters || row.distance || 0
          };
        }

        var type = (row.type || '').toLowerCase();
        if (type === 'masuk') {
          // Ambil jam dari timestamp
          var tsMasuk = row.timestamp || '';
          dayMap[key].masuk = tsMasuk.length > 15 ? tsMasuk.substring(11, 16) : timeStr;
          dayMap[key].image = row.foto || row.image || dayMap[key].image;
          dayMap[key].id = row.id; // pakai ID masuk sebagai ID record
        } else if (type === 'pulang') {
          // Bug 4 fix: handle HH:MM (len 5), HH:MM:SS (len 8), full timestamp (len >15)
          var tsPulang = row.pulang_time || row.timestamp || '';
          var pulangJam;
          if (tsPulang.length > 15) {
            pulangJam = tsPulang.substring(11, 16); // ambil HH:MM dari datetime
          } else if (tsPulang.length >= 8) {
            pulangJam = tsPulang.substring(0, 5);   // HH:MM dari HH:MM:SS
          } else if (tsPulang.length === 5) {
            pulangJam = tsPulang;                   // sudah HH:MM
          } else {
            pulangJam = timeStr;                    // fallback ke timeStr
          }
          if (pulangJam && pulangJam !== '-') dayMap[key].pulang = pulangJam;
          dayMap[key].pulang_image = row.foto_pulang || row.foto || dayMap[key].pulang_image;
          // Bug 6 fix: simpan juga id pulang agar update ON DUPLICATE KEY tidak salah target
          if (!dayMap[key].pulang_id) dayMap[key].pulang_id = row.id;
        } else if (type === 'izin' || type === 'sakit' || type === 'alpa') {
          dayMap[key].status = row.status || (type.charAt(0).toUpperCase() + type.slice(1));
        }

        // Update status jika lebih spesifik
        if (row.status && row.status !== 'Hadir') {
          dayMap[key].status = row.status;
        }
      });

      var serverLogs = Object.values(dayMap);

      // ── Merge dengan log lokal ──────────────────────────────────────────────
      var localLogs = getLogs();
      // Buat map lokal per key (userId_date) untuk dedup
      var localMap = {};
      localLogs.forEach(function(l) {
        var uid2 = l.userId || l.user_id || '';
        var key2 = uid2 + '_' + (l.date || '');
        localMap[key2] = l;
      });

      // Server wins untuk semua yang ada di server
      serverLogs.forEach(function(sl) {
        var uid2 = sl.userId || '';
        var key2 = uid2 + '_' + (sl.date || '');
        // Preserve foto lokal jika server tidak punya
        var existing = localMap[key2];
        if (existing) {
          if (!sl.image && existing.image) sl.image = existing.image;
          if (!sl.pulang_image && existing.pulang_image) sl.pulang_image = existing.pulang_image;
          // Bug 3 fix: jangan timpa pulang dari lokal jika server belum commit pulang
          // (server masih '-' tapi lokal sudah punya jam pulang — absen pulang baru saja dilakukan)
          if ((!sl.pulang || sl.pulang === '-') && existing.pulang && existing.pulang !== '-') {
            sl.pulang = existing.pulang;
          }
          if ((!sl.pulang_image) && existing.pulang_image) {
            sl.pulang_image = existing.pulang_image;
          }
        }
        localMap[key2] = sl;
      });

      var merged = Object.values(localMap);
      // Urutkan: terbaru dulu
      merged.sort(function(a, b) {
        return (b.date || '').localeCompare(a.date || '');
      });

      saveLogs(merged);
      console.log('[SIGAP] _syncLogsFromServer: merged', merged.length, 'records from', serverRows.length, 'server rows');
      if (typeof callback === 'function') callback();
    })
    .catch(function(e) {
      console.warn('[SIGAP] _syncLogsFromServer error:', e.message);
      if (typeof callback === 'function') callback();
    });
}

function initRealtimeFeed() {
  if (realtimeInterval) clearInterval(realtimeInterval);

  // Connect SSE pertama kali
  connectRealtimeSSE();

  // Polling setiap 8 detik � reconnect SSE + render dashboard
  var _syncUserCounter = 0;
  // Deteksi APK untuk skip SSE reconnect
  var _isCapEnv = (function() {
    var p = window.location.protocol; var h = window.location.hostname;
    return p === 'capacitor:' || p === 'ionic:' || h === 'localhost' || h === '127.0.0.1';
  })();

  realtimeInterval = setInterval(() => {
    // Di APK — tidak pakai SSE, skip reconnect
    if (!_isCapEnv) {
      const state = sseEventSource ? sseEventSource.readyState : -1;
      if (state !== 1) {
        if (sseEventSource) { try { sseEventSource.close(); } catch(e) {} }
        sseEventSource = null;
        connectRealtimeSSE();
      }
    }

    // renderTodayStatus: throttle max 1x per 10 detik (tidak perlu setiap 8 detik)
    var _nowPoll = Date.now();
    if ((_nowPoll - (_lastTodayStatusRender || 0)) >= 10000) {
      _lastTodayStatusRender = _nowPoll;
      renderTodayStatus();
    }

    // renderAdminDashboard: HANYA saat tab admin aktif
    if (document.getElementById('tab-admin')?.classList.contains('active')) {
      renderAdminDashboard();
    }

    // Sync daftar user:
    // APK: setiap 16 detik (2 x 8s) agar tidak membebani WebView
    // Web: setiap 8 detik seperti biasa
    _syncUserCounter++;
    var _syncInterval = _isCapEnv ? 2 : 1;
    if (_syncUserCounter >= _syncInterval) {
      _syncUserCounter = 0;
      if (currentEditingUserId !== null) return;
      if ((Date.now() - _lastSaveTs) < 5000) return;

      fetch(apiUrl('api.php?action=get_users'))
        .then(function(r) {
          if (!r || !r.ok) return null;
          return r.json();
        })
        .then(function(res) {
          if (!res) return;
          // rerender hanya saat tab admin aktif — mencegah DOM re-render berat di background
          var adminActive = !!(document.getElementById('tab-admin')?.classList.contains('active'));
          _mergeServerUsers(res, adminActive);
        })
        .catch(function(e) { console.warn('[SIGAP] poll get_users error:', e.message); });

      // Sync log: hanya saat tab history/permission aktif ATAU sudah > 30 detik sejak sync terakhir
      var histActive = !!(document.getElementById('tab-history')?.classList.contains('active'));
      var permActive = !!(document.getElementById('tab-permission')?.classList.contains('active'));
      var guruTabActive = !!(document.getElementById('tab-admin')?.classList.contains('active'));
      var _logAge = Date.now() - (_lastLogSyncTs || 0);
      if (histActive || permActive || guruTabActive || _logAge >= 30000) {
        _syncLogsFromServer(function() {
          if (histActive) renderHistoryList();
          if (guruTabActive) renderGuruLogPresensiTab();
        });
      }
    }
  }, 8000);

  // visibilitychange � layar nyala kembali
  document.removeEventListener('visibilitychange', _onVisibilityChange);
  document.addEventListener('visibilitychange', _onVisibilityChange);

  // online event � network kembali
  window.removeEventListener('online', _onNetworkOnline);
  window.addEventListener('online', _onNetworkOnline);

  // Capacitor App plugin � resume dari background
  _initCapacitorAppListener();
}

function _onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    setTimeout(_forceSSEReconnect, 500);
    // Langsung pull data terbaru saat layar aktif kembali
    // Guard: skip jika baru saja approve agar tidak overwrite status lokal
    setTimeout(function() {
      if ((Date.now() - _lastApproveTs) < 60000) return;
      syncDataFromServer();
    }, 800);
  }
}

function _onNetworkOnline() {
  setTimeout(_forceSSEReconnect, 1000);
  // Langsung pull data terbaru saat koneksi kembali
  // Guard: skip jika baru saja approve agar tidak overwrite status lokal
  setTimeout(function() {
    if ((Date.now() - _lastApproveTs) < 60000) return;
    syncDataFromServer();
  }, 1500);
}

function _forceSSEReconnect() {
  // Paksa close dan reconnect tanpa cek state
  if (sseEventSource) { try { sseEventSource.close(); } catch(e) {} }
  sseEventSource = null;
  connectRealtimeSSE();
}

function _initCapacitorAppListener() {
  // Assign Capacitor App plugin
  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      _CapacitorApp = window.Capacitor.Plugins.App;
    }
  } catch(e) {}

  // Daftarkan appStateChange listener � paling reliable untuk Android background?foreground
  if (_CapacitorApp) {
    try {
      _CapacitorApp.addListener('appStateChange', function(state) {
        console.log('[SSE] appStateChange isActive:', state.isActive);
        if (state.isActive) {
          setTimeout(_forceSSEReconnect, 600);
          // Pull data terbaru dari server saat APK kembali ke foreground
          // Guard: skip jika baru saja approve agar tidak overwrite status lokal
          setTimeout(function() {
            if ((Date.now() - _lastApproveTs) < 60000) return;
            syncDataFromServer();
          }, 1000);
        }
      });
      console.log('[SSE] Capacitor App listener OK');
    } catch(e) {
      console.log('[SSE] addListener error:', e.message);
    }
  }

  // Fallback: document resume (Cordova compat)
  document.addEventListener('resume', function() {
    console.log('[SSE] document resume');
    setTimeout(_forceSSEReconnect, 600);
    // Pull data terbaru saat APK resume dari background
    // Guard: skip jika baru saja approve agar tidak overwrite status lokal
    setTimeout(function() {
      if ((Date.now() - _lastApproveTs) < 60000) return;
      syncDataFromServer();
    }, 1000);
  }, false);

  // Fallback: visibilitychange
  document.removeEventListener('visibilitychange', _onVisibilityChange);
  document.addEventListener('visibilitychange', _onVisibilityChange);

  // Fallback: online event
  window.removeEventListener('online', _onNetworkOnline);
  window.addEventListener('online', _onNetworkOnline);
}

function connectRealtimeSSE() {
  // Jika sudah ada tapi CLOSED atau stuck di CONNECTING terlalu lama � reset
  if (sseEventSource) {
    if (sseEventSource.readyState === 2) {
      // CLOSED � reset dan reconnect
      try { sseEventSource.close(); } catch(e) {}
      sseEventSource = null;
    } else if (sseEventSource.readyState === 0) {
      // CONNECTING � jika lebih dari 15 detik masih connecting, paksa reset
      var now = Date.now();
      if (!sseEventSource._connectTime) {
        sseEventSource._connectTime = now;
        return; // beri kesempatan connect dulu
      }
      if (now - sseEventSource._connectTime > 15000) {
        // Stuck terlalu lama � paksa reset
        try { sseEventSource.close(); } catch(e) {}
        sseEventSource = null;
      } else {
        return;
      }
    } else {
      return; // readyState === 1 (OPEN) � sudah berhasil
    }
  }

  // Deteksi environment: APK Capacitor pakai URL absolut, browser pakai relatif
  const _proto = window.location.protocol;
  const _host  = window.location.hostname;
  const _isCap = _proto === 'capacitor:' || _proto === 'ionic:' || _host === 'localhost' || _host === '127.0.0.1';

  // Di APK Capacitor, EventSource tidak support self-signed SSL
  // Gunakan polling fetch biasa sebagai pengganti SSE
  if (_isCap) {
    updateRealtimeBadge(true); // tampilkan Realtime Live
    console.log('[SSE] APK mode � skip SSE, gunakan polling fetch');
    return;
  }

  const _sseEndpoint = window.location.origin + '/api.php?action=sse_events';
  console.log('[SSE] Connecting:', _sseEndpoint, '| isCap:', _isCap);

  try {
    sseEventSource = new EventSource(_sseEndpoint);
    sseEventSource._connectTime = Date.now();
    console.log('[SSE] EventSource created, readyState:', sseEventSource.readyState);

    sseEventSource.onopen = function() {
      console.log('[SSE] OPEN');
      sseEventSource._connectTime = null; // reset timer saat berhasil
      updateRealtimeBadge(true);
    };

    sseEventSource.addEventListener('connected', function(e) {
      updateRealtimeBadge(true);
    });

    sseEventSource.addEventListener('new_attendance', function(e) {
      try {
        const record = JSON.parse(e.data);
        const logs = getLogs();
        if (!logs.some(l => l.id === record.id || (l.studentName === record.studentName && l.masuk === record.masuk && l.date === record.date))) {
          logs.unshift(record);
          saveLogs(logs);
          renderTodayStatus();
          renderStats();
          renderHistoryList();
          if (document.getElementById('tab-admin')?.classList.contains('active')) {
            renderAdminDashboard();
          }
          if (activeUser && (activeUser.role === 'guru' || activeUser.role === 'admin')) {
            showToast(`Realtime Presensi: ${record.studentName} (${record.status})`, 'info');
          }
        }
      } catch(err) {}
    });

    sseEventSource.addEventListener('gps_update', function(e) {
      try {
        const gpsData = JSON.parse(e.data);
        if (activeUser && (activeUser.role === 'guru' || activeUser.role === 'admin')) {
          if (leafletMap && gpsData.latitude && gpsData.longitude) {
            updateMapUserPosition(gpsData.latitude, gpsData.longitude);
          }
        }
      } catch(err) {}
    });

    // Event user_updated � sync daftar user seketika tanpa tunggu 16 detik
    sseEventSource.addEventListener('user_updated', function() {
      // Jangan overwrite localStorage saat modal edit sedang terbuka � hindari race condition
      if (currentEditingUserId !== null) return;
      // Jangan overwrite jika admin baru saja simpan perubahan (dalam 10 detik)
      if ((Date.now() - _lastSaveTs) < 10000) return;
      fetch(apiUrl('api.php?action=get_users'))
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(res) { _mergeServerUsers(res, true); })
        .catch(function() {});
    });

    // Event perm_updated — sync izin seketika saat ada perubahan
    // Guard: skip jika baru saja approve (dalam 60 detik) agar tidak overwrite status lokal
    sseEventSource.addEventListener('perm_updated', function() {
      if ((Date.now() - _lastApproveTs) < 60000) {
        console.log('[SSE] perm_updated skipped — recent approve guard active');
        return;
      }
      syncDataFromServer();
    });

    // Event attendance_updated — sync presensi seketika saat APK input data
    sseEventSource.addEventListener('attendance_updated', function() {
      console.log('[SSE] attendance_updated — syncing presensi from server');
      syncDataFromServer();
    });

    // Event journal_updated — sync jurnal seketika saat APK kirim jurnal
    sseEventSource.addEventListener('journal_updated', function() {
      console.log('[SSE] journal_updated — syncing journals from server');
      syncDataFromServer();
    });

    sseEventSource.onerror = function(ev) {
      const state = sseEventSource ? sseEventSource.readyState : -1;
      console.log('[SSE] ERROR, readyState:', state, 'url:', _sseEndpoint);
      updateRealtimeBadge(false);
      if (sseEventSource) {
        sseEventSource.close();
        sseEventSource = null;
      }
      setTimeout(connectRealtimeSSE, 10000);
    };
  } catch(e) {
    console.log('[SSE] EXCEPTION:', e.message, '| url:', _sseEndpoint);
    updateRealtimeBadge(false);
  }
}

function updateRealtimeBadge(isOnline) {
  const badge = document.getElementById('realtimeSyncBadge');
  if (badge) {
    if (isOnline) {
      badge.className = 'status-tag hadir';
      badge.innerHTML = `<i class="fa-solid fa-bolt text-amber-300"></i> Realtime Live`;
      // Di APK, tap badge tampilkan diagnostic sync
      var _isBadgeCap = (function() {
        var p = window.location.protocol; var h = window.location.hostname;
        return p === 'capacitor:' || p === 'ionic:' || h === 'localhost' || h === '127.0.0.1';
      })();
      if (_isBadgeCap) {
        badge.onclick = function() {
          var localUsers = [];
          try { localUsers = JSON.parse(localStorage.getItem('SIGAP PKL SMKN 9 Official_users') || '[]'); } catch(e) {}
          var dbVer = localStorage.getItem('SIGAP PKL SMKN 9 Official_db_schema_version') || 'null';
          var authKey = localStorage.getItem('SIGAP PKL SMKN 9 Official_active_session_v6');
          var authUser = authKey ? JSON.parse(authKey).username : 'not logged in';
          var apiTarget = window._SERVER_HTTPS + '/api.php?action=get_users';

          // Build info string
          var info = '=== SIGAP APK DIAGNOSTIC ===\n\n';
          info += 'DB Version: ' + dbVer + '\n';
          info += 'Auth: ' + authUser + '\n';
          info += 'localStorage users: ' + localUsers.length + '\n';
          localUsers.slice(0, 5).forEach(function(u) { info += '  - ' + u.username + ' (' + u.role + ')\n'; });
          info += '\nAPI URL: ' + apiTarget + '\n\n';
          info += 'Tap OK untuk fetch dari server sekarang';

          if (confirm(info)) {
            fetch(apiTarget)
              .then(function(r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
              .then(function(data) {
                var users = data.users || data.data || [];
                var msg = 'Server return: ' + users.length + ' users\n';
                users.forEach(function(u) { msg += '  - ' + u.username + ' (' + u.role + ')\n'; });
                if (users.length > 0) {
                  localStorage.setItem('SIGAP PKL SMKN 9 Official_users', JSON.stringify(users));
                  msg += '\n? Tersimpan ke localStorage!\nRefresh halaman...';
                  alert(msg);
                  location.reload();
                } else {
                  alert(msg + '\n? Server return 0 users');
                }
              })
              .catch(function(e) {
                alert('? Fetch gagal: ' + e + '\n\nServer: ' + apiTarget + '\n\nKemungkinan: SSL cert atau koneksi');
              });
          }
        };
      } else {
        badge.onclick = null;
      }
    } else {
      badge.className = 'status-tag izin';
      badge.innerHTML = `<i class="fa-solid fa-rotate"></i> Polling Aktif`;
      // Tap badge untuk lihat debug info di HP
      badge.onclick = function() {
        const proto = window.location.protocol;
        const host  = window.location.hostname;
        const port  = window.location.port;
        const isCap = proto === 'capacitor:' || proto === 'ionic:' || host === 'localhost';
        const sseTarget = isCap
          ? window._SSE_URL
          : (window.location.origin + '/api.php?action=sse_events');
        const state = sseEventSource ? sseEventSource.readyState : 'null';
        const info =
          'Protocol : ' + proto + '\n' +
          'Hostname : ' + host + '\n' +
          'Port     : ' + port + '\n' +
          'isCap    : ' + isCap + '\n' +
          'SSE URL  : ' + sseTarget + '\n' +
          'SSE state: ' + state + '\n\n' +
          'readyState: 0=CONNECTING 1=OPEN 2=CLOSED\n\n' +
          'Tap OK untuk paksa reconnect SSE';
        if (confirm(info)) {
          // Paksa reset dan reconnect
          if (sseEventSource) { try { sseEventSource.close(); } catch(e) {} }
          sseEventSource = null;
          connectRealtimeSSE();
          setTimeout(function() {
            const ns = sseEventSource ? sseEventSource.readyState : 'null';
            alert('Reconnect dijalankan.\nSSE state baru: ' + ns + '\n(0=sedang connect, 1=berhasil)');
          }, 2000);
        }
      };
    }
  }
}

function startLiveClock() {
  const clockElem = document.getElementById('liveTime');
  const dateElem = document.getElementById('currentDate');

  function update() {
    const now = new Date();
    if (clockElem) clockElem.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (dateElem) dateElem.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  update();
  setInterval(update, 1000);
}

function initGeolocation() {
  startLocationTracking();
}

let watchPositionId = null;

function requestLiveLocation() {
  if ("geolocation" in navigator) {
    showToast("Mengakses sensor GPS HP Live...", "info");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        userCoords = { lat, lng, accuracy };
        applyLocationUpdate(lat, lng, accuracy);
        showToast("Lokasi GPS Live berhasil diperbarui!", "success");
      },
      (error) => {
        console.warn("GPS Error / HTTP block:", error);
        showToast("Sensor GPS HP aktif di titik lokasi terdekat.", "info");
        if (userCoords) applyLocationUpdate(userCoords.lat, userCoords.lng, userCoords.accuracy || 0);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    showToast("Sensor GPS tidak didukung di perangkat ini", "error");
  }
}

function applyLocationUpdate(lat, lng, accuracy) {
  const geoText = document.getElementById('geoText');
  const distanceText = document.getElementById('distanceText');

  const distance = calculateDistance(lat, lng, TARGET_LOCATION.lat, TARGET_LOCATION.lng);
  const distanceMeters = Math.round(distance * 1000);
  const isInside = distanceMeters <= TARGET_LOCATION.allowedRadiusMeters;

  // -- Mode GURU: tampilkan alamat posisi guru + jarak dari SMKN 9 Malang --
  const isGuru = activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin';

  const SMKN9_LAT = -7.9825, SMKN9_LNG = 112.6867;
  const distToSMKN9 = Math.round(calculateDistance(lat, lng, SMKN9_LAT, SMKN9_LNG) * 1000);
  const distToSMKN9Txt = distToSMKN9 >= 1000
    ? `${(distToSMKN9 / 1000).toFixed(1)} km`
    : `${distToSMKN9} m`;

  if (geoText) {
    if (isGuru) {
      // Tampilkan sementara koordinat dulu, ganti dengan alamat setelah reverse geocode selesai
      const addrNow = _lastReverseGeoAddr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      geoText.innerHTML = `<span style="color:#34d399"><i class="fa-solid fa-location-crosshairs"></i> ${addrNow} &nbsp;|&nbsp; <i class="fa-solid fa-school" style="color:#818cf8;"></i> ${distToSMKN9Txt} dari SMKN 9 Malang</span>`;
    } else if (isInside) {
      geoText.innerHTML = `<span style="color:#10b981; font-weight:700; padding:2px 8px; background:rgba(16,185,129,0.15); border-radius:20px; border:1px solid rgba(16,185,129,0.4);"><i class="fa-solid fa-circle-check"></i> Dalam Radius (${distanceMeters}m dari ${TARGET_LOCATION.name})</span>`;
    } else {
      geoText.innerHTML = `<span style="color:#ef4444; font-weight:700; padding:2px 8px; background:rgba(239,68,68,0.15); border-radius:20px; border:1px solid rgba(239,68,68,0.4);"><i class="fa-solid fa-triangle-exclamation"></i> Luar Radius ${distanceMeters}m dari ${TARGET_LOCATION.name}</span>`;
    }
  }

  if (distanceText) distanceText.textContent = isGuru ? distToSMKN9Txt : `${distanceMeters} Meter`;

  // Update mapInfoBar � untuk guru tampilkan alamat + jarak SMKN9
  const mapInfoBar = document.getElementById('mapInfoBar');
  if (mapInfoBar) {
    if (isGuru) {
      const addrNow = _lastReverseGeoAddr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      mapInfoBar.innerHTML = `
        <p><i class="fa-solid fa-location-dot" style="color:#34d399;"></i> Lokasi Anda: <strong id="guruAddrText">${addrNow}</strong></p>
        <p><i class="fa-solid fa-school" style="color:#818cf8;"></i> Jarak dari SMKN 9 Malang: <strong>${distToSMKN9Txt}</strong> &nbsp;|&nbsp; <i class="fa-solid fa-satellite-dish" style="color:#38bdf8;"></i> Akurasi GPS: <strong>${accuracy ? `�${Math.round(accuracy)}m` : '--'}</strong></p>
      `;
    } else {
      mapInfoBar.innerHTML = `
        <p><i class="fa-solid fa-building-flag"></i> Target: <strong id="targetMapName">${TARGET_LOCATION.name}</strong></p>
        <p><i class="fa-solid fa-ruler"></i> Radius Izin: <strong id="radiusMetersText">${TARGET_LOCATION.allowedRadiusMeters} Meter</strong> | Jarak Anda: <strong id="distanceText">${distanceMeters} Meter</strong></p>
      `;
    }
  }

  // Reverse geocode posisi guru � throttle setiap 200m perpindahan atau belum ada alamat
  if (isGuru && !_reverseGeoPending) {
    const movedFar = _lastReverseGeoLat === null ||
      Math.abs(lat - _lastReverseGeoLat) > 0.002 ||
      Math.abs(lng - _lastReverseGeoLng) > 0.002;
    if (movedFar) {
      _reverseGeoPending = true;
      _lastReverseGeoLat = lat;
      _lastReverseGeoLng = lng;
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'id', 'User-Agent': 'SIGAP-PKL-App/1.0' } })
        .then(r => r.json())
        .then(data => {
          if (data && data.address) {
            const a = data.address;
            // Susun alamat ringkas: jalan + kelurahan/kecamatan + kota
            const parts = [];
            if (a.road) parts.push(a.road);
            else if (a.pedestrian) parts.push(a.pedestrian);
            if (a.suburb || a.village) parts.push(a.suburb || a.village);
            if (a.city || a.town || a.county) parts.push(a.city || a.town || a.county);
            _lastReverseGeoAddr = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0,3).join(',');
          } else {
            _lastReverseGeoAddr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          }
          // Update UI dengan alamat baru
          const geoEl = document.getElementById('geoText');
          const addrEl = document.getElementById('guruAddrText');
          if (geoEl && activeUser && activeUser.role === 'guru') {
            const dSMK = Math.round(calculateDistance(_lastReverseGeoLat, _lastReverseGeoLng, SMKN9_LAT, SMKN9_LNG) * 1000);
            const dTxt = dSMK >= 1000 ? `${(dSMK/1000).toFixed(1)} km` : `${dSMK} m`;
            geoEl.innerHTML = `<span style="color:#34d399"><i class="fa-solid fa-location-crosshairs"></i> ${_lastReverseGeoAddr} &nbsp;|&nbsp; <i class="fa-solid fa-school" style="color:#818cf8;"></i> ${dTxt} dari SMKN 9 Malang</span>`;
          }
          if (addrEl) addrEl.textContent = _lastReverseGeoAddr;
        })
        .catch(() => { _lastReverseGeoAddr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`; })
        .finally(() => { _reverseGeoPending = false; });
    }
  }

  // -- Task 2: Update GPS detail info panel --
  const gpsCurrentLat = document.getElementById('gpsCurrentLat');
  const gpsCurrentLng = document.getElementById('gpsCurrentLng');
  const gpsAccuracyValue = document.getElementById('gpsAccuracyValue');
  const gpsDistanceValue = document.getElementById('gpsDistanceValue');
  const gpsAccuracyBadge = document.getElementById('gpsAccuracyBadge');

  if (gpsCurrentLat) gpsCurrentLat.textContent = lat.toFixed(6);
  if (gpsCurrentLng) gpsCurrentLng.textContent = lng.toFixed(6);
  if (gpsAccuracyValue) gpsAccuracyValue.textContent = accuracy ? `${Math.round(accuracy)} m` : '-- m';
  if (gpsDistanceValue) {
    gpsDistanceValue.textContent = `${distanceMeters} m`;
    gpsDistanceValue.style.color = isInside ? '#22d3ee' : '#f59e0b';
  }
  if (gpsAccuracyBadge) {
    const accVal = accuracy ? Math.round(accuracy) : null;
    if (!accVal) {
      gpsAccuracyBadge.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> Mendeteksi...`;
      gpsAccuracyBadge.style.background = 'rgba(100,116,139,0.3)';
      gpsAccuracyBadge.style.color = '#94a3b8';
    } else if (accVal <= 10) {
      gpsAccuracyBadge.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> Akurasi Tinggi (${accVal}m)`;
      gpsAccuracyBadge.style.background = 'rgba(16,185,129,0.2)';
      gpsAccuracyBadge.style.color = '#34d399';
    } else if (accVal <= 30) {
      gpsAccuracyBadge.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> Akurasi Baik (${accVal}m)`;
      gpsAccuracyBadge.style.background = 'rgba(6,182,212,0.2)';
      gpsAccuracyBadge.style.color = '#22d3ee';
    } else {
      gpsAccuracyBadge.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> Akurasi Rendah (${accVal}m)`;
      gpsAccuracyBadge.style.background = 'rgba(245,158,11,0.2)';
      gpsAccuracyBadge.style.color = '#fbbf24';
    }
  }

  // Google Maps links for current position
  const googleMapsCurrentLink = document.getElementById('googleMapsCurrentLink');
  const googleMapsDirectionLink = document.getElementById('googleMapsDirectionLink');
  if (googleMapsCurrentLink) {
    googleMapsCurrentLink.href = `https://www.google.com/maps?q=${lat},${lng}`;
  }
  if (googleMapsDirectionLink) {
    googleMapsDirectionLink.href = `https://www.google.com/maps/dir/${lat},${lng}/${TARGET_LOCATION.lat},${TARGET_LOCATION.lng}`;
  }

  // -- Task 3: Update target location from database --
  updateTargetLocationDisplay();

  // -- Task 4: Show/hide out-of-radius form --
  updateOutRadiusStatus(distanceMeters, isInside);

  updateMapUserPosition(lat, lng);

  // Send live GPS position to Server API every 15 seconds
  const nowMs = Date.now();
  if (nowMs - lastGpsSentTime > 15000) {
    lastGpsSentTime = nowMs;
    fetch('/api/gps_location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: activeUser ? activeUser.id : 1,
        studentName: activeUser ? activeUser.name : 'Siswa',
        latitude: lat,
        longitude: lng
      })
    }).catch(() => {});
  }
}

// -- Task 3: Display target location from database --
function updateTargetLocationDisplay() {
  const targetLocationName = document.getElementById('targetLocationName');
  const targetLocationSubtext = document.getElementById('targetLocationSubtext');
  const targetPklName = document.getElementById('targetPklName');
  const targetLatValue = document.getElementById('targetLatValue');
  const targetLngValue = document.getElementById('targetLngValue');
  const targetRadiusValue = document.getElementById('targetRadiusValue');
  const googleMapsTargetLink = document.getElementById('googleMapsTargetLink');
  const targetMapName = document.getElementById('targetMapName');
  const radiusMetersText = document.getElementById('radiusMetersText');

  if (targetLocationName) targetLocationName.textContent = TARGET_LOCATION.name;
  if (targetPklName) targetPklName.textContent = TARGET_LOCATION.name;
  if (targetLatValue) targetLatValue.textContent = TARGET_LOCATION.lat.toFixed(6);
  if (targetLngValue) targetLngValue.textContent = TARGET_LOCATION.lng.toFixed(6);
  if (targetRadiusValue) targetRadiusValue.textContent = `${TARGET_LOCATION.allowedRadiusMeters} m`;
  if (targetMapName) targetMapName.textContent = TARGET_LOCATION.name;
  if (radiusMetersText) radiusMetersText.textContent = `${TARGET_LOCATION.allowedRadiusMeters} Meter`;

  // Determine source (set by guru/admin or from import)
  let sourceText = 'Lokasi PKL dari database guru pembimbing / admin';
  if (activeUser && activeUser.pklLocation) {
    sourceText = `Diatur oleh: ${activeUser.supervisor || 'Guru Pembimbing'} | Import data massal`;
  }
  if (targetLocationSubtext) targetLocationSubtext.textContent = sourceText;

  if (googleMapsTargetLink) {
    googleMapsTargetLink.href = `https://www.google.com/maps?q=${TARGET_LOCATION.lat},${TARGET_LOCATION.lng}&label=${encodeURIComponent(TARGET_LOCATION.name)}`;
  }
}

// -- Task 4: Out-of-radius form logic --
let pendingAbsenType = null;
let pendingAbsenLat = null;
let pendingAbsenLng = null;

function updateOutRadiusStatus(distanceMeters, isInside) {
  const banner = document.getElementById('distanceStatusBanner');
  if (!banner) return;

  // Untuk guru � sembunyikan banner radius, tidak relevan
  const isGuru = activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin';
  if (isGuru) {
    banner.style.display = 'none';
    return;
  }

  banner.style.display = 'flex';
  if (isInside) {
    banner.style.background = 'rgba(16,185,129,0.15)';
    banner.style.border = '1px solid rgba(16,185,129,0.3)';
    banner.style.color = '#34d399';
    banner.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Anda berada <strong>dalam radius izin</strong> (${distanceMeters}m &lt; ${TARGET_LOCATION.allowedRadiusMeters}m). Absensi dapat dilakukan.</span>`;
  } else {
    banner.style.background = 'rgba(245,158,11,0.15)';
    banner.style.border = '1px solid rgba(245,158,11,0.3)';
    banner.style.color = '#fbbf24';
    banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>Anda <strong>di luar radius izin</strong> (${distanceMeters}m &gt; ${TARGET_LOCATION.allowedRadiusMeters}m). Absensi memerlukan alasan.</span>`;
  }
}

function showOutRadiusReasonForm(absenType, lat, lng, distanceMeters) {
  pendingAbsenType = absenType;
  pendingAbsenLat = lat;
  pendingAbsenLng = lng;

  const form = document.getElementById('outRadiusReasonForm');
  const outRadiusDistance = document.getElementById('outRadiusDistance');
  const outRadiusLimit = document.getElementById('outRadiusLimit');
  const outRadiusReason = document.getElementById('outRadiusReason');

  if (outRadiusDistance) outRadiusDistance.textContent = `${distanceMeters} meter`;
  if (outRadiusLimit) outRadiusLimit.textContent = `${TARGET_LOCATION.allowedRadiusMeters} meter`;
  if (outRadiusReason) {
    outRadiusReason.value = '';
    outRadiusReason.oninput = () => {
      const count = document.getElementById('outRadiusCharCount');
      if (count) count.textContent = `${outRadiusReason.value.length} / 300 karakter`;
    };
  }
  if (form) {
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function cancelOutRadiusAbsen() {
  const form = document.getElementById('outRadiusReasonForm');
  if (form) form.classList.add('hidden');
  pendingAbsenType = null;
  pendingAbsenLat = null;
  pendingAbsenLng = null;
  showToast('Absensi dibatalkan.', 'info');
}

function submitOutRadiusAbsen() {
  const reasonInput = document.getElementById('outRadiusReason');
  const reason = reasonInput ? reasonInput.value.trim() : '';

  if (!reason || reason.length < 10) {
    showToast('Alasan wajib diisi minimal 10 karakter.', 'error');
    if (reasonInput) reasonInput.focus();
    return;
  }

  const form = document.getElementById('outRadiusReasonForm');
  if (form) form.classList.add('hidden');

  // Store reason and proceed with attendance
  if (pendingAbsenType) {
    showToast(`Alasan tercatat. Membuka kamera untuk absen ${pendingAbsenType}...`, 'info');
    // Attach reason to next attendance record
    window._outRadiusReason = reason;
    window._outRadiusDistance = pendingAbsenLat && pendingAbsenLng
      ? Math.round(calculateDistance(pendingAbsenLat, pendingAbsenLng, TARGET_LOCATION.lat, TARGET_LOCATION.lng) * 1000)
      : null;
    openCameraModal(pendingAbsenType);
  }
  pendingAbsenType = null;
  pendingAbsenLat = null;
  pendingAbsenLng = null;
}

// -- Task 5: Sync kelas in student profile --
function syncStudentKelasToProfile(user) {
  if (!user || user.role !== 'siswa') return;

  // Show kelas item in info card
  const profileKelasItem = document.getElementById('profileKelasItem');
  const profileKelas = document.getElementById('profileKelas');
  const syncKelasCard = document.getElementById('syncKelasCard');
  const syncKelasCurrentValue = document.getElementById('syncKelasCurrentValue');
  const syncKelasNisn = document.getElementById('syncKelasNisn');
  const syncKelasLastSync = document.getElementById('syncKelasLastSync');
  const syncKelasStatusText = document.getElementById('syncKelasStatusText');
  const profileSubText = document.getElementById('profileSubText');

  if (profileKelasItem) profileKelasItem.classList.remove('hidden');
  if (syncKelasCard) syncKelasCard.classList.remove('hidden');

  // Tampilkan card ajukan/revisi koordinat sesuai kondisi koordinat siswa
  var _ajKoordWarn  = document.getElementById('ajukanKoordCard');
  var _revisiKoord  = document.getElementById('revisiKoordCard');
  var _uLat = parseFloat(user.latitude_pkl);
  var _uLng = parseFloat(user.longitude_pkl);
  var _coordsOk = !isNaN(_uLat) && _uLat !== 0 && !isNaN(_uLng) && _uLng !== 0
    && !(Math.abs(_uLat - (-7.9825)) < 0.0005 && Math.abs(_uLng - 112.6867) < 0.0005)
    && !(Math.abs(_uLat - (-7.9700)) < 0.0005 && Math.abs(_uLng - 112.6326) < 0.0005);
  if (_coordsOk) {
    // Koordinat valid → hanya tampilkan tombol revisi (tidak mengganggu)
    if (_ajKoordWarn) _ajKoordWarn.classList.add('hidden');
    if (_revisiKoord) _revisiKoord.classList.remove('hidden');
    // Sembunyikan notifikasi beranda
    var _homeN = document.getElementById('homeKoordNotice');
    if (_homeN) _homeN.classList.add('hidden');
  } else {
    // Koordinat belum valid → tampilkan card warning langsung tanpa tunggu geocode
    if (_revisiKoord) _revisiKoord.classList.add('hidden');
    if (_ajKoordWarn) {
      _ajKoordWarn.classList.remove('hidden');
      var _stPend = document.getElementById('ajukanKoordStatus');
      var _desc   = document.getElementById('ajukanKoordDesc');
      if (user.status === 'pending_edit_pkl') {
        // Sudah pernah mengajukan — tampilkan status pending
        if (_stPend) { _stPend.style.display=''; _stPend.textContent='⏳ Pengajuan dikirim, menunggu persetujuan admin.'; }
        if (_desc)   { _desc.textContent = 'Pengajuan koordinat sudah dikirim. Tunggu persetujuan admin untuk mengunci koordinat PKL Anda.'; }
      } else {
        // Belum pernah ajukan — tampilkan deskripsi standar
        var _shortName = (user.pklLocation && user.pklLocation.indexOf(',') > 5)
          ? user.pklLocation.split(',')[0].trim() : (user.pklLocation || 'tempat PKL Anda');
        if (_desc) { _desc.textContent = 'Koordinat GPS untuk "' + _shortName + '" belum tersedia. ' +
          'Jika Anda sedang di lokasi PKL, ajukan titik koordinat untuk diverifikasi admin.'; }
        if (_stPend) _stPend.style.display = 'none';
      }
    }
    // Tampilkan notifikasi di beranda juga (jika belum pending)
    var _homeNotice = document.getElementById('homeKoordNotice');
    if (_homeNotice) {
      if (user.status !== 'pending_edit_pkl') {
        _homeNotice.classList.remove('hidden');
      } else {
        // Sudah pending — ubah teks tombol beranda jadi "Status Pengajuan"
        _homeNotice.classList.remove('hidden');
        var _homeTxt = _homeNotice.querySelector('strong');
        if (_homeTxt) _homeTxt.textContent = 'Pengajuan koordinat sedang diproses admin.';
        var _homeBtn = _homeNotice.querySelector('button');
        if (_homeBtn) { _homeBtn.textContent = '⏳ Menunggu'; _homeBtn.disabled = true; _homeBtn.style.opacity='0.6'; }
      }
    }
  }

  const kelasValue = user.kelas || '--';

  // Update info card kelas
  if (profileKelas) profileKelas.textContent = kelasValue;

  // Update subtext di profile card agar sinkron
  if (profileSubText && user.role === 'siswa') {
    const kelasText = user.kelas ? ` � ${user.kelas}` : '';
    profileSubText.textContent = `NISN: ${user.nomor_induk}${kelasText}`;
  }

  // Update sync status card
  if (syncKelasCurrentValue) syncKelasCurrentValue.textContent = kelasValue;
  if (syncKelasNisn) syncKelasNisn.textContent = user.nomor_induk || '--';

  // Status label
  if (syncKelasStatusText) {
    if (user.kelas) {
      syncKelasStatusText.innerHTML = `<span style="color:#10b981;"><i class="fa-solid fa-circle-check"></i> Tersinkron</span>`;
    } else {
      syncKelasStatusText.innerHTML = `<span style="color:#f59e0b;"><i class="fa-solid fa-circle-exclamation"></i> Belum ada data kelas</span>`;
    }
  }

  // Last sync time
  const lastSync = localStorage.getItem(`kelasSync_${user.id}`);
  if (syncKelasLastSync) {
    syncKelasLastSync.textContent = lastSync
      ? new Date(parseInt(lastSync)).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : 'Belum pernah';
  }
}

function syncStudentKelas() {
  if (!activeUser || activeUser.role !== 'siswa') return;

  const btn = document.getElementById('btnSyncKelas');
  const icon = document.getElementById('syncKelasIcon');
  const statusText = document.getElementById('syncKelasStatusText');

  // Animate button
  if (btn) btn.disabled = true;
  if (icon) icon.className = 'fa-solid fa-rotate fa-spin';

  showToast('Sinkronisasi data kelas...', 'info');

  // Simulate sync (fetch from server or local DB)
  setTimeout(() => {
    // Try to get latest data from server
    fetch(`/api/users/${activeUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.kelas) {
          activeUser.kelas = data.kelas;
          // Update in users list
          const users = getUsers();
          const idx = users.findIndex(u => u.id === activeUser.id);
          if (idx !== -1) {
            users[idx].kelas = data.kelas;
            saveUsers(users);
          }
        }
        completeSyncKelas();
      })
      .catch(() => {
        // Offline: read from local storage
        const users = getUsers();
        const found = users.find(u => u.id === activeUser.id);
        if (found && found.kelas) activeUser.kelas = found.kelas;
        completeSyncKelas();
      });
  }, 1200);
}

function completeSyncKelas() {
  const btn = document.getElementById('btnSyncKelas');
  const icon = document.getElementById('syncKelasIcon');
  const statusText = document.getElementById('syncKelasStatusText');
  const profileKelas = document.getElementById('profileKelas');
  const syncKelasCurrentValue = document.getElementById('syncKelasCurrentValue');
  const syncKelasLastSync = document.getElementById('syncKelasLastSync');
  const profileSubText = document.getElementById('profileSubText');

  const now = Date.now();
  localStorage.setItem(`kelasSync_${activeUser.id}`, now.toString());

  // Persist updated activeUser back to auth storage
  try {
    if (localStorage.getItem(STORAGE_KEY_AUTH)) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(activeUser));
    } else if (sessionStorage.getItem(STORAGE_KEY_AUTH)) {
      sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(activeUser));
    }
  } catch(e) {}

  const kelasVal = activeUser.kelas || '--';

  // Update all displays
  if (profileKelas) profileKelas.textContent = kelasVal;
  if (syncKelasCurrentValue) syncKelasCurrentValue.textContent = kelasVal;

  // Update subtext di profile card
  if (profileSubText && activeUser.role === 'siswa') {
    const kelasText = activeUser.kelas ? ` � ${activeUser.kelas}` : '';
    profileSubText.textContent = `NISN: ${activeUser.nomor_induk}${kelasText}`;
  }

  if (syncKelasLastSync) {
    syncKelasLastSync.textContent = new Date(now).toLocaleString('id-ID', {
      day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
  }
  if (statusText) {
    statusText.innerHTML = activeUser.kelas
      ? `<span style="color:#10b981;"><i class="fa-solid fa-circle-check"></i> Tersinkron</span>`
      : `<span style="color:#f59e0b;"><i class="fa-solid fa-circle-exclamation"></i> Belum ada data kelas</span>`;
  }
  if (btn) btn.disabled = false;
  if (icon) icon.className = 'fa-solid fa-rotate';

  showToast(activeUser.kelas ? `Data kelas berhasil disinkron: ${kelasVal}` : 'Sync selesai. Data kelas belum diisi oleh admin.', activeUser.kelas ? 'success' : 'info');
}

function startLocationTracking() {
  if (!userCoords) {
    userCoords = { lat: TARGET_LOCATION.lat + 0.00012, lng: TARGET_LOCATION.lng + 0.00012 };
  }

  initMap();
  updateTargetLocationDisplay(); // Task 3: show target info immediately

  if ("geolocation" in navigator) {
    if (watchPositionId) navigator.geolocation.clearWatch(watchPositionId);
    watchPositionId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        userCoords = { lat, lng, accuracy };
        applyLocationUpdate(lat, lng, accuracy);
      },
      (error) => {
        console.warn("GPS Watch Error:", error);
        applyLocationUpdate(userCoords.lat, userCoords.lng, userCoords.accuracy || 0);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
  } else {
    applyLocationUpdate(userCoords.lat, userCoords.lng, 0);
  }
}


// ── RULE 3: Deteksi Mock Location / GPS Palsu ─────────────────────────────
var _prevGpsCoords = null;  // { lat, lng, ts } — posisi sebelumnya
var _gpsStaleCount = 0;     // berapa kali koordinat sama persis

function _detectMockLocation(lat, lng, accuracy, altitude) {
  var warnings = [];
  var isSuspicious = false;

  // 1. Accuracy terlalu sempurna: tepat 0 atau 1 (emulator default)
  if (accuracy !== null && accuracy !== undefined && accuracy <= 1 && accuracy >= 0) {
    warnings.push('Akurasi GPS tidak wajar ('+accuracy+'m — kemungkinan emulator)');
    isSuspicious = true;
  }

  // 2. Akurasi terlalu buruk (> 1000m = tidak valid untuk absen)
  if (accuracy !== null && accuracy !== undefined && accuracy > 1000) {
    warnings.push('Akurasi GPS sangat rendah ('+Math.round(accuracy)+'m — tidak dapat digunakan)');
    isSuspicious = true;
  }

  // 3. Koordinat di luar area Malang > 100km
  var distKm = calculateDistance(lat, lng, -7.9825, 112.6867);
  if (distKm > 100) {
    warnings.push('Posisi GPS terlalu jauh dari area PKL ('+Math.round(distKm)+'km dari Malang)');
    isSuspicious = true;
  }

  // 4. Altitude persis 0 + accuracy persis 0 (pola emulator Android)
  if (altitude !== null && altitude !== undefined && altitude === 0 && accuracy === 0) {
    warnings.push('Pola koordinat emulator terdeteksi (altitude=0, accuracy=0)');
    isSuspicious = true;
  }

  // 5. Koordinat tidak berubah sama sekali dalam 2 menit (GPS spoofing statis)
  var now = Date.now();
  if (_prevGpsCoords) {
    var samePos = Math.abs(lat - _prevGpsCoords.lat) < 0.000001 &&
                  Math.abs(lng - _prevGpsCoords.lng) < 0.000001;
    var elapsed = (now - _prevGpsCoords.ts) / 1000; // detik
    if (samePos) {
      _gpsStaleCount++;
    } else {
      _gpsStaleCount = 0;
    }
    // Koordinat sama persis > 2 menit — bisa jadi spoofing statis
    if (_gpsStaleCount > 15 && elapsed > 120) { // 15 update * 8 detik = 2 menit
      warnings.push('Koordinat GPS tidak bergerak dalam '+Math.round(elapsed)+'s (kemungkinan GPS palsu)');
      // Ini tidak langsung dicurigai — bisa saja siswa diam di lokasi PKL
      // Hanya log, tidak blokir
    }
  }
  _prevGpsCoords = { lat: lat, lng: lng, ts: now };

  return { isSuspicious: isSuspicious, warnings: warnings };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function initMap() {
  const mapElem = document.getElementById('map');
  if (!mapElem) return;

  if (!leafletMap) {
    // Buat map baru dengan semua kontrol zoom aktif
    leafletMap = L.map('map', {
      zoomControl: true,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
      dragging: true
    }).setView([TARGET_LOCATION.lat, TARGET_LOCATION.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '� OpenStreetMap',
      maxZoom: 19,
      minZoom: 5
    }).addTo(leafletMap);

    // Tandai bahwa map baru dibuat � belum ada interaksi user
    leafletMap._userHasZoomed = false;
    leafletMap.on('zoomend', function() {
      leafletMap._userHasZoomed = true;
    });
    leafletMap.on('dragend', function() {
      leafletMap._userHasZoomed = true;
    });

    setTimeout(function() { if (leafletMap) leafletMap.invalidateSize(); }, 300);
  } else {
    // Map sudah ada � HANYA invalidateSize, JANGAN setView/reset zoom
    leafletMap.invalidateSize({ pan: false });
    setTimeout(function() { if (leafletMap) leafletMap.invalidateSize({ pan: false }); }, 300);
    return; // Keluar � jangan rebuild marker jika map sudah ada dan user sudah zoom
  }

  // Hapus marker lama
  if (targetMarker) leafletMap.removeLayer(targetMarker);
  if (geofenceCircle) leafletMap.removeLayer(geofenceCircle);
  studentPklMarkers.forEach(m => { try { leafletMap.removeLayer(m); } catch(e){} });
  studentPklMarkers = [];

  // -- Mode GURU: tampilkan semua titik PKL siswa bimbingan ------------------
  const isGuru = activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin';
  if (isGuru) {
    const supervised = getSupervisedStudentsOnly();
    const bounds = [];

    // Warna marker per siswa (berbeda supaya mudah dibedakan)
    const COLORS = ['#4f46e5','#e11d48','#f59e0b','#10b981','#0284c7','#7c3aed','#db2777','#059669'];

    supervised.forEach((student, idx) => {
      const lat = parseFloat(student.latitude_pkl);
      const lng = parseFloat(student.longitude_pkl);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      const color = COLORS[idx % COLORS.length];
      const kelasInfo = student.kelas ? ` � ${student.kelas}` : '';
      const pklInfo   = student.pklLocation || 'Lokasi PKL';

      // Marker titik PKL siswa
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:${color};
          color:#fff;
          border-radius:50% 50% 50% 0;
          width:28px; height:28px;
          display:flex; align-items:center; justify-content:center;
          font-size:0.65rem; font-weight:700;
          box-shadow:0 2px 6px rgba(0,0,0,0.4);
          border:2px solid #fff;
          transform:rotate(-45deg);
        "><span style="transform:rotate(45deg)">${idx+1}</span></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
      });

      const marker = L.marker([lat, lng], { icon }).addTo(leafletMap)
        .bindPopup(`
          <div style="font-size:0.82rem; min-width:180px;">
            <div style="font-weight:700; color:${color}; margin-bottom:4px;">
              ${idx+1}. ${student.name}
            </div>
            <div style="color:#555;">${kelasInfo ? kelasInfo.replace(' � ','') : ''}</div>
            <div style="margin-top:4px;"><b>?? PKL:</b> ${pklInfo}</div>
            <div><b>??</b> ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank"
               style="display:inline-block; margin-top:6px; color:#4f46e5; font-weight:600; font-size:0.75rem;">
              Lihat di Google Maps ?
            </a>
          </div>
        `);

      // Lingkaran radius geofencing per siswa
      const circle = L.circle([lat, lng], {
        color,
        fillColor: color,
        fillOpacity: 0.08,
        weight: 2,
        radius: TARGET_LOCATION.allowedRadiusMeters || 350
      }).addTo(leafletMap);

      studentPklMarkers.push(marker, circle);
      bounds.push([lat, lng]);
    });

    // Fit map agar semua titik PKL terlihat
    if (bounds.length > 1) {
      try { leafletMap.fitBounds(bounds, { padding: [40, 40] }); } catch(e) {}
    } else if (bounds.length === 1) {
      leafletMap.setView(bounds[0], 16);
    } else {
      // Tidak ada koordinat siswa � tampilkan SMKN9
      leafletMap.setView([-7.9825, 112.6867], 14);
      L.marker([-7.9825, 112.6867]).addTo(leafletMap)
        .bindPopup('<b>SMK Negeri 9 Malang</b><br>Belum ada koordinat siswa.').openPopup();
      studentPklMarkers.push();
    }

    // Posisi guru (dot hijau)
    if (userCoords) updateMapUserPosition(userCoords.lat, userCoords.lng);

    // Isi legenda daftar siswa di bawah peta
    const legendDiv  = document.getElementById('guruPklLegend');
    const legendList = document.getElementById('guruPklLegendList');
    const mapInfoBar = document.getElementById('mapInfoBar');
    if (mapInfoBar) mapInfoBar.style.display = 'none'; // sembunyikan bar info siswa
    if (legendDiv && legendList) {
      legendList.innerHTML = '';
      supervised.forEach((student, idx) => {
        const lat = parseFloat(student.latitude_pkl);
        const lng = parseFloat(student.longitude_pkl);
        const color = COLORS[idx % COLORS.length];
        const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        const kelasInfo = student.kelas ? ` � ${student.kelas}` : '';
        const gmLink = hasCoords
          ? `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank"
               style="color:${color}; font-size:0.7rem; margin-left:6px;">? Maps</a>`
          : `<span style="color:#ef4444; font-size:0.7rem; margin-left:6px;">? Koordinat belum ada</span>`;
        legendList.innerHTML += `
          <div style="display:flex; align-items:center; gap:8px; font-size:0.75rem;">
            <span style="background:${color}; color:#fff; border-radius:50%; width:20px; height:20px;
              display:inline-flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">
              ${idx+1}
            </span>
            <span style="flex:1; color:#e2e8f0;">
              <strong>${student.name}</strong>${kelasInfo}
              <span style="color:#94a3b8;"> � ${student.pklLocation || '(belum diisi)'}</span>
            </span>
            ${gmLink}
          </div>`;
      });
      if (supervised.length === 0) {
        legendList.innerHTML = '<span style="color:#f87171; font-size:0.75rem;">Belum ada siswa dalam kelompok bimbingan.</span>';
      }
      legendDiv.style.display = 'block';
    }

    setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 200);
    return;
  }

  // -- Mode SISWA / ADMIN: marker target tunggal -----------------------------
  const legendDiv2 = document.getElementById('guruPklLegend');
  const mapInfoBar2 = document.getElementById('mapInfoBar');
  if (legendDiv2) legendDiv2.style.display = 'none';
  if (mapInfoBar2) mapInfoBar2.style.display = '';

  // Marker PKL — merah dengan ikon lokasi
  const _pklIcon = L.divIcon({
    className: '',
    html: `<div style="
      background:#dc2626; color:#fff;
      border-radius:50% 50% 50% 0;
      width:32px; height:32px;
      display:flex; align-items:center; justify-content:center;
      font-size:14px;
      box-shadow:0 3px 8px rgba(220,38,38,0.5);
      border:2.5px solid #fff;
      transform:rotate(-45deg);
    "><span style="transform:rotate(45deg)">📍</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  targetMarker = L.marker([TARGET_LOCATION.lat, TARGET_LOCATION.lng], { icon: _pklIcon })
    .addTo(leafletMap)
    .bindPopup(`
      <div style="font-size:0.82rem; min-width:160px;">
        <div style="font-weight:700; color:#dc2626; margin-bottom:4px;">📍 Lokasi PKL</div>
        <div style="font-weight:600;">${TARGET_LOCATION.name}</div>
        <div style="color:#64748b; font-size:0.75rem; margin-top:2px;">
          Radius: ${TARGET_LOCATION.allowedRadiusMeters} meter
        </div>
        <a href="https://www.google.com/maps?q=${TARGET_LOCATION.lat},${TARGET_LOCATION.lng}"
           target="_blank" style="color:#dc2626; font-size:0.75rem; margin-top:4px; display:block;">
          Buka Google Maps →
        </a>
      </div>
    `).openPopup();

  // Lingkaran geofence — ungu/biru
  geofenceCircle = L.circle([TARGET_LOCATION.lat, TARGET_LOCATION.lng], {
    color: '#4f46e5',
    fillColor: '#6366f1',
    fillOpacity: 0.15,
    weight: 2,
    dashArray: '6,4',
    radius: TARGET_LOCATION.allowedRadiusMeters
  }).addTo(leafletMap);

  if (userCoords) updateMapUserPosition(userCoords.lat, userCoords.lng);

  setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 200);
}

function updateMapUserPosition(lat, lng) {
  if (!leafletMap) return;

  if (userMarker) {
    userMarker.setLatLng([lat, lng]);
  } else {
    // Titik biru — posisi siswa saat ini dari GPS HP
    userMarker = L.circleMarker([lat, lng], {
      color: '#1d4ed8',
      fillColor: '#3b82f6',
      fillOpacity: 0.9,
      radius: 10,
      weight: 3
    }).addTo(leafletMap).bindPopup(
      '<div style="font-size:0.82rem;"><b>📱 Posisi Saya</b><br><span style="color:#3b82f6;">GPS Aktif</span></div>'
    );
  }

  // Garis putus-putus hanya untuk siswa (menunjukkan jarak ke titik target)
  // Untuk guru tidak relevan karena ada banyak titik � tidak ditampilkan
  const isGuru = activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin';

  if (distanceLine) {
    leafletMap.removeLayer(distanceLine);
    distanceLine = null;
  }

  if (!isGuru) {
    distanceLine = L.polyline([[lat, lng], [TARGET_LOCATION.lat, TARGET_LOCATION.lng]], {
      color: '#34d399',
      dashArray: '5, 5'
    }).addTo(leafletMap);
  }

  try {
    // fitBounds hanya sekali saat GPS pertama kali dapat posisi
    // Setelah itu user bebas zoom dan pan � tidak di-reset
    if (!mapFittedOnce) {
      mapFittedOnce = true;
      leafletMap.fitBounds([
        [lat, lng],
        [TARGET_LOCATION.lat, TARGET_LOCATION.lng]
      ], { padding: [45, 45], maxZoom: 17 });
    }
    // Tidak ada auto-pan/zoom setelah fitBounds pertama
  } catch(e) {}
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add('active');

  // Map tabId → nav button ID (beberapa ID tidak mengikuti pola nav+TabId+Btn)
  const navIdMap = {
    home:       'navHomeBtn',
    history:    'navHistoryBtn',
    permission: 'navPermBtn',
    journal:    'navJournalBtn',
    admin:      'adminNavBtn',
    profile:    'navProfileBtn',
  };
  const navBtnId = navIdMap[tabId] || ('nav' + tabId.charAt(0).toUpperCase() + tabId.slice(1) + 'Btn');
  const activeNav = document.getElementById(navBtnId);
  if (activeNav) activeNav.classList.add('active');

  scrollToTop();

  if (tabId === 'home') {
    if (!leafletMap) {
      initMap();
    } else {
      // Map sudah ada � hanya refresh ukuran, JANGAN reset zoom
      setTimeout(function() { if (leafletMap) leafletMap.invalidateSize({ pan: false }); }, 200);
    }
    renderChart();
    // Pastikan tombol monitoring tampil untuk guru/admin
    setTimeout(_ensureMonitoringBtn, 150);
  }

  if (tabId === 'permission') {
    if (activeUser && (activeUser.role === 'guru' || activeUser.role === 'admin' || activeUser.username === 'admin')) {
      // Pastikan form siswa tersembunyi dan log guru visible
      var spfc = document.getElementById('studentPermissionFormCard');
      var sptc = document.getElementById('studentPermissionTitleContainer');
      var glpc = document.getElementById('guruLogPresensiContainer');
      if (spfc) spfc.classList.add('hidden');
      if (sptc) sptc.classList.add('hidden');
      if (glpc) glpc.classList.remove('hidden');
      renderGuruLogPresensiTab();
    } else {
      // Pastikan log guru tersembunyi dan form siswa visible
      var spfc2 = document.getElementById('studentPermissionFormCard');
      var sptc2 = document.getElementById('studentPermissionTitleContainer');
      var glpc2 = document.getElementById('guruLogPresensiContainer');
      if (spfc2) spfc2.classList.remove('hidden');
      if (sptc2) sptc2.classList.remove('hidden');
      if (glpc2) glpc2.classList.add('hidden');
      renderPermissionList();
    }
  }

    if (tabId === 'journal') {
    if (typeof initJournalTab === 'function') initJournalTab();
  }

  if (tabId === 'history') {
    // Populate filter + sync + render saat tab riwayat dibuka
    populateHistoryFilters();
    renderHistoryList();
    // Sync log dari server saat tab dibuka
    _syncLogsFromServer(function() { renderHistoryList(); });
  }
  if (tabId === 'admin') {
    if (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin') {
      switchAdminSubTab('monitoring', false);
    } else {
      switchAdminSubTab('users', false);
    }
  }
}

let liveViewfinderInterval = null;

let modalLeafletMap = null;
let modalTargetCircle = null;
let modalUserMarker = null;
let modalTargetMarker = null;

function initModalMap(userLat, userLng) {
  const mapContainer = document.getElementById('modalMap');
  if (!mapContainer || typeof L === 'undefined') return;

  if (!modalLeafletMap) {
    modalLeafletMap = L.map('modalMap', { zoomControl: false }).setView([userLat, userLng], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(modalLeafletMap);
  } else {
    modalLeafletMap.setView([userLat, userLng], 17);
  }

  if (modalTargetCircle) modalLeafletMap.removeLayer(modalTargetCircle);
  if (modalUserMarker) modalLeafletMap.removeLayer(modalUserMarker);
  if (modalTargetMarker) modalLeafletMap.removeLayer(modalTargetMarker);

  modalTargetCircle = L.circle([TARGET_LOCATION.lat, TARGET_LOCATION.lng], {
    color: '#059669',
    fillColor: '#10b981',
    fillOpacity: 0.2,
    radius: TARGET_LOCATION.allowedRadiusMeters
  }).addTo(modalLeafletMap);

  const targetIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background:#059669; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 8px rgba(0,0,0,0.5);"><i class="fa-solid fa-building" style="font-size:11px;"></i></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
  modalTargetMarker = L.marker([TARGET_LOCATION.lat, TARGET_LOCATION.lng], { icon: targetIcon }).addTo(modalLeafletMap)
    .bindPopup(`<b>${TARGET_LOCATION.name}</b><br>Radius: ${TARGET_LOCATION.allowedRadiusMeters}m`);

  const userIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background:#4f46e5; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 8px rgba(0,0,0,0.5); border:2px solid #fff;"><i class="fa-solid fa-location-dot" style="font-size:11px;"></i></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
  modalUserMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(modalLeafletMap)
    .bindPopup(`<b>Posisi Saya</b>`);

  setTimeout(() => {
    if (modalLeafletMap) modalLeafletMap.invalidateSize();
  }, 250);
}

async function openCameraModal(type) {
  activeCameraType = type;

  // Stop stream lama jika ada (mencegah kamera lambat saat dibuka ulang)
  if (currentStream) {
    try { currentStream.getTracks().forEach(function(t) { t.stop(); }); } catch(e) {}
    currentStream = null;
  }
  const modal = document.getElementById('cameraModal');
  const title = document.getElementById('cameraModalTitle');
  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('capturedCanvas');
  const photoPreviewBox = document.getElementById('photoPreviewBox');
  const btnCapture = document.getElementById('btnCapturePhoto');
  const btnSubmit = document.getElementById('btnSubmitAttendance');
  const btnRetake = document.getElementById('btnRetakePhoto');
  const modalLocationText = document.getElementById('modalLocationText');
  const warningBox = document.getElementById('outOfRadiusWarningBox');
  const warningTitle = document.getElementById('warningBoxTitle');
  const reasonInput = document.getElementById('outOfRadiusReasonInput');

  if (!userCoords) {
    userCoords = { lat: TARGET_LOCATION.lat + 0.00012, lng: TARGET_LOCATION.lng + 0.00012 };
  }

  if (title) {
    if (type === 'pengantaran') title.textContent = 'Absen Pengantaran Siswa PKL (Foto & GPS)';
    else if (type === 'monitoring') title.textContent = 'Absen Kunjungan Monitoring PKL (Foto & GPS)';
    else if (type === 'penjemputan') title.textContent = 'Absen Penjemputan Siswa PKL (Foto & GPS)';
    else if (type === 'masuk') title.textContent = 'Presensi Masuk (Selfie)';
    else title.textContent = 'Presensi Pulang (Selfie)';
  }

  // Calculate distance & check if out of radius
  const dist = calculateDistance(userCoords.lat, userCoords.lng, TARGET_LOCATION.lat, TARGET_LOCATION.lng);
  const distanceMeters = Math.round(dist * 1000);
  const isOutOfRadius = (distanceMeters > TARGET_LOCATION.allowedRadiusMeters);

  // Hitung jarak dan tampilkan info lokasi
  var _isGuruMonitoringInfo = (type === 'monitoring' || type === 'pengantaran' || type === 'penjemputan') &&
    activeUser && (activeUser.role === 'guru' || activeUser.role === 'admin' || activeUser.username === 'admin');

  if (modalLocationText) {
    if (_isGuruMonitoringInfo) {
      // Guru monitoring: tampilkan jarak ke lokasi PKL siswa tanpa warna merah
      modalLocationText.innerHTML = `<span style="color:#34d399; font-weight:bold;"><i class="fa-solid fa-location-crosshairs"></i> Monitoring: ${TARGET_LOCATION.name} (${distanceMeters}m)</span>`;
    } else if (isOutOfRadius) {
      modalLocationText.innerHTML = `<span style="color:#f87171; font-weight:bold;"><i class="fa-solid fa-triangle-exclamation"></i> Di Luar Radius (${distanceMeters}m dari ${TARGET_LOCATION.name})</span>`;
    } else {
      modalLocationText.innerHTML = `<span style="color:#34d399; font-weight:bold;"><i class="fa-solid fa-circle-check"></i> Lokasi Terverifikasi (${distanceMeters}m dari ${TARGET_LOCATION.name})</span>`;
    }
  }

  if (warningBox) {
    // Untuk guru/admin monitoring: tidak perlu cek radius — langsung izinkan
    var _isGuruMonitoringModal = (type === 'monitoring' || type === 'pengantaran' || type === 'penjemputan') &&
      activeUser && (activeUser.role === 'guru' || activeUser.role === 'admin' || activeUser.username === 'admin');
    if (isOutOfRadius && !_isGuruMonitoringModal) {
      warningBox.classList.remove('hidden');
      if (warningTitle) warningTitle.textContent = `Peringatan: Posisi Anda ${distanceMeters} meter di luar radius titik target PKL!`;
    } else {
      warningBox.classList.add('hidden');
      if (reasonInput) reasonInput.value = '';
    }
  }

  if (canvas) canvas.classList.add('hidden');
  if (photoPreviewBox) photoPreviewBox.classList.add('hidden');
  if (btnCapture) btnCapture.classList.remove('hidden');
  if (btnSubmit) btnSubmit.classList.add('hidden');
  if (btnRetake) btnRetake.style.display = 'none';

  if (modal) modal.classList.remove('hidden');

  // Jalankan initModalMap secara async (tidak blocking kamera)
  setTimeout(function() { initModalMap(userCoords.lat, userCoords.lng); }, 50);

  let streamOk = false;
  if (video) video.classList.remove('hidden');

  // Helper: getUserMedia dengan timeout agar tidak hang lama
  function _getMediaWithTimeout(constraints, ms) {
    return Promise.race([
      navigator.mediaDevices.getUserMedia(constraints),
      new Promise(function(_, reject) {
        setTimeout(function() { reject(new Error('camera_timeout')); }, ms);
      })
    ]);
  }

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Strategi: coba dari yang paling kompatibel ke yang paling umum
      // Tidak pakai width/height constraint — menyebabkan gagal di banyak device Android
      try {
        // Percobaan 1: kamera depan (selfie) — paling umum untuk absen
        currentStream = await _getMediaWithTimeout(
          { video: { facingMode: 'user' }, audio: false }, 5000);
        streamOk = true;
      } catch (e1) {
        console.warn('[CAM] facingMode user gagal:', e1.message);
        try {
          // Percobaan 2: kamera belakang
          currentStream = await _getMediaWithTimeout(
            { video: { facingMode: 'environment' }, audio: false }, 4000);
          streamOk = true;
        } catch (e2) {
          console.warn('[CAM] facingMode environment gagal:', e2.message);
          try {
            // Percobaan 3: kamera apapun tanpa constraint
            currentStream = await _getMediaWithTimeout({ video: true, audio: false }, 4000);
            streamOk = true;
          } catch (e3) {
            console.warn('[CAM] video:true gagal:', e3.message);
          }
        }
      }
      if (video && currentStream && streamOk) {
        video.srcObject = currentStream;
        // Tunggu metadata loaded agar videoWidth tersedia saat takeCameraPhoto()
        video.onloadedmetadata = function() {
          video.play().catch(function(pe) { console.warn('[CAM] play error:', pe.message); });
        };
        // Fallback jika onloadedmetadata tidak trigger
        try { await video.play(); } catch(pe) { console.warn('[CAM] play error:', pe.message); }
      }
    }
  } catch (err) {
    console.warn("Hardware webcam unavailable / HTTP non-SSL context:", err);
    streamOk = false;
  }

  const httpNotice = document.getElementById('httpCameraNotice');

  if (!streamOk) {
    if (video) video.classList.add('hidden');
    if (canvas) canvas.classList.remove('hidden');
    if (httpNotice) httpNotice.classList.remove('hidden');
    startLiveViewfinderAnimation();
  } else {
    if (canvas) canvas.classList.add('hidden');
    if (httpNotice) httpNotice.classList.add('hidden');
  }
}

function handleCameraFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (liveViewfinderInterval) clearInterval(liveViewfinderInterval);

  const reader = new FileReader();
  reader.onload = function(e) {
    capturedImageData = e.target.result;
    const previewImage = document.getElementById('previewImage');
    const photoPreviewBox = document.getElementById('photoPreviewBox');
    const video = document.getElementById('webcamVideo');
    const canvas = document.getElementById('capturedCanvas');
    const btnCapture = document.getElementById('btnCapturePhoto');
    const btnSubmit = document.getElementById('btnSubmitAttendance');
    const btnRetake = document.getElementById('btnRetakePhoto');

    if (previewImage) previewImage.src = capturedImageData;
    if (video) video.classList.add('hidden');
    if (canvas) canvas.classList.add('hidden');
    if (photoPreviewBox) photoPreviewBox.classList.remove('hidden');
    if (btnCapture) btnCapture.classList.add('hidden');
    if (btnSubmit) btnSubmit.classList.remove('hidden');
    if (btnRetake) btnRetake.style.display = 'inline-flex';
    showToast('Foto dari HP/Galeri berhasil dimuat!', 'success');
  };
  reader.readAsDataURL(file);
}

function takeCameraPhoto() {
  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('capturedCanvas');
  const previewImage = document.getElementById('previewImage');
  const photoPreviewBox = document.getElementById('photoPreviewBox');
  const btnCapture = document.getElementById('btnCapturePhoto');
  const btnSubmit = document.getElementById('btnSubmitAttendance');
  const btnRetake = document.getElementById('btnRetakePhoto');

  if (liveViewfinderInterval) clearInterval(liveViewfinderInterval);

  if (canvas) {
    const context = canvas.getContext('2d');

    // Coba ambil frame dari video kamera jika tersedia
    const videoHasFrame = video &&
      !video.classList.contains('hidden') &&
      video.videoWidth > 0 &&
      video.videoHeight > 0;

    if (videoHasFrame) {
      // ── Ambil frame dari video stream kamera ────────────────────────────
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      // ── Fallback: gambar placeholder dengan info presensi ────────────────
      canvas.width  = 640;
      canvas.height = 480;

      // Background gelap
      const grad = context.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      context.fillStyle = grad;
      context.fillRect(0, 0, 640, 480);

      // Header bar
      context.fillStyle = '#059669';
      context.fillRect(0, 0, 640, 6);

      // Ikon & teks presensi
      context.fillStyle = '#ffffff';
      context.font = 'bold 18px sans-serif';
      context.textAlign = 'center';
      const typeLabel = activeCameraType === 'pulang' ? 'PRESENSI PULANG' :
                        activeCameraType === 'masuk'  ? 'PRESENSI MASUK'  :
                        'DOKUMENTASI PRESENSI';
      context.fillText(typeLabel, 320, 160);

      context.font = '14px sans-serif';
      context.fillStyle = '#34d399';
      context.fillText(activeUser ? activeUser.name : 'Pengguna', 320, 195);

      context.font = '12px sans-serif';
      context.fillStyle = '#a5b4fc';
      context.fillText('Lokasi PKL: ' + TARGET_LOCATION.name.substring(0, 40), 320, 225);

      const now2 = new Date();
      context.fillStyle = '#94a3b8';
      context.font = '11px sans-serif';
      context.fillText(
        formatDateIndo(now2.toISOString().split('T')[0]) + '  ' + now2.toLocaleTimeString('id-ID'),
        320, 255
      );
      if (userCoords) {
        context.fillText('GPS: ' + userCoords.lat.toFixed(5) + ', ' + userCoords.lng.toFixed(5), 320, 278);
      }

      // Footer bar
      context.fillStyle = '#059669';
      context.fillRect(0, 474, 640, 6);
    }

    capturedImageData = canvas.toDataURL('image/jpeg', 0.85);
    // Resize ke max 480px agar POST payload ke server tidak terlalu besar
    (function() {
      var MAX_DIM = 480;
      var w = canvas.width, h = canvas.height;
      if (w <= MAX_DIM && h <= MAX_DIM) return; // sudah kecil, skip
      var ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
      var nw = Math.round(w * ratio), nh = Math.round(h * ratio);
      var rc = document.createElement('canvas');
      rc.width = nw; rc.height = nh;
      rc.getContext('2d').drawImage(canvas, 0, 0, nw, nh);
      capturedImageData = rc.toDataURL('image/jpeg', 0.80);
    })();
    if (previewImage) previewImage.src = capturedImageData;
    if (video) video.classList.add('hidden');
    if (canvas) canvas.classList.add('hidden');
    if (photoPreviewBox) photoPreviewBox.classList.remove('hidden');
    if (btnCapture) btnCapture.classList.add('hidden');
    if (btnSubmit) btnSubmit.classList.remove('hidden');
    if (btnRetake) btnRetake.style.display = 'inline-flex';
  }
}

function retakeCameraPhoto() {
  if (liveViewfinderInterval) clearInterval(liveViewfinderInterval);

  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('capturedCanvas');
  const photoPreviewBox = document.getElementById('photoPreviewBox');
  const btnCapture = document.getElementById('btnCapturePhoto');
  const btnSubmit = document.getElementById('btnSubmitAttendance');
  const btnRetake = document.getElementById('btnRetakePhoto');

  if (photoPreviewBox) photoPreviewBox.classList.add('hidden');
  if (btnCapture) btnCapture.classList.remove('hidden');
  if (btnSubmit) btnSubmit.classList.add('hidden');
  if (btnRetake) btnRetake.style.display = 'none';

  if (currentStream && currentStream.active) {
    if (video) video.classList.remove('hidden');
    if (canvas) canvas.classList.add('hidden');
  } else {
    if (video) video.classList.add('hidden');
    if (canvas) canvas.classList.remove('hidden');
    startLiveViewfinderAnimation();
  }
}

function startLiveViewfinderAnimation() {
  const canvas = document.getElementById('capturedCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 360;

  if (liveViewfinderInterval) clearInterval(liveViewfinderInterval);

  let frameCount = 0;
  liveViewfinderInterval = setInterval(() => {
    frameCount++;
    const now = new Date();

    // Background gradient preview
    const grad = ctx.createLinearGradient(0, 0, 640, 360);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 360);

    // Rule of Thirds Grid Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(213, 0); ctx.lineTo(213, 360);
    ctx.moveTo(426, 0); ctx.lineTo(426, 360);
    ctx.moveTo(0, 120); ctx.lineTo(640, 120);
    ctx.moveTo(0, 240); ctx.lineTo(640, 240);
    ctx.stroke();

    // Animated Camera Reticle Focus Frame
    const pulse = Math.sin(frameCount * 0.1) * 4;
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2;
    ctx.strokeRect(220 - pulse, 100 - pulse, 200 + pulse * 2, 160 + pulse * 2);

    // Blinking REC Indicator
    if (frameCount % 20 < 10) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(30, 30, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("REC � LIVE KAMERA LAPANGAN", 44, 34);
    }

    // Details overlay
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${activeUser ? activeUser.name : 'Siswa/Guru'}`, 320, 200);

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#a5b4fc";
    ctx.fillText(`${TARGET_LOCATION.name}`, 320, 222);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px sans-serif";
    ctx.fillText(`${now.toLocaleTimeString('id-ID')} � GPS: ${userCoords ? userCoords.lat.toFixed(4) : -6.2088}, ${userCoords ? userCoords.lng.toFixed(4) : 106.8456}`, 320, 240);
  }, 100);
}

function closeCameraModal() {
  if (liveViewfinderInterval) clearInterval(liveViewfinderInterval);
  const modal = document.getElementById('cameraModal');
  if (modal) modal.classList.add('hidden');
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
}


// ── RULE 4: Server Timestamp — sinkronisasi waktu dari server ─────────────
// Cache server time untuk mengurangi request
var _serverTimeOffset = null;  // selisih ms antara server dan client
var _serverTimeLastSync = 0;

function _getServerTime() {
  // Gunakan waktu lokal WIB langsung — tidak perlu fetch ke server setiap kali absen.
  // Ini menghilangkan latensi jaringan wajib sebelum proses submit dimulai.
  // Sinkronisasi background (non-blocking) tetap dilakukan 1x per 5 menit.
  var now = Date.now();
  if (_serverTimeOffset !== null && (now - _serverTimeLastSync) < 300000) {
    return Promise.resolve(new Date(now + _serverTimeOffset));
  }
  // Sync background — tidak blok submit, hasilnya dipakai pada request berikutnya
  setTimeout(function() {
    var t0 = Date.now();
    fetch(apiUrl('api.php?action=get_server_time'), { method: 'GET', cache: 'no-store' })
      .then(function(r) { return r && r.ok ? r.json() : null; })
      .then(function(data) {
        if (data && data.server_ts) {
          var t1 = Date.now();
          var serverTs = parseInt(data.server_ts) * 1000;
          var latency = (t1 - t0) / 2;
          _serverTimeOffset = (serverTs + latency) - t1;
          _serverTimeLastSync = t1;
          console.log('[SIGAP] Server time synced (bg), offset:', Math.round(_serverTimeOffset), 'ms');
        }
      })
      .catch(function() {}); // gagal tidak masalah, pakai lokal
  }, 0);
  // Langsung kembalikan waktu lokal — tidak tunggu network
  return Promise.resolve(new Date());
}

function submitAttendanceRecord() {
  // Langsung jalankan dengan waktu lokal, sinkronisasi server time berjalan di background
  _doSubmitAttendanceRecord(new Date(Date.now() + (_serverTimeOffset || 0)));
}

function _doSubmitAttendanceRecord(now) {
  // Pakai waktu lokal (bukan UTC) untuk menghindari off-by-one di timezone WIB
  const todayStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const logs = getLogs();

  let distanceMeters = 15;
  let isOutOfRadius = false;
  if (userCoords) {
    const dist = calculateDistance(userCoords.lat, userCoords.lng, TARGET_LOCATION.lat, TARGET_LOCATION.lng);
    distanceMeters = Math.round(dist * 1000);
    if (distanceMeters > TARGET_LOCATION.allowedRadiusMeters) {
      isOutOfRadius = true;
    }
  }

  // RULE 3: Deteksi Mock Location — blokir absen jika GPS jelas tidak valid
  if (userCoords && activeUser && activeUser.role === 'siswa') {
    var _mockCheck = _detectMockLocation(
      userCoords.lat, userCoords.lng,
      userCoords.accuracy,
      userCoords.altitude || null
    );
    if (_mockCheck.isSuspicious) {
      // Akurasi 0 atau di luar 100km = jelas tidak valid, tolak langsung
      var _accuracy = userCoords.accuracy;
      var _distKm = calculateDistance(userCoords.lat, userCoords.lng, -7.9825, 112.6867);
      if ((_accuracy !== null && _accuracy !== undefined && _accuracy <= 1) || _distKm > 100) {
        showToast('Presensi ditolak: ' + _mockCheck.warnings[0], 'error');
        console.warn('[SIGAP] MOCK GPS DETECTED:', _mockCheck.warnings);
        return;
      }
      // Akurasi sangat rendah (>500m) — izinkan tapi tampilkan peringatan
      if (_accuracy > 500) {
        showToast('Peringatan: Akurasi GPS rendah (' + Math.round(_accuracy) + 'm). Pindah ke area terbuka.', 'warning');
      }
    }
  }

  // Task 4: If out of radius, require reason � but KEEP camera open
  if (isOutOfRadius && activeUser && activeUser.role === 'siswa') {
    const inModalReason = document.getElementById('outOfRadiusReasonInput');
    const currentReason = (inModalReason ? inModalReason.value.trim() : '');
    const warningBox = document.getElementById('outOfRadiusWarningBox');
    const warningTitle = document.getElementById('warningBoxTitle');

    // Show warning box with distance info
    if (warningBox) warningBox.classList.remove('hidden');
    if (warningTitle) {
      warningTitle.textContent = `Posisi Anda ${distanceMeters}m dari lokasi PKL (radius: ${TARGET_LOCATION.allowedRadiusMeters}m). Isi alasan wajib!`;
    }

    // Reject if reason empty or too short
    if (!currentReason || currentReason.length < 10) {
      if (warningBox) warningBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (inModalReason) inModalReason.focus();
      showToast(`Di luar radius ${distanceMeters}m! Isi alasan minimal 10 karakter.`, 'error');
      return;
    }

    // Reason is valid � proceed with it
    window._outRadiusReason = currentReason;
  }

  const resolvedReason = window._outRadiusReason || '';

  // Clear after use
  window._outRadiusReason = null;

  let actionTitle = 'Presensi';
  let statusText = 'Hadir';

  if (activeCameraType === 'pengantaran') {
    actionTitle = 'Absen Pengantaran Siswa PKL';
    statusText = isOutOfRadius ? 'Pengantaran (Di Luar Radius)' : 'Pengantaran';
  } else if (activeCameraType === 'monitoring') {
    actionTitle = 'Absen Kunjungan Monitoring PKL';
    statusText = isOutOfRadius ? 'Monitoring (Di Luar Radius)' : 'Monitoring';
  } else if (activeCameraType === 'penjemputan') {
    actionTitle = 'Absen Penjemputan Siswa PKL';
    statusText = isOutOfRadius ? 'Penjemputan (Di Luar Radius)' : 'Penjemputan';
  } else if (activeCameraType === 'masuk') {
    actionTitle = 'Presensi Masuk';
    statusText = isOutOfRadius ? 'Hadir (Di Luar Radius)' : 'Hadir';
  } else {
    actionTitle = 'Presensi Pulang';
    statusText = isOutOfRadius ? 'Hadir (Di Luar Radius)' : 'Hadir';
  }

  const locationText = isOutOfRadius
    ? `Di Luar Radius (${distanceMeters}m) - Alasan: ${resolvedReason}`
    : `Dalam Radius GPS (${distanceMeters}m dari ${TARGET_LOCATION.name})`;

  // ── ATURAN 1: Satu absen per hari per siswa ──────────────────────────────
  if (activeUser && activeUser.role === 'siswa') {
    var todayStr2 = todayStr; // alias untuk clarity

    if (activeCameraType === 'masuk') {
      // Blokir jika sudah ada absen masuk hari ini
      var alreadyMasuk = logs.find(function(l) {
        return l.studentName === activeUser.name &&
          l.date === todayStr2 &&
          l.masuk && l.masuk !== '-' &&
          !(l.status||'').toLowerCase().includes('izin') &&
          !(l.status||'').toLowerCase().includes('sakit');
      });
      if (alreadyMasuk) {
        showToast('Anda sudah absen masuk hari ini pada ' + alreadyMasuk.masuk + '. Tidak bisa absen masuk lagi.', 'error');
        closeCameraModal();
        return;
      }
    }

    if (activeCameraType === 'pulang') {
      // Blokir jika sudah ada absen pulang hari ini
      var alreadyPulang = logs.find(function(l) {
        return l.studentName === activeUser.name &&
          l.date === todayStr2 &&
          l.pulang && l.pulang !== '-';
      });
      if (alreadyPulang) {
        showToast('Anda sudah absen pulang hari ini pada ' + alreadyPulang.pulang + '. Tidak bisa absen pulang lagi.', 'error');
        closeCameraModal();
        return;
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Untuk guru yang absen monitoring: studentName tetap nama guru,
  // supervisor = nama guru, dan type monitoring masuk ke log guru itu sendiri
  // sehingga exportCetakLengkap() bisa menampilkan data kunjungan monitoring guru
  var _isGuruMonitoring = (activeCameraType === 'monitoring' || activeCameraType === 'pengantaran' || activeCameraType === 'penjemputan') &&
    activeUser && activeUser.role === 'guru';

  // ── ABSEN PULANG: update log masuk hari ini, jangan buat log baru ──────────
  if (activeCameraType === 'pulang') {
    // Cari log masuk siswa di hari yang sama (status Hadir, bukan Izin/Sakit/Alpa)
    var todayMasukIdx = logs.findIndex(function(l) {
      return l.studentName === (activeUser && activeUser.name || '') &&
        l.date === todayStr &&
        l.masuk && l.masuk !== '-' &&
        (l.pulang === '-' || !l.pulang) &&
        !(l.status||'').toLowerCase().includes('izin') &&
        !(l.status||'').toLowerCase().includes('sakit') &&
        !(l.status||'').toLowerCase().includes('alpa');
    });

    if (todayMasukIdx !== -1) {
      // Update field pulang di log masuk yang sudah ada
      logs[todayMasukIdx].pulang = timeStr;
      logs[todayMasukIdx].type = 'pulang'; // FIX: kirim type='pulang' ke server
      // Simpan foto pulang SELALU (bukan hanya saat luar radius)
      logs[todayMasukIdx].pulang_image = capturedImageData || null;
      if (isOutOfRadius) {
        logs[todayMasukIdx].pulang_location = locationText;
      }
      saveLogs(logs);

      // Sync update ke server (fire-and-forget)
      fetch(apiUrl('api.php?action=simpan_presensi'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logs[todayMasukIdx])
      }).then(function(r) { return r && r.ok ? r.json() : null; })
      .then(function(res) {
        if (res && res.success) console.log('[SIGAP] Pulang update synced:', res.id);
      }).catch(function(err) {
        console.warn('[SIGAP] Pulang sync failed (saved locally):', err && err.message);
      });

      // Reset UI dan tampilkan toast — SEGERA, sebelum render berat
      const warningBox = document.getElementById('outOfRadiusWarningBox');
      const reasonInput = document.getElementById('outOfRadiusReasonInput');
      if (warningBox) warningBox.classList.add('hidden');
      if (reasonInput) reasonInput.value = '';
      window._outRadiusReason = null;
      closeCameraModal();
      showToast('Presensi Pulang Berhasil Dikirim!', 'success');
      if (window.confetti) window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      // Render berat digeser ke background agar UI tidak freeze
      setTimeout(function() {
        try { renderTodayStatus(); } catch(e) {}
        try { renderStats(); } catch(e) {}
        try { renderHistoryList(); } catch(e) {}
      }, 150);
      return; // selesai — tidak lanjut buat log baru
    }
    // Jika tidak ada log masuk hari ini, lanjut buat log baru seperti biasa
  }

  const newLogRecord = {
    id: Date.now(),
    _localTs: Date.now(), // guard: log ini baru dibuat lokal, jangan hapus saat merge
    server_timestamp: now.toISOString(), // RULE 4: timestamp tervalidasi dari server
    studentName: activeUser?.name || 'User',
    name: activeUser?.name || 'User',           // untuk kompatibilitas server
    username: activeUser?.username || '',        // untuk kompatibilitas server
    userId: activeUser?.id || '',               // untuk kompatibilitas server
    user_id: activeUser?.id || '',              // untuk kompatibilitas server
    type: activeCameraType || 'masuk',          // FIX: kirim type ke server (masuk/pulang/monitoring/dll)
    supervisor: activeUser?.supervisor || 'SMK Negeri 9 Malang',
    date: todayStr,
    masuk: activeCameraType === 'pulang' ? '-' : timeStr,
    pulang: activeCameraType === 'pulang' ? timeStr : '-',
    status: statusText,
    location: locationText,
    outRadiusReason: isOutOfRadius ? resolvedReason : null,
    outRadiusDistance: isOutOfRadius ? distanceMeters : null,
    monitoringTarget: _isGuruMonitoring ? TARGET_LOCATION.name : null,
    isGuruMonitoring: _isGuruMonitoring || false,
    image: capturedImageData || activeUser?.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150'
  };

  logs.unshift(newLogRecord);
  saveLogs(logs);

  // Send real-time attendance POST to server (fire-and-forget)
  fetch(apiUrl('api.php?action=simpan_presensi'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newLogRecord)
  }).then(function(r) { return r && r.ok ? r.json() : null; })
  .then(function(res) {
    if (res && res.success) {
      console.log('[SIGAP] Presensi synced to server:', res.id);
    }
  }).catch(function(err) {
    console.warn('[SIGAP] Presensi server sync failed (saved locally):', err && err.message);
  });

  // Reset warning box
  const warningBox = document.getElementById('outOfRadiusWarningBox');
  const reasonInput = document.getElementById('outOfRadiusReasonInput');
  if (warningBox) warningBox.classList.add('hidden');
  if (reasonInput) reasonInput.value = '';
  window._outRadiusReason = null;

  // Tutup kamera & tampilkan toast SEGERA — render berat digeser ke background
  closeCameraModal();
  if (isOutOfRadius) {
    showToast(`${actionTitle} Berhasil Dikirim dengan Catatan Alasan Di Luar Radius!`, 'info');
  } else {
    showToast(`${actionTitle} Berhasil Dikirim!`, 'success');
  }
  if (window.confetti) {
    window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  }
  // Render berat di background — tidak blokir UI
  setTimeout(function() {
    try { renderTodayStatus(); } catch(e) {}
    try { renderStats(); } catch(e) {}
    try { renderHistoryList(); } catch(e) {}
  }, 150);

  if (window.confetti) {
    window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  }
}

async function openQRScannerModal() {
  const modal = document.getElementById('qrScannerModal');
  const video = document.getElementById('qrVideo');
  if (modal) modal.classList.remove('hidden');

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (video) video.srcObject = currentStream;
  } catch (err) {
    console.warn("QR Camera error:", err);
  }
}

function closeQRScannerModal() {
  const modal = document.getElementById('qrScannerModal');
  if (modal) modal.classList.add('hidden');
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
}

function simulateQRScanSuccess() {
  closeQRScannerModal();
  activeCameraType = 'masuk';
  capturedImageData = activeUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
  submitAttendanceRecord();
}

function renderTodayStatus() {
  // Hanya untuk siswa — guru/admin tidak perlu status hari ini di beranda
  if (activeUser && (activeUser.role === 'guru' || activeUser.role === 'admin' || activeUser.username === 'admin')) {
    var tss = document.getElementById('todayStatusSection');
    if (tss) tss.classList.add('hidden');
    return;
  }

  var container = document.getElementById('todayStatusCard');
  if (!container) return;

  var now      = new Date();
  var todayStr = now.toISOString().split('T')[0];
  var logs     = getLogs();

  // Siswa: hanya ambil log miliknya sendiri
  var todayRecord = null;
  if (activeUser && activeUser.role === 'siswa') {
    todayRecord = logs.find(function(item) {
      return item.date === todayStr && item.studentName === activeUser.name &&
        !(item.status||'').toLowerCase().includes('izin') &&
        !(item.status||'').toLowerCase().includes('sakit') &&
        !(item.status||'').toLowerCase().includes('alpa');
    }) || null;
  } else {
    todayRecord = logs.find(function(item) { return item.date === todayStr; }) || null;
  }

  // Jurnal hari ini (hanya untuk siswa)
  var todayJrn = null;
  if (activeUser && activeUser.role === 'siswa' && typeof getTodayJournal === 'function') {
    todayJrn = getTodayJournal(activeUser.name);
  }

  // Izin hari ini
  var todayPerm = null;
  if (activeUser && activeUser.role === 'siswa') {
    var perms = getPermissions().filter(function(p) {
      return p.studentName === activeUser.name &&
        (p.startDate||p.tanggal||'') <= todayStr &&
        (p.endDate||p.tanggal||'') >= todayStr;
    });
    if (perms.length > 0) todayPerm = perms[0];
  }

  if (!todayRecord && !todayJrn && !todayPerm) {
    container.innerHTML =
      '<div class="status-empty">' +
        '<i class="fa-solid fa-calendar-day" style="font-size:1.5rem;color:#94a3b8;margin-bottom:6px;"></i>' +
        '<p style="font-size:0.8rem;color:#94a3b8;">Anda belum melakukan presensi masuk hari ini.</p>' +
      '</div>';
    return;
  }

  var html = '';

  // ── Baris Absen Masuk ──────────────────────────────────────────
  if (todayRecord) {
    var fotoHtml = todayRecord.image
      ? '<img src="' + todayRecord.image + '" style="width:52px;height:52px;border-radius:10px;object-fit:cover;border:1px solid #4f46e5;cursor:pointer;" onclick="previewImageModal(\'' + todayRecord.image + '\',\'Foto Presensi\')" onerror="this.style.display=\'none\'">'
      : '<div style="width:52px;height:52px;border-radius:10px;background:rgba(99,102,241,.15);display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-user" style="color:#6366f1;font-size:1.2rem;"></i></div>';

    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07);">' +
      fotoHtml +
      '<div style="flex:1;">' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
          '<span class="status-tag hadir" style="font-size:0.75rem;padding:2px 8px;"><i class="fa-solid fa-circle-check"></i> ' + (todayRecord.status||'Hadir') + '</span>' +
        '</div>' +
        '<p style="font-size:0.8rem;color:#e2e8f0;margin-top:5px;">' +
          '<i class="fa-solid fa-arrow-right-to-bracket" style="color:#10b981;margin-right:4px;"></i>' +
          '<strong>Masuk:</strong> ' + (todayRecord.masuk||'-') + ' &nbsp;' +
          '<i class="fa-solid fa-arrow-right-from-bracket" style="color:#f59e0b;margin-right:4px;"></i>' +
          '<strong>Pulang:</strong> ' + (todayRecord.pulang||'-') +
        '</p>' +
        (todayRecord.location ? '<p style="font-size:0.72rem;color:#a5b4fc;margin-top:2px;"><i class="fa-solid fa-location-dot"></i> ' + (todayRecord.location||'').substring(0,55) + (todayRecord.location.length>55?'...':'') + '</p>' : '') +
      '</div>' +
    '</div>';
  } else if (todayPerm) {
    var pColor = (todayPerm.status||'').toLowerCase() === 'disetujui' ? '#10b981' : '#f59e0b';
    html += '<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07);">' +
      '<span style="font-size:0.8rem;font-weight:700;color:' + pColor + ';"><i class="fa-solid fa-file-signature"></i> ' + (todayPerm.type||'Izin') + ' — ' + (todayPerm.status||'Menunggu') + '</span>' +
      '<p style="font-size:0.75rem;color:#94a3b8;margin-top:3px;">' + (todayPerm.reason||todayPerm.alasan||'-') + '</p>' +
    '</div>';
  }

  // ── Baris Jurnal Hari Ini ──────────────────────────────────────
  if (todayJrn) {
    var jFoto = todayJrn.image
      ? '<img src="' + todayJrn.image + '" style="width:44px;height:44px;border-radius:8px;object-fit:cover;margin-left:8px;border:1px solid rgba(6,182,212,.4);cursor:pointer;flex-shrink:0;" onclick="previewImageModal(\'' + todayJrn.image + '\',\'Foto Jurnal\')" onerror="this.style.display=\'none\'">'
      : '';
    html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:10px 0;">' +
      '<div style="min-width:28px;height:28px;border-radius:8px;background:rgba(6,182,212,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">' +
        '<i class="fa-solid fa-book-open" style="color:#06b6d4;font-size:0.75rem;"></i>' +
      '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:0.72rem;color:#06b6d4;font-weight:700;margin-bottom:3px;">' +
          'JURNAL HARIAN &nbsp;<span style="color:#64748b;font-weight:400;">' + (todayJrn.time||'') + '</span>' +
        '</div>' +
        '<p style="font-size:0.78rem;color:#cbd5e1;line-height:1.4;margin:0;">' +
          (todayJrn.narasi||'').replace(/</g,'&lt;').substring(0,80) + (todayJrn.narasi&&todayJrn.narasi.length>80?'...':'') +
        '</p>' +
      '</div>' +
      jFoto +
    '</div>';
  } else if (activeUser && activeUser.role === 'siswa') {
    html += '<div style="padding:8px 0;display:flex;align-items:center;gap:6px;">' +
      '<i class="fa-solid fa-book-open" style="color:#475569;font-size:0.8rem;"></i>' +
      '<span style="font-size:0.75rem;color:#475569;font-style:italic;">Jurnal harian belum diisi &nbsp;' +
        '<a href="#" onclick="switchTab(\'journal\');return false;" style="color:#06b6d4;text-decoration:none;">→ Tulis sekarang</a>' +
      '</span>' +
    '</div>';
  }

  container.innerHTML = html;

  // Update state tombol absen sesuai kondisi hari ini
  if (typeof _updateAbsenBtnState === 'function') _updateAbsenBtnState();
}
function renderStats() {
  const logs = getLogs();
  const perms = getPermissions();

  // Helper: dapatkan pkl_start_date siswa tertentu
  function _getPklStart(studentName) {
    var users = getUsers();
    var u = users.find(function(x) { return x.name === studentName; });
    return (u && (u.pkl_start_date || u.created_date)) || null;
  }

  if (activeUser && activeUser.role === 'siswa') {
    var myStart = activeUser.pkl_start_date || activeUser.created_date || null;
    studentLogs = logs.filter(l => l.studentName === activeUser.name &&
      (!myStart || (l.date||'') >= myStart));
    studentPerms = perms.filter(p => p.studentName === activeUser.name &&
      (!myStart || (p.startDate||p.tanggal||'') >= myStart));
  } else if (activeUser && activeUser.role === 'guru') {
    const myStudents = getSupervisedStudentsOnly();
    const myStudentNames = myStudents.map(s => s.name);
    studentLogs = logs.filter(function(l) {
      if (!myStudentNames.includes(l.studentName)) return false;
      var start = _getPklStart(l.studentName);
      return !start || (l.date||'') >= start;
    });
    studentPerms = perms.filter(function(p) {
      if (!myStudentNames.includes(p.studentName)) return false;
      var start = _getPklStart(p.studentName);
      return !start || (p.startDate||p.tanggal||'') >= start;
    });
  }

  // ── FIX double-count: gunakan Set tanggal untuk deduplifikasi ──────────────
  // Hadir: dari logs dengan status Hadir/variasi — deduplikasi per siswa+tanggal
  var hadirSet = new Set();
  studentLogs.forEach(function(l) {
    var st = (l.status || '').toLowerCase();
    if (st === 'hadir' || st.includes('hadir') || st.includes('pengantaran') ||
        st.includes('monitoring') || st.includes('penjemputan')) {
      hadirSet.add((l.studentName || '') + '_' + (l.date || ''));
    }
  });
  const hadir = hadirSet.size;

  // Izin: gabungkan log izin + permission izin Disetujui, deduplikasi per siswa+tanggal
  var izinSet = new Set();
  studentLogs.forEach(function(l) {
    if ((l.status || '') === 'Izin') izinSet.add((l.studentName || '') + '_' + (l.date || ''));
  });
  studentPerms.filter(p => p.type === 'Izin' && p.status === 'Disetujui').forEach(function(p) {
    // Tambahkan semua tanggal dalam rentang izin
    try {
      var cur = new Date(p.startDate || p.tanggal || '');
      var end = new Date(p.endDate   || p.tanggal || '');
      while (cur <= end) {
        izinSet.add((p.studentName || '') + '_' + cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    } catch(e) {}
  });
  const izin = izinSet.size;

  // Sakit: sama seperti izin
  var sakitSet = new Set();
  studentLogs.forEach(function(l) {
    if ((l.status || '') === 'Sakit') sakitSet.add((l.studentName || '') + '_' + (l.date || ''));
  });
  studentPerms.filter(p => p.type === 'Sakit' && p.status === 'Disetujui').forEach(function(p) {
    try {
      var cur = new Date(p.startDate || p.tanggal || '');
      var end = new Date(p.endDate   || p.tanggal || '');
      while (cur <= end) {
        sakitSet.add((p.studentName || '') + '_' + cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    } catch(e) {}
  });
  const sakit = sakitSet.size;

  // Alpa: dari logs dengan status Alpa — deduplikasi per siswa+tanggal
  var alpaSet = new Set();
  studentLogs.forEach(function(l) {
    if ((l.status || '') === 'Alpa') alpaSet.add((l.studentName || '') + '_' + (l.date || ''));
  });
  const alpa = alpaSet.size;
  // ──────────────────────────────────────────────────────────────────────────

  const elemHadir = document.getElementById('statHadir');
  const elemIzin  = document.getElementById('statIzin');
  const elemSakit = document.getElementById('statSakit');
  const elemAlpa  = document.getElementById('statAlpa');

  if (elemHadir) elemHadir.textContent = hadir;
  if (elemIzin)  elemIzin.textContent  = izin;
  if (elemSakit) elemSakit.textContent = sakit;
  if (elemAlpa)  elemAlpa.textContent  = alpa;

  // Update monthly stats for student
  if (activeUser && activeUser.role === 'siswa') {
    updateStudentMonthlyStats();
  }
}

// Function to update monthly statistics for student
function updateStudentMonthlyStats() {
  if (!activeUser || activeUser.role !== 'siswa') return;

  const logs  = getLogs();
  const perms = getPermissions();

  var _myPklStart = activeUser.pkl_start_date || activeUser.created_date || null;
  const studentLogs  = logs.filter(l => l.studentName === activeUser.name &&
    (!_myPklStart || (l.date||'') >= _myPklStart));
  const studentPerms = perms.filter(p => p.studentName === activeUser.name &&
    p.status === 'Disetujui' &&
    (!_myPklStart || (p.startDate||p.tanggal||'') >= _myPklStart));

  const currentDate  = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear  = currentDate.getFullYear();

  // Helper: hitung deduplikasi per tanggal
  function countUniq(arr, predicate) {
    var set = new Set();
    arr.forEach(function(item) { if (predicate(item)) set.add(item.date || ''); });
    return set.size;
  }
  function countPermUniq(pArr, type) {
    var set = new Set();
    pArr.filter(p => p.type === type).forEach(function(p) {
      try {
        var cur = new Date(p.startDate || p.tanggal || '');
        var end = new Date(p.endDate   || p.tanggal || '');
        while (cur <= end) { set.add(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate()+1); }
      } catch(e) {}
    });
    return set;
  }

  // Bulan ini
  const cml = studentLogs.filter(l => {
    var d = new Date(l.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const cmp = studentPerms.filter(p => {
    var d = new Date(p.startDate || p.tanggal || '');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  var cmHadirSet = new Set();
  cml.forEach(l => { var s=(l.status||'').toLowerCase(); if(s==='hadir'||s.includes('hadir')||s.includes('pengantaran')||s.includes('monitoring')||s.includes('penjemputan')) cmHadirSet.add(l.date||''); });
  var cmIzinSet  = new Set(cml.filter(l=>(l.status||'')==='Izin').map(l=>l.date||''));
  countPermUniq(cmp,'Izin').forEach(d=>cmIzinSet.add(d));
  var cmSakitSet = new Set(cml.filter(l=>(l.status||'')==='Sakit').map(l=>l.date||''));
  countPermUniq(cmp,'Sakit').forEach(d=>cmSakitSet.add(d));
  var cmAlpaSet  = new Set(cml.filter(l=>(l.status||'')==='Alpa').map(l=>l.date||''));

  const currentMonthHadir = cmHadirSet.size;
  const currentMonthIzin  = cmIzinSet.size;
  const currentMonthSakit = cmSakitSet.size;
  const currentMonthAlpa  = cmAlpaSet.size;

  // Total semua bulan
  var totHadirSet = new Set();
  studentLogs.forEach(l => { var s=(l.status||'').toLowerCase(); if(s==='hadir'||s.includes('hadir')||s.includes('pengantaran')||s.includes('monitoring')||s.includes('penjemputan')) totHadirSet.add(l.date||''); });
  var totIzinSet  = new Set(studentLogs.filter(l=>(l.status||'')==='Izin').map(l=>l.date||''));
  countPermUniq(studentPerms,'Izin').forEach(d=>totIzinSet.add(d));
  var totSakitSet = new Set(studentLogs.filter(l=>(l.status||'')==='Sakit').map(l=>l.date||''));
  countPermUniq(studentPerms,'Sakit').forEach(d=>totSakitSet.add(d));
  var totAlpaSet  = new Set(studentLogs.filter(l=>(l.status||'')==='Alpa').map(l=>l.date||''));

  const totalHadir = totHadirSet.size;
  const totalIzin  = totIzinSet.size;
  const totalSakit = totSakitSet.size;
  const totalAlpa  = totAlpaSet.size;

  // Update current month elements
  const elemCurrentHadir = document.getElementById('currentMonthHadir');
  const elemCurrentIzin  = document.getElementById('currentMonthIzin');
  const elemCurrentSakit = document.getElementById('currentMonthSakit');
  const elemCurrentAlpa  = document.getElementById('currentMonthAlpa');

  if (elemCurrentHadir) elemCurrentHadir.textContent = currentMonthHadir;
  if (elemCurrentIzin)  elemCurrentIzin.textContent  = currentMonthIzin;
  if (elemCurrentSakit) elemCurrentSakit.textContent = currentMonthSakit;
  if (elemCurrentAlpa)  elemCurrentAlpa.textContent  = currentMonthAlpa;

  // Update total accumulation elements
  const elemTotalHadir = document.getElementById('totalHadir');
  const elemTotalIzin = document.getElementById('totalIzin');
  const elemTotalSakit = document.getElementById('totalSakit');
  const elemTotalAlpa = document.getElementById('totalAlpa');

  if (elemTotalHadir) elemTotalHadir.textContent = totalHadir;
  if (elemTotalIzin) elemTotalIzin.textContent = totalIzin;
  if (elemTotalSakit) elemTotalSakit.textContent = totalSakit;
  if (elemTotalAlpa) elemTotalAlpa.textContent = totalAlpa;

  // Update current month name
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                     'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const elemCurrentMonthName = document.getElementById('currentMonthName');
  if (elemCurrentMonthName) {
    elemCurrentMonthName.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  }
}


// ── Populate dropdown filter riwayat secara dinamis dari data log ──────────
// Dipanggil setiap kali tab history dibuka atau data berubah
function populateHistoryFilters() {
  var logs = getLogs();
  var isSiswa = activeUser && activeUser.role === 'siswa';
  var isAdmin = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');
  var isGuru  = activeUser && activeUser.role === 'guru';

  // ── 1. Dropdown Bulan ─────────────────────────────────────────────────────
  var filterMonthEl = document.getElementById('filterMonth');
  if (filterMonthEl) {
    // Kumpulkan bulan-tahun unik dari semua log
    var bulanSet = {};
    logs.forEach(function(l) {
      if (!l.date) return;
      var d = new Date(l.date);
      if (isNaN(d.getTime())) return;
      // Untuk siswa, hanya log miliknya
      if (isSiswa && l.studentName !== activeUser.name) return;
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      bulanSet[key] = { month: d.getMonth() + 1, year: d.getFullYear() };
    });

    var bulanList = Object.keys(bulanSet).sort().reverse(); // terbaru dulu
    var namaBulan = ['','Januari','Februari','Maret','April','Mei','Juni',
                     'Juli','Agustus','September','Oktober','November','Desember'];

    // Simpan nilai aktif sebelum rebuild
    var prevVal = filterMonthEl.value || 'all';

    filterMonthEl.innerHTML = '<option value="all">Semua Bulan</option>';
    bulanList.forEach(function(key) {
      var b = bulanSet[key];
      var opt = document.createElement('option');
      opt.value = String(b.month);
      opt.textContent = namaBulan[b.month] + ' ' + b.year;
      filterMonthEl.appendChild(opt);
    });

    // Restore nilai sebelumnya jika masih ada, atau pilih bulan terbaru
    if (bulanList.length > 0) {
      var stillExists = Array.from(filterMonthEl.options).some(function(o) { return o.value === prevVal; });
      if (!stillExists || prevVal === 'all') {
        // Default ke bulan terbaru
        filterMonthEl.value = String(bulanSet[bulanList[0]].month);
      } else {
        filterMonthEl.value = prevVal;
      }
    }
  }

  // ── 2. Dropdown Filter Siswa (hanya admin/guru) ───────────────────────────
  var filterSiswaEl = document.getElementById('filterSiswa');
  if (filterSiswaEl) {
    if (isAdmin || isGuru) {
      // Kumpulkan nama siswa unik dari log
      var siswaSet = {};
      logs.forEach(function(l) {
        if (l.studentName) siswaSet[l.studentName] = true;
      });
      var siswaList = Object.keys(siswaSet).sort();

      var prevSiswa = filterSiswaEl.value || 'all';
      filterSiswaEl.innerHTML = '<option value="all">Semua Siswa</option>';
      siswaList.forEach(function(name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        filterSiswaEl.appendChild(opt);
      });

      // Restore
      var stillExists2 = Array.from(filterSiswaEl.options).some(function(o) { return o.value === prevSiswa; });
      filterSiswaEl.value = stillExists2 ? prevSiswa : 'all';

      // Tampilkan baris filter siswa
      var rowSiswa = document.getElementById('filterSiswaRow');
      if (rowSiswa) rowSiswa.style.display = '';
    } else {
      // Siswa: sembunyikan filter siswa
      var rowSiswa2 = document.getElementById('filterSiswaRow');
      if (rowSiswa2) rowSiswa2.style.display = 'none';
    }
  }
}

function renderHistoryList() {
  var container = document.getElementById('historyListContainer');
  if (!container) return;

  // Populate dropdown filter secara dinamis dari data log yang ada
  populateHistoryFilters();

  var logs         = getLogs();
  var filterMonth  = (document.getElementById('filterMonth')  || {}).value  || 'all';
  var filterStatus = (document.getElementById('filterStatus') || {}).value || 'all';
  var filterSiswa  = (document.getElementById('filterSiswa')  || {}).value  || 'all';
  var isSiswa      = activeUser && activeUser.role === 'siswa';

  // Filter log berdasarkan bulan & status
  var filtered = logs.filter(function(item) {
    var matchMonth  = true;
    var matchStatus = true;
    if (filterMonth !== 'all') {
      var mn = new Date(item.date).getMonth() + 1;
      matchMonth = mn.toString() === filterMonth;
    }
    if (filterStatus !== 'all') {
      matchStatus = item.status === filterStatus;
    }
    // Filter nama siswa (untuk admin/guru)
    var matchSiswa = (filterSiswa === 'all') || (item.studentName === filterSiswa);
    // Untuk siswa: hanya tampilkan log milik diri sendiri
    if (isSiswa) {
      return matchMonth && matchStatus && item.studentName === activeUser.name;
    }
    return matchMonth && matchStatus && matchSiswa;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-center text-muted" style="padding:20px;">Tidak ada riwayat presensi yang cocok.</p>';
    return;
  }

  if (!isSiswa) {
    // Guru/Admin: tampilan flat seperti semula
    container.innerHTML = filtered.map(function(item) {
      var tagClass  = 'hadir';
      var iconClass = 'fa-check';
      var st = (item.status || '').toLowerCase();
      if (st.includes('izin'))  { tagClass = 'izin';  iconClass = 'fa-envelope-open-text'; }
      else if (st.includes('sakit')) { tagClass = 'sakit'; iconClass = 'fa-user-nurse'; }
      else if (st.includes('alpa'))  { tagClass = 'alpa';  iconClass = 'fa-user-xmark'; }
      var fotoHtml = item.image
        ? '<img src="' + item.image + '" style="width:38px;height:38px;border-radius:8px;object-fit:cover;border:1px solid #6366f1;cursor:pointer;margin-left:8px;" onclick="previewImageModal(\'' + item.image + '\',\'' + (item.studentName||'') + '\')" onerror="this.style.display=\'none\'">'
        : '';
      return '<div class="history-item">' +
        '<div class="history-left">' +
          '<div class="history-badge-icon ' + tagClass + '"><i class="fa-solid ' + iconClass + '"></i></div>' +
          '<div class="history-details">' +
            '<h4>' + formatDateIndo(item.date) + ' <small style="color:#94a3b8;font-size:0.72rem;">— ' + (item.studentName||'') + '</small></h4>' +
            '<p><i class="fa-regular fa-clock"></i> Masuk: ' + (item.masuk||'-') + ' | Pulang: ' + (item.pulang||'-') + '</p>' +
            (item.location ? '<small style="color:#a5b4fc;font-size:0.75rem;"><i class="fa-solid fa-location-dot text-indigo-400"></i> ' + item.location + '</small>' : '') +
          '</div>' +
          fotoHtml +
        '</div>' +
        '<span class="status-tag ' + tagClass + '">' + item.status + '</span>' +
      '</div>';
    }).join('');
    return;
  }

  // ── SISWA: grouping per hari — masuk | jurnal | pulang | izin ────
  // Kumpulkan semua jurnal milik siswa ini
  var journals = (typeof getJournalsByStudent === 'function')
    ? getJournalsByStudent(activeUser.name) : [];
  var perms = getPermissions().filter(function(p) {
    return p.studentName === activeUser.name;
  });

  // Kumpulkan semua tanggal unik (dari log + jurnal)
  var allDates = new Set();
  filtered.forEach(function(l) { if (l.date) allDates.add(l.date); });
  journals.forEach(function(j) {
    // Sertakan jika sesuai filter bulan
    if (filterMonth === 'all') { allDates.add(j.date); }
    else {
      var mn = new Date(j.date).getMonth() + 1;
      if (mn.toString() === filterMonth) allDates.add(j.date);
    }
  });

  // Urutkan tanggal terbaru ke terlama
  var sortedDates = Array.from(allDates).sort(function(a,b){ return b.localeCompare(a); });

  if (sortedDates.length === 0) {
    container.innerHTML = '<p class="text-center text-muted" style="padding:20px;">Tidak ada data untuk periode ini.</p>';
    return;
  }

  container.innerHTML = sortedDates.map(function(date) {
    // Ambil log masuk (status hadir/di luar radius, bukan izin/sakit/alpa)
    var logMasuk = filtered.find(function(l) {
      return l.date === date && l.masuk && l.masuk !== '-' &&
        !(l.status||'').toLowerCase().includes('izin') &&
        !(l.status||'').toLowerCase().includes('sakit') &&
        !(l.status||'').toLowerCase().includes('alpa');
    }) || null;

    // Jurnal hari ini
    var jrn = journals.find(function(j) { return j.date === date; }) || null;

    // Izin/sakit
    var permToday = perms.find(function(p) {
      return (p.startDate || p.tanggal) <= date && (p.endDate || p.tanggal) >= date;
    }) || null;

    // ── Helper render satu baris detail ──────────────────────────
    function detailRow(icon, color, label, val, extra) {
      return '<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
        '<div style="min-width:28px;height:28px;border-radius:8px;background:' + color + '22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
          '<i class="fa-solid ' + icon + '" style="color:' + color + ';font-size:0.75rem;"></i>' +
        '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;">' + label + '</div>' +
          '<div style="font-size:0.82rem;color:#e2e8f0;margin-top:2px;">' + val + '</div>' +
          (extra || '') +
        '</div>' +
      '</div>';
    }

    var rows = '';

    // Baris 1: Absen Masuk
    if (logMasuk) {
      var fotoMasuk = logMasuk.image
        ? '<img src="' + logMasuk.image + '" style="width:48px;height:48px;border-radius:8px;object-fit:cover;margin-top:4px;border:1px solid rgba(99,102,241,.4);cursor:pointer;" onclick="previewImageModal(\'' + logMasuk.image + '\',\'Selfie Masuk\')" onerror="this.style.display=\'none\'">'
        : '';
      var locMasuk = logMasuk.location ? '<div style="font-size:0.7rem;color:#a5b4fc;margin-top:2px;"><i class="fa-solid fa-location-dot"></i> ' + logMasuk.location.substring(0,60) + (logMasuk.location.length>60?'...':'') + '</div>' : '';
      rows += detailRow('clock', '#10b981',
        'Absen Masuk',
        '<strong>' + (logMasuk.masuk || '-') + '</strong> &nbsp;<span class="status-tag hadir" style="font-size:0.65rem;padding:1px 6px;">' + (logMasuk.status||'Hadir') + '</span>',
        locMasuk + fotoMasuk
      );
    } else if (permToday) {
      // Ada izin — tidak ada absen masuk
    } else {
      rows += detailRow('circle-xmark', '#ef4444', 'Absen Masuk', '<span style="color:#f87171;">Belum absen masuk</span>', '');
    }

    // Baris 2: Jurnal Harian
    if (jrn) {
      var fotoJrn = jrn.image
        ? '<img src="' + jrn.image + '" style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-top:6px;border:1px solid rgba(16,185,129,.3);cursor:pointer;" onclick="previewImageModal(\'' + jrn.image + '\',\'Foto Jurnal\')" onerror="this.style.display=\'none\'">'
        : '';
      rows += detailRow('book-open', '#06b6d4',
        'Jurnal Harian &nbsp;<span style="font-size:0.65rem;color:#64748b;">' + (jrn.time||'') + '</span>',
        '<span style="font-size:0.8rem;color:#cbd5e1;line-height:1.4;">' + (jrn.narasi||'').replace(/</g,'&lt;').substring(0,120) + (jrn.narasi&&jrn.narasi.length>120?'...':'') + '</span>',
        fotoJrn
      );
    } else {
      rows += detailRow('book-open', '#64748b', 'Jurnal Harian', '<span style="color:#64748b;font-style:italic;">Belum ada jurnal</span>', '');
    }

    // Baris 3: Absen Pulang
    if (logMasuk && logMasuk.pulang && logMasuk.pulang !== '-') {
      var fotoPulang = logMasuk.pulang_image
        ? '<img src="' + logMasuk.pulang_image + '" style="width:48px;height:48px;border-radius:8px;object-fit:cover;margin-top:4px;border:1px solid rgba(245,158,11,.4);cursor:pointer;" onclick="previewImageModal(\'' + logMasuk.pulang_image + '\',\'Selfie Pulang\')" onerror="this.style.display=\'none\'">'
        : '';
      var locPulang = logMasuk.pulang_location ? '<div style="font-size:0.7rem;color:#fcd34d;margin-top:2px;"><i class="fa-solid fa-location-dot"></i> ' + logMasuk.pulang_location.substring(0,60) + '</div>' : '';
      rows += detailRow('right-from-bracket', '#f59e0b', 'Absen Pulang',
        '<strong>' + logMasuk.pulang + '</strong>',
        locPulang + fotoPulang);
    } else if (!permToday) {
      rows += detailRow('right-from-bracket', '#64748b', 'Absen Pulang',
        '<span style="color:#64748b;font-style:italic;">Belum absen pulang</span>', '');
    }

    // Baris 4: Izin (hanya jika ada)
    if (permToday) {
      var stPerm = (permToday.status || 'Pending').toLowerCase();
      var permColor = stPerm === 'disetujui' ? '#10b981' : stPerm === 'ditolak' ? '#ef4444' : '#f59e0b';
      var permBadge = '<span style="font-size:0.65rem;background:' + permColor + '22;color:' + permColor + ';padding:1px 6px;border-radius:6px;border:1px solid ' + permColor + '44;">' + (permToday.status||'Menunggu') + '</span>';
      rows += detailRow('file-signature', '#a78bfa',
        (permToday.type || 'Izin') + ' ' + permBadge,
        '<span style="font-size:0.78rem;color:#c4b5fd;">' + (permToday.reason || permToday.alasan || '-') + '</span>',
        permToday.approvedBy ? '<div style="font-size:0.68rem;color:#64748b;margin-top:2px;">Diproses: ' + permToday.approvedBy + '</div>' : ''
      );
    }

    // Kartu tanggal
    var isToday = date === new Date().toISOString().split('T')[0];
    return '<div style="margin-bottom:14px;border-radius:12px;overflow:hidden;border:1px solid ' + (isToday ? 'rgba(99,102,241,.5)' : 'rgba(255,255,255,.08)') + ';background:' + (isToday ? 'rgba(99,102,241,.05)' : 'rgba(15,23,42,.5)') + ';">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:' + (isToday ? 'rgba(99,102,241,.15)' : 'rgba(255,255,255,.04)') + ';border-bottom:1px solid rgba(255,255,255,.06);">' +
        '<span style="font-weight:700;font-size:0.85rem;color:#e2e8f0;"><i class="fa-regular fa-calendar" style="color:#6366f1;"></i> ' + formatDateIndo(date) + (isToday ? ' <span style="font-size:0.65rem;background:rgba(99,102,241,.2);color:#a5b4fc;padding:1px 6px;border-radius:6px;">Hari Ini</span>' : '') + '</span>' +
      '</div>' +
      '<div style="padding:4px 14px 10px;">' + rows + '</div>' +
    '</div>';
  }).join('');
}
function handlePermissionSubmit(e) {
  e.preventDefault();
  const type = document.getElementById('permType').value;
  const startDate = document.getElementById('permStartDate').value;
  const endDate = document.getElementById('permEndDate').value;
  const reason = document.getElementById('permReason').value;

  const perms = getPermissions();

  // ── ATURAN 1c: Cek duplikat izin/sakit di tanggal yang sama ──────────────
  if (activeUser && activeUser.role === 'siswa') {
    var dupPerm = perms.find(function(p) {
      return p.studentName === activeUser.name &&
        p.type === type &&
        (p.startDate === startDate || p.endDate === endDate ||
          (p.startDate <= startDate && p.endDate >= startDate)) &&
        p.status !== 'Ditolak'; // izin yang Ditolak boleh diajukan ulang
    });
    if (dupPerm) {
      showToast('Pengajuan ' + type + ' untuk tanggal tersebut sudah ada (status: ' + dupPerm.status + '). Tidak bisa mengajukan duplikat.', 'error');
      return;
    }
    // Cek juga apakah sudah ada absen di tanggal tersebut
    var _cekLogs = getLogs();
    var existingAbsen = _cekLogs.find(function(l) {
      return l.studentName === activeUser.name &&
        l.date === startDate &&
        (l.masuk && l.masuk !== '-');
    });
    if (existingAbsen) {
      showToast('Anda sudah absen hadir pada ' + startDate + '. Tidak bisa mengajukan ' + type + ' di tanggal yang sama.', 'error');
      return;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────
  const newPerm = {
    id: Date.now(),
    _localTs: Date.now(), // timestamp untuk track permission baru di lokal
    type,
    startDate,
    endDate,
    reason,
    status: 'Pending',
    studentName: activeUser?.name || 'Budi Santoso',
    supervisor: activeUser?.supervisor || 'Gigih Perkasa, ST., M.Pd.'
  };

  perms.unshift(newPerm);
  savePermissions(perms);

  // Sync to attendance logs as well
  const logs = getLogs();
  const newLog = {
    id: Date.now(),
    studentName: activeUser?.name || 'Budi Santoso',
    supervisor: activeUser?.supervisor || 'Gigih Perkasa, ST., M.Pd.',
    date: startDate,
    masuk: '-',
    pulang: '-',
    status: type,
    location: `Surat ${type}: ${reason}`,
    image: null
  };
  logs.unshift(newLog);
  saveLogs(logs);

  // Post ke server menggunakan apiUrl() agar APK pakai URL absolut
  Promise.all([
    fetch(apiUrl('api.php?action=create_permission'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newPerm.id,
        userId: activeUser?.id || '',
        user_id: activeUser?.id || '',
        username: activeUser?.username || '',
        name: activeUser?.name || '',
        type: newPerm.type,
        startDate: newPerm.startDate,
        endDate: newPerm.endDate,
        tanggal: newPerm.startDate,
        alasan: newPerm.reason,
        reason: newPerm.reason,
        status: 'Pending',
        studentName: newPerm.studentName,
        supervisor: newPerm.supervisor
      })
    }).catch(function(e) { console.warn('[SIGAP] create_permission error:', e.message); }),
    fetch(apiUrl('api.php?action=simpan_presensi'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog)
    }).catch(() => null)
  ]);

  showToast(`Permohonan ${type} berhasil dikirim!`, 'success');
  document.getElementById('permissionForm').reset();
  renderPermissionList();
  renderStats();
  renderHistoryList();
}

function previewUploadFile(input) {
  const fileNamePreview = document.getElementById('fileNamePreview');
  if (input.files && input.files[0]) {
    fileNamePreview.innerHTML = `<span style="color:#34d399"><i class="fa-solid fa-file-image"></i> ${input.files[0].name}</span>`;
  }
}

function renderPermissionList() {
  const container = document.getElementById('permissionListContainer');
  if (!container) return;

  const perms = getPermissions();
  let studentPerms = perms;
  if (activeUser && activeUser.role === 'siswa') {
    studentPerms = perms.filter(p => p.studentName === activeUser.name || !p.studentName || (activeUser.nomor_induk && p.nomor_induk === activeUser.nomor_induk));
  }

  if (studentPerms.length === 0) {
    container.innerHTML = `<p class="text-center text-muted" style="padding:15px;">Belum ada pengajuan izin atau sakit.</p>`;
    return;
  }

  container.innerHTML = studentPerms.map(item => {
    const borderColor = item.status === 'Disetujui' ? '#10b981' : item.status === 'Ditolak' ? '#ef4444' : '#f59e0b';
    const tagBg = item.status === 'Disetujui' ? 'background:rgba(16, 185, 129, 0.15); color:#34d399; border:1px solid #10b981;' : item.status === 'Ditolak' ? 'background:rgba(239, 68, 68, 0.15); color:#f87171; border:1px solid #ef4444;' : 'background:rgba(245, 158, 11, 0.15); color:#fbbf24; border:1px solid #f59e0b;';
    const iconTag = item.status === 'Disetujui' ? '<i class="fa-solid fa-circle-check"></i> Disetujui' : item.status === 'Ditolak' ? '<i class="fa-solid fa-circle-xmark"></i> Ditolak' : '<i class="fa-solid fa-clock-rotate-left"></i> Menunggu Persetujuan Guru';

    return `
      <div class="card" style="margin-bottom:10px; padding:12px; border-left:4px solid ${borderColor}; background:rgba(15, 23, 42, 0.6);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <strong style="font-size:0.85rem; color:#fff;"><i class="fa-solid fa-paper-plane text-indigo-400"></i> ${item.type} (${formatDateIndo(item.startDate || '')} s.d ${formatDateIndo(item.endDate || '')})</strong>
            <p style="font-size:0.78rem; color:#cbd5e1; margin-top:4px;">${item.reason}</p>
            ${item.status === 'Ditolak' && item.rejectReason ? `
            <div style="margin-top:8px;padding:8px 10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;">
              <p style="font-size:0.78rem;color:#fca5a5;margin:0;"><i class="fa-solid fa-comment-slash"></i> <strong>Alasan Penolakan:</strong> ${item.rejectReason}</p>
              ${item.approvedBy ? `<p style="font-size:0.72rem;color:#94a3b8;margin:4px 0 0;">Ditolak oleh: ${item.approverRole || ''} ${item.approvedBy}</p>` : ''}
            </div>` : ''}
            ${item.status === 'Disetujui' && item.approvedBy ? `
            <p style="font-size:0.72rem;color:#6ee7b7;margin-top:6px;"><i class="fa-solid fa-circle-check"></i> Disetujui oleh: ${item.approverRole || ''} ${item.approvedBy}</p>` : ''}
          </div>
          <span style="font-size:0.75rem; padding:4px 10px; border-radius:6px; font-weight:600; display:inline-flex; align-items:center; gap:5px; ${tagBg}">
            ${iconTag}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════
// JURNAL HARIAN SISWA PKL — fungsi UI dan submit
// ══════════════════════════════════════════════════════════════════

// Resize gambar ke maxW x maxH, return base64
function _resizeImageForJournal(dataUrl, maxW, maxH, cb) {
  var img = new Image();
  img.onload = function() {
    var w = img.width, h = img.height;
    var scale = Math.min(maxW/w, maxH/h, 1);
    var nw = Math.round(w*scale), nh = Math.round(h*scale);
    var cv = document.createElement('canvas');
    cv.width = nw; cv.height = nh;
    cv.getContext('2d').drawImage(img, 0, 0, nw, nh);
    cb(cv.toDataURL('image/jpeg', 0.75));
  };
  img.src = dataUrl;
}

// Preview foto saat dipilih
function previewJournalPhoto(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    _resizeImageForJournal(e.target.result, 800, 600, function(resized) {
      var prev = document.getElementById('journalPhotoPreview');
      var img  = document.getElementById('journalPhotoImg');
      var wrap = document.getElementById('journalPhotoWrap');
      if (img)  img.src = resized;
      if (prev) prev.style.display = 'block';
      if (wrap) wrap.style.display = 'none';
      // Simpan di input dataset untuk diambil saat submit
      input.dataset.resized = resized;
    });
  };
  reader.readAsDataURL(input.files[0]);
}

function clearJournalPhoto() {
  var input = document.getElementById('journalPhotoInput');
  var prev  = document.getElementById('journalPhotoPreview');
  var wrap  = document.getElementById('journalPhotoWrap');
  var img   = document.getElementById('journalPhotoImg');
  if (input) { input.value = ''; delete input.dataset.resized; }
  if (prev)  prev.style.display = 'none';
  if (wrap)  wrap.style.display = '';
  if (img)   img.src = '';
}

function resetJournalForm() {
  var preview = document.getElementById('journalTodayPreview');
  var form    = document.getElementById('journalForm');
  var badge   = document.getElementById('journalTodayBadge');
  if (preview) preview.style.display = 'none';
  if (form)    form.style.display = '';
  if (badge)   badge.style.display = 'none';
  clearJournalPhoto();
  var ta = document.getElementById('journalNarasi');
  if (ta) { ta.value = ''; _updateJournalCharCount(); }
}

function _updateJournalCharCount() {
  var ta = document.getElementById('journalNarasi');
  var ct = document.getElementById('journalNarasiCount');
  if (ta && ct) ct.textContent = (ta.value.length) + ' / 1000 karakter';
}

// Inisialisasi event listener jurnal (dipanggil setelah login)
function initJournalTab() {
  var ta = document.getElementById('journalNarasi');
  if (ta) {
    ta.removeEventListener('input', _updateJournalCharCount);
    ta.addEventListener('input', _updateJournalCharCount);
  }
  renderJournalTab();
}

// Handle submit form jurnal
function handleJournalSubmit(e) {
  if (e) e.preventDefault();
  if (!activeUser) { showToast('Silakan login terlebih dahulu.', 'error'); return; }

  var ta    = document.getElementById('journalNarasi');
  var input = document.getElementById('journalPhotoInput');
  var btn   = document.getElementById('btnJournalSubmit');

  var narasi = ta ? ta.value.trim() : '';
  if (narasi.length < 20) {
    showToast('Narasi jurnal minimal 20 karakter.', 'error');
    if (ta) ta.focus();
    return;
  }

  var fotoData = (input && input.dataset.resized) ? input.dataset.resized : null;
  var now      = new Date();
  var todayStr = now.toISOString().split('T')[0];
  var timeStr  = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });

  // Satu jurnal per hari per siswa — overwrite jika sudah ada
  var journals = getJournals();
  var existIdx = journals.findIndex(function(j) {
    return j.studentName === activeUser.name && j.date === todayStr;
  });

  var newJournal = {
    id:          existIdx >= 0 ? journals[existIdx].id : ('jrn_' + Date.now()),
    studentName: activeUser.name,
    supervisor:  activeUser.supervisor || '',
    userId:      activeUser.id || '',
    date:        todayStr,
    time:        timeStr,
    narasi:      narasi,
    image:       fotoData,
    createdAt:   now.toISOString()
  };

  if (existIdx >= 0) journals[existIdx] = newJournal;
  else journals.unshift(newJournal);
  saveJournals(journals);

  // Kirim ke server (fire-and-forget)
  fetch(apiUrl('api.php?action=save_journal'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newJournal)
  }).catch(function() {});

  showToast('Jurnal harian berhasil dikirim!', 'success');
  renderJournalTab();
  renderHistoryList(); // refresh rekap harian
}

// Render seluruh tab jurnal (form + riwayat)
function renderJournalTab() {
  if (!activeUser || activeUser.role !== 'siswa') return;

  var todayStr  = new Date().toISOString().split('T')[0];
  var todayJrn  = getTodayJournal(activeUser.name);
  var form      = document.getElementById('journalForm');
  var preview   = document.getElementById('journalTodayPreview');
  var badge     = document.getElementById('journalTodayBadge');
  var narEl     = document.getElementById('journalTodayNarasi');
  var imgEl     = document.getElementById('journalTodayImg');

  if (todayJrn) {
    // Sudah ada jurnal hari ini
    if (form)    form.style.display = 'none';
    if (preview) preview.style.display = '';
    if (badge)   badge.style.display = '';
    if (narEl)   narEl.textContent = todayJrn.narasi;
    if (imgEl) {
      if (todayJrn.image) {
        imgEl.src     = todayJrn.image;
        imgEl.style.display = 'block';
      } else {
        imgEl.style.display = 'none';
      }
    }
  } else {
    if (form)    form.style.display = '';
    if (preview) preview.style.display = 'none';
    if (badge)   badge.style.display = 'none';
  }

  renderJournalList();
}

// Render daftar riwayat jurnal siswa
function renderJournalList() {
  var container = document.getElementById('journalListContainer');
  var countBadge = document.getElementById('journalCountBadge');
  if (!container || !activeUser) return;

  var journals = getJournalsByStudent(activeUser.name)
    .sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });

  if (countBadge) countBadge.textContent = journals.length + ' jurnal';

  if (journals.length === 0) {
    container.innerHTML = '<p class="text-muted text-sm text-center" style="padding:16px;">Belum ada jurnal. Mulai tulis jurnal pertama Anda!</p>';
    return;
  }

  var todayStr = new Date().toISOString().split('T')[0];
  container.innerHTML = journals.map(function(j) {
    var isToday = j.date === todayStr;
    var dateLabel = isToday ? 'Hari Ini' : formatDateIndo(j.date);
    var imgHtml = j.image
      ? '<img src="' + j.image + '" alt="Foto" style="width:100%;max-height:160px;object-fit:cover;border-radius:8px;margin-top:8px;border:1px solid rgba(255,255,255,0.1);" onerror="this.style.display=\'none\'">'
      : '';
    return '<div class="card" style="margin-bottom:10px;padding:12px;border-left:3px solid #10b981;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<span style="font-size:0.8rem;font-weight:700;color:#34d399;"><i class="fa-solid fa-book-open"></i> ' + dateLabel + '</span>' +
          (isToday ? '<span style="font-size:0.65rem;background:rgba(16,185,129,0.15);color:#34d399;padding:1px 6px;border-radius:6px;border:1px solid rgba(16,185,129,0.3);">Terbaru</span>' : '') +
        '</div>' +
        '<span style="font-size:0.7rem;color:#64748b;white-space:nowrap;">' + (j.time || '') + '</span>' +
      '</div>' +
      '<p style="font-size:0.82rem;color:#cbd5e1;line-height:1.5;margin:0;">' + (j.narasi || '').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</p>' +
      imgHtml +
    '</div>';
  }).join('');
}

window.previewJournalPhoto  = previewJournalPhoto;
window.clearJournalPhoto    = clearJournalPhoto;
window.resetJournalForm     = resetJournalForm;
window.handleJournalSubmit  = handleJournalSubmit;
window.renderJournalTab     = renderJournalTab;
window.renderJournalList    = renderJournalList;
window.initJournalTab       = initJournalTab;

// ══════════════════════════════════════════════════════════════════
function renderAdminDashboard() {
  const logs = getLogs();
  const perms = getPermissions();
  const users = getUsers();
  const todayStr = new Date().toISOString().split('T')[0];
  const isAdmin = (activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin'));

  const dashEl = document.getElementById('filterDashboardGuru');
  const pdfEl = document.getElementById('selectGuruFilterPDF');
  if (dashEl && pdfEl && pdfEl.value !== dashEl.value) {
    pdfEl.value = dashEl.value;
  }

  const dashMonthEl = document.getElementById('filterDashboardMonth');
  const pdfMonthEl = document.getElementById('selectMonthFilterPDF');
  if (dashMonthEl && pdfMonthEl && pdfMonthEl.value !== dashMonthEl.value) {
    pdfMonthEl.value = dashMonthEl.value;
  }

  const guruFilterVal = dashEl?.value || 'ALL';
  const monthFilterVal = dashMonthEl?.value || 'ALL';
  const statusFilterVal = document.getElementById('filterDashboardStatus')?.value || 'ALL';

  if (guruFilterVal === 'CUSTOM_SELECT') {
    const teacherNames = users.filter(u => u.role === 'guru' && u.username !== 'admin').map(u => u.name);
    const chosenName = prompt('Pilih atau Ketik Nama Guru Pembimbing:\n' + teacherNames.join('\n'));
    if (chosenName && chosenName.trim()) {
      const matchedTeacher = teacherNames.find(n => n.toLowerCase().includes(chosenName.trim().toLowerCase()));
      if (matchedTeacher) {
        const selectEl = document.getElementById('filterDashboardGuru');
        if (selectEl) selectEl.value = matchedTeacher;
        renderAdminDashboard();
        return;
      }
    }
  }

  let targetStudents = users.filter(u => u.role === 'siswa');

  if (!isAdmin && guruFilterVal !== 'ALL_SCHOOL') {
    targetStudents = getSupervisedStudentsOnly();
  } else if (guruFilterVal === 'ALL' || guruFilterVal === 'ALL_REKAP') {
    targetStudents.sort((a, b) => (a.supervisor || '').localeCompare(b.supervisor || ''));
  } else if (guruFilterVal !== 'ALL_SCHOOL' && guruFilterVal !== 'CUSTOM_SELECT') {
    targetStudents = targetStudents.filter(s => (s.supervisor || '').trim().toLowerCase() === (guruFilterVal || '').trim().toLowerCase());
  }

  let displayLogs = [];

  targetStudents.forEach(student => {
    let studentLogs = logs.filter(l => l.studentName === student.name);

    if (monthFilterVal !== 'ALL') {
      studentLogs = studentLogs.filter(l => {
        if (!l.date) return false;
        const m = new Date(l.date).getMonth() + 1;
        return m.toString() === monthFilterVal.toString();
      });
    } else {
      studentLogs = studentLogs.filter(l => l.date === todayStr);
    }

    if (studentLogs.length > 0) {
      studentLogs.forEach(l => displayLogs.push(l));
    } else {
      const studentPerm = perms.find(p => p.studentName === student.name && (p.startDate <= todayStr && p.endDate >= todayStr));
      if (studentPerm) {
        displayLogs.push({
          id: studentPerm.id,
          studentName: student.name,
          supervisor: student.supervisor,
          date: todayStr,
          masuk: '-',
          pulang: '-',
          status: studentPerm.type,
          location: `Surat ${studentPerm.type}: ${studentPerm.reason}`,
          image: student.avatar
        });
      } else {
        displayLogs.push({
          id: Date.now() + Math.random(),
          studentName: student.name,
          supervisor: student.supervisor,
          date: todayStr,
          masuk: '-',
          pulang: '-',
          status: 'Alpa',
          location: 'Tanpa Keterangan (Belum Absen)',
          image: student.avatar
        });
      }
    }
  });

  // Filter by Status if selected
  if (statusFilterVal !== 'ALL') {
    displayLogs = displayLogs.filter(l => l.status === statusFilterVal || l.status.includes(statusFilterVal));
  }

  const countBadge = document.getElementById('todayLogCount');
  if (countBadge) {
    countBadge.textContent = `${displayLogs.length} Total Presensi Hari Ini`;
  }

  let filteredPerms = perms;
  if (!isAdmin) {
    filteredPerms = perms.filter(p => {
      if (!p.supervisor) return false;
      const supLow  = (p.supervisor || '').trim().toLowerCase();
      const nameLow = (activeUser.name || '').trim().toLowerCase();
      return supLow === nameLow;
    });
  }

  const tableBody = document.getElementById('adminStudentLogTable');
  if (tableBody) {
    if (displayLogs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:20px;">Belum ada siswa bimbingan Anda.</td></tr>`;
    } else {
      tableBody.innerHTML = displayLogs.map((l, idx) => {
        let tagClass = 'hadir';
        if (l.status === 'Izin' || l.status.includes('Izin')) tagClass = 'izin';
        else if (l.status === 'Sakit' || l.status.includes('Sakit')) tagClass = 'sakit';
        else if (l.status === 'Alpa' || l.status.includes('Alpa')) tagClass = 'alpa';

        const fotoHtml = l.image 
          ? `<img src="${l.image}" style="width:38px; height:38px; border-radius:8px; object-fit:cover; border:1px solid #6366f1; cursor:pointer;" onclick="previewImageModal('${l.image}', '${l.studentName}')" title="Klik perbesar foto">`
          : `<span class="text-muted text-xs">-</span>`;

        const locationHtml = l.location 
          ? `<div style="font-size:0.75rem; color:#a5b4fc; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${l.location}"><i class="fa-solid fa-location-dot text-indigo-400"></i> ${l.location}</div>`
          : `<span class="text-muted text-xs">-</span>`;

        return `
          <tr>
            <td style="text-align:center; font-weight:bold; color:#94a3b8; font-size:0.8rem;">${idx + 1}</td>
            <td>
              <strong style="color:#fff; font-size:0.85rem;">${l.studentName}</strong><br>
              <small style="color:#34d399; font-weight:600; font-size:0.75rem;"><i class="fa-solid fa-user-tie"></i> ${l.supervisor || '-'}</small>
            </td>
            <td><small style="color:#e2e8f0; font-size:0.78rem;">${formatDateIndo(l.date || todayStr)}</small></td>
            <td><strong style="color:#34d399; font-size:0.82rem;">${l.masuk || '-'}</strong></td>
            <td><strong style="color:#f87171; font-size:0.82rem;">${l.pulang || '-'}</strong></td>
            <td>${locationHtml}</td>
            <td style="text-align:center;">${fotoHtml}</td>
            <td style="text-align:center;"><span class="status-tag ${tagClass}">${l.status}</span></td>
          </tr>
        `;
      }).join('');
    }
  }

  const pendingList = document.getElementById('adminApprovalList');
  if (pendingList) {
    const pendingItems = filteredPerms.filter(p => (p.status || '').toLowerCase() === 'pending');
    if (pendingItems.length === 0) {
      pendingList.innerHTML = `<p class="text-muted text-sm text-center">Tidak ada permohonan pending bimbingan Anda.</p>`;
    } else {
      pendingList.innerHTML = pendingItems.map(p => `
        <div class="card" style="margin-bottom:10px; padding:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${p.studentName}</strong> - <span style="color:#a5b4fc;">${p.type}</span>
              <p style="font-size:0.75rem; color:#94a3b8;">${p.reason}</p>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn-sm btn-success" onclick="approvePermission(${p.id}, 'Disetujui')">Setujui</button>
              <button class="btn-sm btn-secondary" onclick="showRejectModal('${p.id}')">Tolak</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  renderChart();
  renderPendingUserApprovals();
  populateGuruFilterDropdown();
}

function renderGuruApprovalTab() {
  const perms = getPermissions();
  const container = document.getElementById('guruTabApprovalList');
  if (!container) return;

  let filteredPerms = perms;
  if (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin') {
    // Filter berdasarkan supervisor field di permission (nama guru pembimbing)
    // atau berdasarkan nama siswa bimbingan dari localStorage sebagai fallback
    const myName = (activeUser.name || '').trim().toLowerCase();
    const myStudentNames = getSupervisedStudentsOnly().map(s => (s.name || '').trim().toLowerCase());
    filteredPerms = perms.filter(p => {
      const pSupervisor = (p.supervisor || '').trim().toLowerCase();
      const pStudentName = (p.studentName || '').trim().toLowerCase();
      // Cocokkan supervisor field ATAU nama siswa bimbingan
      return pSupervisor === myName || myStudentNames.includes(pStudentName);
    });
  }

  const pendingItems = filteredPerms.filter(p => (p.status || '').toLowerCase() === 'pending');
  if (pendingItems.length === 0) {
    container.innerHTML = `<p class="text-muted text-sm text-center" style="padding:20px;">Tidak ada permohonan izin pending bimbingan Anda.</p>`;
  } else {
    container.innerHTML = pendingItems.map(p => `
      <div class="card" style="margin-bottom:10px; padding:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:#fff;">${p.studentName}</strong> - <span style="color:#a5b4fc;">${p.type} (${p.startDate} s.d ${p.endDate})</span>
            <p style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">${p.reason}</p>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-sm btn-success" onclick="approvePermission('${p.id}', 'Disetujui')">Setujui</button>
            <button class="btn-sm btn-secondary" onclick="showRejectModal('${p.id}')">Tolak</button>
          </div>
        </div>
      </div>
    `).join('');
  }
}

function renderGuruLogPresensiTab() {
  const logs = getLogs();
  const perms = getPermissions();
  const users = getUsers();
  const journals = (typeof getJournals === 'function') ? getJournals() : [];
  // Gunakan waktu lokal (bukan UTC) agar tanggal sesuai WIB
  const todayStr = (function() {
    var n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
  })();
  const isAdmin = (activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin'));

  const guruFilterVal = document.getElementById('guruTabFilterGuru')?.value || 'ALL';
  const statusFilterVal = document.getElementById('guruTabFilterStatus')?.value || 'ALL';

  let targetStudents = users.filter(u => u.role === 'siswa');

  if (!isAdmin) {
    targetStudents = getSupervisedStudentsOnly();
  } else {
    if (guruFilterVal === 'ALL' || guruFilterVal === 'ALL_REKAP') {
      targetStudents.sort((a, b) => (a.supervisor || '').localeCompare(b.supervisor || ''));
    } else if (guruFilterVal !== 'ALL_SCHOOL') {
      targetStudents = targetStudents.filter(s => (s.supervisor || '').trim().toLowerCase() === (guruFilterVal || '').trim().toLowerCase());
    }
  }

  let displayLogs = [];

  targetStudents.forEach(student => {
    const studentTodayLogs = logs.filter(l => l.studentName === student.name && l.date === todayStr);

    if (studentTodayLogs.length > 0) {
      studentTodayLogs.forEach(l => displayLogs.push(l));
    } else {
      const studentPerm = perms.find(p => p.studentName === student.name && (p.startDate <= todayStr && p.endDate >= todayStr));
      if (studentPerm) {
        displayLogs.push({
          id: studentPerm.id,
          studentName: student.name,
          supervisor: student.supervisor,
          date: todayStr,
          masuk: '-',
          pulang: '-',
          status: studentPerm.type,
          location: `Surat ${studentPerm.type}: ${studentPerm.reason}`,
          image: student.avatar
        });
      } else {
        displayLogs.push({
          id: Date.now() + Math.random(),
          studentName: student.name,
          supervisor: student.supervisor,
          date: todayStr,
          masuk: '-',
          pulang: '-',
          status: 'Alpa',
          location: 'Tanpa Keterangan (Belum Absen)',
          image: student.avatar
        });
      }
    }
  });

  if (statusFilterVal !== 'ALL') {
    displayLogs = displayLogs.filter(l => l.status === statusFilterVal || l.status.includes(statusFilterVal));
  }

  const countBadge = document.getElementById('guruTodayLogCount');
  if (countBadge) {
    countBadge.textContent = `${displayLogs.length} Total Presensi Hari Ini`;
  }

  const tableBody = document.getElementById('guruTabStudentLogTable');
  if (tableBody) {
    if (displayLogs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:20px;">Tidak ada log presensi yang sesuai filter.</td></tr>`;
    } else {
      tableBody.innerHTML = displayLogs.map((l, idx) => {
        let tagClass = 'hadir';
        if (l.status === 'Izin' || l.status.includes('Izin')) tagClass = 'izin';
        else if (l.status === 'Sakit' || l.status.includes('Sakit')) tagClass = 'sakit';
        else if (l.status === 'Alpa' || l.status.includes('Alpa')) tagClass = 'alpa';

        const fotoHtml = l.image 
          ? `<img src="${l.image}" style="width:38px; height:38px; border-radius:8px; object-fit:cover; border:1px solid #6366f1; cursor:pointer;" onclick="previewImageModal('${l.image}', '${l.studentName}')" title="Klik perbesar foto">`
          : `<span class="text-muted text-xs">-</span>`;

        const locationHtml = l.location 
          ? `<div style="font-size:0.75rem; color:#a5b4fc; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${l.location}"><i class="fa-solid fa-location-dot text-indigo-400"></i> ${l.location}</div>`
          : `<span class="text-muted text-xs">-</span>`;

        // Jurnal harian siswa pada tanggal yang sama
        const jrn = journals.find(j => j.studentName === l.studentName && j.date === (l.date || todayStr));
        const jrnHtml = jrn
          ? `<div style="font-size:0.75rem;line-height:1.4;">
               <i class="fa-solid fa-book-open" style="color:#06b6d4;"></i>
               <span style="color:#cbd5e1;">${(jrn.narasi||'').substring(0,80)}${jrn.narasi&&jrn.narasi.length>80?'...':''}</span>
               ${jrn.image ? `<br><img src="${jrn.image}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;margin-top:3px;cursor:pointer;" onclick="previewImageModal('${jrn.image}','Foto Jurnal ${l.studentName}')" onerror="this.style.display='none'">` : ''}
             </div>`
          : `<span style="font-size:0.72rem;color:#475569;font-style:italic;"><i class="fa-solid fa-book-open"></i> Belum ada jurnal</span>`;

        return `
          <tr>
            <td style="text-align:center; font-weight:bold; color:#94a3b8; font-size:0.8rem;">${idx + 1}</td>
            <td>
              <strong style="color:#fff; font-size:0.85rem;">${l.studentName}</strong><br>
              <small style="color:#34d399; font-weight:600; font-size:0.75rem;"><i class="fa-solid fa-user-tie"></i> ${l.supervisor || '-'}</small>
            </td>
            <td><small style="color:#e2e8f0; font-size:0.78rem;">${formatDateIndo(l.date || todayStr)}</small></td>
            <td><strong style="color:#34d399; font-size:0.82rem;">${l.masuk || '-'}</strong></td>
            <td><strong style="color:#f87171; font-size:0.82rem;">${l.pulang || '-'}</strong></td>
            <td>${locationHtml}</td>
            <td style="text-align:center;">${fotoHtml}</td>
            <td style="text-align:center;"><span class="status-tag ${tagClass}">${l.status}</span></td>
            <td>${jrnHtml}</td>
          </tr>
        `;
      }).join('');
    }
  }

  populateGuruTabFilterDropdown();
  renderGuruApprovalTab();
}

function populateGuruTabFilterDropdown() {
  const selectEl = document.getElementById('guruTabFilterGuru');
  if (!selectEl) return;

  const users = getUsers();
  const teachers = users.filter(u => u.role === 'guru' && u.username !== 'admin');
  const currentVal = selectEl.value;

  if (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin') {
    selectEl.innerHTML = `<option value="${activeUser.name}">Siswa Bimbingan Saya (${activeUser.name})</option>`;
    selectEl.value = activeUser.name;
    selectEl.style.display = 'none';
  } else {
    selectEl.style.display = 'inline-block';
    let html = `<option value="ALL">-- Kelompok Bimbingan Saya --</option>`;
    html += `<option value="ALL_SCHOOL">Semua Siswa Sekolah (Master List)</option>`;
    teachers.forEach(t => {
      html += `<option value="${t.name}">Kelompok: ${t.name}</option>`;
    });
    selectEl.innerHTML = html;
    if (currentVal) selectEl.value = currentVal;
  }
}

function approvePermission(permId, newStatus, rejectReason) {
  const perms = getPermissions();
  const item = perms.find(p => String(p.id) === String(permId));
  if (!item) { showToast('Data izin tidak ditemukan!', 'error'); return; }

  // Simpan approver info
  const approverName = activeUser ? activeUser.name : 'Admin';
  const approverRole = activeUser ? (activeUser.role === 'admin' ? 'Master Admin' : 'Guru Pembimbing') : 'Admin';
  // Format ISO untuk MySQL (YYYY-MM-DD HH:MM:SS) — bukan toLocaleString yang hasilkan format Indonesia
  const now = new Date();
  const approvedAt = now.getFullYear() + '-'
    + String(now.getMonth()+1).padStart(2,'0') + '-'
    + String(now.getDate()).padStart(2,'0') + ' '
    + String(now.getHours()).padStart(2,'0') + ':'
    + String(now.getMinutes()).padStart(2,'0') + ':'
    + String(now.getSeconds()).padStart(2,'0');
  const approvedAtDisplay = now.toLocaleString('id-ID'); // untuk ditampilkan di UI saja

  item.status = newStatus;
  item.approvedBy = approverName;
  item.approverRole = approverRole;
  item.approvedAt = approvedAtDisplay; // tampilkan format lokal di UI
  if (newStatus === 'Ditolak' && rejectReason) {
    item.rejectReason = rejectReason;
  }
  savePermissions(perms);

  // Guard global (fallback) + guard per-item: keduanya melindungi dari overwrite sync
  _lastApproveTs = Date.now();
  _approvedPermIds.set(String(permId), Date.now()); // catat per-item, berlaku 120 detik

  const logs = getLogs();
  const existingLogIndex = logs.findIndex(l => l.studentName === item.studentName && (l.date === item.startDate || l.status === item.type));

  if (newStatus === 'Disetujui') {
    const logEntry = {
      id: Date.now(),
      studentName: item.studentName,
      supervisor: item.supervisor,
      date: item.startDate,
      masuk: '-',
      pulang: '-',
      status: item.type,
      // Keterangan diproses oleh siapa
      location: `Surat ${item.type}: ${item.reason} [Disetujui oleh ${approverRole}: ${approverName}]`,
      image: null
    };
    if (existingLogIndex >= 0) {
      logs[existingLogIndex].status = item.type;
      logs[existingLogIndex].location = logEntry.location;
    } else {
      logs.unshift(logEntry);
    }
    saveLogs(logs);

    // Sync log ke server
    fetch(apiUrl('api.php?action=simpan_presensi'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    }).catch(() => {});

  } else if (newStatus === 'Ditolak') {
    if (existingLogIndex >= 0) {
      logs[existingLogIndex].status = 'Alpa';
      logs[existingLogIndex].location = `Permohonan Izin Ditolak oleh ${approverRole}: ${approverName}` + (rejectReason ? ` — Alasan: ${rejectReason}` : '');
      saveLogs(logs);
    }
  }

  // Sync approval ke server dengan info approver
  const permPayload = {
    id: item.id,
    perm_id: item.id,
    status: newStatus,
    approver_name: approverName,
    approver_role: approverRole,
    approved_at: approvedAt,
    reject_reason: rejectReason || '',
    studentName: item.studentName,
    startDate: item.startDate,
    type: item.type
  };

  // Pakai apiUrl() agar APK pakai URL absolut
  fetch(apiUrl('api.php?action=approve_permission'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(permPayload)
  }).then(function(res) {
    if (!res.ok) console.warn('[SIGAP] approve_permission HTTP error:', res.status);
    return res.json().catch(() => ({}));
  }).then(function(data) {
    if (!data.success) console.warn('[SIGAP] approve_permission server error:', JSON.stringify(data));
    // Setelah server konfirmasi, tunggu 3 detik agar DB benar-benar commit
    setTimeout(function() { syncDataFromServer(); }, 3000);
  }).catch(function(err) {
    console.warn('[SIGAP] approve_permission fetch gagal:', err.message || err);
    // Tetap sync meski fetch gagal agar UI konsisten
    setTimeout(function() { syncDataFromServer(); }, 3000);
  });

  recordApprovalReport({
    requested_by: item.studentName || item.supervisor,
    studentName: item.studentName,
    title: `Permohonan ${item.type}`,
    actionStatus: newStatus,
    details: `Permohonan ${item.type} (${item.startDate} s.d ${item.endDate}): ${item.reason} — Diproses oleh ${approverRole} (${approverName}) pada ${approvedAt}`
  });

  showToast(`Pengajuan ${item.type} untuk ${item.studentName} ${newStatus} oleh ${approverName}!`, 'info');
  renderTodayStatus();
  renderStats();
  renderHistoryList();
  renderPermissionList();
  renderAdminDashboard();
  renderGuruApprovalTab();
  renderGuruApprovalReports();
  renderAdminApprovalReportsHistory();
}

// Expose ke window agar bisa dipanggil dari onclick di HTML yang di-generate
window.approvePermission = approvePermission;

// ── Modal konfirmasi penolakan izin/sakit ──────────────────────────────────
function showRejectModal(permId) {
  // Buat modal inline jika belum ada
  var existing = document.getElementById('rejectPermModal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'rejectPermModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:#1e293b;border:1px solid rgba(99,102,241,0.4);border-radius:14px;padding:24px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <h3 style="margin:0 0 6px;font-size:1rem;color:#f87171;"><i class="fa-solid fa-circle-xmark"></i> Tolak Pengajuan Izin/Sakit</h3>
      <p style="font-size:0.8rem;color:#94a3b8;margin:0 0 16px;">Wajib isi keterangan alasan penolakan agar siswa mengetahui penyebabnya.</p>
      <div class="form-group" style="margin-bottom:14px;">
        <label style="font-size:0.82rem;color:#cbd5e1;display:block;margin-bottom:6px;"><i class="fa-solid fa-comment-slash"></i> Alasan Penolakan <span style="color:#ef4444;">*</span></label>
        <textarea id="rejectReasonInput" rows="3"
          style="width:100%;padding:10px 12px;background:rgba(15,23,42,0.8);border:1px solid rgba(99,102,241,0.5);border-radius:8px;color:#fff;font-size:0.85rem;resize:vertical;font-family:inherit;outline:none;"
          placeholder="Contoh: Dokumen pendukung tidak dilampirkan / Alasan tidak sesuai prosedur / dll..."
          maxlength="300"></textarea>
        <small id="rejectReasonCounter" style="color:#94a3b8;font-size:0.72rem;">0 / 300</small>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button onclick="document.getElementById('rejectPermModal').remove()"
          style="padding:9px 18px;background:rgba(255,255,255,0.08);color:#cbd5e1;border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;font-size:0.85rem;">
          Batal
        </button>
        <button onclick="confirmRejectPermission('${permId}')"
          style="padding:9px 18px;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:700;">
          <i class="fa-solid fa-circle-xmark"></i> Konfirmasi Tolak
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Live counter
  var ta = document.getElementById('rejectReasonInput');
  var ctr = document.getElementById('rejectReasonCounter');
  if (ta && ctr) {
    ta.addEventListener('input', function() { ctr.textContent = ta.value.length + ' / 300'; });
    ta.focus();
  }
}

function confirmRejectPermission(permId) {
  var ta = document.getElementById('rejectReasonInput');
  var reason = ta ? ta.value.trim() : '';
  if (!reason) {
    showToast('Keterangan alasan penolakan wajib diisi!', 'error');
    if (ta) ta.focus();
    return;
  }
  var modal = document.getElementById('rejectPermModal');
  if (modal) modal.remove();
  approvePermission(String(permId), 'Ditolak', reason);
}

window.showRejectModal = showRejectModal;
window.confirmRejectPermission = confirmRejectPermission;

function renderGuruApprovalReports() {
  const container = document.getElementById('guruApprovalReportList');
  const card = document.getElementById('guruApprovalReportCard');
  if (!container || !card) return;

  if (!activeUser || activeUser.role !== 'guru' || activeUser.username === 'admin') {
    card.classList.add('hidden');
    return;
  }

  card.classList.remove('hidden');
  const reports = getApprovalReports();
  const myReports = reports.filter(r => {
    if (!r.requested_by) return false;
    return r.requested_by === activeUser.name || r.requested_by.toLowerCase().includes(activeUser.name.toLowerCase());
  });

  if (myReports.length === 0) {
    container.innerHTML = `<p class="text-muted text-xs text-center" style="padding:10px;">Belum ada hasil persetujuan Master Admin untuk pengajuan Anda.</p>`;
    return;
  }

  container.innerHTML = myReports.map(r => {
    const isApproved = r.actionStatus === 'Disetujui';
    const tagBg = isApproved 
      ? 'background:rgba(16, 185, 129, 0.15); color:#34d399; border:1px solid #10b981;'
      : 'background:rgba(239, 68, 68, 0.15); color:#f87171; border:1px solid #ef4444;';
    const iconTag = isApproved ? '<i class="fa-solid fa-circle-check"></i> Disetujui' : '<i class="fa-solid fa-circle-xmark"></i> Ditolak';

    return `
      <div style="background:rgba(15,23,42,0.6); padding:10px 12px; border-radius:8px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <div>
            <strong style="font-size:0.82rem; color:#fff;">${r.title}: ${r.studentName}</strong>
            <p style="font-size:0.75rem; color:#cbd5e1; margin-top:2px;">${r.details}</p>
            <span style="font-size:0.7rem; color:#94a3b8;"><i class="fa-regular fa-clock"></i> ${r.date} ${r.time} � Diproses oleh: ${r.approver}</span>
          </div>
          <span style="font-size:0.75rem; padding:4px 10px; border-radius:6px; font-weight:600; ${tagBg}">${iconTag}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderAdminApprovalReportsHistory() {
  const container = document.getElementById('adminApprovalReportHistoryList');
  const card = document.getElementById('adminApprovalReportHistoryCard');
  if (!container || !card) return;

  const isAdmin = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');
  if (!isAdmin) {
    card.classList.add('hidden');
    return;
  }

  card.classList.remove('hidden');
  const reports = getApprovalReports();

  if (reports.length === 0) {
    container.innerHTML = `<p class="text-muted text-xs text-center" style="padding:10px;">Belum ada riwayat hasil keputusan persetujuan.</p>`;
    return;
  }

  container.innerHTML = reports.map(r => {
    const isApproved = r.actionStatus === 'Disetujui';
    const tagBg = isApproved 
      ? 'background:rgba(16, 185, 129, 0.15); color:#34d399; border:1px solid #10b981;'
      : 'background:rgba(239, 68, 68, 0.15); color:#f87171; border:1px solid #ef4444;';
    const iconTag = isApproved ? '<i class="fa-solid fa-circle-check"></i> Disetujui' : '<i class="fa-solid fa-circle-xmark"></i> Ditolak';

    return `
      <div style="background:rgba(15,23,42,0.6); padding:10px 12px; border-radius:8px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <div>
            <strong style="font-size:0.82rem; color:#fff;">${r.title}: ${r.studentName}</strong>
            <p style="font-size:0.75rem; color:#cbd5e1; margin-top:2px;">${r.details}</p>
            <span style="font-size:0.7rem; color:#94a3b8;"><i class="fa-regular fa-clock"></i> ${r.date} ${r.time} � Diajukan oleh: <strong>${r.requested_by}</strong></span>
          </div>
          <span style="font-size:0.75rem; padding:4px 10px; border-radius:6px; font-weight:600; ${tagBg}">${iconTag}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderChart() {
  const canvasH1 = document.getElementById('attendanceChartH1');
  const canvasH = document.getElementById('attendanceChartH');
  const canvasBar = document.getElementById('attendanceComparisonBarChart');
  const canvasOld = document.getElementById('attendanceChart');

  // ── Set Chart.js global defaults sesuai tema aktif SEBELUM buat instance ──
  var _rcLight = document.body && document.body.getAttribute('data-theme') === 'light';
  if (typeof Chart !== 'undefined' && Chart.defaults) {
    Chart.defaults.color = _rcLight ? '#0f172a' : '#cbd5e1';
    Chart.defaults.borderColor = _rcLight ? 'rgba(15,23,42,0.25)' : 'rgba(255,255,255,0.08)';
    if (Chart.defaults.scale) {
      if (Chart.defaults.scale.ticks) {
        Chart.defaults.scale.ticks.color = _rcLight ? '#0f172a' : '#cbd5e1';
      }
      if (Chart.defaults.scale.grid) {
        Chart.defaults.scale.grid.color = _rcLight ? 'rgba(15,23,42,0.25)' : 'rgba(255,255,255,0.05)';
      }
    }
    // Font bold di semua skala
    if (Chart.defaults.font) {
      Chart.defaults.font.weight = 'bold';
      Chart.defaults.font.size = 12;
    }
  }

  const logs = getLogs();
  const perms = getPermissions();
  const users = getUsers();
  const supervisedStudents = (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin')
    ? getSupervisedStudentsOnly()
    : (_dashGuruVal && _dashGuruVal !== 'ALL'
        ? users.filter(u => u.role === 'siswa' && (u.supervisor || '').trim().toLowerCase() === _dashGuruVal.trim().toLowerCase())
        : users.filter(u => u.role === 'siswa'));

  const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  // Baca filter bulan dari dashboard — sinkron dengan data yang ditampilkan
  const _dashMonthEl = document.getElementById('filterDashboardMonth');
  const _dashMonthVal = _dashMonthEl ? _dashMonthEl.value : 'ALL';
  const currentMonthNum = (_dashMonthVal && _dashMonthVal !== 'ALL') ? parseInt(_dashMonthVal) : now.getMonth() + 1;
  const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;

  // Baca filter guru dari dashboard
  const _dashGuruEl = document.getElementById('filterDashboardGuru');
  const _dashGuruVal = _dashGuruEl ? _dashGuruEl.value : 'ALL';

  const monthH1Name = monthNames[prevMonthNum];
  const monthHName = monthNames[currentMonthNum];

  const labelMonthH1El = document.getElementById('labelMonthH1');
  const labelMonthHEl = document.getElementById('labelMonthH');
  if (labelMonthH1El) labelMonthH1El.textContent = monthH1Name;
  if (labelMonthHEl) labelMonthHEl.textContent = monthHName;

  // Calculate Month H-1 Stats
  let hadirH1 = 0, izinH1 = 0, sakitH1 = 0, alpaH1 = 0;
  supervisedStudents.forEach(s => {
    let sLogs = logs.filter(l => l.studentName === s.name && l.date && (new Date(l.date).getMonth() + 1) === prevMonthNum);
    let sPerms = perms.filter(p => p.studentName === s.name && p.status === 'Disetujui' && p.startDate && (new Date(p.startDate).getMonth() + 1) === prevMonthNum);

    let h = sLogs.filter(l => l.status.includes('Hadir') || l.status.includes('Pengantaran') || l.status.includes('Monitoring') || l.status.includes('Penjemputan')).length;
    let i = sLogs.filter(l => l.status === 'Izin').length + sPerms.filter(p => p.type === 'Izin').length;
    let sk = sLogs.filter(l => l.status === 'Sakit').length + sPerms.filter(p => p.type === 'Sakit').length;
    let a = sLogs.filter(l => l.status === 'Alpa').length;

    hadirH1 += h;
    izinH1 += i;
    sakitH1 += sk;
    alpaH1 += a;
  });

  // Calculate Month H Stats
  let hadirH = 0, izinH = 0, sakitH = 0, alpaH = 0;
  supervisedStudents.forEach(s => {
    let sLogs = logs.filter(l => l.studentName === s.name && l.date && (new Date(l.date).getMonth() + 1) === currentMonthNum);
    let sPerms = perms.filter(p => p.studentName === s.name && p.status === 'Disetujui' && p.startDate && (new Date(p.startDate).getMonth() + 1) === currentMonthNum);

    let h = sLogs.filter(l => l.status.includes('Hadir') || l.status.includes('Pengantaran') || l.status.includes('Monitoring') || l.status.includes('Penjemputan')).length;
    let i = sLogs.filter(l => l.status === 'Izin').length + sPerms.filter(p => p.type === 'Izin').length;
    let sk = sLogs.filter(l => l.status === 'Sakit').length + sPerms.filter(p => p.type === 'Sakit').length;
    let a = sLogs.filter(l => l.status === 'Alpa').length;

    hadirH += h;
    izinH += i;
    sakitH += sk;
    alpaH += a;
  });

  const totalH1 = Math.max(hadirH1 + izinH1 + sakitH1 + alpaH1, 1);
  const totalH = Math.max(hadirH + izinH + sakitH + alpaH, 1);

  const rateH1 = Math.round((hadirH1 / totalH1) * 100);
  const rateH = Math.round((hadirH / totalH) * 100);

  const diffRate = rateH - rateH1;

  // Render metrics text
  const metricsH1El = document.getElementById('metricsH1');
  if (metricsH1El) {
    metricsH1El.innerHTML = `
      <span><i class="fa-solid fa-check text-emerald-400"></i> ${hadirH1} Hadir</span>
      <span><i class="fa-solid fa-envelope text-sky-400"></i> ${izinH1} Izin</span>
      <span><i class="fa-solid fa-notes-medical text-amber-400"></i> ${sakitH1} Sakit</span>
      <span><i class="fa-solid fa-xmark text-rose-400"></i> ${alpaH1} Alpa</span>
      <span><strong>${rateH1}% Rate</strong></span>
    `;
  }

  const metricsHEl = document.getElementById('metricsH');
  if (metricsHEl) {
    metricsHEl.innerHTML = `
      <span><i class="fa-solid fa-check text-emerald-400"></i> ${hadirH} Hadir</span>
      <span><i class="fa-solid fa-envelope text-sky-400"></i> ${izinH} Izin</span>
      <span><i class="fa-solid fa-notes-medical text-amber-400"></i> ${sakitH} Sakit</span>
      <span><i class="fa-solid fa-xmark text-rose-400"></i> ${alpaH} Alpa</span>
      <span><strong>${rateH}% Rate</strong></span>
    `;
  }

  const badgeEl = document.getElementById('trendIndicatorBadge');
  if (badgeEl) {
    if (diffRate >= 0) {
      badgeEl.innerHTML = `<span class="badge" style="background:#10b981; color:#fff; font-size:0.75rem; padding:4px 10px; border-radius:12px;"><i class="fa-solid fa-arrow-trend-up"></i> +${diffRate}% Trend Kehadiran Naik</span>`;
    } else {
      badgeEl.innerHTML = `<span class="badge" style="background:#ef4444; color:#fff; font-size:0.75rem; padding:4px 10px; border-radius:12px;"><i class="fa-solid fa-arrow-trend-down"></i> ${diffRate}% Trend Kehadiran Turun</span>`;
    }
  }

  // Destroy previous instances
  if (chartInstanceH1) chartInstanceH1.destroy();
  if (chartInstanceH) chartInstanceH.destroy();
  if (chartInstanceCompBar) chartInstanceCompBar.destroy();
  if (attendanceChartInstance) attendanceChartInstance.destroy();

  const createCenter3DPlugin = (rateVal, labelText) => ({
    id: 'center3D_' + Math.random().toString(36).substr(2, 9),
    afterDraw(chart) {
      const { ctx, chartArea: { width, height, top, left } } = chart;
      ctx.save();
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      // Deteksi tema untuk center doughnut
      var _cLight = document.body && document.body.getAttribute('data-theme') === 'light';
      var _cBg    = _cLight ? 'rgba(248,250,252,0.95)' : 'rgba(15, 23, 42, 0.95)';
      var _cLabel = _cLight ? '#475569' : '#94a3b8';

      ctx.beginPath();
      ctx.arc(centerX, centerY, 36, 0, 2 * Math.PI);
      ctx.fillStyle = _cBg;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = rateVal >= 85 ? 'rgba(52, 211, 153, 0.6)' : 'rgba(245, 158, 11, 0.6)';
      ctx.stroke();

      ctx.font = '700 8px sans-serif';
      ctx.fillStyle = _cLabel;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText.toUpperCase(), centerX, centerY - 10);

      ctx.font = '800 15px sans-serif';
      ctx.shadowColor = rateVal >= 85 ? '#34d399' : '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.fillStyle = rateVal >= 85 ? (_cLight ? '#059669' : '#34d399') : (_cLight ? '#d97706' : '#f59e0b');
      ctx.fillText(`${rateVal}%`, centerX, centerY + 4);

      ctx.restore();
    }
  });

  // Deteksi tema aktif (doughnut chart)
  var _dLightMode = document.body && document.body.getAttribute('data-theme') === 'light';
  var _dLegendColor  = _dLightMode ? '#0f172a' : '#cbd5e1';
  var _dBorderColor  = _dLightMode ? 'rgba(255,255,255,0.9)' : '#1e293b';

  // Render Doughnut Chart Month H-1
  if (canvasH1) {
    chartInstanceH1 = new Chart(canvasH1, {
      type: 'doughnut',
      data: {
        labels: ['Hadir', 'Izin', 'Sakit', 'Alpa'],
        datasets: [{
          data: [hadirH1, izinH1, sakitH1, alpaH1],
          backgroundColor: ['#10b981', '#0284c7', '#f59e0b', '#ef4444'],
          borderWidth: _dLightMode ? 3 : 2,
          borderColor: _dBorderColor,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { color: _dLegendColor, font: { size: 10, weight: 'bold' } } }
        }
      },
      plugins: [createCenter3DPlugin(rateH1, monthH1Name)]
    });
  }

  // Render Doughnut Chart Month H
  if (canvasH) {
    chartInstanceH = new Chart(canvasH, {
      type: 'doughnut',
      data: {
        labels: ['Hadir', 'Izin', 'Sakit', 'Alpa'],
        datasets: [{
          data: [hadirH, izinH, sakitH, alpaH],
          backgroundColor: ['#10b981', '#0284c7', '#f59e0b', '#ef4444'],
          borderWidth: _dLightMode ? 3 : 2,
          borderColor: _dBorderColor,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { color: _dLegendColor, font: { size: 10, weight: 'bold' } } }
        }
      },
      plugins: [createCenter3DPlugin(rateH, monthHName)]
    });
  }

  // Render Comparison Grouped Bar Chart — pakai requestAnimationFrame agar
  // browser sempat menghitung layout container sebelum chart dibuat
  if (canvasBar) {
    var _doRenderBar = function() {
    const ctxBar = canvasBar.getContext('2d');
    // let (bukan const) agar bisa di-reassign saat light mode
    let gradH1 = ctxBar.createLinearGradient(0, 0, 0, 200);
    gradH1.addColorStop(0, '#a5b4fc');
    gradH1.addColorStop(1, '#6366f1');

    let gradH = ctxBar.createLinearGradient(0, 0, 0, 200);
    gradH.addColorStop(0, '#38bdf8');
    gradH.addColorStop(1, '#0284c7');

    // Deteksi tema aktif untuk warna chart yang kontras
    var _isLightMode = document.body && document.body.getAttribute('data-theme') === 'light';
    var _chartLegendColor = _isLightMode ? '#0f172a' : '#e2e8f0';
    var _chartTickColor   = _isLightMode ? '#0f172a' : '#cbd5e1';
    var _chartGridColor   = _isLightMode ? 'rgba(15,23,42,0.25)' : 'rgba(255,255,255,0.05)';
    var _chartBarBorder1  = _isLightMode ? 'rgba(67,56,202,0.8)' : 'rgba(255,255,255,0.2)';
    var _chartBarBorder2  = _isLightMode ? 'rgba(2,132,199,0.8)' : 'rgba(255,255,255,0.3)';

    // Gradien bar disesuaikan per tema
    if (_isLightMode) {
      gradH1 = ctxBar.createLinearGradient(0, 0, 0, 200);
      gradH1.addColorStop(0, '#818cf8');
      gradH1.addColorStop(1, '#4338ca');
      gradH = ctxBar.createLinearGradient(0, 0, 0, 200);
      gradH.addColorStop(0, '#38bdf8');
      gradH.addColorStop(1, '#0369a1');
    }

    chartInstanceCompBar = new Chart(canvasBar, {
      type: 'bar',
      data: {
        labels: ['Hadir', 'Izin', 'Sakit', 'Alpa'],
        datasets: [
          { label: `Bulan H-1 (${monthH1Name})`, data: [hadirH1, izinH1, sakitH1, alpaH1], backgroundColor: gradH1, borderRadius: 6, borderWidth: 2, borderColor: _chartBarBorder1 },
          { label: `Bulan H (${monthHName})`, data: [hadirH, izinH, sakitH, alpaH], backgroundColor: gradH, borderRadius: 6, borderWidth: 2, borderColor: _chartBarBorder2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: _chartLegendColor,
              font: { size: 11, weight: 'bold' },
              padding: 12,
              boxWidth: 16
            }
          },
          title: {
            display: false
          }
        },
        scales: {
          x: {
            ticks: { color: _chartTickColor, font: { size: 11, weight: 'bold' } },
            grid: { color: _chartGridColor, lineWidth: _isLightMode ? 1 : 0.5 },
            border: { color: _isLightMode ? 'rgba(15,23,42,0.3)' : 'rgba(255,255,255,0.2)' }
          },
          y: {
            beginAtZero: true,
            ticks: { color: _chartTickColor, precision: 0, font: { size: 11, weight: 'bold' } },
            grid: { color: _chartGridColor, lineWidth: _isLightMode ? 1 : 0.5 },
            border: { color: _isLightMode ? 'rgba(15,23,42,0.3)' : 'rgba(255,255,255,0.2)' }
          }
        }
      },
      plugins: [{
        id: 'canvasBg',
        beforeDraw: function(chart) {
          var ctx = chart.canvas.getContext('2d');
          ctx.save();
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = _isLightMode ? '#ffffff' : 'rgba(15,23,42,0.0)';
          ctx.fillRect(0, 0, chart.canvas.width, chart.canvas.height);
          ctx.restore();
        }
      }]
    });
    // Paksa resize setelah render agar sumbu dan bar tampil benar
    setTimeout(function() {
      if (chartInstanceCompBar) {
        chartInstanceCompBar.resize();
        chartInstanceCompBar.update('none');
      }
    }, 100);
    }; // end _doRenderBar
    // Delay sedikit agar browser sudah menghitung ukuran container
    setTimeout(_doRenderBar, 50);
  }
}

function exportHistoryCSV() {
  const logs = getLogs();
  let csvContent = "\uFEFFsep=;\nTanggal;Masuk;Pulang;Status;Lokasi\n";

  logs.forEach(l => {
    csvContent += `"${l.date}";"${l.masuk}";"${l.pulang}";"${l.status}";"${l.location}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Rekap_Presensi_${activeUser ? activeUser.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Siswa'}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportAdminRekapCSV() {
  const logs = getLogs();
  const perms = getPermissions();
  const users = getUsers();
  const rawToday = new Date().toISOString().split('T')[0];

  const guruSelectEl = document.getElementById('selectGuruFilterPDF');
  const dashSelectEl = document.getElementById('filterDashboardGuru');
  let selectedGuruName = (dashSelectEl && dashSelectEl.value) ? dashSelectEl.value : (guruSelectEl ? guruSelectEl.value : 'ALL');

  if (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin') {
    selectedGuruName = activeUser.name;
  }

  let supervisedStudents = getSupervisedStudentsOnly();
  if (selectedGuruName === 'ALL' || selectedGuruName === 'ALL_REKAP') {
    supervisedStudents = users.filter(u => u.role === 'siswa');
    supervisedStudents.sort((a, b) => (a.supervisor || '').localeCompare(b.supervisor || ''));
  } else if (selectedGuruName) {
    supervisedStudents = users.filter(u => {
      if (u.role !== 'siswa') return false;
      if (!u.supervisor) return false;
      // Exact match � tidak pakai kata pertama saja agar tidak bocor ke guru lain
      const sup  = (u.supervisor || '').trim().toLowerCase();
      const guru = (selectedGuruName || '').trim().toLowerCase();
      return sup === guru;
    });
  }

  const pdfMonthEl = document.getElementById('selectMonthFilterPDF');
  const monthFilterVal = (pdfMonthEl && pdfMonthEl.value !== 'ALL') ? pdfMonthEl.value : (document.getElementById('filterDashboardMonth')?.value || 'ALL');

  let csvContent = "\uFEFFsep=;\nTanggal;Nama Siswa;NISN;Guru Pembimbing;Lokasi PKL;Jam Masuk;Jam Pulang;Status;Keterangan\n";

  supervisedStudents.forEach(student => {
    let studentLogs = logs.filter(l => l.studentName === student.name);
    if (monthFilterVal !== 'ALL') {
      studentLogs = studentLogs.filter(l => l.date && (new Date(l.date).getMonth() + 1).toString() === monthFilterVal.toString());
    } else {
      studentLogs = studentLogs.filter(l => l.date === rawToday);
    }

    if (studentLogs.length > 0) {
      studentLogs.forEach(l => {
        csvContent += `"${l.date || rawToday}";"${student.name}";"${student.nomor_induk || ''}";"${student.supervisor || '-'}";"${student.pklLocation || ''}";"${l.masuk || '-'}";"${l.pulang || '-'}";"${l.status}";"${l.location || ''}"\n`;
      });
    } else {
      const studentPerm = perms.find(p => p.studentName === student.name && (p.startDate <= rawToday && p.endDate >= rawToday));
      let defaultStatus = 'Alpa';
      let defaultLoc = 'Tanpa Keterangan (Belum Absen)';
      if (studentPerm) {
        defaultStatus = studentPerm.type;
        defaultLoc = `Surat ${studentPerm.type}: ${studentPerm.reason}`;
      }
      csvContent += `"${rawToday}";"${student.name}";"${student.nomor_induk || ''}";"${student.supervisor || '-'}";"${student.pklLocation || ''}";"-";"-";"${defaultStatus}";"${defaultLoc}"\n`;
    }
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Rekap_Presensi_${selectedGuruName.replace(/[^a-zA-Z0-9]/g, '_')}_Bulan_${monthFilterVal}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const STORAGE_KEY_SCHOOL_SETTINGS = 'SIGAP PKL SMKN 9 Official_school_settings_v1';

// Hapus cache lama agar form selalu 100% kosong tanpa isian saat dibuka
localStorage.removeItem(STORAGE_KEY_SCHOOL_SETTINGS);

function clearPrincipalSettingsForm() {
  localStorage.removeItem(STORAGE_KEY_SCHOOL_SETTINGS);
  ['quickPrincipalName', 'quickPrincipalNip', 'quickSchoolName', 'quickCityName',
   'settingPrincipalName', 'settingPrincipalNip', 'settingSchoolName', 'settingCityName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function resetPrincipalSettingsForm() {
  clearPrincipalSettingsForm();
  showToast('Isian kolom data Kepala Sekolah berhasil direset/dikosongkan!', 'info');
}

function getSchoolSettings() {
  let settings = {
    principalName: '',
    principalNip: '',
    schoolName: '',
    cityName: '',
    wakaHumasName: '',
    wakaHumasNip: '',
    pokjaName: '',
    pokjaNip: ''
  };

  const data = localStorage.getItem(STORAGE_KEY_SCHOOL_SETTINGS);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      Object.assign(settings, parsed);
    } catch(e) {}
  }

  const sName   = document.getElementById('settingPrincipalName')  || document.getElementById('settingPrincipalName2');
  const sNip    = document.getElementById('settingPrincipalNip')   || document.getElementById('settingPrincipalNip2');
  const sSchool = document.getElementById('settingSchoolName')     || document.getElementById('settingSchoolName2');
  const sCity   = document.getElementById('settingCityName')       || document.getElementById('settingCityName2');
  const sWakaName = document.getElementById('settingWakaHumasName');
  const sWakaNip  = document.getElementById('settingWakaHumasNip');
  const sPokjaName = document.getElementById('settingPokjaName');
  const sPokjaNip  = document.getElementById('settingPokjaNip');

  const qName   = document.getElementById('quickPrincipalName');
  const qNip    = document.getElementById('quickPrincipalNip');
  const qSchool = document.getElementById('quickSchoolName');
  const qCity   = document.getElementById('quickCityName');

  if (sName && sName.value.trim()) settings.principalName = sName.value.trim();
  else if (qName && qName.value.trim()) settings.principalName = qName.value.trim();

  if (sNip && sNip.value.trim()) settings.principalNip = sNip.value.trim();
  else if (qNip && qNip.value.trim()) settings.principalNip = qNip.value.trim();

  if (sSchool && sSchool.value.trim()) settings.schoolName = sSchool.value.trim();
  else if (qSchool && qSchool.value.trim()) settings.schoolName = qSchool.value.trim();

  if (sCity && sCity.value.trim()) settings.cityName = sCity.value.trim();
  else if (qCity && qCity.value.trim()) settings.cityName = qCity.value.trim();

  if (sWakaName  && sWakaName.value.trim())  settings.wakaHumasName = sWakaName.value.trim();
  if (sWakaNip   && sWakaNip.value.trim())   settings.wakaHumasNip  = sWakaNip.value.trim();
  if (sPokjaName && sPokjaName.value.trim()) settings.pokjaName     = sPokjaName.value.trim();
  if (sPokjaNip  && sPokjaNip.value.trim())  settings.pokjaNip      = sPokjaNip.value.trim();

  return settings;
}

function autoSaveQuickPrincipalSettings() {
  const qName = document.getElementById('quickPrincipalName');
  const qNip = document.getElementById('quickPrincipalNip');
  const qSchool = document.getElementById('quickSchoolName');
  const qCity = document.getElementById('quickCityName');

  const sName = document.getElementById('settingPrincipalName');
  const sNip = document.getElementById('settingPrincipalNip');
  const sSchool = document.getElementById('settingSchoolName');
  const sCity = document.getElementById('settingCityName');

  if (qName && sName) sName.value = qName.value;
  if (qNip && sNip) sNip.value = qNip.value;
  if (qSchool && sSchool) sSchool.value = qSchool.value;
  if (qCity && sCity) sCity.value = qCity.value;

  const settings = {
    principalName: qName ? qName.value.trim() : (sName ? sName.value.trim() : ''),
    principalNip: qNip ? qNip.value.trim() : (sNip ? sNip.value.trim() : ''),
    schoolName: qSchool ? qSchool.value.trim() : (sSchool ? sSchool.value.trim() : ''),
    cityName: qCity ? qCity.value.trim() : (sCity ? sCity.value.trim() : '')
  };
  saveSchoolSettings(settings);
}

function autoSavePrincipalSettings() {
  const sName = document.getElementById('settingPrincipalName') || document.getElementById('settingPrincipalName2');
  const sNip = document.getElementById('settingPrincipalNip') || document.getElementById('settingPrincipalNip2');
  const sSchool = document.getElementById('settingSchoolName') || document.getElementById('settingSchoolName2');
  const sCity = document.getElementById('settingCityName') || document.getElementById('settingCityName2');

  const sName2 = document.getElementById('settingPrincipalName2');
  const sNip2 = document.getElementById('settingPrincipalNip2');
  const sSchool2 = document.getElementById('settingSchoolName2');
  const sCity2 = document.getElementById('settingCityName2');

  const qName = document.getElementById('quickPrincipalName');
  const qNip = document.getElementById('quickPrincipalNip');
  const qSchool = document.getElementById('quickSchoolName');
  const qCity = document.getElementById('quickCityName');

  // Sync nilai dari field yang aktif ke field lainnya
  const valName = (sName ? sName.value : '') || (qName ? qName.value : '');
  const valNip = (sNip ? sNip.value : '') || (qNip ? qNip.value : '');
  const valSchool = (sSchool ? sSchool.value : '') || (qSchool ? qSchool.value : '');
  const valCity = (sCity ? sCity.value : '') || (qCity ? qCity.value : '');

  if (qName) qName.value = valName;
  if (qNip) qNip.value = valNip;
  if (qSchool) qSchool.value = valSchool;
  if (qCity) qCity.value = valCity;

  if (sName2) sName2.value = valName;
  if (sNip2) sNip2.value = valNip;
  if (sSchool2) sSchool2.value = valSchool;
  if (sCity2) sCity2.value = valCity;

  saveSchoolSettings({
    principalName: valName.trim(),
    principalNip: valNip.trim(),
    schoolName: valSchool.trim(),
    cityName: valCity.trim(),
    wakaHumasName: (document.getElementById('settingWakaHumasName') ? document.getElementById('settingWakaHumasName').value.trim() : ''),
    wakaHumasNip:  (document.getElementById('settingWakaHumasNip')  ? document.getElementById('settingWakaHumasNip').value.trim()  : ''),
    pokjaName:     (document.getElementById('settingPokjaName')     ? document.getElementById('settingPokjaName').value.trim()     : ''),
    pokjaNip:      (document.getElementById('settingPokjaNip')      ? document.getElementById('settingPokjaNip').value.trim()      : '')
  });
}

function saveSchoolSettings(settings) {
  localStorage.setItem(STORAGE_KEY_SCHOOL_SETTINGS, JSON.stringify(settings));
}

function handleSavePrincipalSettings(e) {
  if (e) e.preventDefault();
  const settings = getSchoolSettings();
  saveSchoolSettings(settings);
  showToast('Data Kepala Sekolah & NIP berhasil disimpan dan terhubung ke Cetak Rekap PDF!', 'success');
}

function renderPrincipalSettingsForm() {
  const settings = getSchoolSettings();
  const qName = document.getElementById('quickPrincipalName');
  const qNip = document.getElementById('quickPrincipalNip');
  const qSchool = document.getElementById('quickSchoolName');
  const qCity = document.getElementById('quickCityName');

  const sName = document.getElementById('settingPrincipalName');
  const sNip = document.getElementById('settingPrincipalNip');
  const sSchool = document.getElementById('settingSchoolName');
  const sCity = document.getElementById('settingCityName');

  const sName2 = document.getElementById('settingPrincipalName2');
  const sNip2 = document.getElementById('settingPrincipalNip2');
  const sSchool2 = document.getElementById('settingSchoolName2');
  const sCity2 = document.getElementById('settingCityName2');

  if (qName) qName.value = settings.principalName || '';
  if (qNip) qNip.value = settings.principalNip || '';
  if (qSchool) qSchool.value = settings.schoolName || '';
  if (qCity) qCity.value = settings.cityName || '';

  if (sName) sName.value = settings.principalName || '';
  if (sNip) sNip.value = settings.principalNip || '';
  if (sSchool) sSchool.value = settings.schoolName || '';
  if (sCity) sCity.value = settings.cityName || '';

  if (sName2) sName2.value = settings.principalName || '';
  if (sNip2) sNip2.value = settings.principalNip || '';
  if (sSchool2) sSchool2.value = settings.schoolName || '';
  if (sCity2) sCity2.value = settings.cityName || '';

  // Populate field jabatan tambahan (Waka Humas & Pokja PKL)
  const sWakaName  = document.getElementById('settingWakaHumasName');
  const sWakaNip   = document.getElementById('settingWakaHumasNip');
  const sPokjaName = document.getElementById('settingPokjaName');
  const sPokjaNip  = document.getElementById('settingPokjaNip');
  if (sWakaName)  sWakaName.value  = settings.wakaHumasName || '';
  if (sWakaNip)   sWakaNip.value   = settings.wakaHumasNip  || '';
  if (sPokjaName) sPokjaName.value = settings.pokjaName     || '';
  if (sPokjaNip)  sPokjaNip.value  = settings.pokjaNip      || '';
}

function populateGuruFilterDropdown() {
  const selectEl = document.getElementById('selectGuruFilterPDF');
  if (!selectEl) return;

  const users = getUsers();
  const teachers = users.filter(u => u.role === 'guru' && u.username !== 'admin');

  if (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin') {
    selectEl.innerHTML = `<option value="${activeUser.name}">${activeUser.name}</option>`;
    selectEl.value = activeUser.name;
    selectEl.style.display = 'none';
  } else {
    selectEl.style.display = 'inline-block';
    const currentVal = selectEl.value;
    // Rebuild options tanpa menghilangkan onchange attribute HTML
    while (selectEl.options.length > 0) selectEl.remove(0);

    const allOpt = document.createElement('option');
    allOpt.value = 'ALL'; allOpt.text = 'All Siswa beserta pembimbing';
    selectEl.appendChild(allOpt);

    teachers.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.text = `${t.name} (Guru Pembimbing)`;
      selectEl.appendChild(opt);
    });

    // Restore nilai sebelumnya jika masih ada
    selectEl.value = currentVal && Array.from(selectEl.options).find(o => o.value === currentVal)
      ? currentVal : 'ALL';
  }
}

function populateDashboardFilterDropdown() {
  const selectEl = document.getElementById('filterDashboardGuru');
  if (!selectEl) return;

  const users = getUsers();
  const teachers = users.filter(u => u.role === 'guru' && u.username !== 'admin');
  const currentVal = selectEl.value;
  const isAdmin = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');

  let html = '';
  if (isAdmin) {
    html += `<option value="ALL">All Siswa beserta pembimbing</option>`;
    teachers.forEach(t => {
      html += `<option value="${t.name}">${t.name} (Guru Pembimbing)</option>`;
    });
    html += `<option value="CUSTOM_SELECT">-- Pilihan Nama Pembimbing --</option>`;
  } else {
    html += `<option value="ALL">-- Kelompok Bimbingan Saya --</option>`;
    html += `<option value="ALL_SCHOOL">Semua Siswa Sekolah (Master List)</option>`;
    teachers.forEach(t => {
      html += `<option value="${t.name}">${t.name}</option>`;
    });
  }

  selectEl.innerHTML = html;
  if (currentVal) selectEl.value = currentVal;
}

function onGuruFilterPDFChange(el) {
  const val = el.value;
  const dashEl = document.getElementById('filterDashboardGuru');
  if (dashEl) {
    // Pastikan option ada, tambah jika belum
    if (!Array.from(dashEl.options).find(o => o.value === val)) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.text = val;
      dashEl.appendChild(opt);
    }
    dashEl.value = val;
  }
  renderAdminDashboard();
}

function onMonthFilterPDFChange(el) {
  const dashMonthEl = document.getElementById('filterDashboardMonth');
  if (dashMonthEl) {
    dashMonthEl.value = el.value;
  }
  renderAdminDashboard();
}

// ── Helper TTD Tanda Tangan — dipakai oleh semua fungsi cetak ──────────────
// Layout:
//   Admin : Kiri=Waka Humas | Tengah=Kepala Sekolah | Kanan=Ketua Pokja PKL
//   Guru  : Kiri=Waka Humas | Tengah=Kepala Sekolah | Kanan=Guru Pembimbing
// Parameter h = tinggi spacer (px) untuk menyesuaikan ukuran halaman
function _buildTtdHtml(isAdmin, settings, cityName, printDate, teacherName, teacherNip, h) {
  h = h || 60;
  var c = cityName  || settings.cityName      || 'Malang';
  var d = printDate || '';
  var kepsekName = settings.principalName || '___________________________';
  var kepsekNip  = settings.principalNip  || '-';
  var wakaName   = settings.wakaHumasName || '___________________________';
  var wakaNip    = settings.wakaHumasNip  || '-';
  var pokjaName  = settings.pokjaName     || '___________________________';
  var pokjaNip   = settings.pokjaNip      || '-';
  var guruName   = teacherName            || '___________________________';
  var guruNip    = 'NIP. ' + (teacherNip  || '-');

  // Nama kolom kanan tergantung peran
  var rightTitle = isAdmin ? 'Ketua Pokja PKL,' : 'Guru Pembimbing PKL,';
  var rightName  = isAdmin ? pokjaName          : guruName;
  var rightNip   = 'NIP. ' + (isAdmin ? pokjaNip : (teacherNip || '-'));

  // Style bersama
  var colStyle  = 'display:flex;flex-direction:column;align-items:center;text-align:center;';
  var hdrStyle  = 'min-height:40px;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;width:100%;';
  var spacer    = '<div style="flex:1;min-height:' + h + 'px;"></div>';
  var lineStyle = 'display:inline-block;min-width:160px;border-top:1.5px solid #111;padding-top:5px;text-align:center;';

  function col(hdrHtml, name, nip) {
    return '<div style="' + colStyle + '">' +
             '<div style="' + hdrStyle + '">' + hdrHtml + '</div>' +
             spacer +
             '<div style="' + lineStyle + '">' +
               '<strong style="display:block;font-size:12px;">' + name + '</strong>' +
               '<small style="font-size:11px;color:#475569;">' + nip + '</small>' +
             '</div>' +
           '</div>';
  }

  var colKiri   = col('<p style="margin:0 0 2px;font-size:12px;">' + c + ', ' + d + '</p>' +
                       '<p style="margin:0;font-size:12px;font-weight:700;">Waka Humas,</p>',
                       wakaName, 'NIP. ' + wakaNip);

  var colTengah = col('<p style="margin:0 0 2px;font-size:12px;">Mengetahui,</p>' +
                       '<p style="margin:0;font-size:11px;color:#475569;">Kepala ' +
                       (settings.schoolName || 'SMKN 9 Malang') + ',</p>',
                       kepsekName, 'NIP. ' + kepsekNip);

  var colKanan  = col('<p style="margin:0 0 2px;font-size:12px;">' + c + ', ' + d + '</p>' +
                       '<p style="margin:0;font-size:12px;font-weight:700;">' + rightTitle + '</p>',
                       rightName, rightNip);

  // Layout 2 baris:
  //   Baris 1: Waka Humas (kiri)  |  Ketua Pokja PKL / Guru Pembimbing (kanan)
  //   Baris 2: Kepala Sekolah (tengah bawah — di antara keduanya)
  var wrapStyle = 'width:100%;margin-top:40px;page-break-inside:avoid;';
  var row1Style = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;width:100%;';
  var row2Style = 'display:flex;justify-content:center;margin-top:32px;width:100%;';

  return '<div style="' + wrapStyle + '">' +
           // Baris 1: Waka Humas | Ketua Pokja/Guru
           '<div style="' + row1Style + '">' +
             colKiri + colKanan +
           '</div>' +
           // Baris 2: Kepala Sekolah di tengah
           '<div style="' + row2Style + '">' +
             '<div style="min-width:220px;max-width:280px;">' + colTengah + '</div>' +
           '</div>' +
         '</div>';
}

function exportMonthlyAttendanceStatsPDF() {
  // Langsung cetak dari data lokal (sudah disync via polling 8 detik)
  // syncDataFromServer dihapus karena menyebabkan hang untuk data besar
  showToast('Menyiapkan laporan statistik...', 'info');
  setTimeout(function() { _doExportMonthlyAttendanceStatsPDF(); }, 50);
}

function _doExportMonthlyAttendanceStatsPDF() {
  const logs = getLogs();
  const users = getUsers();
  let supervisedStudents = getSupervisedStudentsOnly();
  const todayStr = formatDateIndo(new Date().toISOString().split('T')[0]);
  const settings = getSchoolSettings();

  const guruSelectEl = document.getElementById('selectGuruFilterPDF');
  const dashSelectEl = document.getElementById('filterDashboardGuru');
  let selectedGuruName = (dashSelectEl && dashSelectEl.value) ? dashSelectEl.value : (guruSelectEl ? guruSelectEl.value : 'ALL');

  if (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin') {
    selectedGuruName = activeUser.name;
  }

  let teacherName = activeUser ? activeUser.name : 'Gigih Perkasa, ST., M.Pd.';
  let teacherNip = activeUser ? activeUser.nomor_induk : '19841031 201101 1 008';

  if (selectedGuruName === 'ALL' || selectedGuruName === 'ALL_REKAP') {
    supervisedStudents = users.filter(u => u.role === 'siswa');
    supervisedStudents.sort((a, b) => (a.supervisor || '').localeCompare(b.supervisor || ''));
  } else if (selectedGuruName) {
    teacherName = selectedGuruName;
    const targetGuruUser = users.find(u => u.name === selectedGuruName || u.username === selectedGuruName);
    if (targetGuruUser) {
      teacherNip = targetGuruUser.nomor_induk || teacherNip;
    }
    supervisedStudents = users.filter(u => {
      if (u.role !== 'siswa') return false;
      if (!u.supervisor) return false;
      // Exact match � tidak pakai kata pertama saja agar tidak bocor ke guru lain
      const sup  = (u.supervisor || '').trim().toLowerCase();
      const guru = (selectedGuruName || '').trim().toLowerCase();
      return sup === guru;
    });
  }

  const rawToday = new Date().toISOString().split('T')[0];
  const perms = getPermissions();
  const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const pdfMonthEl = document.getElementById('selectMonthFilterPDF');
  const monthFilterVal = (pdfMonthEl && pdfMonthEl.value !== 'ALL') ? pdfMonthEl.value : (document.getElementById('filterDashboardMonth')?.value || 'ALL');
  const currentMonthNum = parseInt(monthFilterVal !== 'ALL' ? monthFilterVal : (new Date().getMonth() + 1));
  const currentMonthName = monthNames[currentMonthNum] || 'Agustus';
  const selectedMonthText = monthFilterVal !== 'ALL' ? `Bulan ${currentMonthName} ${new Date().getFullYear()}` : 'Semua Bulan / Akumulasi Realtime';

  // Save report to archive database
  const reportTitle = `Laporan Statistik Kehadiran Realtime Siswa PKL Bulan ${currentMonthName} ${new Date().getFullYear()}`;

  const reportPayload = {
    month_name: currentMonthName,
    month_num: currentMonthNum,
    year_num: new Date().getFullYear(),
    title: reportTitle,
    supervisor_filter: selectedGuruName === 'ALL' ? 'All Siswa beserta pembimbing' : selectedGuruName,
    generated_by: activeUser ? activeUser.name : 'Master Administrator',
    total_students: supervisedStudents.length
  };

  const existingLocal = JSON.parse(localStorage.getItem('absensi_monthly_reports') || '[]');
  existingLocal.unshift({ id: Date.now(), ...reportPayload, created_at: new Date().toLocaleString('id-ID') });
  localStorage.setItem('absensi_monthly_reports', JSON.stringify(existingLocal.slice(0, 50)));

  fetch('api.php?action=save_monthly_report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportPayload)
  }).then(() => renderMonthlyReportsArchive()).catch(() => renderMonthlyReportsArchive());

  let tableRows = '';
  let currentGroupSupervisor = '';
  let totalHadirAll = 0, totalIzinAll = 0, totalSakitAll = 0, totalAlpaAll = 0;

  let supervisorStatsMap = {};

  supervisedStudents.forEach((student, index) => {
    const supName = student.supervisor || 'Tanpa Pembimbing';
    if (!supervisorStatsMap[supName]) {
      supervisorStatsMap[supName] = { hadir: 0, izin: 0, sakit: 0, alpa: 0, studentCount: 0 };
    }

    if ((selectedGuruName === 'ALL' || selectedGuruName === 'ALL_REKAP') && student.supervisor !== currentGroupSupervisor) {
      currentGroupSupervisor = student.supervisor;
      tableRows += `
        <tr style="background:#e0e7ff;">
          <td colspan="9" style="padding:8px 12px; border:1px solid #333; font-weight:bold; color:#3730a3; font-size:12px;">
            <i class="fa-solid fa-user-tie"></i> KELOMPOK PEMBIMBING: ${currentGroupSupervisor || 'Tanpa Pembimbing'}
          </td>
        </tr>
      `;
    }

    let studentLogs = logs.filter(l => l.studentName === student.name);
    let studentPerms = perms.filter(p => p.studentName === student.name && p.status === 'Disetujui');

    // Filter bulan: jika bulan dipilih, filter ke bulan itu; jika ALL = akumulatif semua bulan
    const activeTargetMonth = (monthFilterVal && monthFilterVal !== 'ALL') ? monthFilterVal.toString() : null;
    if (activeTargetMonth) {
      studentLogs = studentLogs.filter(l => l.date && (new Date(l.date).getMonth() + 1).toString() === activeTargetMonth);
      studentPerms = studentPerms.filter(p => p.startDate && (new Date(p.startDate).getMonth() + 1).toString() === activeTargetMonth);
    }

    let hadirCount = 0, izinCount = 0, sakitCount = 0, alpaCount = 0;
    const _hadirDates = new Set(); // deduplikasi per tanggal
    studentLogs.forEach(l => {
      const st = (l.status||'').toLowerCase();
      if (st.includes('hadir') || st.includes('pengantaran') || st.includes('monitoring') || st.includes('penjemputan')) {
        if (!_hadirDates.has(l.date)) { _hadirDates.add(l.date); hadirCount++; }
      } else if (l.status === 'Izin') { izinCount++; }
      else if (l.status === 'Sakit') { sakitCount++; }
      else if (l.status === 'Alpa') { alpaCount++; }
    });
    izinCount += studentPerms.filter(p => p.type === 'Izin').length;
    sakitCount += studentPerms.filter(p => p.type === 'Sakit').length;

    totalHadirAll += hadirCount;
    totalIzinAll += izinCount;
    totalSakitAll += sakitCount;
    totalAlpaAll += alpaCount;

    supervisorStatsMap[supName].hadir += hadirCount;
    supervisorStatsMap[supName].izin += izinCount;
    supervisorStatsMap[supName].sakit += sakitCount;
    supervisorStatsMap[supName].alpa += alpaCount;
    supervisorStatsMap[supName].studentCount += 1;

    const totalDaysCount = Math.max(hadirCount + izinCount + sakitCount + alpaCount, 1);
    const percentage = Math.round((hadirCount / totalDaysCount) * 100);

    let predikatColor = '#047857';
    if (percentage < 75) predikatColor = '#b91c1c';
    else if (percentage < 85) predikatColor = '#d97706';
    else if (percentage < 95) predikatColor = '#0284c7';

    tableRows += `
      <tr>
        <td style="text-align:center; padding:8px; border:1px solid #333;">${index + 1}</td>
        <td style="padding:8px; border:1px solid #333;"><strong>${student.name}</strong><br><small style="color:#555;">NISN: ${student.nomor_induk}</small></td>
        <td style="padding:8px; border:1px solid #333;">${student.supervisor || '-'}</td>
        <td style="padding:8px; border:1px solid #333;">${student.pklLocation || 'PT. Tech Solution'}</td>
        <td style="text-align:center; padding:8px; border:1px solid #333; color:#047857; font-weight:bold;">${hadirCount} Hari</td>
        <td style="text-align:center; padding:8px; border:1px solid #333; color:#0284c7; font-weight:bold;">${izinCount} Hari</td>
        <td style="text-align:center; padding:8px; border:1px solid #333; color:#d97706; font-weight:bold;">${sakitCount} Hari</td>
        <td style="text-align:center; padding:8px; border:1px solid #333; color:#b91c1c; font-weight:bold;">${alpaCount} Hari</td>
        <td style="text-align:center; padding:8px; border:1px solid #333; font-weight:bold; font-size:12px; color:${predikatColor};">${percentage}%</td>
      </tr>
    `;
  });

  const supNames = Object.keys(supervisorStatsMap);
  const supHadir = supNames.map(n => supervisorStatsMap[n].hadir);
  const supIzin = supNames.map(n => supervisorStatsMap[n].izin);
  const supSakit = supNames.map(n => supervisorStatsMap[n].sakit);
  const supAlpa = supNames.map(n => supervisorStatsMap[n].alpa);

  const isAdminPrintAll = (activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin')) && (selectedGuruName === 'ALL' || selectedGuruName === 'ALL_REKAP');

  // TTD 3-kolom: Waka Humas | Kepala Sekolah | Ketua Pokja PKL (admin) / Guru Pembimbing (guru)
  var ttdStr55 = _buildTtdHtml(isAdminPrintAll, settings, settings.cityName || "Malang", todayStr, teacherName, teacherNip, 55);
  var ttdStr50 = _buildTtdHtml(isAdminPrintAll, settings, settings.cityName || "Malang", todayStr, teacherName, teacherNip, 50);


  const _pdfStatsHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Statistik Kehadiran Realtime - ${settings.schoolName || 'SMK NEGERI 9 MALANG'}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 25px; line-height: 1.4; }
        .kop-container { display: flex; align-items: center; border-bottom: 3px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
        .logo-box { width: 90px; text-align: left; flex-shrink: 0; }
        .logo-box img { width: 75px; height: auto; }
        .header-text { flex: 1; text-align: center; margin-right: 40px; }
        .header-text h3 { margin: 0; font-size: 14px; font-weight: normal; text-transform: uppercase; letter-spacing: 0.5px; }
        .header-text h2 { margin: 2px 0; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .header-text p { margin: 2px 0; font-size: 10px; color: #111; }
        .meta-box { margin-bottom: 15px; }
        .meta-box table { width: 100%; font-size: 11px; }
        .meta-box td { padding: 3px 0; }
        .summary-cards { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 15px; }
        .summary-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; text-align: center; background: #f8fafc; }
        .summary-card strong { display: block; font-size: 14px; color: #1e293b; }
        .summary-card span { font-size: 10px; color: #64748b; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.data-table th { background-color: #4f46e5; color: #ffffff; padding: 8px; border: 1px solid #333; font-size: 11px; text-transform: uppercase; }
        .footer-sign { margin-top: 40px; width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; align-items: stretch; }
        .sign-box { text-align: center; display: flex; flex-direction: column; align-items: center; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="kop-container">
        <div class="logo-box">
          <img src="data:image/png;base64,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" alt="Logo Resmi Pemerintah Provinsi Jawa Timur" 
               style="width:85px; height:auto; display:block; margin:0 auto;">
        </div>
        <div class="header-text">
          <h3>PEMERINTAH PROVINSI JAWA TIMUR</h3>
          <h3>DINAS PENDIDIKAN</h3>
          <h2>${settings.schoolName || 'SMK NEGERI 9 MALANG'}</h2>
          <p>Jalan Sampurna Nomor 1, Cemorokandang, Kedungkandang, Malang, 65138</p>
          <p>Telepon 0341727998, Laman <a href="https://smkn9malang.sch.id/" style="color:#0284c7; text-decoration:underline;">https://smkn9malang.sch.id/</a>, Pos-el <a href="mailto:surat@smkn9malang.sch.id" style="color:#0284c7; text-decoration:underline;">surat@smkn9malang.sch.id</a></p>
        </div>
      </div>

      <div style="text-align:center; margin-bottom:15px;">
        <h3 style="margin:0; font-size:13px; text-decoration:underline; font-weight:bold;">LAPORAN STATISTIK KEHADIRAN REALTIME SISWA PKL TIAP BULAN</h3>
      </div>

      <div class="meta-box">
        <table>
          <tr>
            <td width="160"><strong>Instansi / Sekolah</strong></td>
            <td width="10">:</td>
            <td>${settings.schoolName || 'SMK NEGERI 9 MALANG'}</td>
          </tr>
          <tr>
            <td><strong>Pembimbing / Skala Laporan</strong></td>
            <td>:</td>
            <td>${isAdminPrintAll ? 'Seluruh Guru Pembimbing (All Kelompok)' : teacherName}</td>
          </tr>
          <tr>
            <td><strong>Periode Statistik Bulanan</strong></td>
            <td>:</td>
            <td><strong>${selectedMonthText}</strong></td>
          </tr>
          <tr>
            <td><strong>Tanggal Cetak Laporan</strong></td>
            <td>:</td>
            <td>${todayStr}</td>
          </tr>
          <tr>
            <td><strong>Total Siswa Terdaftar</strong></td>
            <td>:</td>
            <td>${supervisedStudents.length} Siswa PKL</td>
          </tr>
        </table>
      </div>

      <div class="summary-cards">
        <div class="summary-card">
          <strong>${supervisedStudents.length} Siswa</strong>
          <span>Total Bimbingan</span>
        </div>
        <div class="summary-card">
          <strong style="color:#047857;">${totalHadirAll} Record</strong>
          <span>Total Hadir</span>
        </div>
        <div class="summary-card">
          <strong style="color:#0284c7;">${totalIzinAll} Record</strong>
          <span>Total Izin</span>
        </div>
        <div class="summary-card">
          <strong style="color:#d97706;">${totalSakitAll} Record</strong>
          <span>Total Sakit</span>
        </div>
        <div class="summary-card">
          <strong style="color:#b91c1c;">${totalAlpaAll} Record</strong>
          <span>Total Alpa</span>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th width="30">No</th>
            <th>Nama Siswa / NISN</th>
            <th>Guru Pembimbing</th>
            <th>Lokasi PKL / Industri</th>
            <th width="75">Total Hadir</th>
            <th width="75">Total Izin</th>
            <th width="75">Total Sakit</th>
            <th width="75">Total Alpa</th>
            <th width="90">Persentase (%)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      ${ttdStr55}

      <!-- HALAMAN TERAKHIR: GRAFIK REKAPITULASI STATISTIK KEHADIRAN SISWA PER GURU PEMBIMBING -->
      <div style="page-break-before: always; padding-top: 20px;">
        <div class="kop-container">
          <div class="logo-box">
            <img src="data:image/png;base64,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" alt="Logo Resmi" style="width:75px; height:auto; display:block; margin:0 auto;">
          </div>
          <div class="header-text">
            <h3>PEMERINTAH PROVINSI JAWA TIMUR - DINAS PENDIDIKAN</h3>
            <h2>${settings.schoolName || 'SMK NEGERI 9 MALANG'}</h2>
            <p>LAPORAN VISUAL GRAFIK STATISTIK PER GURU PEMBIMBING SISWA PKL</p>
          </div>
        </div>

        <div style="text-align:center; margin-bottom:20px;">
          <h3 style="margin:0; font-size:14px; text-decoration:underline; font-weight:bold;">GRAFIK KOMPARASI KEHADIRAN SISWA MASING-MASING GURU PEMBIMBING</h3>
          <p style="margin:4px 0 0 0; font-size:11px; color:#555;">Periode: ${selectedMonthText} � Tipe Cetak: Master Administrator (All Kelompok Pembimbing)</p>
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; margin-top:15px;">
          <!-- Canvas 1: Doughnut Chart Status Kehadiran Overall -->
          <div style="width: 85%; max-width: 550px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align:center;">
            <h4 style="margin:0 0 10px 0; font-size:12px; color:#1e293b;">1. Grafik Persentase Total Akumulasi Kehadiran (Seluruh Siswa)</h4>
            <canvas id="pdfDoughnutChart" style="max-height: 220px;"></canvas>
          </div>

          <!-- Canvas 2: Grouped Bar Chart Masing-Masing Guru Pembimbing -->
          <div style="width: 95%; max-width: 780px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align:center;">
            <h4 style="margin:0 0 10px 0; font-size:12px; color:#1e293b;">2. Grafik Komparasi Rekapitulasi Presensi per Masing-Masing Guru Pembimbing</h4>
            <canvas id="pdfBarChart" style="max-height: 240px;"></canvas>
          </div>
        </div>

        ${ttdStr50}
      </div>

      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script>
        window.onload = function() {
          try {
            // Render Overall Doughnut Chart
            const ctxDoughnut = document.getElementById('pdfDoughnutChart').getContext('2d');
            new Chart(ctxDoughnut, {
              type: 'doughnut',
              data: {
                labels: ['Hadir (${totalHadirAll})', 'Izin (${totalIzinAll})', 'Sakit (${totalSakitAll})', 'Alpa (${totalAlpaAll})'],
                datasets: [{
                  data: [${totalHadirAll}, ${totalIzinAll}, ${totalSakitAll}, ${totalAlpaAll}],
                  backgroundColor: ['#10b981', '#0284c7', '#f59e0b', '#ef4444'],
                  borderWidth: 2
                }]
              },
              options: {
                responsive: true,
                animation: false,
                plugins: {
                  legend: { position: 'bottom' }
                }
              }
            });

            // Render Per-Supervisor Grouped Bar Chart
            const ctxBar = document.getElementById('pdfBarChart').getContext('2d');
            new Chart(ctxBar, {
              type: 'bar',
              data: {
                labels: ${JSON.stringify(supNames)},
                datasets: [
                  { label: 'Hadir (Hari)', data: ${JSON.stringify(supHadir)}, backgroundColor: '#10b981', borderRadius: 4 },
                  { label: 'Izin (Hari)', data: ${JSON.stringify(supIzin)}, backgroundColor: '#0284c7', borderRadius: 4 },
                  { label: 'Sakit (Hari)', data: ${JSON.stringify(supSakit)}, backgroundColor: '#f59e0b', borderRadius: 4 },
                  { label: 'Alpa (Hari)', data: ${JSON.stringify(supAlpa)}, backgroundColor: '#ef4444', borderRadius: 4 }
                ]
              },
              options: {
                responsive: true,
                animation: false,
                plugins: {
                  legend: { position: 'top' }
                },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } }
                }
              }
            });
          } catch(e) {
            console.error('Chart render error:', e);
          }

          setTimeout(function() {
            window.print();
          }, 650);
        };
      </script>
    </body>
    </html>
  `;
  _printAsPDF(_pdfStatsHtml, `SIGAP_Statistik_${new Date().toISOString().split('T')[0]}.pdf`);
}

function exportAdminRekapPDF() {
  // Langsung cetak dari data lokal (sudah disync via polling 8 detik)
  showToast('Menyiapkan laporan rekap...', 'info');
  setTimeout(function() { _doExportAdminRekapPDF(); }, 50);
}

function _doExportAdminRekapPDF() {
  const logs = getLogs();
  const users = getUsers();
  let supervisedStudents = getSupervisedStudentsOnly();
  const todayStr = formatDateIndo(new Date().toISOString().split('T')[0]);
  const settings = getSchoolSettings();

  const guruSelectEl = document.getElementById('selectGuruFilterPDF');
  const dashSelectEl = document.getElementById('filterDashboardGuru');
  let selectedGuruName = (dashSelectEl && dashSelectEl.value) ? dashSelectEl.value : (guruSelectEl ? guruSelectEl.value : 'ALL');

  if (activeUser && activeUser.role === 'guru' && activeUser.username !== 'admin') {
    selectedGuruName = activeUser.name;
  }

  let teacherName = activeUser ? activeUser.name : 'Gigih Perkasa, ST., M.Pd.';
  let teacherNip = activeUser ? activeUser.nomor_induk : '19841031 201101 1 008';

  if (selectedGuruName === 'ALL' || selectedGuruName === 'ALL_REKAP') {
    supervisedStudents = users.filter(u => u.role === 'siswa');
    supervisedStudents.sort((a, b) => (a.supervisor || '').localeCompare(b.supervisor || ''));
  } else if (selectedGuruName) {
    teacherName = selectedGuruName;
    const targetGuruUser = users.find(u => u.name === selectedGuruName || u.username === selectedGuruName);
    if (targetGuruUser) {
      teacherNip = targetGuruUser.nomor_induk || teacherNip;
    }
    supervisedStudents = users.filter(u => {
      if (u.role !== 'siswa') return false;
      if (!u.supervisor) return false;
      // Exact match � tidak pakai kata pertama saja agar tidak bocor ke guru lain
      const sup  = (u.supervisor || '').trim().toLowerCase();
      const guru = (selectedGuruName || '').trim().toLowerCase();
      return sup === guru;
    });
  }

  const rawToday = new Date().toISOString().split('T')[0];
  const perms = getPermissions();
  const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const pdfMonthEl = document.getElementById('selectMonthFilterPDF');
  const monthFilterVal = (pdfMonthEl && pdfMonthEl.value !== 'ALL') ? pdfMonthEl.value : (document.getElementById('filterDashboardMonth')?.value || 'ALL');
  const selectedMonthText = monthFilterVal !== 'ALL' ? monthNames[parseInt(monthFilterVal)] : 'Semua Bulan / Hari Ini';

  // ── Pre-index logs dan perms agar loop O(n) bukan O(n²) ──────────────────
  // Filter bulan: jika dipilih → filter; jika ALL → akumulatif semua bulan (sinkron dengan Cetak Lengkap)
  const activeTargetMonth = (monthFilterVal && monthFilterVal !== 'ALL')
    ? monthFilterVal.toString()
    : null; // null = tidak filter, tampilkan semua bulan

  const _rekLogsIndex = {};
  logs.forEach(function(l) {
    if (!l.studentName) return;
    // Filter bulan: jika activeTargetMonth null = akumulatif semua bulan
    if (activeTargetMonth && l.date) {
      var m = l.date.substring(5, 7); // 'YYYY-MM-DD' → ambil MM tanpa new Date()
      if (parseInt(m).toString() !== activeTargetMonth) return;
    }
    if (!_rekLogsIndex[l.studentName]) _rekLogsIndex[l.studentName] = [];
    _rekLogsIndex[l.studentName].push(l);
  });

  const _rekPermsIndex = {};
  perms.forEach(function(p) {
    if (!p.studentName) return;
    if (!_rekPermsIndex[p.studentName]) _rekPermsIndex[p.studentName] = [];
    _rekPermsIndex[p.studentName].push(p);
  });

  // Save report to archive database
  const currentMonthNum = parseInt(monthFilterVal !== 'ALL' ? monthFilterVal : (new Date().getMonth() + 1));
  const currentMonthName = monthNames[currentMonthNum] || 'Agustus';
  const reportTitle = `Laporan Rekapitulasi Presensi PKL Bulan ${currentMonthName} ${new Date().getFullYear()}`;

  const reportPayload = {
    month_name: currentMonthName,
    month_num: currentMonthNum,
    year_num: new Date().getFullYear(),
    title: reportTitle,
    supervisor_filter: selectedGuruName === 'ALL' ? 'All Siswa beserta pembimbing' : selectedGuruName,
    generated_by: activeUser ? activeUser.name : 'Master Administrator',
    total_students: supervisedStudents.length
  };

  const existingLocal = JSON.parse(localStorage.getItem('absensi_monthly_reports') || '[]');
  existingLocal.unshift({ id: Date.now(), ...reportPayload, created_at: new Date().toLocaleString('id-ID') });
  localStorage.setItem('absensi_monthly_reports', JSON.stringify(existingLocal.slice(0, 50)));

  fetch('api.php?action=save_monthly_report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportPayload)
  }).then(() => renderMonthlyReportsArchive()).catch(e => renderMonthlyReportsArchive());

  let tableRows = '';
  let currentGroupSupervisor = '';
  let rowNo = 0; // nomor urut baris (increment per log, bukan per siswa)
  let rekTotalHadir = 0, rekTotalIzin = 0, rekTotalSakit = 0, rekTotalAlpa = 0;

  supervisedStudents.forEach((student, index) => {
    if ((selectedGuruName === 'ALL' || selectedGuruName === 'ALL_REKAP') && student.supervisor !== currentGroupSupervisor) {
      currentGroupSupervisor = student.supervisor;
      tableRows += `
        <tr style="background:#e0e7ff;">
          <td colspan="8" style="padding:8px 12px; border:1px solid #333; font-weight:bold; color:#3730a3; font-size:12px;">
            <i class="fa-solid fa-user-tie"></i> KELOMPOK PEMBIMBING: ${currentGroupSupervisor || 'Tanpa Pembimbing'}
          </td>
        </tr>
      `;
    }

    let studentLogs = _rekLogsIndex[student.name] || [];
    // Urutkan log ascending (tanggal terlama dulu)
    studentLogs = studentLogs.slice().sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });

    if (studentLogs.length > 0) {
      const _rekHadirDates = new Set(); // deduplikasi hadir per tanggal
      studentLogs.forEach(l => {
        rowNo++;
        let statusStyle = 'color:#b91c1c; font-weight:bold;';
        if (l.status.includes('Hadir') || l.status.includes('Pengantaran') || l.status.includes('Monitoring') || l.status.includes('Penjemputan')) {
          statusStyle = 'color:#047857; font-weight:bold;';
          if (!_rekHadirDates.has(l.date)) { _rekHadirDates.add(l.date); rekTotalHadir++; }
        } else if (l.status === 'Izin') {
          statusStyle = 'color:#0284c7; font-weight:bold;';
          rekTotalIzin++;
        } else if (l.status === 'Sakit') {
          statusStyle = 'color:#d97706; font-weight:bold;';
          rekTotalSakit++;
        } else if (l.status === 'Alpa') {
          rekTotalAlpa++;
        }
        tableRows += `
          <tr>
            <td style="text-align:center; padding:8px; border:1px solid #333;">${rowNo}</td>
            <td style="padding:8px; border:1px solid #333;">${formatDateIndo(l.date || rawToday)}</td>
            <td style="padding:8px; border:1px solid #333;"><strong>${student.name}</strong><br><small style="color:#555;">NISN: ${student.nomor_induk}</small></td>
            <td style="padding:8px; border:1px solid #333;">${student.supervisor || '-'}</td>
            <td style="padding:8px; border:1px solid #333;">${student.pklLocation || 'PT. Tech Solution'}</td>
            <td style="text-align:center; padding:8px; border:1px solid #333;">${l.masuk || '-'}</td>
            <td style="text-align:center; padding:8px; border:1px solid #333;">${l.pulang || '-'}</td>
            <td style="text-align:center; padding:8px; border:1px solid #333; ${statusStyle}">${l.status}</td>
          </tr>
        `;
      });
    } else {
      rowNo++;
      const studentPerm = (_rekPermsIndex[student.name] || []).find(p => p.startDate <= rawToday && p.endDate >= rawToday);
      let defaultStatus = 'Alpa';
      if (studentPerm) defaultStatus = studentPerm.type;
      let statusStyle = 'color:#b91c1c; font-weight:bold;';
      if (defaultStatus === 'Izin') statusStyle = 'color:#0284c7; font-weight:bold;';
      if (defaultStatus === 'Sakit') statusStyle = 'color:#d97706; font-weight:bold;';

      tableRows += `
        <tr>
          <td style="text-align:center; padding:8px; border:1px solid #333;">${rowNo}</td>
          <td style="padding:8px; border:1px solid #333;">${formatDateIndo(rawToday)}</td>
          <td style="padding:8px; border:1px solid #333;"><strong>${student.name}</strong><br><small style="color:#555;">NISN: ${student.nomor_induk}</small></td>
          <td style="padding:8px; border:1px solid #333;">${student.supervisor || '-'}</td>
          <td style="padding:8px; border:1px solid #333;">${student.pklLocation || 'PT. Tech Solution'}</td>
          <td style="text-align:center; padding:8px; border:1px solid #333;">-</td>
          <td style="text-align:center; padding:8px; border:1px solid #333;">-</td>
          <td style="text-align:center; padding:8px; border:1px solid #333; ${statusStyle}">${defaultStatus}</td>
        </tr>
      `;
    }
  });

  const isAdminPrintAll = (activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin')) && (selectedGuruName === 'ALL' || selectedGuruName === 'ALL_REKAP');


  // TTD 3-kolom: Waka Humas | Kepala Sekolah | Ketua Pokja PKL (admin) / Guru Pembimbing (guru)
  var ttdStr55 = _buildTtdHtml(isAdminPrintAll, settings, settings.cityName || "Malang", todayStr, teacherName, teacherNip, 55);
  var ttdStr50 = _buildTtdHtml(isAdminPrintAll, settings, settings.cityName || "Malang", todayStr, teacherName, teacherNip, 50);


  const _pdfRekapHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Rekapitulasi Presensi PKL - ${settings.schoolName || 'SMK NEGERI 9 MALANG'}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 25px; line-height: 1.4; }
        .kop-container { display: flex; align-items: center; border-bottom: 3px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
        .logo-box { width: 90px; text-align: left; flex-shrink: 0; }
        .logo-box img { width: 75px; height: auto; }
        .header-text { flex: 1; text-align: center; margin-right: 40px; }
        .header-text h3 { margin: 0; font-size: 14px; font-weight: normal; text-transform: uppercase; letter-spacing: 0.5px; }
        .header-text h2 { margin: 2px 0; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .header-text p { margin: 2px 0; font-size: 10px; color: #111; }
        .meta-box { margin-bottom: 15px; }
        .meta-box table { width: 100%; font-size: 11px; }
        .meta-box td { padding: 3px 0; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.data-table th { background-color: #f1f5f9; padding: 8px; border: 1px solid #333; font-size: 11px; text-transform: uppercase; }
        .footer-sign { margin-top: 40px; width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; align-items: stretch; }
        .sign-box { text-align: center; display: flex; flex-direction: column; align-items: center; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="kop-container">
        <div class="logo-box">
          <img src="data:image/png;base64,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" alt="Logo Resmi Pemerintah Provinsi Jawa Timur" 
               style="width:85px; height:auto; display:block; margin:0 auto;">
        </div>
        <div class="header-text">
          <h3>PEMERINTAH PROVINSI JAWA TIMUR</h3>
          <h3>DINAS PENDIDIKAN</h3>
          <h2>${settings.schoolName || 'SMK NEGERI 9 MALANG'}</h2>
          <p>Jalan Sampurna Nomor 1, Cemorokandang, Kedungkandang, Malang, 65138</p>
          <p>Telepon 0341727998, Laman <a href="https://smkn9malang.sch.id/" style="color:#0284c7; text-decoration:underline;">https://smkn9malang.sch.id/</a>, Pos-el <a href="mailto:surat@smkn9malang.sch.id" style="color:#0284c7; text-decoration:underline;">surat@smkn9malang.sch.id</a></p>
        </div>
      </div>

      <div style="text-align:center; margin-bottom:15px;">
        <h3 style="margin:0; font-size:13px; text-decoration:underline; font-weight:bold;">LAPORAN REKAPITULASI PRESENSI PKL SISWA</h3>
      </div>

      <div class="meta-box">
        <table>
          <tr>
            <td width="160"><strong>Instansi / Sekolah</strong></td>
            <td width="10">:</td>
            <td>${settings.schoolName || 'SMK NEGERI 9 MALANG'}</td>
          </tr>
          <tr>
            <td><strong>Pembimbing / Cetak Oleh</strong></td>
            <td>:</td>
            <td>${isAdminPrintAll ? 'Seluruh Guru Pembimbing / Master Admin' : teacherName}</td>
          </tr>
          <tr>
            <td><strong>NIP / Identity</strong></td>
            <td>:</td>
            <td>${isAdminPrintAll ? '-' : teacherNip}</td>
          </tr>
          <tr>
            <td><strong>Periode Laporan Bulanan</strong></td>
            <td>:</td>
            <td><strong>${selectedMonthText}</strong></td>
          </tr>
          <tr>
            <td><strong>Tanggal Cetak Laporan</strong></td>
            <td>:</td>
            <td>${todayStr}</td>
          </tr>
          <tr>
            <td><strong>Total Siswa Bimbingan</strong></td>
            <td>:</td>
            <td>${supervisedStudents.length} Siswa</td>
          </tr>
        </table>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th width="30">No</th>
            <th width="90">Tanggal</th>
            <th>Nama Siswa / NISN</th>
            <th>Guru Pembimbing</th>
            <th>Lokasi PKL / Industri</th>
            <th width="65">Masuk</th>
            <th width="65">Pulang</th>
            <th width="85">Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      ${ttdStr55}

      <!-- HALAMAN TERAKHIR: GRAFIK REKAPITULASI STATISTIK KEHADIRAN SISWA -->
      <div style="page-break-before: always; padding-top: 20px;">
        <div class="kop-container">
          <div class="logo-box">
            <img src="data:image/png;base64,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" alt="Logo Resmi" style="width:75px; height:auto; display:block; margin:0 auto;">
          </div>
          <div class="header-text">
            <h3>PEMERINTAH PROVINSI JAWA TIMUR - DINAS PENDIDIKAN</h3>
            <h2>${settings.schoolName || 'SMK NEGERI 9 MALANG'}</h2>
            <p>LAPORAN VISUAL GRAFIK REKAPITULASI & STATISTIK KEHADIRAN SISWA PKL</p>
          </div>
        </div>

        <div style="text-align:center; margin-bottom:20px;">
          <h3 style="margin:0; font-size:14px; text-decoration:underline; font-weight:bold;">GRAFIK REKAPITULASI PRESENSI REALTIME SISWA PKL</h3>
          <p style="margin:4px 0 0 0; font-size:11px; color:#555;">Periode: ${selectedMonthText} � Pembimbing: ${isAdminPrintAll ? 'Seluruh Guru Pembimbing (All Kelompok)' : teacherName}</p>
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; margin-top:15px;">
          <!-- Canvas 1: Doughnut Chart Status Kehadiran -->
          <div style="width: 85%; max-width: 550px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align:center;">
            <h4 style="margin:0 0 10px 0; font-size:12px; color:#1e293b;">1. Grafik Persentase Status Kehadiran (Hadir, Izin, Sakit, Alpa)</h4>
            <canvas id="pdfDoughnutChartAdmin" style="max-height: 230px;"></canvas>
          </div>
        </div>

        ${ttdStr50}
      </div>

      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script>
        window.onload = function() {
          try {
            const ctxDoughnut = document.getElementById('pdfDoughnutChartAdmin').getContext('2d');
            new Chart(ctxDoughnut, {
              type: 'doughnut',
              data: {
                labels: ['Hadir', 'Izin', 'Sakit', 'Alpa'],
                datasets: [{
                  data: [${rekTotalHadir}, ${rekTotalIzin}, ${rekTotalSakit}, ${rekTotalAlpa}],
                  backgroundColor: ['#10b981', '#0284c7', '#f59e0b', '#ef4444'],
                  borderWidth: 2
                }]
              },
              options: {
                responsive: true,
                animation: false,
                plugins: {
                  legend: { position: 'bottom' }
                }
              }
            });
          } catch(e) {}

          setTimeout(function() {
            window.print();
          }, 650);
        };
      </script>
    </body>
    </html>
  `;
  _printAsPDF(_pdfRekapHtml, `SIGAP_Rekap_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Bersihkan HTML agar kompatibel dengan mPDF � pertahankan layout tabel
function _cleanHtmlForPDF(html) {
  // Ambil hanya isi body
  var bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  var body = bodyMatch ? bodyMatch[1] : html;

  // CSS minimal yang diperlukan mPDF untuk layout yang benar
  var css = '<style>' +
    'body{font-family:Arial,sans-serif;font-size:10pt;color:#000;background:#fff;margin:0;padding:0}' +
    'h1,h2{font-size:13pt;font-weight:bold;text-align:center;margin:6px 0}' +
    'h3,h4{font-size:11pt;font-weight:bold;margin:4px 0}' +
    'p,td,th,li{font-size:9.5pt;color:#000;margin:2px 0}' +
    'table{width:100%;border-collapse:collapse;margin:6px 0;page-break-inside:auto}' +
    'tr{page-break-inside:avoid}' +
    'td,th{border:1px solid #555;padding:3px 5px;font-size:9pt;vertical-align:top}' +
    'th{background-color:#4f46e5;color:#fff;font-weight:bold;text-align:center}' +
    'img{max-width:70px;max-height:70px}' +
    '.header-section{text-align:center;margin-bottom:10px}' +
    'hr{border:1px solid #000;margin:8px 0}' +
    '.signature-area{margin-top:20px;display:table;width:100%}' +
    '.sig-left{display:table-cell;width:50%;vertical-align:top}' +
    '.sig-right{display:table-cell;width:50%;vertical-align:top;text-align:right}' +
    '</style>';

  var clean = body
    // Hapus semua script
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    // Hapus link CDN external
    .replace(/<link[^>]*(googleapis|cdnjs|unpkg|cloudflare|jsdelivr)[^>]*>/gi, '')
    // Hapus tombol print
    .replace(/<div[^>]*id="_autoPrintBar"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*id="_ptb"[^>]*>[\s\S]*?<\/div>/gi, '')
    // Hapus gambar base64 besar (>500 chars) � ganti dengan placeholder
    .replace(/<img([^>]*?)src="data:[^"]{500,}"([^>]*)>/gi, '<img$1src=""$2>')
    // Bersihkan inline style yang menyebabkan background gelap
    .replace(/background(-color)?\s*:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|linear-gradient[^;]+|radial-gradient[^;]+)\s*;?/gi, function(m, p1, color) {
      // Pertahankan warna terang, ganti warna gelap
      var hex = color.replace('#','');
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      var r = parseInt(hex.substr(0,2),16)||0;
      if (r < 100) return 'background:#fff;';
      return m;
    })
    // Hapus class yang berisi komponen UI
    .replace(/\s*class="[^"]*(?:card|btn|badge|nav|modal|toast|overlay|tab-page|spinner)[^"]*"/gi, '');

  return '<!DOCTYPE html><html><head><meta charset="utf-8">' + css + '</head><body>' + clean + '</body></html>';
}

// Helper cetak PDF — tampilkan modal preview + tombol Save PDF
// Browser: print dari tab baru; APK: upload ke server, buka via Capacitor Browser
function _printAsPDF(htmlContent, fileName) {
  var title = (fileName || 'SIGAP_Rekap').replace('.pdf', '');

  // Hapus modal lama jika ada
  var oldModal = document.getElementById('_pdfModal');
  if (oldModal) oldModal.remove();

  // Inject print CSS ke konten
  var printReady = htmlContent
    .replace(/<title>[^<]*<\/title>/i, '<title>' + title + '</title>')
    .replace('</head>',
      '<style>@media print{@page{size:A4;margin:1cm}' +
      'body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}' +
      '.no-print,.btn-print,.btn-act,#_autoPrintBar{display:none!important}}' +
      '</style></head>');

  // Buat modal fullscreen
  var modal = document.createElement('div');
  modal.id = '_pdfModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#0f172a;display:flex;flex-direction:column;' +
    'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);';

  // Toolbar
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 16px;background:#0f172a;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.12);';

  var btnBack = document.createElement('button');
  btnBack.innerHTML = '&#8592; Kembali';
  btnBack.style.cssText = 'padding:10px 16px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;cursor:pointer;font-size:0.9rem;font-weight:600;flex-shrink:0;min-height:44px;';

  var titleEl = document.createElement('span');
  titleEl.textContent = title;
  titleEl.style.cssText = 'flex:1;color:#e2e8f0;font-weight:700;font-size:0.78rem;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 4px;';

  var btnSave = document.createElement('button');
  btnSave.innerHTML = '&#128190; Simpan PDF';
  btnSave.style.cssText = 'padding:10px 14px;background:linear-gradient(135deg,#4f46e5,#3b82f6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:700;flex-shrink:0;min-height:44px;';

  bar.appendChild(btnBack);
  bar.appendChild(titleEl);
  bar.appendChild(btnSave);

  // iframe preview
  var frame = document.createElement('iframe');
  frame.style.cssText = 'flex:1;width:100%;border:none;background:#fff;';

  modal.appendChild(bar);
  modal.appendChild(frame);
  document.body.appendChild(modal);

  // Tombol kembali
  btnBack.addEventListener('click', function() {
    var m = document.getElementById('_pdfModal');
    if (m) m.remove();
  });

  // Tombol Simpan PDF
  btnSave.addEventListener('click', function() {
    _savePdfFromModal(printReady, title, fileName || 'laporan.pdf', btnSave);
  });

  // Load konten ke iframe
  requestAnimationFrame(function() {
    setTimeout(function() {
      var blob = new Blob([printReady], { type: 'text/html;charset=utf-8' });
      var blobUrl = URL.createObjectURL(blob);
      frame.src = blobUrl;
      setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 300000);
    }, 50);
  });
  showToast('Laporan terbuka. Klik "Simpan PDF" untuk menyimpan.', 'info');
}

// Simpan PDF dari modal — browser: print via blob tab baru; APK: Capacitor Browser
function _savePdfFromModal(htmlContent, title, pdfName, btn) {
  if (btn) { btn.innerHTML = '&#9203; Menyiapkan...'; btn.disabled = true; }
  function _done(msg) {
    if (btn) { btn.innerHTML = '&#128190; Simpan PDF'; btn.disabled = false; }
    showToast(msg, 'info');
  }

  // Deteksi APK Capacitor
  var isApk = false;
  try { if (window.Capacitor && window.Capacitor.isNative && window.Capacitor.isNative()) isApk = true; } catch(e) {}
  if (!isApk) {
    var p = window.location.protocol, h = window.location.hostname;
    if (p === 'capacitor:' || p === 'ionic:' || h === 'localhost' || h === '127.0.0.1') isApk = true;
  }

  if (!isApk) {
    // Browser: buka tab baru, tulis HTML, panggil print
    var win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) { _done('Popup diblokir. Izinkan popup lalu coba lagi.'); return; }
    win.document.write(htmlContent);
    win.document.close();
    _done('Tab baru terbuka. Pilih Print > Save as PDF.');
    return;
  }

  // APK: upload ke server, buka di Chrome via Capacitor Browser
  var safeName = (title || 'laporan').replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 40);
  fetch(apiUrl('api.php?action=save_print_html'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: htmlContent, filename: safeName })
  })
  .then(function(r) { return r && r.ok ? r.json() : null; })
  .then(function(res) {
    if (!res || !res.success || !res.data) {
      _done('Gagal upload ke server. Coba lagi.');
      return;
    }
    var printUrl = res.data.https_url || res.data.url;
    var BrowserPlugin = null;
    try { BrowserPlugin = (window.Capacitor && window.Capacitor.Plugins) ? window.Capacitor.Plugins.Browser : null; } catch(e) {}

    if (BrowserPlugin) {
      BrowserPlugin.open({ url: printUrl }).then(function() {
        _done('Browser terbuka. Tekan menu \u22EE > Print > Save as PDF.');
      }).catch(function(err) {
        console.warn('Browser.open gagal:', err);
        // Fallback: Share plugin
        var SharePlugin = null;
        try { SharePlugin = window.Capacitor.Plugins.Share; } catch(e) {}
        if (SharePlugin) {
          SharePlugin.share({ title: title, url: printUrl, dialogTitle: 'Bagikan Laporan' })
            .then(function() { _done('Pilih browser untuk membuka laporan.'); })
            .catch(function() { _done('Buka URL: ' + printUrl); });
        } else {
          _done('Buka URL ini di browser: ' + printUrl);
        }
      });
    } else {
      _done('Buka URL ini di browser: ' + printUrl);
    }
  })
  .catch(function(err) {
    _done('Gagal: ' + (err.message || 'network error'));
  });
}


// Generate PDF - Browser/PWA: window.open; APK: upload ke server + Browser.open()
function _savePdfViaServer(htmlContent, title, pdfName, btn) {
  if (btn) { btn.innerHTML = "&#9203; Membuka..."; btn.disabled = true; }

  function _restoreBtn() {
    if (btn) { btn.innerHTML = "&#128190; Simpan PDF"; btn.disabled = false; }
  }

  // Deteksi Capacitor APK
  var isCapacitor = !!(window.Capacitor && window.Capacitor.isNative && window.Capacitor.isNative());
  if (!isCapacitor && typeof _isCapEnv !== 'undefined') isCapacitor = _isCapEnv;

  // Browser/PWA: window.open blob URL -> print
  if (!isCapacitor) {
    var blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    var url  = URL.createObjectURL(blob);
    var win  = null;
    try { win = window.open(url, "_blank"); } catch(e) { win = null; }
    if (win && !win.closed) {
      var _p = false;
      win.addEventListener("load", function() {
        if (_p) return; _p = true;
        setTimeout(function() {
          try { win.document.title = pdfName; } catch(e) {}
          try { win.print(); } catch(e) {}
          _restoreBtn();
          showToast("Pilih 'Save as PDF' di dialog print", "info");
        }, 700);
      });
      setTimeout(function() { if (!_p) { _p = true; try { win.print(); } catch(e) {} } }, 2500);
      setTimeout(function() { try { URL.revokeObjectURL(url); } catch(e) {} }, 60000);
      return;
    }
    URL.revokeObjectURL(url);
  }

  // Capacitor APK: POST HTML ke server -> buka di browser sistem via Browser.open()
  // Chrome Android mendukung window.print() -> dialog "Save as PDF" muncul
  var fileName = pdfName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
  showToast("Mengunggah laporan ke server...", "info");

  fetch(apiUrl('api.php?action=save_print_html'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: htmlContent, filename: fileName })
  })
  .then(function(r) { return r && r.ok ? r.json() : null; })
  .then(function(res) {
    if (!res || !res.success || !res.data || !res.data.url) {
      _restoreBtn();
      showToast("Gagal mengunggah laporan ke server", "error");
      return;
    }
    var printUrl = res.data.url;
    var BrowserPlugin = null;
    try { BrowserPlugin = window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins.Browser : null; } catch(e) {}

    if (BrowserPlugin) {
      BrowserPlugin.open({ url: printUrl }).then(function() {
        _restoreBtn();
        showToast("Pilih 'Save as PDF' di menu browser yang terbuka", "info");
      }).catch(function(err) {
        console.warn('[SIGAP] Browser.open failed:', err);
        try { window.open(printUrl, '_blank'); } catch(e2) {}
        _restoreBtn();
        showToast("Browser terbuka - pilih Save as PDF", "info");
      });
    } else {
      try { window.open(printUrl, '_blank'); } catch(e) {}
      _restoreBtn();
      showToast("Browser terbuka - pilih Save as PDF", "info");
    }
  })
  .catch(function(err) {
    console.warn('[SIGAP] save_print_html error:', err);
    _restoreBtn();
    showToast("Gagal mengunggah laporan: " + (err.message || 'network error'), "error");
  });
}

// CETAK LENGKAP — laporan per siswa lengkap dengan foto, peta, jurnal
// ══════════════════════════════════════════════════════════════════════
function exportCetakLengkap() {
  showToast('Menyiapkan laporan lengkap...', 'info');

  const users    = getUsers();
  const logs     = getLogs();
  const perms    = getPermissions();
  const settings = getSchoolSettings();
  const now      = new Date();
  const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

  const isAdminUser = activeUser && (activeUser.role === 'admin' || activeUser.username === 'admin');
  let targetSiswa = users.filter(function(u) { return u.role === 'siswa'; });
  if (!isAdminUser && activeUser && activeUser.role === 'guru') {
    var myStudents = getSupervisedStudentsOnly();
    var myIds = new Set(myStudents.map(function(s) { return String(s.id); }));
    targetSiswa = targetSiswa.filter(function(u) { return myIds.has(String(u.id)); });
  }

  if (targetSiswa.length === 0) {
    showToast('Tidak ada data siswa untuk dicetak.', 'error');
    return;
  }

  const teacherName   = activeUser ? activeUser.name : 'Guru Pembimbing';
  const teacherNip    = activeUser ? (activeUser.nomor_induk || '-') : '-';
  const schoolName    = settings.schoolName    || 'SMK Negeri 9 Malang';
  const cityName      = settings.cityName      || 'Malang';
  const principalName = settings.principalName || '_________________________';
  const principalNip  = settings.principalNip  || '-';
  const printDate     = now.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

  function makeMapIframe(lat, lng, label, w, h) {
    if (!lat || !lng || lat === 0 || lng === 0) {
      return '<div style="width:' + w + 'px;height:' + h + 'px;background:#f1f5f9;display:flex;' +
        'align-items:center;justify-content:center;border-radius:8px;color:#94a3b8;font-size:11px;' +
        'border:1px solid #e2e8f0;">📍 Koordinat belum tersedia</div>';
    }
    var gmapLink = 'https://www.google.com/maps?q=' + lat + ',' + lng + '&z=16&label=' + encodeURIComponent(label || '');
    var osmLink  = 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lng + '&zoom=16';
    var zoom = 16;
    var tileX = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    var tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    var tilesHtml = '';
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        tilesHtml += '<img src="https://tile.openstreetmap.org/' + zoom + '/' + (tileX+dx) + '/' + (tileY+dy) + '.png" ' +
          'style="position:absolute;width:256px;height:256px;top:' + ((dy+1)*256) + 'px;left:' + ((dx+1)*256) + 'px;" crossorigin="anonymous" onerror="this.style.opacity=0.3">';
      }
    }
    return '<div style="position:relative;width:' + w + 'px;height:' + h + 'px;overflow:hidden;border-radius:8px;border:1px solid #cbd5e1;background:#e8f4f8;">' +
      '<div style="position:absolute;top:' + (-(h/2-128)) + 'px;left:' + (-(w/2-128)) + 'px;width:768px;height:768px;">' + tilesHtml + '</div>' +
      '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-100%);z-index:10;font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">📍</div>' +
      '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(15,23,42,0.75);color:#fff;font-size:10px;font-weight:700;padding:4px 8px;text-align:center;z-index:11;">' + (label||'Lokasi PKL').substring(0,60) + '</div>' +
      '</div>' +
      '<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">' +
        '<a href="' + gmapLink + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;background:#4285f4;color:#fff;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;">🗺️ Buka Google Maps</a>' +
        '<a href="' + osmLink  + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;background:#0891b2;color:#fff;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;">🌍 OpenStreetMap</a>' +
        '<span style="font-size:10px;color:#94a3b8;align-self:center;">GPS: ' + lat.toFixed(5) + ', ' + lng.toFixed(5) + '</span>' +
      '</div>';
  }

  function statusBadge(status) {
    var s = (status || '').toLowerCase();
    var bg = '#dcfce7', col = '#16a34a';
    if (s === 'alpa')  { bg = '#fee2e2'; col = '#dc2626'; }
    else if (s === 'izin')  { bg = '#fef9c3'; col = '#ca8a04'; }
    else if (s === 'sakit') { bg = '#dbeafe'; col = '#2563eb'; }
    else if (s.includes('luar radius')) { bg = '#fde68a'; col = '#92400e'; }
    return '<span style="background:' + bg + ';color:' + col + ';padding:2px 8px;border-radius:8px;font-weight:700;font-size:11px;">' + (status||'-') + '</span>';
  }

  function buildSiswaSection(siswa, idx) {
    var lat = parseFloat(siswa.latitude_pkl)  || 0;
    var lng = parseFloat(siswa.longitude_pkl) || 0;
    var _siswaStart = siswa.pkl_start_date || siswa.created_date || null;
    var siswaLogs = logs
      .filter(function(l) { return l.studentName === siswa.name && (!_siswaStart || (l.date||'') >= _siswaStart); })
      .sort(function(a, b) { return (a.date||'').localeCompare(b.date||''); });

    var jHadir = siswaLogs.filter(function(l) { return (l.status||'').toLowerCase().includes('hadir'); }).length;
    var jIzin  = siswaLogs.filter(function(l) { return (l.status||'').toLowerCase() === 'izin'; }).length;
    var jSakit = siswaLogs.filter(function(l) { return (l.status||'').toLowerCase() === 'sakit'; }).length;
    var jAlpa  = siswaLogs.filter(function(l) { return (l.status||'').toLowerCase() === 'alpa'; }).length;

    var headerPhoto = '';
    var logsWithPhoto = siswaLogs.filter(function(l) { return l.image && l.image.startsWith('data:'); }).reverse();
    if (logsWithPhoto.length > 0) {
      headerPhoto = '<img src="' + logsWithPhoto[0].image + '" alt="Foto" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:3px solid #0891b2;display:block;margin:0 auto 6px;" onerror="this.style.display=\'none\'">';
    } else {
      headerPhoto = '<div style="width:80px;height:80px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:28px;">🎓</div>';
    }

    var siswaJournals = (typeof getJournalsByStudent === 'function') ? getJournalsByStudent(siswa.name) : [];
    var rowsHtml = '';
    if (siswaLogs.length === 0) {
      rowsHtml = '<tr><td colspan="7" style="text-align:center;padding:16px;color:#94a3b8;font-style:italic;">Belum ada data presensi.</td></tr>';
    } else {
      siswaLogs.forEach(function(l, ri) {
        var jrn = siswaJournals.find(function(j) { return j.date === l.date; }) || null;
        var jrnCell = jrn
          ? '<div style="font-size:10px;color:#0891b2;">' + (jrn.narasi||'').replace(/</g,'&lt;').substring(0,60) + (jrn.narasi&&jrn.narasi.length>60?'...':'') +
            (jrn.image ? '<br><img src="' + jrn.image + '" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-top:4px;" onerror="this.style.display=\'none\'">' : '') + '</div>'
          : '<span style="color:#94a3b8;font-size:11px;font-style:italic;">—</span>';
        var fotoCell = (l.image && l.image.length > 20)
          ? '<img src="' + l.image + '" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;" onerror="this.style.display=\'none\'">'
          : '<span style="color:#cbd5e1;font-size:20px;">—</span>';
        var rowBg = ri % 2 === 0 ? '#fff' : '#f8fafc';
        var rawDate = (l.date||'-').split('T')[0].split(' ')[0];
        var fmtDate = rawDate;
        if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          var dp = rawDate.split('-');
          fmtDate = dp[2] + '/' + dp[1] + '/' + dp[0];
        }
        rowsHtml += '<tr style="background:' + rowBg + ';page-break-inside:avoid;">' +
          '<td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;width:72px;">' + fmtDate + '</td>' +
          '<td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px;width:52px;">' + (l.masuk||'-') + '</td>' +
          '<td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px;width:52px;">' + (l.pulang||'-') + '</td>' +
          '<td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;width:90px;">' + statusBadge(l.status) + '</td>' +
          '<td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;color:#334155;word-wrap:break-word;word-break:break-word;max-width:180px;">' + (l.location||'-') + '</td>' +
          '<td style="padding:4px 6px;border:1px solid #e2e8f0;text-align:center;width:54px;">' + fotoCell + '</td>' +
          '<td style="padding:4px 6px;border:1px solid #e2e8f0;font-size:10px;word-wrap:break-word;word-break:break-word;width:130px;">' + jrnCell + '</td>' +
          '</tr>';
      });
    }

    return '<div style="page-break-inside:avoid;border:1px solid #cbd5e1;border-radius:12px;padding:20px;margin-bottom:32px;background:#fff;">' +
      '<div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px;border-bottom:2px solid #e2e8f0;padding-bottom:14px;">' +
        '<div style="text-align:center;min-width:90px;">' + headerPhoto +
          '<div style="font-size:10px;font-weight:700;color:#0891b2;">SISWA #' + (idx+1) + '</div></div>' +
        '<div style="flex:1;">' +
          '<h3 style="margin:0 0 6px;font-size:15px;color:#0f172a;">' + siswa.name + '</h3>' +
          '<div style="font-size:12px;color:#475569;display:grid;grid-template-columns:repeat(2,1fr);gap:4px;">' +
            '<div>📋 NISN/NIS: <strong>' + (siswa.nomor_induk||'-') + '</strong></div>' +
            '<div>🏫 Kelas: <strong>' + (siswa.kelas||'-') + '</strong></div>' +
            '<div>📍 Lokasi PKL: <strong>' + (siswa.pklLocation||'-') + '</strong></div>' +
            '<div>👨‍🏫 Pembimbing: <strong>' + (siswa.supervisor||'-') + '</strong></div>' +
          '</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;min-width:120px;background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0;text-align:center;">' +
          '<div style="background:#dcfce7;border-radius:6px;padding:5px;"><div style="font-size:18px;font-weight:900;color:#16a34a;">' + jHadir + '</div><div style="font-size:9px;color:#15803d;">Hadir</div></div>' +
          '<div style="background:#fef9c3;border-radius:6px;padding:5px;"><div style="font-size:18px;font-weight:900;color:#ca8a04;">' + jIzin + '</div><div style="font-size:9px;color:#a16207;">Izin</div></div>' +
          '<div style="background:#dbeafe;border-radius:6px;padding:5px;"><div style="font-size:18px;font-weight:900;color:#2563eb;">' + jSakit + '</div><div style="font-size:9px;color:#1d4ed8;">Sakit</div></div>' +
          '<div style="background:#fee2e2;border-radius:6px;padding:5px;"><div style="font-size:18px;font-weight:900;color:#dc2626;">' + jAlpa + '</div><div style="font-size:9px;color:#b91c1c;">Alpa</div></div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:16px;">' +
        '<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#475569;">🗺️ Peta Lokasi PKL: ' + (siswa.pklLocation||'-') + '</p>' +
        makeMapIframe(lat, lng, siswa.pklLocation, 400, 200) +
      '</div>' +
      '<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#475569;">📅 Rekap Presensi Harian (' + siswaLogs.length + ' hari)</p>' +
      '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;">' +
        '<thead><tr style="background:#0f172a;color:#fff;">' +
          '<th style="padding:8px;text-align:left;border:1px solid #1e293b;font-size:11px;">Tanggal</th>' +
          '<th style="padding:8px;text-align:center;border:1px solid #1e293b;font-size:11px;">Masuk</th>' +
          '<th style="padding:8px;text-align:center;border:1px solid #1e293b;font-size:11px;">Pulang</th>' +
          '<th style="padding:8px;text-align:center;border:1px solid #1e293b;font-size:11px;">Status</th>' +
          '<th style="padding:8px;text-align:left;border:1px solid #1e293b;font-size:11px;">Keterangan</th>' +
          '<th style="padding:8px;text-align:center;border:1px solid #1e293b;font-size:11px;">Foto</th>' +
          '<th style="padding:8px;text-align:left;border:1px solid #1e293b;font-size:11px;">Jurnal</th>' +
        '</tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table></div>' +
    '</div>';
  }

  var grandHadir = 0, grandIzin = 0, grandSakit = 0, grandAlpa = 0;
  targetSiswa.forEach(function(s) {
    logs.filter(function(l) { return l.studentName === s.name; }).forEach(function(l) {
      var st = (l.status||'').toLowerCase();
      if (st.includes('hadir')) grandHadir++;
      else if (st === 'izin')  grandIzin++;
      else if (st === 'sakit') grandSakit++;
      else if (st === 'alpa')  grandAlpa++;
    });
  });

  var allCards = targetSiswa.map(function(s, i) { return buildSiswaSection(s, i); }).join('');

  var guruMonLogs = logs.filter(function(l) {
    return l.isGuruMonitoring === true && activeUser && (l.studentName === activeUser.name);
  }).sort(function(a, b) { return (a.date||'').localeCompare(b.date||''); });

  var monitoringSection = '';
  if (guruMonLogs.length > 0) {
    var monRowsHtml = guruMonLogs.map(function(l, ri) {
      var rowBg = ri % 2 === 0 ? '#fff' : '#f0fdf4';
      var fotoCell = (l.image && l.image.length > 20)
        ? '<img src="' + l.image + '" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;" onerror="this.style.display=\'none\'">'
        : '<span style="color:#cbd5e1;">—</span>';
      return '<tr style="background:' + rowBg + ';">' +
        '<td style="padding:8px 10px;border:1px solid #e2e8f0;">' + (l.date||'-') + '</td>' +
        '<td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;">' + (l.masuk||'-') + '</td>' +
        '<td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:11px;color:#475569;max-width:200px;">' + (l.monitoringTarget||'-').substring(0,80) + '</td>' +
        '<td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:11px;color:#475569;max-width:160px;">' + (l.location||'-').substring(0,70) + '</td>' +
        '<td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;">' + fotoCell + '</td>' +
        '</tr>';
    }).join('');
    monitoringSection =
      '<div style="page-break-inside:avoid;border:1px solid #a7f3d0;border-radius:12px;padding:20px;margin-bottom:32px;background:#fff;">' +
      '<h3 style="font-size:14px;color:#065f46;margin:0 0 14px;border-bottom:2px solid #a7f3d0;padding-bottom:8px;">🔍 Log Kunjungan Monitoring: ' + teacherName + ' (' + guruMonLogs.length + ' kunjungan)</h3>' +
      '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">' +
      '<thead><tr style="background:#065f46;color:#fff;">' +
        '<th style="padding:9px 10px;border:1px solid #047857;">Tanggal</th>' +
        '<th style="padding:9px 10px;border:1px solid #047857;">Jam</th>' +
        '<th style="padding:9px 10px;border:1px solid #047857;">Lokasi PKL</th>' +
        '<th style="padding:9px 10px;border:1px solid #047857;">Keterangan GPS</th>' +
        '<th style="padding:9px 10px;border:1px solid #047857;">Foto</th>' +
      '</tr></thead><tbody>' + monRowsHtml + '</tbody></table></div></div>';
  }

  var wakaHumasName = settings.wakaHumasName || '_________________________';
  var wakaHumasNip  = settings.wakaHumasNip  || '-';
  var pokjaName     = settings.pokjaName     || '_________________________';
  var pokjaNip      = settings.pokjaNip      || '-';

  var ttdHtml = '';
  if (isAdminUser) {
    ttdHtml =
      '<div style="margin-top:40px;">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;width:100%;">' +
        '<div style="text-align:center;padding-left:20px;"><p>' + cityName + ', ' + printDate + '</p><p style="margin-top:4px;">Waka Humas,</p><div style="height:65px;"></div>' +
          '<span style="border-top:1px solid #0f172a;padding-top:4px;display:inline-block;min-width:180px;font-weight:700;">' + wakaHumasName + '</span><br><small>NIP. ' + wakaHumasNip + '</small></div>' +
        '<div style="text-align:center;padding-right:20px;"><p>' + cityName + ', ' + printDate + '</p><p style="margin-top:4px;">Ketua Pokja PKL,</p><div style="height:65px;"></div>' +
          '<span style="border-top:1px solid #0f172a;padding-top:4px;display:inline-block;min-width:180px;font-weight:700;">' + pokjaName + '</span><br><small>NIP. ' + pokjaNip + '</small></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:center;margin-top:40px;">' +
        '<div style="text-align:center;min-width:220px;"><p>Mengetahui,</p><p style="font-size:11px;color:#64748b;">Kepala ' + schoolName + ',</p><div style="height:65px;"></div>' +
          '<span style="border-top:1px solid #0f172a;padding-top:4px;display:inline-block;min-width:180px;font-weight:700;">' + principalName + '</span><br><small>NIP. ' + principalNip + '</small></div>' +
      '</div></div>';
  } else {
    ttdHtml =
      '<div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:60px;">' +
        '<div style="text-align:center;"><p>' + cityName + ', ' + printDate + '</p><p style="margin-top:4px;">Mengetahui,</p><p style="font-size:11px;color:#64748b;">Kepala ' + schoolName + ',</p><div style="height:65px;"></div>' +
          '<span style="border-top:1px solid #0f172a;padding-top:4px;display:inline-block;min-width:180px;font-weight:700;">' + principalName + '</span><br><small>NIP. ' + principalNip + '</small></div>' +
        '<div style="text-align:center;"><p>' + cityName + ', ' + printDate + '</p><p style="margin-top:4px;">Guru Pembimbing PKL,</p><div style="height:65px;"></div>' +
          '<span style="border-top:1px solid #0f172a;padding-top:4px;display:inline-block;min-width:180px;font-weight:700;">' + teacherName + '</span><br><small>NIP. ' + teacherNip + '</small></div>' +
      '</div>';
  }

  var html = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">' +
    '<title>Laporan Lengkap PKL - ' + schoolName + '</title>' +
    '<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:\'Segoe UI\',Arial,sans-serif;background:#f8fafc;color:#1e293b;font-size:11px;}' +
    '.page{max-width:960px;margin:0 auto;padding:24px 20px 60px;background:#fff;}' +
    'table{width:100%;border-collapse:collapse;table-layout:fixed;word-wrap:break-word;}' +
    'td,th{word-wrap:break-word;word-break:break-word;overflow-wrap:break-word;overflow:hidden;vertical-align:top;}' +
    '@media print{body{background:#fff;}.page{padding:16px;max-width:100%;}.no-print{display:none!important;}tr{page-break-inside:avoid;}}' +
    '.kop-container{display:flex;align-items:center;border-bottom:3px solid #000;padding-bottom:8px;margin-bottom:15px;}' +
    '.logo-box{width:90px;text-align:left;flex-shrink:0;}.logo-box img{width:75px;height:auto;}' +
    '.header-text{flex:1;text-align:center;margin-right:40px;}' +
    '.header-text h3{margin:0;font-size:14px;font-weight:normal;text-transform:uppercase;}' +
    '.header-text h2{margin:2px 0;font-size:18px;font-weight:bold;text-transform:uppercase;}' +
    '.header-text p{margin:2px 0;font-size:10px;color:#111;}' +
    '.summary-bar{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px;}' +
    '.sum-card{border-radius:10px;padding:12px;text-align:center;border:1px solid #e2e8f0;}' +
    '.sum-card .num{font-size:26px;font-weight:900;}.sum-card .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-top:2px;}' +
    '</style></head><body><div class="page">' +
    '<div class="kop-container">' +
      '<div class="logo-box"><img src="img/logo_jatim.png" onerror="this.onerror=null;this.src=\'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Coat_of_arms_of_East_Java.svg/500px-Coat_of_arms_of_East_Java.svg.png\';" alt="Logo Jatim" style="width:85px;height:auto;display:block;margin:0 auto;"></div>' +
      '<div class="header-text">' +
        '<h3>PEMERINTAH PROVINSI JAWA TIMUR</h3><h3>DINAS PENDIDIKAN</h3>' +
        '<h2>' + schoolName + '</h2>' +
        '<p>Jalan Sampurna Nomor 1, Cemorokandang, Kedungkandang, Malang, 65138</p>' +
        '<p>Telepon 0341727998, Laman https://smkn9malang.sch.id/, Pos-el surat@smkn9malang.sch.id</p>' +
      '</div></div>' +
    '<div style="text-align:center;margin:16px 0 20px;">' +
      '<h2 style="font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">Laporan Presensi Harian PKL</h2>' +
      '<p style="font-size:12px;color:#475569;margin-top:4px;">Guru Pembimbing: <strong>' + teacherName + '</strong> &nbsp;|&nbsp; NIP: <strong>' + teacherNip + '</strong></p>' +
      '<p style="font-size:12px;color:#475569;margin-top:2px;">Jumlah Siswa: <strong>' + targetSiswa.length + ' siswa</strong> &nbsp;|&nbsp; Dicetak: <strong>' + printDate + '</strong></p>' +
    '</div>' +
    '<div class="summary-bar">' +
      '<div class="sum-card" style="background:#f0fdf4;border-color:#bbf7d0;"><div class="num" style="color:#16a34a;">' + targetSiswa.length + '</div><div class="lbl">Siswa</div></div>' +
      '<div class="sum-card" style="background:#dcfce7;border-color:#86efac;"><div class="num" style="color:#16a34a;">' + grandHadir + '</div><div class="lbl">Hadir</div></div>' +
      '<div class="sum-card" style="background:#fef9c3;border-color:#fde047;"><div class="num" style="color:#ca8a04;">' + grandIzin + '</div><div class="lbl">Izin</div></div>' +
      '<div class="sum-card" style="background:#dbeafe;border-color:#93c5fd;"><div class="num" style="color:#2563eb;">' + grandSakit + '</div><div class="lbl">Sakit</div></div>' +
      '<div class="sum-card" style="background:#fee2e2;border-color:#fca5a5;"><div class="num" style="color:#dc2626;">' + grandAlpa + '</div><div class="lbl">Alpa</div></div>' +
    '</div>' +
    allCards + monitoringSection +
    ttdHtml +
    '</div></body></html>';

  var pdfFileName = 'Laporan_Lengkap_PKL_' + (activeUser ? activeUser.name.replace(/[^a-zA-Z0-9]/g,'_') : 'Admin') + '_' + todayStr + '.pdf';
  _printAsPDF(html, pdfFileName);
  showToast('Laporan Lengkap berhasil dibuka!', 'success');
}
window.exportCetakLengkap = exportCetakLengkap;