$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
echo "=== Cek struktur tabel attendance (kolom name) ==="
mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "DESCRIBE attendance" 2>&1 | grep -E "name|user_id|username|student"

echo "=== Cek data siswa1 di semua tabel ==="
mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT 'attendance' as tbl, COUNT(*) as cnt FROM attendance WHERE username='siswa1' OR name=(SELECT name FROM users WHERE username='siswa1' LIMIT 1)
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions WHERE student_name=(SELECT name FROM users WHERE username='siswa1' LIMIT 1)
UNION ALL
SELECT 'journals', COUNT(*) FROM journals WHERE student_name=(SELECT name FROM users WHERE username='siswa1' LIMIT 1) OR username='siswa1';" 2>&1
'@

[System.IO.File]::WriteAllText("$env:TEMP\test_reset.sh", $script, [System.Text.UTF8Encoding]::new($false))
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\test_reset.sh" "${SERVER}:/tmp/test_reset.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "bash /tmp/test_reset.sh"
