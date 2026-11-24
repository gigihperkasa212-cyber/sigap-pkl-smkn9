$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

# Cek semua kondisi
& $SSH @OPT $SERVER "echo '=== PHP-FPM ===' && pct exec 102 -- systemctl is-active php8.2-fpm" > "$env:TEMP\diag.txt" 2>&1
& $SSH @OPT $SERVER "echo '=== Nginx ===' && pct exec 102 -- systemctl is-active nginx" >> "$env:TEMP\diag.txt" 2>&1
& $SSH @OPT $SERVER "echo '=== API Test ===' && pct exec 102 -- curl -sk --max-time 5 'https://localhost/api.php?action=ping' | head -c 100" >> "$env:TEMP\diag.txt" 2>&1
& $SSH @OPT $SERVER "echo '=== Nginx Error Log ===' && pct exec 102 -- tail -5 /var/log/nginx/error.log 2>/dev/null | grep -v 'sse_events\|Connection reset'" >> "$env:TEMP\diag.txt" 2>&1
& $SSH @OPT $SERVER "echo '=== PHP-FPM Workers ===' && pct exec 102 -- ps aux | grep php-fpm | grep -v grep | wc -l" >> "$env:TEMP\diag.txt" 2>&1
& $SSH @OPT $SERVER "echo '=== PHP-FPM Status ===' && pct exec 102 -- systemctl status php8.2-fpm --no-pager -l | grep -E 'Active|Requests|active'" >> "$env:TEMP\diag.txt" 2>&1
& $SSH @OPT $SERVER "echo '=== api.php syntax ===' && pct exec 102 -- php -l /var/www/html/SIGAP-SMKN9-Official/api.php" >> "$env:TEMP\diag.txt" 2>&1
Get-Content "$env:TEMP\diag.txt"
