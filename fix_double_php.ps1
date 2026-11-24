$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
API=/var/www/html/SIGAP-SMKN9-Official/api.php
echo "Sebelum fix - 5 baris pertama:"
head -5 "$API"
echo "---"

# Hapus baris pertama jika sama dengan baris kedua (<?php duplikat)
FIRST=$(head -1 "$API")
SECOND=$(sed -n '2p' "$API")
if [ "$FIRST" = "<?php" ] && [ "$SECOND" = "<?php" ]; then
    echo "Duplikat ditemukan, hapus baris pertama..."
    sed -i '1d' "$API"
    echo "Berhasil"
else
    echo "Tidak ada duplikat (first='$FIRST', second='$SECOND')"
fi

echo "Setelah fix - 5 baris pertama:"
head -5 "$API"
echo "---"
echo "PHP syntax check:"
php -l "$API" 2>&1
echo "---"
rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json
echo "Test API:"
curl -sk --max-time 5 "https://localhost/api.php?action=ping" | head -c 60
echo ""
'@

[System.IO.File]::WriteAllText("$env:TEMP\fix_double.sh", $script, [System.Text.UTF8Encoding]::new($false))
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\fix_double.sh" "${SERVER}:/tmp/fix_double.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/fix_double.sh /tmp/fix_double.sh; pct exec 102 -- bash /tmp/fix_double.sh"
