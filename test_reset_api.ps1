$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
echo "=== Test reset_student_data via API ==="
# Ambil salah satu siswa real dari DB
SISWA_ID=$(mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -sNe "SELECT id FROM users WHERE role='siswa' AND username='siswa1' LIMIT 1" 2>/dev/null)
SISWA_NAME=$(mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -sNe "SELECT name FROM users WHERE username='siswa1' LIMIT 1" 2>/dev/null)
echo "Test dengan: id=$SISWA_ID name=$SISWA_NAME"

# Test API
RESP=$(curl -sk --max-time 10 -X POST "https://localhost/api.php?action=reset_student_data" \
  -H "Content-Type: application/json" \
  -d "{\"student_id\":\"$SISWA_ID\",\"student_name\":\"$SISWA_NAME\"}" 2>&1)
echo "Response: $RESP"

echo "=== Cek PHP error log ==="
tail -5 /var/log/nginx/error.log 2>/dev/null | grep -v "sse_events"
'@

[System.IO.File]::WriteAllText("$env:TEMP\test_rapi.sh", $script, [System.Text.UTF8Encoding]::new($false))
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\test_rapi.sh" "${SERVER}:/tmp/test_rapi.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/test_rapi.sh /tmp/test_rapi.sh; pct exec 102 -- bash /tmp/test_rapi.sh"
