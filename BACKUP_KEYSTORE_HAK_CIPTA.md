# 🔑 CATATAN SERTIFIKAT KUNCI RAHASIA (KEYSTORE) & HAK CIPTA HAKI

**Aplikasi**: SIGAP Presensi & PKL SMKN 9 Malang  
**Pemilik Sah / Pemegang Hak Cipta**: Gigih Perkasa  
**Tahun Rilis**: 2026  
**Algoritma Enkripsi**: RSA-2048 Bit (SHA384withRSA)  
**Masa Berlaku Sertifikat**: 10.000 Hari (~27 Tahun)  

---

### 📂 Informasi File Kunci Rahasia (.keystore)
- **Lokasi Berkas di Project**: `android/release.keystore`
- **Alias Key**: `sigap_key`
- **Keystore Password**: `sampurna01`
- **Key Password**: `sampurna01`
- **SHA-256 Fingerprint**: `C3:3E:C9:A2:E5:18:59:46:DD:F7:99:81:81:52:92:95:57:F0:3F:F8:EB:1D:C4:5E:7C:CD:45:C2:0B:7B:2C:33`

---

### 💻 Petunjuk Pindah Komputer / Laptop Lain di Masa Depan:
1. Simpan dan cadangkan file `android/release.keystore` ini ke Flashdisk atau Google Drive pribadi Anda.
2. Ketika ingin mengedit source code di komputer/laptop lain:
   - Copy folder project `absensi pkl` beserta file `android/release.keystore` ke komputer baru.
   - Buka terminal / command prompt di folder `android` lalu jalankan:
     ```cmd
     gradlew assembleRelease
     ```
3. APK baru buatan komputer lain akan tetap ditandatangani atas nama **Gigih Perkasa** dan dapat di-update langsung oleh pengguna HP tanpa bentrok tanda tangan digital.
