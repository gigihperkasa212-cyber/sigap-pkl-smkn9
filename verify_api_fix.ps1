$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

Write-Host "=== PHP Syntax ==="
& $SSH @OPT $SERVER "pct exec 102 -- php -l /var/www/html/SIGAP-SMKN9-Official/api.php" > "$env:TEMP\v1.txt" 2>&1
Get-Content "$env:TEMP\v1.txt"

Write-Host "=== getDB SET NAMES ==="
& $SSH @OPT $SERVER "pct exec 102 -- grep -A4 'set_charset' /var/www/html/SIGAP-SMKN9-Official/api.php" > "$env:TEMP\v2.txt" 2>&1
Get-Content "$env:TEMP\v2.txt"

Write-Host "=== reset_student_data WHERE clause ==="
& $SSH @OPT $SERVER "pct exec 102 -- grep -A3 'Resolve username' /var/www/html/SIGAP-SMKN9-Official/api.php" > "$env:TEMP\v3.txt" 2>&1
Get-Content "$env:TEMP\v3.txt"
