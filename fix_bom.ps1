$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
APIPHP="/var/www/html/SIGAP-SMKN9-Official/api.php"

echo "=== Cek BOM di file api.php ==="
head -c 3 "$APIPHP" | od -An -tx1

echo "=== Strip BOM dari api.php ==="
# Buat file baru tanpa BOM
sed -i '1s/^\xEF\xBB\xBF//' "$APIPHP"

echo "=== Cek setelah strip ==="
head -c 10 "$APIPHP"
head -c 3 "$APIPHP" | od -An -tx1

echo "=== Lakukan hal sama di /opt/sigap-build/api.php ==="
BUILDPHP="/opt/sigap-build/api.php"
sed -i '1s/^\xEF\xBB\xBF//' "$BUILDPHP"
head -c 3 "$BUILDPHP" | od -An -tx1

echo "=== Test response setelah fix ==="
rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json
curl -sk "https://localhost/api.php?action=get_presensi" 2>/dev/null | head -c 15
echo ""
echo "DONE"
'@

$script | Set-Content "$env:TEMP\fix_bom.sh" -Encoding UTF8 -NoNewline
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\fix_bom.sh" "${SERVER}:/tmp/fix_bom.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/fix_bom.sh /tmp/fix_bom.sh; pct exec 102 -- bash /tmp/fix_bom.sh"
