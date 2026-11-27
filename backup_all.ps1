# ============================================================
# SIGAP PKL - BACKUP SEMUA (1 KLIK)
# Backup: web root, database, SSL cert, kode lokal ke GitHub
# Jalankan: klik kanan → Run with PowerShell
# ============================================================

$DATE = Get-Date -Format "yyyyMMdd_HHmmss"
$SSH  = "C:\Windows\System32\OpenSSH\ssh.exe"
$SCP  = "C:\Windows\System32\OpenSSH\scp.exe"
$KEY  = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SRV  = "root@103.153.190.69"
$OPT  = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=30","-i",$KEY)
$ROOT = "d:\absen pkl update"
$BDIR = "$ROOT\backups\$DATE"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SIGAP PKL - BACKUP SEMUA" -ForegroundColor Cyan
Write-Host "  Tanggal: $DATE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Buat folder backup lokal
New-Item -ItemType Directory -Force -Path $BDIR | Out-Null
Write-Host "[1/5] Folder backup: $BDIR" -ForegroundColor Yellow

# ── 1. Backup web root CT-102 ────────────────────────────
Write-Host ""
Write-Host "[2/5] Backup web root CT-102..." -ForegroundColor Yellow
& $SSH @OPT $SRV "pct exec 102 -- bash -c 'tar -czf /tmp/sigap-webroot-$DATE.tar.gz /var/www/html/SIGAP-SMKN9-Official 2>/dev/null && echo OK'"
& $SCP @OPT "${SRV}:/tmp/sigap-webroot-${DATE}.tar.gz" "$BDIR\sigap-webroot-${DATE}.tar.gz"
if (Test-Path "$BDIR\sigap-webroot-${DATE}.tar.gz") {
    $size = (Get-Item "$BDIR\sigap-webroot-${DATE}.tar.gz").Length / 1MB
    Write-Host "   ✅ Web root backup OK ($([math]::Round($size,1)) MB)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Web root backup GAGAL" -ForegroundColor Red
}

# ── 2. Backup database ───────────────────────────────────
Write-Host ""
Write-Host "[3/5] Backup database MySQL..." -ForegroundColor Yellow
& $SSH @OPT $SRV "pct exec 102 -- bash -c 'mysqldump -u root sigap_pkl > /tmp/sigap-db-$DATE.sql 2>/dev/null && echo OK'"
& $SCP @OPT "${SRV}:/tmp/sigap-db-${DATE}.sql" "$BDIR\sigap-db-${DATE}.sql"
if (Test-Path "$BDIR\sigap-db-${DATE}.sql") {
    $size = (Get-Item "$BDIR\sigap-db-${DATE}.sql").Length / 1KB
    Write-Host "   ✅ Database backup OK ($([math]::Round($size,0)) KB)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Database backup GAGAL" -ForegroundColor Red
}

# ── 3. Backup SSL certificate ────────────────────────────
Write-Host ""
Write-Host "[4/5] Backup SSL certificate..." -ForegroundColor Yellow
& $SCP @OPT "${SRV}:/root/.acme.sh/sigap.smkn9malang.sch.id_ecc/fullchain.cer" "$BDIR\ssl-fullchain-${DATE}.cer"
& $SCP @OPT "${SRV}:/root/.acme.sh/sigap.smkn9malang.sch.id_ecc/sigap.smkn9malang.sch.id.key" "$BDIR\ssl-privkey-${DATE}.key"
if (Test-Path "$BDIR\ssl-fullchain-${DATE}.cer") {
    Write-Host "   ✅ SSL certificate backup OK" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  SSL backup GAGAL (tidak kritis)" -ForegroundColor Yellow
}

# ── 4. Backup kode lokal ke GitHub ───────────────────────
Write-Host ""
Write-Host "[5/5] Push kode lokal ke GitHub..." -ForegroundColor Yellow
Set-Location $ROOT
$gitStatus = git status --short 2>&1
if ($gitStatus) {
    git add -A 2>&1 | Out-Null
    git commit -m "backup: auto backup $DATE" 2>&1 | Out-Null
    git push origin main 2>&1 | Out-Null
    Write-Host "   ✅ Kode lokal dipush ke GitHub" -ForegroundColor Green
} else {
    Write-Host "   ✅ Tidak ada perubahan kode baru" -ForegroundColor Green
}

# ── Bersihkan file tmp di server ─────────────────────────
& $SSH @OPT $SRV "rm -f /tmp/sigap-webroot-$DATE.tar.gz /tmp/sigap-db-$DATE.sql" 2>&1 | Out-Null

# ── Ringkasan ─────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKUP SELESAI!" -ForegroundColor Green
Write-Host "  Lokasi: $BDIR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Buka folder backup
Start-Process explorer.exe $BDIR

Write-Host "Tekan Enter untuk keluar..."
Read-Host
