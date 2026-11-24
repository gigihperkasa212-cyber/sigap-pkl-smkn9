# SIGAP PKL K9 — Cara Deploy + Build APK

## Setup Awal (sekali saja)

**Langkah 1 — Daftarkan SSH Key:**
```
Klik dua kali: LANGKAH_1_DAFTAR_KEY.bat
→ Masukkan password root server (103.153.190.69)
→ Setelah ini tidak perlu password lagi
```

**Langkah 2 — Setup Server:**
```
Klik dua kali: LANGKAH_2_SETUP_SERVER.bat
→ Upload Android project ke server
→ Install JDK 17 + Android SDK (5-15 menit)
```

---

## Deploy Sehari-hari

```
Klik dua kali: deploy_all.bat
```

Yang terjadi otomatis:
1. Upload file yang berubah (app.js, index.html, api.php)
2. Server build APK Release
3. Deploy web ke container Nginx
4. APK otomatis tersimpan di folder `output\`

---

## Struktur File

```
LANGKAH_1_DAFTAR_KEY.bat    ← Jalankan sekali (daftarkan SSH key)
LANGKAH_2_SETUP_SERVER.bat  ← Jalankan sekali (install JDK di server)
deploy_all.bat               ← Jalankan tiap deploy
server_setup.sh              ← Script install JDK (dijalankan di server)
server_build.sh              ← Script build APK (dijalankan di server)
output\                      ← APK hasil build tersimpan di sini
```

---

## Info Server

- IP: 103.153.190.69
- Container: CT-102
- Web path: /var/www/html/SIGAP-SMKN9-Official
- Build path: /opt/sigap-build
- SSH key: `%USERPROFILE%\.ssh\sigap_pkl_key`
