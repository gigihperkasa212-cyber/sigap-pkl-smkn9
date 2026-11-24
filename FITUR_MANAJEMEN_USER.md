# 📋 Fitur Manajemen User - Update

**Tanggal Update:** 11 Agustus 2026  
**Status:** ✅ Implemented

---

## 🎯 Overview

Sistem manajemen user untuk Master Admin dengan pemisahan field berdasarkan role (Siswa vs Guru/Pembimbing).

---

## ✨ Fitur Baru

### 1. **Form Tambah User Dinamis**

Form secara otomatis menyesuaikan field yang ditampilkan berdasarkan role yang dipilih.

#### 🎓 Role: Siswa

**Field yang Ditampilkan:**
- ✅ NISN / Username
- ✅ Nama Lengkap
- ✅ Password
- ✅ Sekolah
- ✅ **Kelas** (Baru!) - Input manual, contoh: "XII RPL 1"
- ✅ **Guru Pembimbing** (Baru!) - Dropdown otomatis dari daftar guru
- ✅ **Lokasi PKL** - Auto-detect koordinat dari Google Maps

**Catatan Penting:**
- **Latitude & Longitude PKL:** Tidak perlu input manual, sistem otomatis mendeteksi dari Google Maps dengan presisi tinggi
- **Kelas:** Wajib diisi untuk identifikasi siswa
- **Guru Pembimbing:** Dropdown otomatis terisi dari daftar guru yang sudah terdaftar

#### 👨‍🏫 Role: Guru / Pembimbing

**Field yang Ditampilkan:**
- ✅ NIP / Username
- ✅ Nama Lengkap
- ✅ Password
- ✅ Sekolah
- ✅ **Instansi Mitra** - Otomatis: "SMK Negeri 9 Malang" (Read-only)

**Field yang TIDAK Ditampilkan:**
- ❌ Kelas (tidak relevan untuk guru)
- ❌ Lokasi PKL (tidak relevan untuk guru)
- ❌ Guru Pembimbing (tidak relevan untuk guru)

**Koordinat Otomatis:**
- Lokasi guru otomatis di **SMKN 9 Malang**
- Latitude: `-7.9666`
- Longitude: `112.6326`

---

## 📊 Tampilan Tabel User

### Untuk Siswa
Menampilkan informasi:
- **Kelas** (jika ada)
- **Guru Pembimbing**
- **GPS PKL** dengan label "(Auto)" - koordinat otomatis dari Google Maps

### Untuk Guru
Menampilkan informasi:
- **Instansi:** SMKN 9 Malang
- **GPS:** Koordinat tetap SMKN 9 Malang

---

## 🔄 Alur Kerja

### Menambah Siswa Baru

1. Login sebagai **Master Admin**
2. Buka tab **"Admin / Guru"**
3. Pilih sub-tab **"Kelola Siswa & Guru"**
4. Di form "Tambah User":
   - Pilih Role: **Siswa**
   - Form akan menampilkan field siswa
5. Isi data:
   ```
   NISN: 0054819203
   Nama: Budi Santoso
   Password: 123456
   Kelas: XII RPL 1
   Guru Pembimbing: [Pilih dari dropdown]
   Lokasi PKL: PT. Tech Solution Indonesia
   ```
6. Koordinat GPS akan otomatis terdeteksi dari nama lokasi PKL
7. Klik **"Simpan User & Create Password"**

### Menambah Guru Baru

1. Login sebagai **Master Admin**
2. Buka tab **"Admin / Guru"**
3. Pilih sub-tab **"Kelola Siswa & Guru"**
4. Di form "Tambah User":
   - Pilih Role: **Guru / Pembimbing**
   - Form akan menampilkan field guru
5. Isi data:
   ```
   NIP: 198410312011011008
   Nama: Ahmad Hidayat, S.Pd.
   Password: 123456
   Instansi: SMK Negeri 9 Malang (otomatis)
   ```
6. Koordinat GPS otomatis di SMKN 9 Malang
7. Klik **"Simpan User & Create Password"**

---

## 🗺️ Auto-Detect GPS Koordinat

### Untuk Siswa (Lokasi PKL)

**Cara Kerja:**
1. Admin input nama lokasi PKL: "PT. Tech Solution Indonesia"
2. Sistem otomatis mendeteksi koordinat dari Google Maps
3. Koordinat tersimpan dengan **presisi tinggi**
4. Tidak perlu input Latitude & Longitude manual

**Contoh:**
```
Input: PT. Tech Solution Indonesia, Malang
Output: 
  Latitude: -7.9445
  Longitude: 112.6345
```

### Untuk Guru (Instansi Mitra)

**Koordinat Tetap:**
```
Lokasi: SMK Negeri 9 Malang
Latitude: -7.9666
Longitude: 112.6326
```

---

## 📝 Template Import CSV

Untuk import data masal, format CSV harus menyesuaikan dengan field baru:

### Siswa
```csv
role,nomor_induk,name,password,kelas,supervisor,pklLocation
siswa,0054819203,Budi Santoso,123456,XII RPL 1,Gigih Perkasa,PT. Tech Solution
siswa,0054819204,Siti Nurhaliza,123456,XII RPL 1,Gigih Perkasa,PT. Maju Jaya
```

### Guru
```csv
role,nomor_induk,name,password
guru,198410312011011008,Ahmad Hidayat,123456
guru,198505152012011002,Rina Amalia,123456
```

**Catatan:**
- Guru tidak perlu kolom `kelas`, `supervisor`, `pklLocation`
- Koordinat siswa otomatis terdeteksi dari `pklLocation`
- Koordinat guru otomatis di SMKN 9 Malang

---

## 🔐 Validasi & Keamanan

### Validasi Input
- ✅ NISN/NIP wajib unique
- ✅ Nama lengkap wajib diisi
- ✅ Password minimal 1 karakter
- ✅ Kelas wajib untuk siswa
- ✅ Guru pembimbing harus dipilih dari daftar yang ada

### Keamanan
- ✅ Hanya Master Admin yang bisa akses manajemen user
- ✅ Guru pembimbing hanya bisa lihat siswa bimbingannya
- ✅ Password tersimpan visible untuk admin (untuk recovery)

---

## 🎨 UI/UX Improvements

### Toggle Dinamis
- Form berubah sesuai role yang dipilih
- Field yang tidak relevan otomatis hidden
- Smooth transition saat toggle

### Dropdown Guru Pembimbing
- Otomatis populate dari daftar guru
- Menampilkan nama + NIP
- Auto-select jika hanya ada 1 guru

### Visual Indicators
- 🎓 Icon siswa berbeda dari 👨‍🏫 guru
- 🗺️ Label "GPS (Auto)" untuk koordinat otomatis
- 🔒 Field read-only dengan style khusus

---

## 🧪 Testing Checklist

### Tambah Siswa
- [ ] Form menampilkan field kelas
- [ ] Form menampilkan dropdown guru pembimbing
- [ ] Form menampilkan input lokasi PKL
- [ ] Koordinat GPS terdeteksi otomatis
- [ ] Data tersimpan dengan benar

### Tambah Guru
- [ ] Form TIDAK menampilkan field kelas
- [ ] Form TIDAK menampilkan dropdown guru pembimbing
- [ ] Form menampilkan instansi (read-only)
- [ ] Koordinat otomatis di SMKN 9 Malang
- [ ] Data tersimpan dengan benar

### Tabel User
- [ ] Siswa menampilkan kelas (jika ada)
- [ ] Siswa menampilkan guru pembimbing
- [ ] Siswa menampilkan GPS dengan label "(Auto)"
- [ ] Guru menampilkan instansi SMKN 9
- [ ] Guru menampilkan GPS SMKN 9

---

## 📞 Support

Jika ada pertanyaan atau masalah:
- **IT Support:** Master Admin
- **Email:** admin@smkn9malang.sch.id

---

**Dokumentasi dibuat:** 11 Agustus 2026  
**Versi:** 2.0  
**Status:** Production Ready ✅
