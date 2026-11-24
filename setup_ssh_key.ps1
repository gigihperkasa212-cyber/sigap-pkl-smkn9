# ============================================================
# Setup SSH Key — jalankan SEKALI SAJA
# Setelah ini, deploy.ps1 tidak perlu input password lagi
# ============================================================

$SERVER   = "root@103.153.190.69"
$KEY_DIR  = "$env:USERPROFILE\.ssh"
$KEY_FILE = "$KEY_DIR\sigap_pkl_key"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Setup SSH Key untuk SIGAP PKL K9" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# 1. Buat folder .ssh jika belum ada
if (-not (Test-Path $KEY_DIR)) {
    New-Item -ItemType Directory -Path $KEY_DIR | Out-Null
    Write-Host "OK: Folder .ssh dibuat"
}

# 2. Generate SSH key baru (tanpa passphrase)
if (Test-Path $KEY_FILE) {
    Write-Host "INFO: Key sudah ada di $KEY_FILE — skip generate" -ForegroundColor Yellow
} else {
    Write-Host "`nGenerate SSH key baru..."
    ssh-keygen -t ed25519 -f $KEY_FILE -N '""' -C "sigap-pkl-deploy"
    Write-Host "OK: Key dibuat di $KEY_FILE" -ForegroundColor Green
}

# 3. Tampilkan public key
$pubKey = Get-Content "$KEY_FILE.pub"
Write-Host "`nPublic key:"
Write-Host $pubKey -ForegroundColor Gray

# 4. Copy public key ke server via ssh-copy-id style
# Tulis ke file temp lalu upload via scp, lalu append via ssh terpisah
Write-Host "`n[Langkah 1/2] Upload public key ke /tmp di server..." -ForegroundColor Cyan
Write-Host "Masukkan password SSH:" -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no "$KEY_FILE.pub" "${SERVER}:/tmp/sigap_key.pub"

if ($LASTEXITCODE -ne 0) {
    Write-Host "GAGAL upload key. Cek password dan koneksi." -ForegroundColor Red
    exit 1
}

Write-Host "`n[Langkah 2/2] Daftarkan key di authorized_keys..." -ForegroundColor Cyan
Write-Host "Masukkan password SSH sekali lagi:" -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $SERVER "mkdir -p /root/.ssh ; chmod 700 /root/.ssh ; cat /tmp/sigap_key.pub >> /root/.ssh/authorized_keys ; chmod 600 /root/.ssh/authorized_keys ; rm /tmp/sigap_key.pub ; echo SSH_KEY_OK"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n============================================" -ForegroundColor Green
    Write-Host " SSH Key berhasil disetup!" -ForegroundColor Green
    Write-Host " Jalankan deploy.ps1 — tidak perlu password lagi." -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
} else {
    Write-Host "GAGAL mendaftarkan key. Coba ulangi." -ForegroundColor Red
}
