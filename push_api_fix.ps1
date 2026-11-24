$SCP = "C:\Windows\System32\OpenSSH\scp.exe"
$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=30","-i",$KEY)

Write-Host "[1] Upload api.php ke Proxmox..."
& $SCP @OPT "d:\absen pkl update\api.php" "${SERVER}:/opt/sigap-build/api.php"
Write-Host "Upload done"

Write-Host "[2] Push ke CT-102..."
& $SSH @OPT $SERVER "pct push 102 /opt/sigap-build/api.php /var/www/html/SIGAP-SMKN9-Official/api.php --perms 755 --user 33 --group 33"
Write-Host "Push done"

Write-Host "[3] Fix duplikat PHP + hapus cache..."
$fixScript = @'
import sys
API='/var/www/html/SIGAP-SMKN9-Official/api.php'
with open(API,'rb') as f: c=f.read()
if c[:3]==b'\xef\xbb\xbf': c=c[3:]
lines=c.decode('utf-8','replace').split('\n')
while len(lines)>1 and lines[0].strip()=='<?php' and lines[1].strip()=='<?php':
    lines=lines[1:]
with open(API,'wb') as f: f.write('\n'.join(lines).encode('utf-8'))
print('api.php OK:', lines[0][:20])
'@
[System.IO.File]::WriteAllText("$env:TEMP\fix_api3.py", $fixScript, [System.Text.UTF8Encoding]::new($false))
& $SCP @OPT "$env:TEMP\fix_api3.py" "${SERVER}:/tmp/fix_api3.py"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/fix_api3.py /tmp/fix_api3.py; pct exec 102 -- python3 /tmp/fix_api3.py"

Write-Host "[4] Hapus cache..."
& $SSH @OPT $SERVER "pct exec 102 -- rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json"

Write-Host "[5] Verifikasi getDB + syntax..."
& $SSH @OPT $SERVER "pct exec 102 -- php -l /var/www/html/SIGAP-SMKN9-Official/api.php"
& $SSH @OPT $SERVER "pct exec 102 -- grep -A4 'set_charset' /var/www/html/SIGAP-SMKN9-Official/api.php | head -6"

Write-Host "[6] Test reset API..."
& $SSH @OPT $SERVER "pct exec 102 -- bash -c 'ID=\$(mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -sNe ""SELECT id FROM users WHERE username=chr(39)siswa1chr(39) LIMIT 1"" 2>/dev/null); curl -sk --max-time 8 -X POST https://localhost/api.php?action=reset_student_data -H Content-Type:application/json -d \"{\\\"student_id\\\":\\\"\$ID\\\",\\\"student_name\\\":\\\"siswa1\\\"}\" 2>&1'"
Write-Host "DONE"
