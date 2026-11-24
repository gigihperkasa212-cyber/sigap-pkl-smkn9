$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
WEB=/var/www/html/SIGAP-SMKN9-Official

echo "Byte awal api.php di server:"
head -c 3 "$WEB/api.php" | od -An -tx1

echo "Strip BOM dengan python3:"
python3 -c "
import sys
with open('$WEB/api.php', 'rb') as f:
    content = f.read()
if content[:3] == b'\xef\xbb\xbf':
    print('BOM ditemukan, strip...')
    content = content[3:]
    with open('$WEB/api.php', 'wb') as f:
        f.write(content)
    print('BOM stripped!')
else:
    print('Tidak ada BOM di file server')
    print('Bytes:', content[:3].hex())
"

echo "Byte awal setelah strip:"
head -c 3 "$WEB/api.php" | od -An -tx1

echo "Test API response:"
rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json
curl -sk "https://localhost/api.php?action=ping" 2>/dev/null | head -c 30
echo ""
'@

# Tulis tanpa BOM
[System.IO.File]::WriteAllText("$env:TEMP\force_strip.sh", $script, [System.Text.UTF8Encoding]::new($false))
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\force_strip.sh" "${SERVER}:/tmp/force_strip.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/force_strip.sh /tmp/force_strip.sh; pct exec 102 -- bash /tmp/force_strip.sh"
