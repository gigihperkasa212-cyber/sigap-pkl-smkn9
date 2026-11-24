$SCP = "C:\Windows\System32\OpenSSH\scp.exe"
$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=60","-i",$KEY)

Write-Host "[1] Upload app.js..."
& $SCP @OPT "d:\absen pkl update\js\app.js" "${SERVER}:/opt/sigap-build/js/app.js"
Write-Host "[2] Upload api.php..."
& $SCP @OPT "d:\absen pkl update\api.php" "${SERVER}:/opt/sigap-build/api.php"

Write-Host "[3] Deploy + fix api.php + clear cache..."
$cmd = @"
CT=102
WEB=/var/www/html/SIGAP-SMKN9-Official
SIGAP_DIR=/opt/sigap-build
pct push `$CT `$SIGAP_DIR/js/app.js `$WEB/js/app.js --perms 755 --user 33 --group 33 && echo app.js_OK
pct push `$CT `$SIGAP_DIR/api.php `$WEB/api.php --perms 755 --user 33 --group 33 && echo api.php_OK
pct push `$CT `$SIGAP_DIR/index.html `$WEB/index.html --perms 755 --user 33 --group 33 && echo index.html_OK
pct exec `$CT -- python3 -c "
with open('`$WEB/api.php','rb') as f: c=f.read()
if c[:3]==b'\xef\xbb\xbf': c=c[3:]
lines=c.decode('utf-8','replace').split('\n')
if lines[0].strip()=='<?php' and lines[1].strip()=='<?php': c='\n'.join(lines[1:]).encode('utf-8')
with open('`$WEB/api.php','wb') as f: f.write(c)
print('api.php fixed')
" && echo php_fixed
pct exec `$CT -- rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json && echo cache_cleared
cp `$SIGAP_DIR/js/app.js `$SIGAP_DIR/android/app/src/main/assets/public/js/app.js
cp `$SIGAP_DIR/index.html `$SIGAP_DIR/android/app/src/main/assets/public/index.html
pct exec `$CT -- head -c 5 `$WEB/api.php | od -An -tx1
pct exec `$CT -- php -l `$WEB/api.php
echo ALL_DONE
"@

$bytes = [System.Text.Encoding]::UTF8.GetBytes($cmd)
[System.IO.File]::WriteAllBytes("$env:TEMP\deploy_cmd2.sh", $bytes)
& $SCP @OPT "$env:TEMP\deploy_cmd2.sh" "${SERVER}:/tmp/deploy_cmd2.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "bash /tmp/deploy_cmd2.sh"
Write-Host "DONE"
