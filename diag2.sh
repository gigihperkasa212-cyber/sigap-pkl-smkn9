#!/bin/bash
echo "=== Semua user di DB termasuk aktif=0 ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "SELECT id, username, name, role, status, aktif, created_at FROM users ORDER BY aktif DESC, role;" 2>/dev/null

echo ""
echo "=== Index.html version di server ==="
pct exec 102 -- grep "app.js" /var/www/html/SIGAP-SMKN9-Official/index.html | grep "src="

echo ""
echo "=== api.php version / last modified ==="
pct exec 102 -- stat /var/www/html/SIGAP-SMKN9-Official/api.php | grep Modify

echo ""
echo "=== app.js version di server ==="
pct exec 102 -- grep "app.js" /var/www/html/SIGAP-SMKN9-Official/index.html
