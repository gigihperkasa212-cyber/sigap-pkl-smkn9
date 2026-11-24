Set-Location "d:\absen pkl update"

Write-Host "=== SIGAP PKL — Git Init & Push ke GitHub ==="

# 1. Init git repo
Write-Host "[1] git init..."
git init
git branch -M main

# 2. Set identity (diperlukan untuk commit)
git config user.email "gigihperkasa212@github.com"
git config user.name "gigihperkasa212-cyber"

# 3. Add remote
Write-Host "[2] Add remote origin..."
git remote add origin https://github.com/gigihperkasa212-cyber/sigap-pkl-smkn9.git

# 4. Cek file yang akan di-track (pastikan tidak ada credential)
Write-Host "[3] File yang akan di-commit (cek tidak ada credential):"
git status --short | Select-Object -First 50

# 5. Stage semua file
Write-Host "[4] git add..."
git add .

# 6. Verifikasi file sensitif tidak masuk staging
Write-Host "[5] Verifikasi file sensitif tidak ter-stage:"
$sensitif = @("config.php","github.properties","release.keystore","api.php.bak")
foreach ($f in $sensitif) {
    $check = git ls-files --cached $f 2>&1
    if ($check) { Write-Host "  ⚠️  BAHAYA: $f ter-stage!" -ForegroundColor Red }
    else { Write-Host "  ✅ $f tidak ter-stage (aman)" -ForegroundColor Green }
}

# 7. Commit
Write-Host "[6] git commit..."
git commit -m "Initial commit: SIGAP PKL SMKN9 Malang v2.2.202

- Sistem absensi PKL berbasis GPS dan selfie
- Support siswa, guru, dan admin
- Capacitor Android app
- Credential sensitif dipisah (tidak di-commit)"

Write-Host "[7] Push ke GitHub..."
Write-Host "INFO: Akan diminta username dan password GitHub."
Write-Host "      Gunakan Personal Access Token (PAT) sebagai password."
Write-Host "      Cara buat PAT: github.com/settings/tokens -> Generate new token"
Write-Host ""
git push -u origin main

Write-Host "=== SELESAI ==="
