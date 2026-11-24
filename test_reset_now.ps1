$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
echo "=== Current time ==="
date

echo "=== Test reset_student_data ==="
SISWA_ID=$(mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -sNe "SELECT id FROM users WHERE username='siswa1' LIMIT 1" 2>/dev/null)
SISWA_NAME=$(mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -sNe "SELECT name FROM users WHERE username='siswa1' LIMIT 1" 2>/dev/null)
echo "id=$SISWA_ID name=$SISWA_NAME"

RESP=$(curl -sk --max-time 10 -X POST "https://localhost/api.php?action=reset_student_data" \
  -H "Content-Type: application/json" \
  -d "{\"student_id\":\"$SISWA_ID\",\"student_name\":\"$SISWA_NAME\"}" 2>&1)
echo "Response: $RESP"

echo "=== Error log terbaru (hanya yang baru) ==="
tail -3 /var/log/nginx/error.log | grep -v "sse_events\|reset_by_peer"
'@

[System.IO.File]::WriteAllText("$env:TEMP\test_now.sh", $script, [System.Text.UTF8Encoding]::new($false))
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\test_now.sh" "${SERVER}:/tmp/test_now.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/test_now.sh /tmp/test_now.sh; pct exec 102 -- bash /tmp/test_now.sh"
