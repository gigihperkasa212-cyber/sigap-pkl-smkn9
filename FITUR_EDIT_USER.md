# 📝 Fitur Edit User - Management

**Tanggal Update:** 11 Agustus 2026  
**Status:** ✅ Implemented

---

## 🎯 Overview

Fitur edit user untuk Master Admin dengan kemampuan edit username dan ganti guru pembimbing siswa.

---

## ✨ Fitur Baru

### 1. **Edit Username**

Master Admin dapat mengubah username user tanpa mengubah data lainnya.

**Cara Kerja:**
1. Klik tombol **"Edit Username"** (ikon pensil biru) di tabel user
2. Dialog akan muncul menampilkan:
   - Nama lengkap user
   - Username saat ini
   - Input untuk username baru
3. Masukkan username baru
4. Sistem akan validasi:
   - ✅ Username tidak boleh kosong
   - ✅ Username tidak boleh duplicate dengan user lain
   - ❌ Username Master Admin tidak dapat diubah
5. Klik OK untuk menyimpan

**Contoh:**
```
User: Budi Santoso
Username lama: budi123
Username baru: budi_santoso_xii
```

**Proteksi:**
- Master Admin (username: `admin`) **tidak dapat diubah**
- Validasi otomatis mencegah username duplicate

---

### 2. **Ganti Guru Pembimbing** (Khusus Siswa)

Master Admin dapat mengubah guru pembimbing siswa melalui dropdown dari database.

**Cara Kerja:**
1. Klik tombol **"Ganti Pembimbing"** (ikon ungu) di baris siswa
2. Dialog akan muncul menampilkan:
   - Nama & NISN siswa
   - Guru pembimbing saat ini
   - Daftar semua guru yang tersedia
3. Pilih nomor guru pembimbing baru
4. Sistem akan update:
   - Field `supervisor` siswa
   - Subtext siswa (jika ada kelas)
   - Sync ke backend server

**Contoh:**
```
Siswa: Budi Santoso (NISN: 0054819203)
Pembimbing lama: Gigih Perkasa
Pembimbing baru: Ahmad Hidayat

Daftar Guru:
1. Gigih Perkasa, ST., M.Pd. (NIP: 198410311234)
2. Ahmad Hidayat, S.Pd. (NIP: 198505151235)
3. Rina Amalia, S.Kom. (NIP: 199001011236)

Masukkan pilihan: 2
```

**Validasi:**
- ✅ Hanya untuk siswa (role: siswa)
- ✅ Dropdown otomatis dari database guru
- ✅ Menampilkan nama + NIP guru
- ❌ Tidak bisa untuk guru/admin

---

## 🎨 Tampilan Tabel User

### Tombol Aksi Baru:

**Untuk Semua User (Siswa & Guru):**
```
[📝 Edit Username] - Edit username user
[🔑 Reset Password] - Ubah password
[📍 Edit PKL] - Edit lokasi PKL
[🗑️ Hapus] - Hapus user
```

**Khusus Untuk Siswa:**
```
[👨‍🏫 Ganti Pembimbing] - Ganti guru pembimbing
```

**Layout Tombol:**
```
┌─────────────────────────────────────────────────┐
│ Aksi:                                           │
│ [Edit Username] [Ganti Pembimbing] [Edit PKL]  │
│ [Reset Password] [Hapus]                        │
└─────────────────────────────────────────────────┘
```

---

## 🔄 Alur Kerja

### Edit Username

1. **Login** sebagai Master Admin
2. **Buka** tab Admin/Guru → Kelola Siswa & Guru
3. **Cari** user yang ingin diedit
4. **Klik** tombol **"Edit Username"**
5. **Masukkan** username baru
6. **Simpan** → Username berhasil diubah

### Ganti Guru Pembimbing Siswa

1. **Login** sebagai Master Admin
2. **Buka** tab Admin/Guru → Kelola Siswa & Guru
3. **Cari** siswa yang ingin diganti pembimbingnya
4. **Klik** tombol **"Ganti Pembimbing"** (hanya muncul untuk siswa)
5. **Lihat** daftar guru yang tersedia
6. **Pilih** nomor guru baru
7. **Simpan** → Guru pembimbing berhasil diganti

---

## 🛡️ Keamanan & Validasi

### Edit Username

**Validasi:**
- ❌ Username kosong → Ditolak
- ❌ Username duplicate → Ditolak
- ❌ Edit username Master Admin → Ditolak
- ✅ Username unique → Diterima

**Pesan Error:**
```
✗ Username Master Admin tidak dapat diubah!
✗ Username sudah digunakan oleh user lain!
✗ User tidak ditemukan!
```

**Pesan Success:**
```
✓ Username berhasil diubah menjadi: [username_baru]
```

### Ganti Guru Pembimbing

**Validasi:**
- ❌ User bukan siswa → Ditolak
- ❌ Tidak ada guru tersedia → Ditolak
- ❌ Pilihan nomor invalid → Ditolak
- ✅ Pilihan valid → Diterima

**Pesan Error:**
```
✗ Guru Pembimbing hanya bisa diubah untuk siswa!
✗ Tidak ada guru pembimbing yang tersedia!
✗ Pilihan tidak valid!
```

**Pesan Success:**
```
✓ Guru pembimbing [Nama Siswa] berhasil diganti menjadi: [Nama Guru]
```

---

## 📊 Update Data

### Edit Username - Yang Berubah:

```javascript
{
  username: "username_baru",  // ✓ BERUBAH
  nomor_induk: "...",          // Tetap
  name: "...",                 // Tetap
  password: "...",             // Tetap
  role: "...",                 // Tetap
  // ... field lain tetap
}
```

### Ganti Guru Pembimbing - Yang Berubah:

```javascript
{
  supervisor: "Nama Guru Baru",  // ✓ BERUBAH
  subtext: "NISN: ... • Kelas • Pembimbing: Guru Baru",  // ✓ BERUBAH (optional)
  // ... field lain tetap
}
```

---

## 🔄 Sync Backend API

### Edit Username

**Endpoint:**
- `/api/update_user` (Python)
- `api.php?action=update_user` (PHP)

**Payload:**
```json
{
  "user_id": 12345,
  "username": "new_username",
  "nomor_induk": "0054819203",
  "name": "Budi Santoso"
}
```

### Ganti Guru Pembimbing

**Endpoint:**
- `/api/update_supervisor` (Python)
- `api.php?action=update_supervisor` (PHP)

**Payload:**
```json
{
  "user_id": 12345,
  "student_name": "Budi Santoso",
  "old_supervisor": "Gigih Perkasa",
  "new_supervisor": "Ahmad Hidayat",
  "supervisor_nip": "198505151235"
}
```

---

## 🧪 Testing Checklist

### Edit Username
- [ ] Klik tombol "Edit Username" → Dialog muncul
- [ ] Username kosong → Error ditampilkan
- [ ] Username duplicate → Error ditampilkan
- [ ] Edit username Master Admin → Error ditampilkan
- [ ] Username valid → Berhasil tersimpan
- [ ] Tabel user terupdate otomatis
- [ ] Data sync ke backend

### Ganti Guru Pembimbing
- [ ] Tombol "Ganti Pembimbing" hanya muncul untuk siswa
- [ ] Tombol tidak muncul untuk guru/admin
- [ ] Klik tombol → Dialog dengan daftar guru muncul
- [ ] Pilih guru baru → Berhasil tersimpan
- [ ] Info pembimbing di tabel terupdate
- [ ] Subtext siswa terupdate (jika ada kelas)
- [ ] Data sync ke backend

---

## 💡 Tips & Best Practices

### Edit Username
1. **Username Konsisten:** Gunakan format konsisten (lowercase, underscore, dll)
2. **Username Bermakna:** Gunakan username yang mudah diingat siswa/guru
3. **Backup Data:** Catat username lama sebelum diubah
4. **Notify User:** Beritahu user jika username mereka diubah

### Ganti Guru Pembimbing
1. **Koordinasi:** Koordinasikan dengan guru pembimbing lama & baru
2. **Alasan Jelas:** Dokumentasikan alasan pergantian
3. **Update Siswa:** Beritahu siswa tentang guru pembimbing baru
4. **Load Balance:** Pastikan distribusi siswa merata antar guru

---

## 🎯 Use Cases

### Use Case 1: Siswa Pindah Username
```
Situasi: Siswa lupa username login lama
Solusi: Admin ubah username ke format yang mudah diingat
Action: Klik "Edit Username" → Input username baru
Result: Siswa bisa login dengan username baru
```

### Use Case 2: Redistribusi Siswa Bimbingan
```
Situasi: Guru pembimbing A overload, Guru B underload
Solusi: Pindahkan beberapa siswa dari A ke B
Action: Klik "Ganti Pembimbing" → Pilih Guru B
Result: Beban guru lebih seimbang
```

### Use Case 3: Guru Resign/Mutasi
```
Situasi: Guru C resign, siswa bimbingannya harus dipindah
Solusi: Pindahkan semua siswa Guru C ke guru lain
Action: Untuk setiap siswa → "Ganti Pembimbing"
Result: Semua siswa tetap punya pembimbing aktif
```

---

## 📞 Support

Jika ada pertanyaan atau masalah:
- **IT Support:** Master Admin
- **Email:** admin@smkn9malang.sch.id

---

**Dokumentasi dibuat:** 11 Agustus 2026  
**Versi:** 2.1  
**Status:** Production Ready ✅


---

## 🆕 Update: Fitur Edit Kelas

**Tanggal Update:** 11 Agustus 2026  
**Status:** ✅ Added

### 3. **📚 Edit Kelas** (Khusus Siswa)

**Fungsi:**
- Edit kelas siswa dengan cepat
- Update otomatis subtext siswa
- Validasi hanya untuk siswa

**Cara Pakai:**
1. Klik tombol **"Edit Kelas"** (ikon hijau 📚) di baris siswa
   - *Hanya muncul untuk baris siswa*
2. Dialog prompt muncul dengan:
   - Nama & NISN siswa
   - Kelas saat ini
   - Input untuk kelas baru
3. Masukkan kelas baru (contoh: `XII RPL 1`)
4. Klik OK untuk menyimpan
5. Sistem update kelas → Selesai

**Contoh:**
```
Siswa: Budi Santoso
NISN: 0054819203
Kelas lama: XI RPL 1
         ↓
Kelas baru: XII RPL 1

Subtext terupdate: "NISN: 0054819203 • XII RPL 1"
```

**Validasi:**
- ✅ Hanya untuk siswa
- ✅ Kelas bisa dikosongkan (hapus kelas)
- ✅ Update subtext otomatis
- ❌ Tidak bisa untuk guru/admin

**Pesan Success:**
```
✓ Kelas [Nama Siswa] berhasil diubah menjadi: [Kelas Baru]
```

**Update Data:**
```javascript
{
  kelas: "XII RPL 1",  // ✓ BERUBAH
  subtext: "NISN: ... • XII RPL 1",  // ✓ BERUBAH
  // ... field lain tetap
}
```

---

## 📊 Layout Tombol Lengkap

### Untuk Siswa:
```
┌────────────────────────────────────────────────┐
│ [📝 Edit Username] [📚 Edit Kelas]            │
│ [👨‍🏫 Ganti Pembimbing]                         │
│ [📍 Edit PKL] [🔑 Password] [🗑️ Hapus]        │
└────────────────────────────────────────────────┘
```

### Untuk Guru:
```
┌────────────────────────────────────────────────┐
│ [📝 Edit Username]                             │
│ [📍 Edit PKL] [🔑 Password] [🗑️ Hapus]        │
└────────────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist Update

### Edit Kelas
- [ ] Tombol "Edit Kelas" hanya muncul untuk siswa ✅
- [ ] Tombol tidak muncul untuk guru/admin ✅
- [ ] Klik tombol → Dialog dengan kelas saat ini muncul ✅
- [ ] Input kelas baru → Berhasil tersimpan ✅
- [ ] Subtext siswa terupdate dengan kelas baru ✅
- [ ] Info kelas di tabel terupdate ✅
- [ ] Kelas bisa dikosongkan (hapus kelas) ✅
- [ ] Data sync ke backend ✅

---

**Update terakhir:** 11 Agustus 2026  
**Versi:** 2.2  
**Status:** Production Ready ✅
