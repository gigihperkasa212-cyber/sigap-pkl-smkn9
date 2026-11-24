$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
echo "=== Cek konfigurasi PHP-FPM pool ==="
cat /etc/php/8.2/fpm/pool.d/www.conf | grep -E "^pm|^pm\." | head -20

echo ""
echo "=== RAM tersedia di container ==="
free -m

echo ""
echo "=== Tuning PHP-FPM: naikkan max_children ==="
# Backup dulu
cp /etc/php/8.2/fpm/pool.d/www.conf /etc/php/8.2/fpm/pool.d/www.conf.bak

# Set pm = dynamic dengan worker lebih banyak
sed -i 's/^pm = .*/pm = dynamic/' /etc/php/8.2/fpm/pool.d/www.conf
sed -i 's/^pm.max_children = .*/pm.max_children = 50/' /etc/php/8.2/fpm/pool.d/www.conf
sed -i 's/^pm.start_servers = .*/pm.start_servers = 10/' /etc/php/8.2/fpm/pool.d/www.conf
sed -i 's/^pm.min_spare_servers = .*/pm.min_spare_servers = 5/' /etc/php/8.2/fpm/pool.d/www.conf
sed -i 's/^pm.max_spare_servers = .*/pm.max_spare_servers = 20/' /etc/php/8.2/fpm/pool.d/www.conf
# Request timeout lebih pendek agar worker tidak stuck
sed -i 's/^request_terminate_timeout = .*/request_terminate_timeout = 30/' /etc/php/8.2/fpm/pool.d/www.conf

# Tambahkan jika belum ada
grep -q "^request_terminate_timeout" /etc/php/8.2/fpm/pool.d/www.conf || echo "request_terminate_timeout = 30" >> /etc/php/8.2/fpm/pool.d/www.conf

echo "Konfigurasi setelah tuning:"
cat /etc/php/8.2/fpm/pool.d/www.conf | grep -E "^pm|^pm\.|^request_terminate" | head -20

echo ""
echo "=== Reload PHP-FPM ==="
systemctl reload php8.2-fpm && echo "RELOAD_OK" || systemctl restart php8.2-fpm && echo "RESTART_OK"
'@

$script | Set-Content "$env:TEMP\tune_fpm.sh" -Encoding UTF8 -NoNewline
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\tune_fpm.sh" "${SERVER}:/tmp/tune_fpm.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/tune_fpm.sh /tmp/tune_fpm.sh --perms 755; pct exec 102 -- bash /tmp/tune_fpm.sh"
