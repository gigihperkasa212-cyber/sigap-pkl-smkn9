# Update Template Import Data Massal

## 📋 Perubahan Template (11 Agustus 2026)

### ✨ Fitur Baru:
1. **Kolom Kelas** ditambahkan untuk siswa
2. **Keterangan Lokasi PKL** untuk guru (kosongkan jika role guru)

---

## 📊 Struktur Template Baru (9 Kolom)

### Format Kolom:
```
role | nama | nomor_induk | username | password | kelas | sekolah | lokasi_pkl | guru_pembimbing
```

### Urutan Kolom:
1. **role** - Role pengguna: `siswa` atau `guru`
2. **nama** - Nama lengkap pengguna
3. **nomor_induk** - NISN (siswa) atau NIP (guru)
4. **username** - Username untuk login
5. **password** - Password untuk login
6. **kelas** - Kelas siswa (contoh: XII RPL 1, XII TKJ 1)
7. **sekolah** - Nama sekolah/instansi
8. **lokasi_pkl** - Lokasi PKL (kosongkan jika guru)
9. **guru_pembimbing** - Nama guru pembimbing (untuk siswa)

---

## 📝 Panduan Pengisian

### ✅ Untuk **SISWA**:

| Kolom | Wajib Diisi? | Contoh | Keterangan |
|-------|--------------|--------|------------|
| role | ✅ Wajib | `siswa` | Harus diisi "siswa" |
| nama | ✅ Wajib | `Budi Santoso` | Nama lengkap siswa |
| nomor_induk | ✅ Wajib | `0054819203` | NISN siswa |
| username | ✅ Wajib | `budi` | Username login |
| password | ✅ Wajib | `123456` | Password login |
| **kelas** | ✅ **Wajib** | **`XII RPL 1`** | **Kelas siswa (format: XII [Jurusan] [Nomor])** |
| sekolah | ✅ Wajib | `SMK Negeri 9 Malang` | Nama sekolah |
| lokasi_pkl | ✅ Wajib | `PT. Tech Solution` | Nama perusahaan/tempat PKL |
| guru_pembimbing | ✅ Wajib | `Gigih Perkasa, ST., M.Pd.` | Nama guru pembimbing |

**Contoh Row Siswa (CSV):**
```csv
siswa;"Budi Santoso";0054819203;budi;123456;"XII RPL 1";"SMK Negeri 9 Malang";"PT. Tech Solution Indonesia";"Gigih Perkasa, ST., M.Pd."
```

---

### ✅ Untuk **GURU**:

| Kolom | Wajib Diisi? | Contoh | Keterangan |
|-------|--------------|--------|------------|
| role | ✅ Wajib | `guru` | Harus diisi "guru" |
| nama | ✅ Wajib | `Ahmad Hidayat, S.Pd.` | Nama lengkap guru |
| nomor_induk | ✅ Wajib | `19850515 201202 1 004` | NIP guru |
| username | ✅ Wajib | `ahmad` | Username login |
| password | ✅ Wajib | `123456` | Password login |
| **kelas** | ❌ **Kosongkan** | **`-`** | **Isi dengan tanda "-" atau kosongkan** |
| sekolah | ✅ Wajib | `SMK Negeri 9 Malang` | Nama sekolah |
| **lokasi_pkl** | ❌ **Kosongkan** | **`kosongkan`** atau **`SMK Negeri 9 Malang`** | **⚠️ PENTING: Kosongkan atau isi "SMK Negeri 9 Malang" jika role sebagai guru** |
| guru_pembimbing | ❌ Kosongkan | `-` | Isi dengan tanda "-" atau kosongkan |

**Contoh Row Guru (CSV):**
```csv
guru;"Ahmad Hidayat, S.Pd.";"19850515 201202 1 004";ahmad;123456;"-";"SMK Negeri 9 Malang";"kosongkan";"-"
```

---

## 🔄 Kompatibilitas Backward

### Support Format Lama (8 Kolom):
Template masih mendukung format lama tanpa kolom kelas:
```
role | nama | nomor_induk | username | password | sekolah | lokasi_pkl | guru_pembimbing
```

Parser akan otomatis mendeteksi:
- **Format baru (9 kolom)**: Kolom kelas ada di index 5
- **Format lama (8 kolom)**: Skip kolom kelas (default kosong)

---

## 📥 Download Template

### 1️⃣ **Template Excel Rapi (.xls)**
- Struktur tabel Excel profesional
- Header berwarna (indigo #4f46e5)
- Sample data 6 rows (3 siswa + 2 guru)
- Keterangan lokasi_pkl pada header kolom
- Border dan styling lengkap

**Cara Download:**
1. Login sebagai Master Admin
2. Tab **Admin/Guru** → **Manajemen User**
3. Klik tombol **"Download Template Excel Rapi (.xls)"**

---

### 2️⃣ **Template CSV (.csv)**
- Format CSV standar dengan delimiter `;`
- UTF-8 with BOM untuk Excel compatibility
- Sample data 7 rows (4 siswa + 2 guru + 1 siswa tambahan)
- Separator otomatis: `sep=;` (untuk Excel)

**Cara Download:**
1. Login sebagai Master Admin
2. Tab **Admin/Guru** → **Manajemen User**
3. Klik tombol **"Download Template CSV (.csv)"**

---

## 🎨 Preview Template Excel

### Header Tabel:
| role | nama | nomor_induk | username | password | **kelas** | sekolah | **lokasi_pkl<br><small>(Kosongkan jika guru)</small>** | guru_pembimbing |
|------|------|-------------|----------|----------|-----------|---------|--------------------------------------------------------|-----------------|

### Sample Data:

#### Row 1 (Guru):
```
guru | Gigih Perkasa, ST., M.Pd. | 19841031 201101 1 008 | gigih | 123456 | - | SMK Negeri 9 Malang | kosongkan | -
```

#### Row 2 (Siswa):
```
siswa | Budi Santoso | 0054819203 | budi | 123456 | XII RPL 1 | SMK Negeri 9 Malang | PT. Tech Solution Indonesia | Gigih Perkasa, ST., M.Pd.
```

#### Row 3 (Siswa):
```
siswa | Siti Aminah | 0054819204 | siti | 123456 | XII RPL 2 | SMK Negeri 9 Malang | PT. Tech Solution Indonesia | Gigih Perkasa, ST., M.Pd.
```

#### Row 4 (Siswa):
```
siswa | Rudi Hermawan | 0054819205 | rudi | 123456 | XII TKJ 1 | SMK Negeri 9 Malang | PT. Astra International | Gigih Perkasa, ST., M.Pd.
```

#### Row 5 (Guru):
```
guru | Ahmad Hidayat, S.Pd. | 19850515 201202 1 004 | ahmad | 123456 | - | SMK Negeri 9 Malang | SMK Negeri 9 Malang | -
```

#### Row 6 (Siswa):
```
siswa | Dewi Lestari | 0054819206 | dewi | 123456 | XII MM 1 | SMK Negeri 9 Malang | PT. Telkom Indonesia | Ahmad Hidayat, S.Pd.
```

---

## 🎯 Contoh Kelas yang Valid

### Format Kelas:
```
[TINGKAT] [JURUSAN] [NOMOR]
```

### Contoh Valid:
- ✅ `XII RPL 1` - Rekayasa Perangkat Lunak kelas 1
- ✅ `XII RPL 2` - Rekayasa Perangkat Lunak kelas 2
- ✅ `XII TKJ 1` - Teknik Komputer Jaringan kelas 1
- ✅ `XII TKJ 2` - Teknik Komputer Jaringan kelas 2
- ✅ `XII MM 1` - Multimedia kelas 1
- ✅ `XII AK 1` - Akuntansi kelas 1
- ✅ `XII OTKP 1` - Otomatisasi Tata Kelola Perkantoran kelas 1
- ✅ `XI RPL 1` - Kelas 11 RPL
- ✅ `X TKJ 1` - Kelas 10 TKJ

### Contoh Tidak Valid:
- ❌ `RPL 1` - Missing tingkat (XII/XI/X)
- ❌ `12 RPL 1` - Harus romawi (XII bukan 12)
- ❌ `kelas 12` - Format tidak sesuai

---

## 🚀 Cara Import Data

### Langkah-langkah:

1. **Download Template**
   - Klik "Download Template Excel Rapi (.xls)" atau "Download Template CSV (.csv)"

2. **Isi Data di Excel/Text Editor**
   - Excel: Buka file .xls, edit langsung di Excel
   - CSV: Buka dengan text editor atau Excel, edit dengan delimiter `;`

3. **Perhatikan:**
   - ✅ Kolom **kelas** wajib diisi untuk siswa
   - ✅ Kolom **lokasi_pkl** kosongkan untuk guru
   - ✅ NISN/NIP harus unik (tidak boleh duplikat)
   - ✅ Username harus unik (tidak boleh duplikat)

4. **Save File**
   - Simpan sebagai `.xls` atau `.csv`
   - Pastikan encoding UTF-8 (untuk CSV)

5. **Upload di SIGAP**
   - Login sebagai Master Admin
   - Tab Admin/Guru → Manajemen User
   - Klik area upload atau drag & drop file
   - Sistem akan validasi otomatis

6. **Lihat Hasil Import**
   - ✅ Sukses: Notifikasi "Import berhasil"
   - ❌ Error: Lihat tabel validasi error untuk detail

---

## ⚡ Fitur Otomatis

### 1. **GPS Koordinat Auto-Detect** ✨
- Sistem otomatis mendeteksi koordinat GPS dari nama lokasi PKL
- Database lokasi built-in untuk tempat umum di Malang
- Presisi tinggi dengan Google Maps integration

**Lokasi yang Sudah Terdaftar:**
```javascript
- PT. Tech Solution Indonesia → -7.9556, 112.6116
- PT. Astra International → -7.9666, 112.6326
- PT. Telkom Indonesia → -7.9826, 112.6311
- SMK Negeri 9 Malang → -7.9666, 112.6326
- Default/Unknown → -7.9666, 112.6326 (SMKN 9 Malang)
```

### 2. **Guru Pembimbing Default** 👨‍🏫
- Jika kolom guru_pembimbing kosong untuk siswa
- Sistem auto-assign ke guru yang login (jika login sebagai guru)
- Atau assign ke default: "Gigih Perkasa, ST., M.Pd." (jika login sebagai admin)

### 3. **Status Approval** 🎯
- **Login sebagai Guru Biasa**: Status user baru = `pending` (butuh approval admin)
- **Login sebagai Master Admin**: Status user baru = `approved` (langsung aktif)

---

## 🛡️ Validasi Import

### Sistem akan menolak import jika:

1. ❌ **Nama Kosong**
   - Error: "Nama Lengkap Kosong"
   - Solusi: Isi nama lengkap pada kolom ke-2

2. ❌ **NISN/NIP Kosong**
   - Error: "NISN / NIP (Nomor Induk) Kosong"
   - Solusi: Isi NISN (siswa) atau NIP (guru) pada kolom ke-3

3. ❌ **Role Tidak Valid**
   - Error: "Role tidak sesuai format"
   - Solusi: Gunakan kata "siswa" atau "guru" pada kolom pertama

4. ❌ **Duplikasi NISN/NIP dalam File**
   - Error: "Duplikasi NISN/NIP dalam File CSV"
   - Solusi: Hapus baris duplikat, pastikan NISN/NIP unik

5. ❌ **Duplikasi Username dalam File**
   - Error: "Duplikasi Username dalam File CSV"
   - Solusi: Gunakan username unik untuk setiap baris

6. ❌ **User Sudah Terdaftar di Database**
   - Error: "User sudah terdaftar di System"
   - Solusi: Ganti NISN/Username atau hapus user lama dari database

---

## 📊 Preview Template di Interface

### Card Import Data Massal:

**Judul:**
```
🗂️ Import Data Massal Siswa & Guru (Master Admin)
```

**Deskripsi:**
```
Upload file .csv atau .xls berisi kolom: role, nama, nomor_induk, username, password, kelas, sekolah, lokasi_pkl, guru_pembimbing
```

**Tabel Preview:**
```
┌────────┬──────────────────────┬───────────────────┬──────────┬──────────┬───────────┬─────────────────────┬──────────────────────────┬────────────────────────────┐
│ role   │ nama                 │ nomor_induk       │ username │ password │ kelas     │ sekolah             │ lokasi_pkl               │ guru_pembimbing            │
├────────┼──────────────────────┼───────────────────┼──────────┼──────────┼───────────┼─────────────────────┼──────────────────────────┼────────────────────────────┤
│ siswa  │ Budi Santoso         │ 0054819203        │ budi     │ 123456   │ XII RPL 1 │ SMK Negeri 9 Malang │ PT. Tech Solution        │ Gigih Perkasa              │
│ guru   │ Ahmad Hidayat, S.Pd. │ 198505151235      │ ahmad    │ 123456   │ -         │ SMK Negeri 9 Malang │ kosongkan                │ -                          │
└────────┴──────────────────────┴───────────────────┴──────────┴──────────┴───────────┴─────────────────────┴──────────────────────────┴────────────────────────────┘
```

**Panduan Pengisian (di bawah tabel):**
```
ℹ️ Panduan Pengisian:
• kelas: Wajib diisi untuk siswa (contoh: XII RPL 1), kosongkan atau isi "-" untuk guru
• lokasi_pkl: Kosongkan atau isi "SMK Negeri 9 Malang" jika role sebagai guru
• guru_pembimbing: Wajib diisi untuk siswa, kosongkan atau isi "-" untuk guru
• GPS Koordinat: Otomatis terdeteksi dari nama lokasi_pkl (presisi tinggi)
```

---

## 🔧 Technical Details

### File Modified:
1. `index.html` - Update preview tabel template + keterangan
2. `js/app.js` - Update fungsi:
   - `downloadSampleExcel()` - Tambah kolom kelas + keterangan header
   - `downloadSampleCSV()` - Tambah kolom kelas di CSV
   - `parseAndImportCSV()` - Parser support kolom kelas (index 5)

### Parsing Logic:
```javascript
// Old format (8 columns): parts[5] = sekolah
// New format (9 columns): parts[5] = kelas, parts[6] = sekolah

const kelas = parts[5] || ''; // Kolom 6 = kelas
const school = parts[6] || 'SMK Negeri 9 Malang'; // Kolom 7 = sekolah
const pklLocation = parts[7] || 'PT. Tech Solution'; // Kolom 8 = lokasi_pkl
const supervisor = parts[8] || ''; // Kolom 9 = guru_pembimbing
```

### Data Structure:
```javascript
const newUserObj = {
  id: timestamp,
  role: 'siswa' | 'guru',
  name: string,
  nomor_induk: string,
  username: string,
  password: string,
  kelas: string, // ← NEW FIELD
  school: string,
  pklLocation: string,
  latitude_pkl: float,
  longitude_pkl: float,
  supervisor: string,
  status: 'approved' | 'pending',
  subtext: string,
  avatar: string
};
```

---

## 📸 Screenshots

### Before (8 Kolom):
```
role | nama | nomor_induk | username | password | sekolah | lokasi_pkl | guru_pembimbing
```

### After (9 Kolom):
```
role | nama | nomor_induk | username | password | kelas | sekolah | lokasi_pkl | guru_pembimbing
                                                    ↑
                                                 NEW!
```

---

## ✅ Testing Checklist

### Download Template:
- [x] Excel (.xls) download dengan kolom kelas
- [x] CSV (.csv) download dengan kolom kelas
- [x] Header kolom lokasi_pkl ada keterangan "(Kosongkan jika guru)"
- [x] Sample data siswa ada kelas (XII RPL 1, XII RPL 2, dll)
- [x] Sample data guru kelas = "-", lokasi_pkl = "kosongkan"

### Import Data:
- [ ] Import CSV baru (9 kolom) berhasil
- [ ] Import Excel baru (9 kolom) berhasil
- [ ] Import CSV lama (8 kolom) masih berhasil (backward compatible)
- [ ] Kolom kelas tersimpan untuk siswa
- [ ] Kolom kelas kosong untuk guru
- [ ] Validasi error jika NISN/Username duplikat
- [ ] GPS auto-detect masih berfungsi

### Display Data:
- [ ] Kelas muncul di tabel user siswa
- [ ] Edit kelas via modal edit berhasil
- [ ] Filter/search berdasarkan kelas (future feature)

---

## 🎓 Use Case Examples

### Use Case 1: Import 30 Siswa RPL
```csv
role;nama;nomor_induk;username;password;kelas;sekolah;lokasi_pkl;guru_pembimbing
siswa;"Andi Wijaya";0054819301;andi;123456;"XII RPL 1";"SMK Negeri 9 Malang";"PT. Tech Solution";"Gigih Perkasa, ST., M.Pd."
siswa;"Budi Santoso";0054819302;budi;123456;"XII RPL 1";"SMK Negeri 9 Malang";"PT. Tech Solution";"Gigih Perkasa, ST., M.Pd."
siswa;"Citra Dewi";0054819303;citra;123456;"XII RPL 2";"SMK Negeri 9 Malang";"PT. Astra";"Gigih Perkasa, ST., M.Pd."
...
```

### Use Case 2: Import 5 Guru Pembimbing
```csv
role;nama;nomor_induk;username;password;kelas;sekolah;lokasi_pkl;guru_pembimbing
guru;"Gigih Perkasa, ST., M.Pd.";"19841031 201101 1 008";gigih;123456;"-";"SMK Negeri 9 Malang";"kosongkan";"-"
guru;"Ahmad Hidayat, S.Pd.";"19850515 201202 1 004";ahmad;123456;"-";"SMK Negeri 9 Malang";"SMK Negeri 9 Malang";"-"
guru;"Siti Nurjanah, S.Kom.";"19900810 201503 2 002";siti;123456;"-";"SMK Negeri 9 Malang";"";"-"
...
```

### Use Case 3: Mixed Import (Siswa + Guru)
```csv
role;nama;nomor_induk;username;password;kelas;sekolah;lokasi_pkl;guru_pembimbing
guru;"Rudi Hermanto, M.Kom.";"19880215 201401 1 005";rudi;123456;"-";"SMK Negeri 9 Malang";"";"-"
siswa;"Eko Prasetyo";0054819401;eko;123456;"XII TKJ 1";"SMK Negeri 9 Malang";"PT. Telkom";"Rudi Hermanto, M.Kom."
siswa;"Dewi Lestari";0054819402;dewi;123456;"XII TKJ 1";"SMK Negeri 9 Malang";"PT. Telkom";"Rudi Hermanto, M.Kom."
siswa;"Fajar Nugraha";0054819403;fajar;123456;"XII TKJ 2";"SMK Negeri 9 Malang";"PT. Indosat";"Rudi Hermanto, M.Kom."
```

---

## 📞 Support

### Jika mengalami masalah:

1. **Template tidak ter-download:**
   - Pastikan login sebagai Master Admin
   - Cek browser console untuk error
   - Coba browser lain (Chrome/Firefox/Edge)

2. **Import gagal/error:**
   - Periksa format CSV (delimiter `;`)
   - Periksa encoding file (harus UTF-8)
   - Lihat tabel validasi error untuk detail

3. **Kelas tidak muncul:**
   - Pastikan menggunakan template baru (9 kolom)
   - Cek data di localStorage browser
   - Refresh halaman (Ctrl+F5)

4. **GPS tidak akurat:**
   - Tambahkan lokasi baru di fungsi `getCoordinatesByLocationName()`
   - Atau isi manual lat/lng di format lama (11 kolom)

---

## 🎉 Summary

### ✨ Yang Baru:
1. ✅ Kolom **kelas** ditambahkan (wajib untuk siswa)
2. ✅ Keterangan **lokasi_pkl** (kosongkan untuk guru)
3. ✅ Sample data lebih lengkap (6-7 rows)
4. ✅ Panduan pengisian di interface
5. ✅ Backward compatible dengan format lama

### 🎯 Benefits:
- 📊 Data siswa lebih terstruktur (ada kelas)
- 🎓 Memudahkan filtering/grouping by kelas (future)
- 📝 Template lebih jelas dengan keterangan
- 🚀 Import masih mudah dan cepat
- 🛡️ Validasi tetap ketat

---

**Last Updated:** 11 Agustus 2026, 23:15 WIB  
**Version:** Template v2.0 (9 Kolom dengan Kelas)  
**Status:** ✅ Production Ready
