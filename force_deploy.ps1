$SCP = "C:\Windows\System32\OpenSSH\scp.exe"
$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=60","-i",$KEY)

Write-Host "[1] Upload app.js ke /opt/sigap-build/js/"
& $SCP @OPT "d:\absen pkl update\js\app.js" "${SERVER}:/opt/sigap-build/js/app.js"

Write-Host "[2] Upload api.php ke /opt/sigap-build/"
& $SCP @OPT "d:\absen pkl update\api.php" "${SERVER}:/opt/sigap-build/api.php"

Write-Host "[3] Hapus cache lama di /tmp/"
$rmCache = "rm -f /tmp/sigap_web_deploy.sh /tmp/deploy_cmd.sh /tmp/deploy_cmd2.sh"
& $SSH @OPT $SERVER $rmCache

Write-Host "[4] pct push langsung ke CT-102..."
$push1 = "pct push 102 /opt/sigap-build/js/app.js /var/www/html/SIGAP-SMKN9-Official/js/app.js --perms 755 --user 33 --group 33"
$push2 = "pct push 102 /opt/sigap-build/api.php /var/www/html/SIGAP-SMKN9-Official/api.php --perms 755 --user 33 --group 33"

& $SSH @OPT $SERVER $push1
Write-Host "  app.js pushed"
& $SSH @OPT $SERVER $push2
Write-Host "  api.php pushed"

Write-Host "[5] Fix duplikat PHP tag + strip BOM di api.php..."
$fixPy = @"
pct exec 102 -- python3 -c "
with open('/var/www/html/SIGAP-SMKN9-Official/api.php','rb') as f: c=f.read()
if c[:3]==b'\xef\xbb\xbf': c=c[3:]
lines=c.decode('utf-8','replace').split('\n')
while len(lines)>1 and lines[0].strip()=='<?php' and lines[1].strip()=='<?php': lines=lines[1:]
with open('/var/www/html/SIGAP-SMKN9-Official/api.php','wb') as f: f.write('\n'.join(lines).encode('utf-8'))
print('fixed')
"
"@
& $SSH @OPT $SERVER $fixPy
Write-Host "  php fix done"

Write-Host "[6] Hapus cache presensi..."
$clearCache = "pct exec 102 -- rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json"
& $SSH @OPT $SERVER $clearCache

Write-Host "[7] Verifikasi..."
$verifyR = @"
pct exec 102 -- bash -c "php -l /var/www/html/SIGAP-SMKN9-Official/api.php && grep -c 'student_name_WRONG\|BUKAN student_name' /var/www/html/SIGAP-SMKN9-Official/api.php || echo 'NOT_FOUND_OK'"
"@
& $SSH @OPT $SERVER "pct exec 102 -- php -l /var/www/html/SIGAP-SMKN9-Official/api.php"
& $SSH @OPT $SERVER "pct exec 102 -- grep -A3 'Bangun kondisi WHERE' /var/www/html/SIGAP-SMKN9-Official/api.php | head -10"

Write-Host "DONE"
