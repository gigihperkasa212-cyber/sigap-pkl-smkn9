$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

$script = @'
#!/bin/bash
echo "=== Patch attendance: isi username dan user_id yang kosong ==="
mysql -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE attendance a
JOIN users u ON LOWER(TRIM(a.name)) = LOWER(TRIM(u.name))
SET a.username = u.username,
    a.user_id  = u.id
WHERE (a.username = '' OR a.username IS NULL OR a.user_id = '' OR a.user_id IS NULL)
  AND u.role = 'siswa';" 2>&1

echo "Rows updated:"
mysql -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT ROW_COUNT() as rows_updated;" 2>&1

echo "Verifikasi:"
mysql -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN username = '' OR username IS NULL THEN 1 ELSE 0 END) as still_empty
FROM attendance;" 2>&1
'@

$script | Set-Content "$env:TEMP\fix_att.sh" -Encoding UTF8 -NoNewline
& "C:\Windows\System32\OpenSSH\scp.exe" @OPT "$env:TEMP\fix_att.sh" "${SERVER}:/tmp/fix_att.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "bash /tmp/fix_att.sh"
