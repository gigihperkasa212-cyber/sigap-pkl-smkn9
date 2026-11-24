# FLOWCHART SISTEM SIGAP PKL
## Sistem Informasi & Geofencing Absensi PKL
### SMK Negeri 9 Malang

**Versi:** 2.1.63  
**Tanggal:** 3 September 2026

---

## Daftar Isi
1. [Flowchart 1 - Alur Utama Sistem](#1-alur-utama-sistem)
2. [Flowchart 2 - Login & Autentikasi](#2-login--autentikasi)
3. [Flowchart 3 - Absensi Siswa (Masuk & Pulang)](#3-absensi-siswa)
4. [Flowchart 4 - Monitoring Guru](#4-monitoring-guru)
5. [Flowchart 5 - Pengajuan & Persetujuan Izin/Sakit](#5-izin--sakit)
6. [Flowchart 6 - Import Data Massal CSV](#6-import-csv)
7. [Flowchart 7 - Geocoding Koordinat PKL](#7-geocoding-koordinat-pkl)
8. [Flowchart 8 - Cetak Laporan PDF](#8-cetak-laporan-pdf)
9. [Flowchart 9 - Sync Realtime SSE + Polling](#9-sync-realtime)
10. [Flowchart 10 - Reset Database](#10-reset-database)

---

## 1. Alur Utama Sistem

```
        ┌──────────┐
        │  BUKA    │
        │   APK    │
        └────┬─────┘
             │
             ▼
  ┌──────────────────────┐
  │   checkAuthSession() │
  │   Cek localStorage   │
  │   + flag remember_v1 │
  └──────┬───────────────┘
         │
    ┌────┴────┐
    │ Ada     │ Tidak ada sesi /
    │ sesi?   │ flag remember = false?
    └────┬────┘
    Ya   │             │ Tidak
    ▼    │             ▼
┌────────┴──┐     ┌──────────────┐
│ Verifikasi│     │ Tampilkan    │
│ ke server │     │ Halaman Login│
│ (6 detik) │     └──────┬───────┘
└─────┬─────┘            │
      │                  │ Input
      │           ┌──────┴──────────────────┐
      │           │ username + password     │
      │           └──────┬──────────────────┘
      │                  │
      │           ┌──────▼────────────────────────┐
      │           │  Cek di users lokal + server  │
      │           │  Cocokkan role & aktif         │
      │           └──────┬────────────────────────┘
      │                  │
      │         ┌────────┴─────────┐
      │         │ Login berhasil?  │
      │         └────────┬─────────┘
      │              Ya  │    Tidak → Error toast
      │                  ▼
      └──────►  performUserLogin()
              sessionStorage (default)
              localStorage (jika "Ingat Saya" ✓)
                          │
              ┌───────────▼───────────┐
              │  applyUserInterface() │
              │  Tampilkan UI sesuai  │
              │  role pengguna        │
              └───────────┬───────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌─────────┐    ┌─────────────┐  ┌──────────────┐
    │  SISWA  │    │    GURU     │  │ MASTER ADMIN │
    │  PKL    │    │ PEMBIMBING  │  │              │
    └────┬────┘    └──────┬──────┘  └──────┬───────┘
         │                │                │
    Absen Masuk/     Monitoring       Kelola Semua
    Pulang + Jurnal  + Cetak Laporan  + Import + Cetak
```

---

## 2. Login & Autentikasi

```
┌─────────────────────────────────────────────────────┐
│                  HALAMAN LOGIN                       │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │         SIGAP PKL - SMK NEGERI 9             │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Username: [___________________________]             │
│  Password: [___________________________]             │
│  ☐ Ingat Saya                                        │
│  [        MASUK         ]                            │
└─────────────────────────────────────────────────────┘
         │                  │
    ┌────▼────┐         ┌───▼────────────────────────┐
    │ Ingat   │         │ Tanpa Ingat Saya           │
    │ Saya ✓  │         │ (default)                  │
    └────┬────┘         └───┬────────────────────────┘
         │                  │
    localStorage         sessionStorage
    + flag               (hilang saat browser tutup)
    remember_v1
         │                  │
         └──────┬───────────┘
                ▼
    Fetch /api.php?action=get_users
    Verifikasi username + password
    Cek aktif=1
                │
        ┌───────┴───────┐
        │  Valid?        │
        └───────┬───────┘
                │
        ┌───────┴──────────────────────────────┐
        │              ROLE ROUTING            │
        ├────────────┬─────────────┬───────────┤
        │  admin     │    guru     │  siswa    │
        ▼            ▼             ▼
  Tab Admin    Tab Monitoring  Tab Absensi
  (Kelola      (Siswa          (Masuk/Pulang
  Semua)       Bimbingan)      + Jurnal)

LOGOUT:
  handleLogout() →
    localStorage.removeItem(STORAGE_KEY_AUTH)
    sessionStorage.removeItem(STORAGE_KEY_AUTH)
    localStorage.removeItem('SIGAP_PKL_K9_remember_v1')
    → Tampilkan halaman Login
```

---

## 3. Absensi Siswa

```
┌──────────────────────────────────────────────────────┐
│              ALUR ABSENSI SISWA PKL                   │
└──────────────────────────────────────────────────────┘

SISWA KLIK [ABSEN MASUK] atau [ABSEN PULANG]
              │
              ▼
    openCameraModal()
    Minta izin Kamera + GPS
              │
        ┌─────┴─────┐
        │ Izin OK?  │
        └─────┬─────┘
         Ya   │    Tidak → Error "Izin kamera/GPS diperlukan"
              ▼
    Tampilkan kamera
    + overlay GPS realtime
    + radius geofence (circle)
              │
    User foto selfie
              │
              ▼
    Cek GPS Geofencing:
    Hitung jarak user ke TARGET_LOCATION
    (koordinat PKL siswa dari DB)
              │
      ┌───────┴──────────────────────────────────┐
      │  Dalam radius?  (default: 350 meter)     │
      └───────┬──────────────────────────────────┘
         Ya   │         Tidak → Status "Luar Radius"
              │                 (tetap bisa absen)
              ▼
    Cek 1 kali per hari:
    - Belum absen masuk hari ini? → Izinkan masuk
    - Belum absen pulang hari ini? → Izinkan pulang
    - Sudah keduanya? → Blokir "Sudah absen hari ini"
              │
              ▼
    Submit ke api.php?action=simpan_presensi
    (user_id, nama, tipe, GPS, foto, status)
              │
              ▼
    SSE broadcast ke semua client
    → Admin/Guru update realtime
              │
              ▼
    Auto-Alpa: _runAutoAlpa()
    Jika pkl_start_date sudah lewat dan
    tidak ada log masuk+pulang hari ini
    → Insert record Alpa otomatis
```

---

## 4. Monitoring Guru

```
GURU login → Tab Monitoring tersedia

[ABSEN MONITORING] (gantikan tombol masuk/pulang guru)
         │
         ▼
  openCameraModal()
  Foto selfie + GPS lokasi saat ini
         │
         ▼
  Input: nama siswa/PKL yang dikunjungi
         │
         ▼
  Simpan log monitoring:
  isGuruMonitoring: true
  monitoringTarget: nama siswa/PKL
  location: alamat GPS
  foto: base64 selfie
         │
         ▼
  Tampil di:
  - Tab Log Presensi guru
  - Cetak Lengkap (seksi monitoring)

Siswa bimbingan:
  getSupervisedStudentsOnly()
  → Filter berdasarkan field supervisor
  → Hanya tampilkan siswa dengan
    supervisor = nama guru login
```

---

## 5. Izin & Sakit

```
SISWA KLIK [IZIN / SAKIT]
         │
         ▼
  Form pengajuan:
  - Jenis: Izin / Sakit
  - Tanggal mulai & selesai
  - Keterangan / alasan
         │
         ▼
  Submit → api.php?action=submit_permission
  status: "pending"
         │
         ▼ (SSE broadcast)
GURU/ADMIN terima notifikasi
         │
    ┌────┴─────────────────────────────────────────┐
    │     Tab Persetujuan Pengajuan                │
    │     Tampilkan daftar izin pending            │
    └────┬─────────────────────────────────────────┘
         │
    Guru klik [Setujui] / [Tolak]
         │
    ┌────┴───────────┐
    │ Setuju?         │
    └────┬───────────┘
    Ya   │              Tidak → status: "rejected"
         ▼
  status: "approved"
  Auto-update status log harian siswa
  (Alpa → Izin/Sakit pada rentang tanggal)

Note: Guru bisa setujui izin siswa bimbingannya saja.
      Admin bisa setujui semua izin.
```

---

## 6. Import CSV

```
ADMIN KLIK [Import Data Massal]
         │
         ▼
  Upload file .csv / .xlsx
  Format: role, nama, nomor_induk, username,
          password, kelas, sekolah, lokasi_pkl,
          guru_pembimbing
         │
         ▼
  parseAndImportCSV()
  Validasi setiap baris:
  - Cek role valid (siswa/guru)
  - Cek duplikat username
  - Cek duplikat nomor_induk
         │
         ▼
  Untuk setiap baris valid:
  - Cek apakah user sudah ada (username match)
    → Ada: update pklLocation + reset koordinat ke 0
    → Baru: create_user di server
         │
         ▼
  Koordinat awal = 0 (tidak pakai kamus perkiraan)
         │
         ▼
  Trigger batch geocode Nominatim:
  - Cek _geocodeNameCache (nama lokasi pernah di-geocode?)
    → Cache HIT: pakai koordinat cache, skip Nominatim
    → Cache MISS: antri Nominatim (1.2 detik/request)
  - Dedup per nama lokasi (50 siswa PKL sama = 1 request)
         │
         ▼
  Setelah geocode selesai:
  - fetch update_pkl_location ke server
  - update localStorage
         │
         ▼
  Tampilkan laporan validasi:
  ✅ N siswa berhasil
  ⚠️  M baris gagal + keterangan
```

---

## 7. Geocoding Koordinat PKL

```
NAMA LOKASI PKL (input)
         │
         ▼
  Cek _geocodeNameCache[nama.toLowerCase()]
         │
    ┌────┴───────────────────────┐
    │ Cache HIT?                 │
    └────┬───────────────────────┘
    Ya   │             Tidak
         │             │
    Pakai cache        ▼
    (0 HTTP req)  Query Nominatim (4 strategi):
         │        1. "nama, Malang, Jawa Timur, Indonesia"
         │        2. "nama, Indonesia"
         │        3. nama stripped + "Malang"
         │        4. nama stripped saja
         │             │
         │        Pilih hasil terdekat Malang (Haversine)
         │        Radius maks: 1000 km dari Malang
         │             │
         │    ┌────────┴──────────────────┐
         │    │ Ditemukan?                │
         │    └────────┬──────────────────┘
         │         Ya  │        Tidak
         │             │        → getCoordinatesByLocationName()
         │             │          (kamus lokal 50+ entry)
         │             │
         └─────────────▼
         _addToGeocodeCache(nama, lat, lng)
         → localStorage SIGAP_PKL_K9_geocache_v1
         → persist 30 hari
                   │
                   ▼
         fetch update_pkl_location
         → UPDATE DB: latitude_pkl, longitude_pkl
                   │
                   ▼
         Update activeUser + localStorage users
         _updateMapUIAndReset()
         → Leaflet map + geofence circle update
```

---

## 8. Cetak Laporan PDF

```
ADMIN/GURU KLIK [CETAK ...]
         │
    ┌────┴───────────────────────────────────────┐
    │  Jenis Cetak                               │
    └────┬───────────────────────────────────────┘
         │
   ┌─────┼──────────────┐
   ▼     ▼              ▼
Cetak  Cetak         Cetak
Lengkap Statistik   Rekap

── CETAK LENGKAP ──────────────────────────────────
  showToast → setTimeout(80ms) → _doExportCetakLengkap()
    │
    ▼ Pre-processing (sekali, sebelum loop):
    getLogs() → _logsCache (in-memory)
    getJournals() → _journalCache (in-memory)
    Build _logsIndex{}  — O(n) per studentName (foto di-strip)
    Build _journalsIndex{} — O(n)
    Build _geocodeNameCache (dari users)
    │
    ▼ Loop per siswa (O(n)):
    buildSiswaSection(siswa)
    → Ambil log dari _logsIndex[siswa.name]
    → makeMapIframe(lat,lng) — 1 tile OSM
    → Tampilkan ikon 📷 jika foto ada (base64 di-strip)
    │
    ▼ Setelah semua siswa:
    _buildTtdHtml(isAdmin, settings, ...)
    → Admin: Waka Humas | Kepala Sekolah | Ketua Pokja
    → Guru : Waka Humas | Kepala Sekolah | Guru Pembimbing
    │
    ▼ _printAsPDF(html, filename):
    requestAnimationFrame → setTimeout(50ms)
    → new Blob([html]) → URL.createObjectURL
    → frame.src = blobUrl
    → Modal fullscreen preview + tombol Simpan PDF

── CETAK STATISTIK / REKAP ────────────────────────
  showToast → setTimeout(50ms) → _doExport...()
    │
    ▼ Pre-processing:
    Build _rekLogsIndex{} — filter bulan via string slice
    Build _rekPermsIndex{}
    Hitung ttdStr55 = _buildTtdHtml(...)
    │
    ▼ Loop siswa O(n):
    Ambil log dari _rekLogsIndex[student.name]
    │
    ▼ _printAsPDF → Modal preview
```

---

## 9. Sync Realtime

```
App startup:
  startupSync() → fetch get_users → _mergeServerUsers()
                                  → _initGeocodeCache()

initRealtimeFeed():
  │
  ├── connectRealtimeSSE()
  │   EventSource → /api.php?action=sse_events
  │   onmessage → renderAdminDashboard() (realtime)
  │
  └── setInterval(8 detik):
      fetch get_users → _mergeServerUsers()
      (preserve koordinat lokal jika server = default SMKN9)

_mergeServerUsers(res):
  Untuk setiap user dari server:
  - Ambil koordinat dari lokalMap
  - Jika server kirim koordinat default SMKN9 (-7.9825)
    DAN lokal punya hasil geocoding (<5 menit)
    → pakai lokal (tidak di-overwrite)
  - Selain itu → server wins
  Sync activeUser.latitude_pkl dari server terbaru
  → _updateMapUIAndReset() jika koordinat berubah

syncDataFromServer() (DIHAPUS dari cetak):
  Hanya dipanggil saat login awal dan event tertentu
  TIDAK dipanggil saat klik tombol cetak
  (mencegah hang karena download ribuan log)
```

---

## 10. Reset Database

```
ADMIN KLIK [Reset Database]
         │
         ▼
  Konfirmasi dialog (2 kali)
         │
         ▼
  _doResetDatabase():
  1. fetch api.php?action=reset_database (server)
  2. saveUsers([admin only])
  3. saveLogs([])      → _invalidateLogsCache()
  4. savePermissions([])
  5. saveApprovalReports([])
  6. _initGeocodeCache()
     → Geocache TETAP ADA di localStorage
       (tidak dihapus — berguna untuk import ulang)
         │
         ▼
  Render ulang semua tab
  Toast: "Database berhasil di-reset"

Note: Koordinat cache SIGAP_PKL_K9_geocache_v1
      TIDAK ikut dihapus saat reset.
      Berguna agar import ulang siswa langsung
      dapat koordinat dari cache tanpa Nominatim.
```
