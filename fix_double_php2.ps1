$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
API=/var/www/html/SIGAP-SMKN9-Official/api.php

echo "Fix dengan python3..."
python3 -c "
with open('$API', 'rb') as f:
    content = f.read()

# Decode
text = content.decode('utf-8', errors='replace')
lines = text.split('\n')
print('Line 1:', repr(lines[0][:20]))
print('Line 2:', repr(lines[1][:20]))

# Hapus duplikat <?php di awal
if lines[0].strip() == '<?php' and lines[1].strip() == '<?php':
    print('Duplikat ditemukan, hapus baris 1...')
    text = '\n'.join(lines[1:])
    with open('$API', 'wb') as f:
        f.write(text.encode('utf-8'))
    print('Done')
else:
    print('Tidak duplikat')
"

echo "5 baris pertama setelah fix:"
head -5 "$API"
echo "---"
echo "PHP syntax:"
php -l "$API" 2>&1
echo "Test API:"
rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json
curl -sk --max-time 5 "https://localhost/api.php?action=ping" | head -c 80
echo ""
'@

[System.IO.File]::WriteAllText("$env:TEMP\fix_double2.sh", $script, [System.Text.UTF8Encoding]::new($false))
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\fix_double2.sh" "${SERVER}:/tmp/fix_double2.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/fix_double2.sh /tmp/fix_double2.sh; pct exec 102 -- bash /tmp/fix_double2.sh"
