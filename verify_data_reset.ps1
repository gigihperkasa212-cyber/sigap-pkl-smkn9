$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
echo "=== Hapus cache users ==="
rm -f /tmp/sigap_users_cache.json
echo "Cache deleted"

echo ""
echo "=== Test get_users fresh (tanpa cache) ==="
curl -sk --max-time 5 "https://localhost/api.php?action=get_users" 2>/dev/null | \
  python3 -c "
import sys, json
raw = sys.stdin.buffer.read()
if raw[:3]==b'\xef\xbb\xbf': raw=raw[3:]
data = json.loads(raw)
users = data.get('users', data.get('data', []))
# Cari siswa1
for u in users:
    if u.get('username') == 'siswa1':
        print('siswa1 | data_reset_at:', u.get('data_reset_at', 'NOT IN RESPONSE'))
        break
# Tampilkan 3 user pertama
for u in users[:3]:
    print(u.get('username'), '| has data_reset_at:', 'data_reset_at' in u)
print('Total users:', len(users))
" 2>&1
'@

[System.IO.File]::WriteAllText("$env:TEMP\verify_dr.sh", $script, [System.Text.UTF8Encoding]::new($false))
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\verify_dr.sh" "${SERVER}:/tmp/verify_dr.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/verify_dr.sh /tmp/verify_dr.sh; pct exec 102 -- bash /tmp/verify_dr.sh"
