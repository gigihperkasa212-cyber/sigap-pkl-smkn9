# SIGAP - Sistem Informasi & Geofencing Absensi PKL

**Sistem Informasi & Geofencing Absensi PKL** untuk SMK Negeri 9 Malang

## Deskripsi

Aplikasi Presensi Siswa dan PKL Berbasis Web dengan fitur:
- Kamera Selfie untuk absensi
- GPS Geofencing
- Realtime monitoring
- Dashboard Admin & Guru Pembimbing
- Export laporan PDF & CSV

## Struktur Folder

```
absen pkl update/
├── css/
│   └── styles.css          # File CSS utama
├── img/
│   ├── admin_avatar.jpg    # Avatar default
│   └── logo_smkn9.png      # Logo sekolah
├── js/
│   └── app.js              # JavaScript utama aplikasi
├── index.html              # Halaman utama
├── manifest.json           # PWA manifest
└── README.md               # Dokumentasi ini
```

## Fitur Utama

### Untuk Siswa:
- ✅ Login dengan NISN/Username
- ✅ Absensi Masuk & Pulang dengan Selfie
- ✅ Deteksi Lokasi GPS Real-time
- ✅ Geofencing (validasi radius lokasi)
- ✅ Riwayat kehadiran
- ✅ Pengajuan Izin/Sakit
- ✅ Upload surat keterangan
- ✅ Statistik kehadiran (Hadir, Izin, Sakit, Alpa)

### Untuk Guru/Pembimbing:
- ✅ Dashboard monitoring real-time
- ✅ Log presensi siswa hari ini
- ✅ Persetujuan izin pending
- ✅ Filter berdasarkan kelompok bimbingan
- ✅ Chart statistik kehadiran komparasi bulan
- ✅ Export rekap PDF per pembimbing
- ✅ Export CSV

### Untuk Admin:
- ✅ Kelola data siswa & guru
- ✅ Pengaturan data kepala sekolah
- ✅ Cetak statistik kehadiran bulanan
- ✅ Export rekap komprehensif
- ✅ Master list semua siswa sekolah

## Teknologi

- **Frontend**: HTML5, CSS3, JavaScript
- **Maps**: Leaflet.js
- **Charts**: Chart.js (diindikasikan dari kode)
- **Icons**: Font Awesome 6.4.0
- **Fonts**: Google Fonts (Plus Jakarta Sans)
- **PWA**: Progressive Web App ready

## Instalasi & Penggunaan

### Cara 1: Langsung Buka File
1. Buka file `index.html` di browser modern (Chrome, Firefox, Edge)
2. Login dengan kredensial yang telah diberikan

### Cara 2: Menggunakan Web Server Lokal

**Dengan Python:**
```bash
# Python 3
python -m http.server 8088

# Python 2
python -m SimpleHTTPServer 8088
```

**Dengan Node.js (http-server):**
```bash
npx http-server -p 8088
```

**Dengan PHP:**
```bash
php -S localhost:8088
```

Kemudian buka browser dan akses: `http://localhost:8088`

## Kredensial Default

**Siswa:**
- Username: `siswa` atau NISN siswa
- Password: `123` (default)

**Guru/Pembimbing:**
- Username: username guru
- Password: `123` (default)

**Master Admin:**
- Username: `admin`
- Password: `sampurna01` (PERMANEN - tidak bisa login dengan "123")

> ⚠️ **Penting**: 
> - Password admin **HANYA** "sampurna01" (password "123" dihapus secara permanen)
> - Admin/Guru harus login di tab **"Guru / Pembimbing"**
> - Siswa harus login di tab **"Siswa"**
> - Ganti password default setelah login pertama kali

## Konfigurasi

### GPS Geofencing
- Radius default: 350 meter
- Target lokasi bisa diatur melalui panel admin

### Server Backend
Aplikasi ini memerlukan koneksi ke backend server untuk:
- Autentikasi user
- Penyimpanan data absensi
- Real-time sync (SSE - Server-Sent Events)
- Upload foto selfie
- Export PDF/CSV

Server backend perlu dikonfigurasi di file `js/app.js`

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Persyaratan Browser

- JavaScript enabled
- Camera access permission
- Geolocation access permission
- LocalStorage enabled
- Modern CSS support

## Lisensi

© SMK Negeri 9 Malang

## Sumber

File ini diunduh dari server: `http://103.153.190.69:8088`

---

**Catatan Pengembangan:**
- File CSS: ~26 KB
- File JavaScript: ~228 KB
- Logo sekolah: ~249 KB (PNG)
- Avatar default: ~198 KB (JPG)

Untuk pertanyaan atau bantuan teknis, hubungi administrator sistem.
