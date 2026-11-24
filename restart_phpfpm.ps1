$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
echo "=== Status PHP-FPM sebelum restart ==="
pct exec 102 -- systemctl status php8.2-fpm --no-pager -l 2>&1 | head -20

echo "=== Restart PHP-FPM ==="
pct exec 102 -- systemctl restart php8.2-fpm 2>&1
sleep 2

echo "=== Status setelah restart ==="
pct exec 102 -- systemctl status php8.2-fpm --no-pager -l 2>&1 | head -10

echo "=== Test API setelah restart ==="
pct exec 102 -- curl -sk --max-time 5 "https://localhost/api.php?action=ping" 2>&1
'@

$script | Set-Content "$env:TEMP\restart_fpm.sh" -Encoding UTF8 -NoNewline
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\restart_fpm.sh" "${SERVER}:/tmp/restart_fpm.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "bash /tmp/restart_fpm.sh"
