$SCP = "C:\Windows\System32\OpenSSH\scp.exe"
$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=30","-i",$KEY)

Write-Host "[1] Upload api.php..."
& $SCP @OPT "d:\absen pkl update\api.php" "${SERVER}:/opt/sigap-build/api.php"

Write-Host "[2] Push ke CT-102..."
& $SSH @OPT $SERVER "pct push 102 /opt/sigap-build/api.php /var/www/html/SIGAP-SMKN9-Official/api.php --perms 755 --user 33 --group 33"

Write-Host "[3] Fix duplikat PHP jika ada..."
$py = "with open('/var/www/html/SIGAP-SMKN9-Official/api.php','rb') as f: c=f.read()`nif c[:3]==b'\xef\xbb\xbf': c=c[3:]`nlines=c.decode('utf-8','replace').split('\n')`nwhile len(lines)>1 and lines[0].strip()=='<?php' and lines[1].strip()=='<?php': lines=lines[1:]`nopen('/var/www/html/SIGAP-SMKN9-Official/api.php','wb').write('\n'.join(lines).encode('utf-8'))`nprint('OK')"
[System.IO.File]::WriteAllText("$env:TEMP\fp.py", $py, [System.Text.UTF8Encoding]::new($false))
& $SCP @OPT "$env:TEMP\fp.py" "${SERVER}:/tmp/fp.py"
& $SSH @OPT $SERVER "pct push 102 /tmp/fp.py /tmp/fp.py; pct exec 102 -- python3 /tmp/fp.py"

Write-Host "[4] Hapus cache presensi lama..."
& $SSH @OPT $SERVER "pct exec 102 -- rm -f /tmp/sigap_presensi_cache.json /tmp/sigap_users_cache.json"

Write-Host "[5] Syntax check..."
& $SSH @OPT $SERVER "pct exec 102 -- php -l /var/www/html/SIGAP-SMKN9-Official/api.php"

Write-Host "[6] Verify cache fix in api.php..."
& $SSH @OPT $SERVER "pct exec 102 -- grep -A2 'TTL' /var/www/html/SIGAP-SMKN9-Official/api.php | head -6"
Write-Host "DONE"
