# ============================================================
# SIGAP PKL - BACKUP SEMUA (1 KLIK)
# Backup: web root, database, SSL cert, kode lokal ke GitHub
# ============================================================

$DATE  = Get-Date -Format "yyyyMMdd_HHmmss"
$SSH   = "C:\Windows\System32\OpenSSH\ssh.exe"
$SCP   = "C:\Windows\System32\OpenSSH\scp.exe"
$KEY   = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SRV   = "root@103.153.190.69"
$ROOT  = "d:\absen pkl update"
$BDIR  = "$ROOT\backups\$DATE"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SIGAP PKL - BACKUP SEMUA" -ForegroundColor Cyan
Write-Host "  Tanggal: $DATE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Buat folder backup lokal
New-Item -ItemType Directory -Force -Path $BDIR | Out-Null
Write-Host "[1/5] Folder backup: $BDIR" -ForegroundColor Yellow

# ── Tulis script bash ke file temp lokal ─────────────────
$bashScript = @"
#!/bin/bash
DATE="$DATE"
echo "=== Backup dimulai: `$DATE ==="

# Backup web root
echo "--- Backup web root..."
tar -czf /tmp/sigap-webroot-`$DATE.tar.gz /var/www/html/SIGAP-SMKN9-Official 2>/dev/null
if [ -f "/tmp/sigap-webroot-`$DATE.tar.gz" ]; then
    echo "OK_WEBROOT:`$(wc -c < /tmp/sigap-webroot-`$DATE.tar.gz)"
else
    # Coba dari CT-102
    pct exec 102 -- tar -czf /tmp/sigap-webroot-`$DATE.tar.gz /var/www/html/SIGAP-SMKN9-Official 2>/dev/null
    pct pull 102 /tmp/sigap-webroot-`$DATE.tar.gz /tmp/sigap-webroot-`$DATE.tar.gz 2>/dev/null
    if [ -f "/tmp/sigap-webroot-`$DATE.tar.gz" ]; then
        echo "OK_WEBROOT:`$(wc -c < /tmp/sigap-webroot-`$DATE.tar.gz)"
    else
        echo "FAIL_WEBROOT"
    fi
fi

# Backup database
echo "--- Backup database..."
pct exec 102 -- bash -c "mysqldump -u root sigap_pkl 2>/dev/null" > /tmp/sigap-db-`$DATE.sql
if [ -s "/tmp/sigap-db-`$DATE.sql" ]; then
    echo "OK_DB:`$(wc -c < /tmp/sigap-db-`$DATE.sql)"
else
    echo "FAIL_DB"
fi

echo "=== Backup selesai ==="
"@

# Simpan script ke file temp
$tempScript = "$env:TEMP\sigap_backup.sh"
$bashScript | Set-Content -Path $tempScript -Encoding UTF8

# Upload script ke server
Write-Host ""
Write-Host "[2/5] Upload script ke server..." -ForegroundColor Yellow
$scpArgs = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=30","-i",$KEY,$tempScript,"${SRV}:/tmp/sigap_backup.sh")
& $SCP @scpArgs 2>&1 | Out-Null

# Jalankan script di server
Write-Host "[3/5] Menjalankan backup di server..." -ForegroundColor Yellow
$sshArgs = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=120","-i",$KEY,$SRV,"bash /tmp/sigap_backup.sh")
$output = & $SSH @sshArgs 2>&1
Write-Host $output

# Download hasil backup
Write-Host ""
Write-Host "[4/5] Download hasil backup..." -ForegroundColor Yellow

# Web root
$scpWeb = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=60","-i",$KEY,"${SRV}:/tmp/sigap-webroot-${DATE}.tar.gz","$BDIR\sigap-webroot-${DATE}.tar.gz")
& $SCP @scpWeb 2>&1 | Out-Null
if (Test-Path "$BDIR\sigap-webroot-${DATE}.tar.gz") {
    $size = [math]::Round((Get-Item "$BDIR\sigap-webroot-${DATE}.tar.gz").Length / 1MB, 1)
    Write-Host "   ✅ Web root: $size MB" -ForegroundColor Green
} else {
    Write-Host "   ❌ Web root GAGAL" -ForegroundColor Red
}

# Database
$scpDb = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=60","-i",$KEY,"${SRV}:/tmp/sigap-db-${DATE}.sql","$BDIR\sigap-db-${DATE}.sql")
& $SCP @scpDb 2>&1 | Out-Null
if (Test-Path "$BDIR\sigap-db-${DATE}.sql") {
    $size = [math]::Round((Get-Item "$BDIR\sigap-db-${DATE}.sql").Length / 1KB, 0)
    Write-Host "   ✅ Database: $size KB" -ForegroundColor Green
} else {
    Write-Host "   ❌ Database GAGAL" -ForegroundColor Red
}

# SSL Certificate
$scpSsl1 = @("-o","StrictHostKeyChecking=no","-i",$KEY,"${SRV}:/root/.acme.sh/sigap.smkn9malang.sch.id_ecc/fullchain.cer","$BDIR\ssl-fullchain-${DATE}.cer")
$scpSsl2 = @("-o","StrictHostKeyChecking=no","-i",$KEY,"${SRV}:/root/.acme.sh/sigap.smkn9malang.sch.id_ecc/sigap.smkn9malang.sch.id.key","$BDIR\ssl-privkey-${DATE}.key")
& $SCP @scpSsl1 2>&1 | Out-Null
& $SCP @scpSsl2 2>&1 | Out-Null
if (Test-Path "$BDIR\ssl-fullchain-${DATE}.cer") {
    Write-Host "   ✅ SSL certificate OK" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  SSL backup tidak ada" -ForegroundColor Yellow
}

# ── Push kode lokal ke GitHub ─────────────────────────────
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

# Bersihkan file tmp server
$sshClean = @("-o","StrictHostKeyChecking=no","-i",$KEY,$SRV,"rm -f /tmp/sigap-webroot-${DATE}.tar.gz /tmp/sigap-db-${DATE}.sql /tmp/sigap_backup.sh")
& $SSH @sshClean 2>&1 | Out-Null

# ── Ringkasan ─────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKUP SELESAI!" -ForegroundColor Green
Write-Host "  Lokasi: $BDIR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Tampilkan isi folder backup
Get-ChildItem $BDIR | Format-Table Name, @{L='Size(KB)';E={[math]::Round($_.Length/1KB,0)}} -AutoSize

# Buka folder backup
Start-Process explorer.exe $BDIR

Write-Host "Tekan Enter untuk keluar..."
Read-Host
