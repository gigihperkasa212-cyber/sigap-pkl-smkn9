$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=30","-i",$KEY)

Write-Host "Status CT-102:"
& $SSH @OPT root@103.153.190.69 "pct status 102"

Write-Host "Start CT-102..."
& $SSH @OPT root@103.153.190.69 "pct start 102; sleep 8; pct status 102"

Write-Host "Push config.php..."
& $SSH @OPT root@103.153.190.69 "pct push 102 /opt/sigap-build/config.php /var/www/html/SIGAP-SMKN9-Official/config.php --perms 640 --user 33 --group 33 && echo config_OK"

Write-Host "Push api.php..."
& $SSH @OPT root@103.153.190.69 "pct push 102 /opt/sigap-build/api.php /var/www/html/SIGAP-SMKN9-Official/api.php --perms 755 --user 33 --group 33 && echo api_OK"

Write-Host "PHP syntax check..."
& $SSH @OPT root@103.153.190.69 "pct exec 102 -- php -l /var/www/html/SIGAP-SMKN9-Official/api.php"

Write-Host "DONE"
