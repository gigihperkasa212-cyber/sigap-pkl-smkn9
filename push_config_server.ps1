$SCP = "C:\Windows\System32\OpenSSH\scp.exe"
$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=30","-i",$KEY)

# Cek status CT-102
Write-Host "Cek status CT-102..."
& $SSH @OPT root@103.153.190.69 "pct status 102"

# Start CT-102 jika belum running
& $SSH @OPT root@103.153.190.69 "pct status 102 | grep -q running || pct start 102 && sleep 5 && echo started"

# Push kedua file ke CT-102
Write-Host "Push ke CT-102..."
& $SSH @OPT root@103.153.190.69 "pct push 102 /opt/sigap-build/config.php /var/www/html/SIGAP-SMKN9-Official/config.php --perms 640 --user 33 --group 33 && echo config_OK"
& $SSH @OPT root@103.153.190.69 "pct push 102 /opt/sigap-build/api.php /var/www/html/SIGAP-SMKN9-Official/api.php --perms 755 --user 33 --group 33 && echo api_OK"
& $SSH @OPT root@103.153.190.69 "pct exec 102 -- php -l /var/www/html/SIGAP-SMKN9-Official/api.php && echo syntax_OK"
Write-Host "DONE"
