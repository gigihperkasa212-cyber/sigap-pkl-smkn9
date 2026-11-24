# Setup GitHub Secrets untuk Build APK

Sebelum workflow bisa build APK, tambahkan 4 secrets di GitHub:

## Cara Menambahkan Secrets

1. Buka repo GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Klik **New repository secret**
3. Tambahkan secrets berikut:

---

## Secrets yang Dibutuhkan

| Secret Name | Nilai | Keterangan |
|---|---|---|
| `KEYSTORE_BASE64` | *(lihat cara encode di bawah)* | File `release.keystore` di-encode Base64 |
| `KEYSTORE_PASSWORD` | *(password keystore Anda)* | Password keystore — **jangan tulis di sini** |
| `KEY_ALIAS` | `sigap_key` | Alias key di keystore |
| `KEY_PASSWORD` | *(password key Anda)* | Password key — **jangan tulis di sini** |

---

## Cara Encode Keystore ke Base64

Jalankan perintah ini di PowerShell (dari folder `android/`):

```powershell
$bytes = [System.IO.File]::ReadAllBytes("d:\absen pkl update\android\release.keystore")
$b64 = [System.Convert]::ToBase64String($bytes)
$b64 | Set-Content "keystore_base64.txt"
Write-Host "File keystore_base64.txt siap di-copy ke GitHub Secret KEYSTORE_BASE64"
```

Lalu copy isi file `keystore_base64.txt` ke secret `KEYSTORE_BASE64`.

**PENTING:** Hapus `keystore_base64.txt` setelah selesai, dan jangan pernah commit file keystore atau base64-nya!

---

## Cara Trigger Build

**Otomatis:** Setiap push ke branch `main`/`master` yang mengubah file di:
- `android/`, `js/`, `css/`, `index.html`, `www/`

**Manual:**
1. Buka repo → **Actions** → **Build & Release APK**
2. Klik **Run workflow**
3. Isi version name (opsional) → **Run workflow**

---

## Hasil Build

APK tersedia di dua tempat:
1. **Artifacts** — di tab Actions, klik run → download artifact
2. **GitHub Releases** — otomatis dibuat di tab Releases dengan tag `v2.2.8`
