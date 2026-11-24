$SCP = "C:\Windows\System32\OpenSSH\scp.exe"
$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=60","-i",$KEY)

Write-Host "[1] Upload app.js..."
& $SCP @OPT "d:\absen pkl update\js\app.js" "${SERVER}:/opt/sigap-build/js/app.js"

Write-Host "[2] Push ke CT-102..."
& $SSH @OPT $SERVER "pct push 102 /opt/sigap-build/js/app.js /var/www/html/SIGAP-SMKN9-Official/js/app.js --perms 755 --user 33 --group 33"

Write-Host "[3] Hapus cache..."
& $SSH @OPT $SERVER "pct exec 102 -- rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json"

Write-Host "[4] Verifikasi baris..."
& $SSH @OPT $SERVER "pct exec 102 -- wc -l /var/www/html/SIGAP-SMKN9-Official/js/app.js"
Write-Host "DONE"
