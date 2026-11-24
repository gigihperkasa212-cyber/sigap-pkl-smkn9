#!/bin/bash
echo "=== Nginx access log terakhir (POST requests) ==="
pct exec 102 -- tail -30 /var/log/nginx/access.log 2>/dev/null | grep "POST" | head -20

echo ""
echo "=== PHP error log ==="
pct exec 102 -- tail -10 /var/log/php8.2-fpm.log 2>/dev/null | head -10

echo ""
echo "=== Semua user di DB sekarang ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT username, name, role, status, aktif FROM users ORDER BY role;
" 2>/dev/null
