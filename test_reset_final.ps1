$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$testScript = @'
#!/bin/bash
ID=$(mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -sNe "SELECT id FROM users WHERE username='siswa1' LIMIT 1" 2>/dev/null)
echo "Test student id: $ID"
RESP=$(curl -sk --max-time 8 -X POST "https://localhost/api.php?action=reset_student_data" \
  -H "Content-Type: application/json" \
  -d "{\"student_id\":\"$ID\",\"student_name\":\"siswa1\"}" 2>&1)
echo "Response: $RESP"
echo ""
echo "Error log (recent):"
tail -3 /var/log/nginx/error.log | grep -v "sse_events\|Connection reset"
'@
[System.IO.File]::WriteAllText("$env:TEMP\test_rf.sh", $testScript, [System.Text.UTF8Encoding]::new($false))
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\test_rf.sh" "${SERVER}:/tmp/test_rf.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/test_rf.sh /tmp/test_rf.sh; pct exec 102 -- bash /tmp/test_rf.sh"
