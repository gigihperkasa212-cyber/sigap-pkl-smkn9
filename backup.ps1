$root = "d:\absen pkl update"
$ts   = Get-Date -Format "yyyyMMdd_HHmmss"
$dst  = "$root\backup_$ts"

New-Item -ItemType Directory -Path $dst | Out-Null

$files = @(
    "$root\js\app.js",
    "$root\css\styles.css",
    "$root\index.html",
    "$root\api.php",
    "$root\capacitor.config.json",
    "$root\deploy.ps1",
    "$root\backup.ps1",
    "$root\android\app\src\main\AndroidManifest.xml",
    "$root\android\app\src\main\res\xml\network_security_config.xml",
    "$root\android\app\build\outputs\apk\release\SIGAP-PKL-K9-v1.0.apk",
    "C:\Windows\Temp\sigap_nginx.conf",
    "C:\Windows\Temp\pdf_generator.js",
    "C:\Windows\Temp\www-data-node"
)

$ok = 0
foreach ($f in $files) {
    if (Test-Path $f) {
        $name = Split-Path $f -Leaf
        Copy-Item $f "$dst\$name" -Force
        $size = [math]::Round((Get-Item "$dst\$name").Length / 1KB, 1)
        Write-Host "  OK  $name ($size KB)"
        $ok++
    } else {
        Write-Host "  SKIP $(Split-Path $f -Leaf)"
    }
}

Write-Host ""
Write-Host "BACKUP SELESAI: backup_$ts ($ok files)" -ForegroundColor Green
