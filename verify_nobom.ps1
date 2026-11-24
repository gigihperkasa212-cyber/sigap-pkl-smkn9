$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
echo "=== Cek BOM di response API ==="
# Hapus cache dulu
rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json

# Ambil 10 byte pertama response dan tampilkan hex
RESP=$(curl -sk "https://localhost/api.php?action=get_presensi" 2>/dev/null | head -c 10)
echo "First 10 chars: $RESP"
echo "Hex:" $(echo -n "$RESP" | od -An -tx1 | head -1)

echo ""
echo "=== Cek field pulang di response ==="
curl -sk "https://localhost/api.php?action=get_presensi" 2>/dev/null | \
  python3 -c "
import sys, json
raw = sys.stdin.buffer.read()
# Strip BOM jika ada
if raw[:3] == b'\xef\xbb\xbf':
    print('BOM MASIH ADA!')
    raw = raw[3:]
else:
    print('BOM sudah hilang OK')
data = json.loads(raw)
logs = data.get('logs', data.get('data', []))
print('Total logs:', len(logs))
for l in logs[:3]:
    name = l.get('studentName','') or l.get('name','')
    print(f'  {name[:25]:25} masuk={l.get(\"masuk\",\"?\"):6} pulang={l.get(\"pulang\",\"?\")}')
" 2>&1
'@

$script | Set-Content "$env:TEMP\verify_bom.sh" -Encoding UTF8 -NoNewline
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\verify_bom.sh" "${SERVER}:/tmp/verify_bom.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/verify_bom.sh /tmp/verify_bom.sh; pct exec 102 -- bash /tmp/verify_bom.sh"
