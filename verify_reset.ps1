$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
API=/var/www/html/SIGAP-SMKN9-Official/api.php

echo "=== Cek kode reset_student_data di server ==="
grep -A 20 "case 'reset_student_data'" "$API" | head -25

echo "=== Test reset via API ==="
# Test dengan siswa test (tidak ada di DB jadi tidak akan hapus apapun)
curl -sk --max-time 5 -X POST "https://localhost/api.php?action=reset_student_data" \
  -H "Content-Type: application/json" \
  -d '{"student_id":"test_dry_run","student_name":"TEST DRY RUN"}' 2>&1 | head -c 200
echo ""
'@

[System.IO.File]::WriteAllText("$env:TEMP\verify_reset.sh", $script, [System.Text.UTF8Encoding]::new($false))
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\verify_reset.sh" "${SERVER}:/tmp/verify_reset.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "pct push 102 /tmp/verify_reset.sh /tmp/verify_reset.sh; pct exec 102 -- bash /tmp/verify_reset.sh"
