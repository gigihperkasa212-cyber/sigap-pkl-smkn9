$SCP = "C:\Windows\System32\OpenSSH\scp.exe"
$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=30","-i",$KEY)

Write-Host "Upload api.php ke Proxmox host..."
& $SCP @OPT "d:\absen pkl update\api.php" "${SERVER}:/opt/sigap-build/api.php"
Write-Host "Upload done"

Start-Sleep -Seconds 1
Write-Host "Push api.php ke CT-102..."
& $SSH @OPT $SERVER "pct push 102 /opt/sigap-build/api.php /var/www/html/SIGAP-SMKN9-Official/api.php --perms 755 --user 33 --group 33"
Write-Host "Push done"

Start-Sleep -Seconds 1
Write-Host "Fix duplikat PHP tag..."
$fixCmd = "pct exec 102 -- python3 -c `"with open('/var/www/html/SIGAP-SMKN9-Official/api.php','rb') as f: c=f.read(); lines=c.decode('utf-8','replace').split(chr(10)); [lines.pop(0)] if len(lines)>1 and lines[0].strip()=='<?php' and lines[1].strip()=='<?php' else None; open('/var/www/html/SIGAP-SMKN9-Official/api.php','wb').write(chr(10).join(lines).encode('utf-8')); print('fixed')`""
& $SSH @OPT $SERVER $fixCmd
Write-Host "Fix done"

Start-Sleep -Seconds 1
Write-Host "Verify..."
& $SSH @OPT $SERVER "pct exec 102 -- php -l /var/www/html/SIGAP-SMKN9-Official/api.php"
& $SSH @OPT $SERVER "pct exec 102 -- grep -A2 'set_charset' /var/www/html/SIGAP-SMKN9-Official/api.php | head -6"

Write-Host "DONE"
