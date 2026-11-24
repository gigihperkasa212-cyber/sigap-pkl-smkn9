$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$pyScript = @'
import sys
API='/var/www/html/SIGAP-SMKN9-Official/api.php'
with open(API,'rb') as f: c=f.read()
lines=c.decode('utf-8','replace').split('\n')
print('Line1:',repr(lines[0][:15]))
print('Line2:',repr(lines[1][:15]))
while len(lines)>1 and lines[0].strip()=='<?php' and lines[1].strip()=='<?php':
    lines=lines[1:]
    print('Removed dup')
with open(API,'wb') as f: f.write('\n'.join(lines).encode('utf-8'))
print('Done. Line1 now:',repr(lines[0][:20]))
'@

# Tulis python script tanpa BOM
[System.IO.File]::WriteAllText("$env:TEMP\fix_api.py", $pyScript, [System.Text.UTF8Encoding]::new($false))

$SCP = "C:\Windows\System32\OpenSSH\scp.exe"
& $SCP @OPT "$env:TEMP\fix_api.py" "${SERVER}:/tmp/fix_api.py"
Start-Sleep -Seconds 1

# Push python script ke CT-102 dan jalankan
& $SSH @OPT $SERVER "pct push 102 /tmp/fix_api.py /tmp/fix_api.py; pct exec 102 -- python3 /tmp/fix_api.py"
Write-Host "Checking syntax..."
& $SSH @OPT $SERVER "pct exec 102 -- php -l /var/www/html/SIGAP-SMKN9-Official/api.php"
Write-Host "Check getDB..."
& $SSH @OPT $SERVER "pct exec 102 -- grep -A4 'set_charset' /var/www/html/SIGAP-SMKN9-Official/api.php | head -6"
Write-Host "Test API..."
& $SSH @OPT $SERVER "pct exec 102 -- bash -c 'SISWA_ID=\$(mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -sNe \"SELECT id FROM users WHERE username=chr(39)siswa1chr(39) LIMIT 1\" 2>/dev/null); echo id=\$SISWA_ID'"
Write-Host "DONE"
