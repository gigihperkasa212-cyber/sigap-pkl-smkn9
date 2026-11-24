# MANUAL BOOK SIGAP PKL
## Panduan Penggunaan Lengkap per Peran
### SMK Negeri 9 Malang — Versi 2.1.63

**Tanggal:** 3 September 2026  
**URL Aplikasi:** https://103.153.190.69:8443  
**APK:** SIGAP-PKL-K9-v2.1.63.apk

---

## BAB 1 — PENDAHULUAN

### 1.1 Tentang SIGAP PKL

SIGAP (Sistem Informasi & Geofencing Absensi PKL) adalah aplikasi berbasis web + Android untuk mengelola absensi siswa PKL menggunakan teknologi GPS Geofencing. Siswa hanya bisa absen jika berada dalam radius tertentu dari lokasi PKL yang terdaftar.

### 1.2 Fitur Utama

| Fitur | Siswa | Guru | Admin |
|-------|-------|------|-------|
| Absen masuk & pulang dengan GPS + selfie | ✅ | - | - |
| Jurnal harian kegiatan PKL | ✅ | - | - |
| Pengajuan izin / sakit | ✅ | - | - |
| Monitoring kunjungan PKL | - | ✅ | - |
| Persetujuan izin & akun | - | ✅ | ✅ |
| Cetak laporan PDF | - | ✅ | ✅ |
| Import data massal CSV | - | - | ✅ |
| Kelola semua user | - | - | ✅ |
| Reset database | - | - | ✅ |
| Dashboard statistik realtime | - | ✅ | ✅ |

### 1.3 Akses Aplikasi

- **APK Android:** Install file `SIGAP-PKL-K9-v2.1.63.apk`
- **Browser:** Buka `https://103.153.190.69:8443`
- Jika browser memberi peringatan SSL → klik **"Lanjutkan"**

---

## BAB 2 — LOGIN & AUTENTIKASI

### 2.1 Langkah Login

1. Buka aplikasi / URL
2. Masukkan **Username** dan **Password**
3. Centang **"Ingat Saya"** jika ingin tetap login setelah browser ditutup
4. Klik **[🔐 MASUK]**

### 2.2 Akun Default

| Peran | Username | Password |
|-------|----------|----------|
| Master Admin | admin | sampurna01 |
| Guru | (dibuat saat import) | (sesuai kolom password CSV) |
| Siswa | (dibuat saat import) | (sesuai kolom password CSV) |

### 2.3 Perilaku Sesi

- **Tanpa centang "Ingat Saya":** Sesi hilang saat browser/app ditutup. Buka ulang → tampil halaman login.
- **Dengan centang "Ingat Saya":** Sesi tersimpan permanen. Buka ulang → langsung masuk.
- **Logout:** Selalu hapus sesi. Buka ulang → tampil halaman login.

> **Penting untuk HP bersama:** Jangan centang "Ingat Saya" jika HP digunakan oleh lebih dari satu orang.

### 2.4 Lupa Password

Hubungi Master Admin untuk reset password melalui fitur **Edit Data User** di tab Kelola Siswa & Guru.

---

## BAB 3 — PANDUAN SISWA PKL

### 3.1 Tampilan Awal Setelah Login

Setelah login sebagai siswa, Anda akan melihat:
- **Nama dan NISN** di bagian atas
- **Peta Lokasi PKL** dengan titik lokasi PKL dan posisi Anda saat ini
- **Status GPS** (dalam/luar radius)
- Tombol **[ABSEN MASUK]** dan **[ABSEN PULANG]**
- Menu bawah: Absensi | Log Presensi | Izin/Sakit | Jurnal | Profil

### 3.2 Cara Absen Masuk

**Syarat:**
- GPS aktif dan akurat (icon GPS hijau)
- Belum absen masuk hari ini

**Langkah:**
1. Buka tab **Absensi**
2. Pastikan titik biru (posisi Anda) berada dalam lingkaran geofence
3. Klik **[▶ ABSEN MASUK]**
4. Modal kamera terbuka — arahkan ke wajah Anda
5. Klik **[📸 AMBIL FOTO]**
6. Konfirmasi: "✅ Absen Masuk berhasil! HH:MM WIB — Hadir"

**Status yang mungkin muncul:**
- `Hadir` — dalam radius PKL
- `Luar Radius (XXXm)` — di luar radius tapi tetap terabsen
- `Error: GPS tidak tersedia` — aktifkan GPS di pengaturan HP

### 3.3 Cara Absen Pulang

Prosedur sama dengan absen masuk, klik **[▶ ABSEN PULANG]**.

> ⚠️ Absen masuk dan pulang hanya bisa **1 kali per hari**. Jika sudah absen keduanya, tombol tidak bisa diklik lagi hari ini.

### 3.4 Auto-Alpa

Jika hingga akhir hari Anda tidak absen masuk DAN tidak absen pulang, sistem otomatis mencatat **Alpa** untuk hari tersebut. Alpa dihitung sejak tanggal Anda pertama kali diupload ke sistem (pkl_start_date).

### 3.5 Melihat Log Presensi

1. Buka tab **Log Presensi**
2. Tampil daftar kehadiran harian: tanggal, jam masuk, jam pulang, status
3. Status: Hadir | Izin | Sakit | Alpa | Luar Radius

### 3.6 Pengajuan Izin / Sakit

1. Buka tab **Izin/Sakit**
2. Pilih jenis: **Izin** atau **Sakit**
3. Isi tanggal mulai dan tanggal selesai
4. Tulis keterangan / alasan
5. Klik **[📤 KIRIM PENGAJUAN]**
6. Status pengajuan: **Menunggu** → **Disetujui** / **Ditolak**

> Pengajuan yang disetujui guru/admin akan otomatis mengubah status Alpa menjadi Izin/Sakit pada rentang tanggal yang diajukan.

### 3.7 Mengisi Jurnal Harian

1. Buka tab **Jurnal**
2. Tanggal otomatis terisi hari ini
3. Tulis narasi kegiatan (1 kali per hari)
4. Opsional: tambah foto kegiatan
5. Klik **[💾 SIMPAN JURNAL]**

### 3.8 Profil & Pengaturan

Tab **Profil** menampilkan:
- Data diri: nama, NISN, kelas, sekolah
- Lokasi PKL + koordinat GPS
- Nama guru pembimbing
- Tombol **[🌙/☀️]** untuk ganti tema gelap/terang

---

## BAB 4 — PANDUAN GURU PEMBIMBING

### 4.1 Tampilan Awal Setelah Login

Setelah login sebagai guru:
- Statistik siswa bimbingan (hadir hari ini, belum absen, alpa)
- Peta lokasi SMKN 9 Malang
- Tombol **[🔍 ABSEN MONITORING]**
- Menu: Monitoring | Log Presensi | Persetujuan | Daftar Siswa | Profil

### 4.2 Absen Monitoring Kunjungan PKL

Guru menggunakan tombol ini saat mengunjungi lokasi PKL siswa untuk monitoring langsung.

**Langkah:**
1. Pergi ke lokasi PKL siswa yang dikunjungi
2. Klik **[🔍 ABSEN MONITORING]**
3. Modal kamera terbuka — foto selfie
4. Pilih siswa/PKL yang dikunjungi dari dropdown
5. Tulis catatan kunjungan (opsional)
6. Klik **[📸 AMBIL FOTO & SIMPAN]**
7. Log monitoring tersimpan dan tampil di Cetak Lengkap

### 4.3 Melihat Daftar Siswa Bimbingan

Tab **Kelola Siswa & Guru** (atau **Daftar User**):
- Hanya menampilkan siswa dengan field `supervisor` = nama guru yang login
- Bisa dicari berdasarkan nama, username, kelas, atau lokasi PKL
- Klik **[Edit Data]** untuk melihat/edit data siswa

### 4.4 Mengubah Lokasi PKL Siswa

1. Klik **[Edit Data]** pada baris siswa
2. Ubah **Lokasi PKL**
3. Sistem otomatis mencari koordinat GPS via Nominatim
4. Perubahan dikirim sebagai **pengajuan** ke Admin
5. Admin menyetujui → koordinat tersimpan permanen

> Guru tidak bisa langsung mengubah koordinat — harus melalui persetujuan Admin.

### 4.5 Persetujuan Izin/Sakit Siswa

1. Buka tab **Persetujuan Pengajuan**
2. Lihat daftar izin pending dari siswa bimbingan
3. Klik **[✅ Setujui]** atau **[❌ Tolak]**
4. Jika disetujui: status log siswa otomatis berubah dari Alpa ke Izin/Sakit

### 4.6 Cetak Laporan (Siswa Bimbingan)

1. Buka tab **Dashboard** atau **Log Presensi**
2. Pilih filter bulan (opsional)
3. Klik tombol cetak yang tersedia:
   - **[📊 Cetak Statistik]** — grafik + tabel statistik
   - **[📋 Cetak Rekap]** — rekap kehadiran semua siswa bimbingan
   - **[📄 Cetak Lengkap]** — laporan lengkap per siswa (peta + tabel harian)
4. Modal preview muncul → klik **[💾 Simpan PDF]**

---

## BAB 5 — PANDUAN MASTER ADMIN

### 5.1 Tampilan Awal Setelah Login

Dashboard admin menampilkan:
- Total siswa, guru, hadir hari ini
- Grafik kehadiran realtime
- Notifikasi akun & izin pending
- Akses ke semua fitur sistem

### 5.2 Import Data Massal Siswa & Guru

**Format file CSV:**
```
role,nama,nomor_induk,username,password,kelas,sekolah,lokasi_pkl,guru_pembimbing
siswa,NAMA SISWA,123456,username1,pass123,XI RPL 1,SMK Negeri 9 Malang,Nama Tempat PKL,Nama Guru
guru,NAMA GURU,NIP,username.guru,pass456,,SMK Negeri 9 Malang,SMK Negeri 9 Malang,
```

**Aturan:**
- `role`: wajib diisi `siswa` atau `guru`
- `nomor_induk`: NISN (siswa) atau NIP (guru), boleh kosong
- `username`: unik, tidak boleh duplikat
- `password`: minimal 6 karakter
- `kelas`: hanya untuk siswa (guru kosongkan)
- `lokasi_pkl`: nama lengkap tempat PKL siswa
- `guru_pembimbing`: nama guru yang membimbing siswa ini

**Langkah:**
1. Buka tab **Kelola Siswa & Guru**
2. Klik **[📥 Download Template CSV]**
3. Isi data di template
4. Upload file CSV
5. Klik **[🚀 Import Sekarang]**
6. Periksa laporan validasi

**Setelah import:**
- Sistem otomatis geocoding koordinat PKL via Nominatim
- Lokasi yang pernah di-geocode diambil dari cache (lebih cepat)
- Koordinat tersimpan di database untuk semua perangkat

### 5.3 Kelola Data User

**Edit user:**
1. Cari user di tabel (gunakan kotak pencarian)
2. Klik **[Edit Data]**
3. Ubah data yang diperlukan
4. Klik **[💾 Simpan Perubahan]**

**Hapus user:**
1. Klik **[Edit Data]** → scroll bawah
2. Klik **[🗑️ Hapus User]**
3. Konfirmasi penghapusan

**Reset password:**
1. Di modal Edit Data
2. Isi kolom Password Baru
3. Simpan perubahan

### 5.4 Pengaturan Kop Surat & TTD

Untuk tampilan yang benar di laporan PDF, isi data di **Profil & Pengaturan**:

| Field | Keterangan |
|-------|-----------|
| Nama Sekolah | Muncul di kop surat dan judul laporan |
| Kepala Sekolah | TTD tengah di semua laporan |
| NIP Kepala Sekolah | Muncul di bawah TTD |
| Waka Humas | TTD kiri di semua laporan |
| NIP Waka Humas | Muncul di bawah TTD |
| Ketua Pokja PKL | TTD kanan di laporan admin |
| NIP Ketua Pokja PKL | Muncul di bawah TTD |
| Kota | Muncul di baris tanggal TTD |

### 5.5 Persetujuan Akun & Perubahan PKL

Tab **Persetujuan Pengajuan** menampilkan:
- **Akun guru baru** yang menunggu persetujuan
- **Edit lokasi PKL** yang diajukan guru

Klik **[✅ Setujui]** atau **[❌ Tolak]** untuk setiap pengajuan.

### 5.6 Cetak Laporan (Semua Siswa)

**Filter tersedia:**
- Semua Guru (ALL) — semua siswa
- Per Guru Pembimbing — siswa bimbingan guru tertentu
- Per Bulan

**Tip performa:**
> Cetak Lengkap untuk 300+ siswa membutuhkan waktu lebih lama. Disarankan filter per guru pembimbing (15-30 siswa) untuk hasil lebih cepat.

### 5.7 Reset Database

> ⚠️ **PERHATIAN:** Tindakan ini tidak bisa dibatalkan!

Reset akan menghapus:
- Semua data siswa dan guru (kecuali akun admin)
- Semua log presensi
- Semua data izin/sakit
- Semua jurnal harian

Yang TIDAK terhapus:
- Akun Master Admin
- Cache koordinat PKL (tetap ada untuk import ulang)

**Langkah:**
1. Buka tab **Profil & Pengaturan**
2. Scroll ke bagian **Reset Database**
3. Klik **[🗑️ Reset Database]**
4. Konfirmasi 2 kali
5. Semua data terhapus, akun admin tetap aktif

---

## BAB 6 — CETAK LAPORAN PDF

### 6.1 Jenis Laporan

| Laporan | Konten | Siapa |
|---------|--------|-------|
| Statistik | Grafik kehadiran, tabel per siswa, grafik per guru | Admin + Guru |
| Rekap | Tabel semua absensi bulan ini, per siswa | Admin + Guru |
| Cetak Lengkap | Per siswa: peta PKL, tabel harian lengkap, jurnal | Admin + Guru |

### 6.2 Struktur TTD di Laporan

Semua laporan menggunakan TTD 3-kolom:

```
┌────────────────┬────────────────┬────────────────┐
│   Waka Humas,  │  Mengetahui,   │ Ketua Pokja PKL│  (Admin)
│                │ Kepala SMKN 9, │ / Guru Pembimb │  (Guru)
│                │                │                │
│ _____________  │ _____________  │ _____________  │
│ Nama           │ Nama           │ Nama           │
│ NIP. ...       │ NIP. ...       │ NIP. ...       │
└────────────────┴────────────────┴────────────────┘
```

Data TTD diambil dari Pengaturan Sekolah.

### 6.3 Cara Menyimpan PDF

1. Klik tombol cetak yang diinginkan
2. Tunggu modal preview muncul (beberapa detik)
3. Klik **[💾 Simpan PDF]** di toolbar atas
4. File tersimpan ke folder Downloads HP/browser

### 6.4 Cetak Langkah via Browser

Alternatif: Di modal preview, tekan `Ctrl+P` (Windows) atau `Cmd+P` (Mac) untuk membuka dialog cetak browser, lalu pilih "Save as PDF".

---

## BAB 7 — TROUBLESHOOTING

### 7.1 Masalah Login

| Masalah | Solusi |
|---------|--------|
| Buka link langsung masuk ke akun | Logout dulu. Untuk HP bersama, jangan centang "Ingat Saya". |
| Password salah | Hubungi admin untuk reset password. |
| Akun tidak aktif | Admin perlu menyetujui akun di tab Persetujuan. |

### 7.2 Masalah Absensi

| Masalah | Solusi |
|---------|--------|
| Tombol absen tidak bisa diklik | Sudah absen hari ini, atau GPS tidak tersedia. |
| GPS tidak akurat | Tunggu beberapa detik, aktifkan mode akurasi tinggi. |
| Status "Luar Radius" padahal di PKL | Koordinat PKL mungkin belum tepat. Minta admin cek lokasi PKL. |
| Kamera tidak terbuka | Beri izin kamera di pengaturan HP → Izin Aplikasi. |

### 7.3 Masalah Koordinat PKL

| Masalah | Solusi |
|---------|--------|
| Titik PKL di peta salah | Admin edit lokasi PKL → geocode ulang otomatis. |
| Semua titik sama di SMKN9 | Tunggu geocoding selesai (1.2 detik/lokasi). |
| Koordinat tidak berubah setelah edit | Reload halaman (Ctrl+F5 / hard refresh). |

### 7.4 Masalah Cetak Laporan

| Masalah | Solusi |
|---------|--------|
| Cetak sangat lambat / freeze | Filter per guru pembimbing, bukan semua. Max 50 siswa/cetak. |
| Peta tidak muncul di cetak | Aktifkan koneksi internet. |
| PDF kosong / blank | Tunggu loading selesai sebelum klik Simpan PDF. |
| TTD tidak ada nama | Isi Pengaturan Sekolah: nama Kepsek, Waka Humas, Pokja PKL. |

---

## LAMPIRAN

### A. Format CSV Import

```
role,nama,nomor_induk,username,password,kelas,sekolah,lokasi_pkl,guru_pembimbing
siswa,Nasywa Nata Neilla,1234567890,nasywa69,pass123,XI RPL 1,SMK Negeri 9 Malang,CV. Lintas Tech,Budi Santoso
siswa,Randy Jadmiko,0987654321,randy70,pass456,XI RPL 1,SMK Negeri 9 Malang,AHASS Asia Sulfat,Budi Santoso
guru,Budi Santoso,198501012010011001,budi.santoso,guru123,,SMK Negeri 9 Malang,SMK Negeri 9 Malang,
guru,Siti Rahma,197803142005012001,siti.rahma,guru456,,SMK Negeri 9 Malang,SMK Negeri 9 Malang,
```

### B. Informasi Server

- **URL:** https://103.153.190.69:8443
- **Server:** Proxmox CT102 — Debian Linux
- **Database:** MariaDB — sigap_pkl
- **PHP:** 8.2 + Nginx
- **APK Min Android:** 8.0 (API 26)

### C. Kontak & Support

Untuk bantuan teknis:
- SSH ke server: `root@103.153.190.69` (SSH key required)
- Script maintenance ada di folder proyek
- Backup otomatis: folder `backup_*/` di root proyek

---

*SIGAP PKL K9 — SMK Negeri 9 Malang — Versi 2.1.63 — 3 September 2026*
