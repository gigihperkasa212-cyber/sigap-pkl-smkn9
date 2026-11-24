# ============================================================
# Backup Konfigurasi Proxmox VE Host + Semua Container
# Jalankan: .\backup_proxmox.ps1
# Hasil: folder backup_proxmox_YYYYMMDD_HHMMSS
# ============================================================

$KEY = "C:\Users\FUJITSU T939\.ssh\sigap_pkl_key"
$SRV = "root@103.153.190.69"
$ROOT = "d:\absen pkl update"
$TS   = Get-Date -Format "yyyyMMdd_HHmmss"
$DST  = "$ROOT\backup_proxmox_$TS"

New-Item -ItemType Directory -Path $DST | Out-Null
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Backup Proxmox VE Host - SMKN 9 Malang" -ForegroundColor Cyan
Write-Host " $TS" -ForegroundColor Cyan
Write-Host "============================================"

function SSH-Get($cmd, $outFile) {
    $result = ssh -o ConnectTimeout=30 -o ServerAliveInterval=10 -i $KEY $SRV $cmd 2>&1
    if ($result -and ($result | Out-String) -notmatch "^FILE_NOT_FOUND$") {
        $result | Out-File -FilePath $outFile -Encoding utf8 -Force
        return $true
    }
    return $false
}

function SCP-Get($remotePath, $localFile) {
    scp -o ConnectTimeout=30 -i $KEY "${SRV}:${remotePath}" $localFile 2>&1 | Out-Null
    return (Test-Path $localFile) -and ((Get-Item $localFile).Length -gt 0)
}

# ── 1. PVE HOST KONFIGURASI ───────────────────────────────────────────────────
Write-Host "`n[1/6] PVE Host Konfigurasi..." -ForegroundColor Yellow
$d1 = "$DST\01_pve_host"
New-Item -ItemType Directory -Path $d1 | Out-Null

$hostFiles = @(
    "/etc/network/interfaces",
    "/etc/hosts",
    "/etc/hostname",
    "/etc/resolv.conf",
    "/etc/pve/datacenter.cfg",
    "/etc/pve/lxc/100.conf",
    "/etc/pve/lxc/101.conf",
    "/etc/pve/lxc/102.conf",
    "/etc/nginx/sites-available/SIGAP-SMKN9-Official"
)

foreach ($f in $hostFiles) {
    $name = ($f -split "/")[-1]
    if (SCP-Get $f "$d1\$name") {
        Write-Host "  OK  $name" -ForegroundColor Green
    } else {
        Write-Host "  SKIP $name"
    }
}

# Daftar VM dan CT
if (SSH-Get "pct list 2>/dev/null; echo '---'; qm list 2>/dev/null" "$d1\vm_ct_list.txt") {
    Write-Host "  OK  vm_ct_list.txt" -ForegroundColor Green
}

# Versi PVE
if (SSH-Get "pveversion 2>/dev/null" "$d1\pve_version.txt") {
    Write-Host "  OK  pve_version.txt" -ForegroundColor Green
}

# ── 2. CT-100 (CT-K9) ────────────────────────────────────────────────────────
Write-Host "`n[2/6] Container 100 (CT-K9)..." -ForegroundColor Yellow
$d2 = "$DST\02_ct100_CTK9"
New-Item -ItemType Directory -Path $d2 | Out-Null

$ct100Files = @("/etc/nginx/sites-available/default", "/etc/hosts", "/etc/hostname")
foreach ($f in $ct100Files) {
    $name = ($f -split "/")[-1]
    $result = ssh -i $KEY $SRV "pct exec 100 -- cat '$f' 2>/dev/null || echo FILE_NOT_FOUND" 2>&1
    if ($result -and $result -notmatch "FILE_NOT_FOUND") {
        $result | Out-File "$d2\$name" -Encoding utf8
        Write-Host "  OK  $name" -ForegroundColor Green
    }
}

# ── 3. CT-101 (noc-smkn9-malang) ─────────────────────────────────────────────
Write-Host "`n[3/6] Container 101 (noc-smkn9-malang)..." -ForegroundColor Yellow
$d3 = "$DST\03_ct101_noc"
New-Item -ItemType Directory -Path $d3 | Out-Null

$ct101Files = @("/etc/nginx/sites-available/default", "/etc/hosts", "/etc/hostname")
foreach ($f in $ct101Files) {
    $name = ($f -split "/")[-1]
    $result = ssh -i $KEY $SRV "pct exec 101 -- cat '$f' 2>/dev/null || echo FILE_NOT_FOUND" 2>&1
    if ($result -and $result -notmatch "FILE_NOT_FOUND") {
        $result | Out-File "$d3\$name" -Encoding utf8
        Write-Host "  OK  $name" -ForegroundColor Green
    }
}

# ── 4. CT-102 (SIGAP-PKL-SMKN9-Official) ─────────────────────────────────────
Write-Host "`n[4/6] Container 102 (SIGAP-PKL-SMKN9-Official)..." -ForegroundColor Yellow
$d4 = "$DST\04_ct102_sigap"
New-Item -ItemType Directory -Path $d4 | Out-Null

$ct102Files = @(
    "/etc/nginx/sites-available/SIGAP-SMKN9-Official",
    "/etc/php/8.2/fpm/pool.d/www.conf",
    "/etc/sudoers.d/www-data-node",
    "/etc/hosts",
    "/etc/hostname",
    "/var/www/html/SIGAP-SMKN9-Official/api.php",
    "/var/www/html/SIGAP-SMKN9-Official/pdf_generator.js",
    "/var/www/html/SIGAP-SMKN9-Official/server.py"
)
foreach ($f in $ct102Files) {
    $name = ($f -split "/")[-1]
    $result = ssh -i $KEY $SRV "pct exec 102 -- cat '$f' 2>/dev/null || echo FILE_NOT_FOUND" 2>&1
    if ($result -and $result -notmatch "FILE_NOT_FOUND") {
        $result | Out-File "$d4\$name" -Encoding utf8
        Write-Host "  OK  $name" -ForegroundColor Green
    } else {
        Write-Host "  SKIP $name"
    }
}

# Installed packages CT-102
$pkgs = ssh -i $KEY $SRV "pct exec 102 -- dpkg -l 2>/dev/null | grep -E 'nginx|php|node|chromium|mysql|maria'" 2>&1
$pkgs | Out-File "$d4\installed_packages.txt" -Encoding utf8
Write-Host "  OK  installed_packages.txt" -ForegroundColor Green

# ── 5. DATABASE BACKUP ────────────────────────────────────────────────────────
Write-Host "`n[5/6] Backup Database MySQL..." -ForegroundColor Yellow
$d5 = "$DST\05_database"
New-Item -ItemType Directory -Path $d5 | Out-Null

Write-Host "  Dump DB ke /tmp di CT102..."
# Step 1: dump ke file di CT102 dulu
$dumpCmd = "pct exec 102 -- mysqldump -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl > /tmp/sigap_backup.sql && echo DUMP_OK"
$dumpResult = ssh -o ConnectTimeout=60 -o ServerAliveInterval=15 -i $KEY $SRV $dumpCmd 2>&1
if ($dumpResult -match "DUMP_OK") {
    # Step 2: copy dari CT102 ke Proxmox host /tmp
    ssh -o ConnectTimeout=30 -i $KEY $SRV "pct pull 102 /tmp/sigap_backup.sql /tmp/sigap_backup.sql && echo PULL_OK" 2>&1 | Out-Null
    # Step 3: scp dari Proxmox host ke lokal
    scp -o ConnectTimeout=30 -i $KEY "${SRV}:/tmp/sigap_backup.sql" "$d5\sigap_pkl_$TS.sql" 2>&1 | Out-Null
    if ((Test-Path "$d5\sigap_pkl_$TS.sql") -and (Get-Item "$d5\sigap_pkl_$TS.sql").Length -gt 500) {
        $sz = [math]::Round((Get-Item "$d5\sigap_pkl_$TS.sql").Length/1KB, 1)
        Write-Host "  OK  sigap_pkl_$TS.sql ($sz KB)" -ForegroundColor Green
    } else {
        Write-Host "  WARN File kosong atau terlalu kecil" -ForegroundColor Yellow
    }
} else {
    Write-Host "  SKIP database (dump gagal: $dumpResult)" -ForegroundColor Yellow
}

# ── 6. FILE LOKAL (APK + Source) ─────────────────────────────────────────────
Write-Host "`n[6/6] File Lokal (APK + Source Code)..." -ForegroundColor Yellow
$d6 = "$DST\06_local_files"
New-Item -ItemType Directory -Path $d6 | Out-Null

$localFiles = @(
    "$ROOT\js\app.js",
    "$ROOT\css\styles.css",
    "$ROOT\index.html",
    "$ROOT\api.php",
    "$ROOT\capacitor.config.json",
    "$ROOT\deploy.ps1",
    "$ROOT\backup.ps1",
    "$ROOT\backup_proxmox.ps1",
    "$ROOT\android\app\src\main\AndroidManifest.xml",
    "$ROOT\android\app\src\main\res\xml\network_security_config.xml",
    "$ROOT\android\app\build\outputs\apk\release\SIGAP-PKL-K9-v1.0.apk",
    "C:\Windows\Temp\sigap_nginx.conf",
    "C:\Windows\Temp\pdf_generator.js",
    "C:\Windows\Temp\www-data-node"
)
foreach ($f in $localFiles) {
    if (Test-Path $f) {
        $name = Split-Path $f -Leaf
        Copy-Item $f "$d6\$name" -Force
        $sz = [math]::Round((Get-Item "$d6\$name").Length/1KB, 1)
        Write-Host "  OK  $name ($sz KB)" -ForegroundColor Green
    } else {
        Write-Host "  SKIP $(Split-Path $f -Leaf)"
    }
}

# ── RINGKASAN ─────────────────────────────────────────────────────────────────
$totalFiles = (Get-ChildItem $DST -Recurse -File).Count
$totalSize  = [math]::Round((Get-ChildItem $DST -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " BACKUP SELESAI!" -ForegroundColor Green
Write-Host " Folder : $DST" -ForegroundColor Green
Write-Host " Total  : $totalFiles file ($totalSize MB)" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
