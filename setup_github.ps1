# ============================================================
# SIGAP PKL K9 — Setup Git + Push ke GitHub
# Jalankan SEKALI: powershell.exe -ExecutionPolicy Bypass -File setup_github.ps1
# ============================================================

$ROOT = "d:\absen pkl update"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Setup GitHub untuk SIGAP PKL K9" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# ── Minta URL repo GitHub ────────────────────────────────────
Write-Host "Buat repo GitHub dulu di: https://github.com/new" -ForegroundColor Yellow
Write-Host "Nama repo disarankan: sigap-pkl-k9" -ForegroundColor Yellow
Write-Host ""
$repoUrl = Read-Host "Masukkan URL repo GitHub (contoh: https://github.com/USERNAME/sigap-pkl-k9.git)"
if (-not $repoUrl) { Write-Host "URL tidak boleh kosong." -ForegroundColor Red; exit 1 }

# ── Init git ────────────────────────────────────────────────
Set-Location $ROOT
Write-Host "`n[1/5] Init git repo..." -ForegroundColor Yellow
git init
git branch -M main

# ── Set identity (jika belum) ───────────────────────────────
$gitUser = git config user.name 2>&1
if (-not $gitUser -or $gitUser -match "error") {
    git config user.name "SIGAP PKL K9"
    git config user.email "sigap@smkn9malang.sch.id"
}

# ── Add remote ──────────────────────────────────────────────
Write-Host "`n[2/5] Set remote origin..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin $repoUrl

# ── Stage files ─────────────────────────────────────────────
Write-Host "`n[3/5] Staging files..." -ForegroundColor Yellow
git add index.html js/app.js css/ www/ android/ .github/ capacitor.config.json package.json .gitignore api.php
git status --short | Select-Object -First 20

# ── Commit ──────────────────────────────────────────────────
Write-Host "`n[4/5] Commit..." -ForegroundColor Yellow
git commit -m "v2.2.8: Fix sinkronisasi filter cetak statistik/rekap/lengkap"

# ── Push ────────────────────────────────────────────────────
Write-Host "`n[5/5] Push ke GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host "`n============================================" -ForegroundColor Green
Write-Host " Push selesai!" -ForegroundColor Green
Write-Host " GitHub Actions akan build APK otomatis." -ForegroundColor Green
Write-Host " Pantau di: $($repoUrl -replace '\.git$','')/actions" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
