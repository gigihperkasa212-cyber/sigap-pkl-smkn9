$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
echo "Restart PHP-FPM..."
systemctl restart php8.2-fpm
sleep 2
echo "Status: $(systemctl is-active php8.2-fpm)"
rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json
echo "Cache cleared"
curl -sk --max-time 5 "https://localhost/api.php?action=ping" | head -c 60
echo ""
echo "First char hex:"
curl -sk --max-time 5 "https://localhost/api.php?action=ping" | head -c 1 | od -An -tx1
'@

[System.IO.File]::WriteAllText("$env:TEMP\restart_fpm_now.sh", $script, [System.Text.UTF8Encoding]::new($false))
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\restart_fpm_now.sh" "${SERVER}:/tmp/restart_fpm_now.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/restart_fpm_now.sh /tmp/restart_fpm_now.sh; pct exec 102 -- bash /tmp/restart_fpm_now.sh"
