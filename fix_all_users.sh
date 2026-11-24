#!/bin/bash
echo "=== Restore semua user approved ke aktif=1 ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE users SET aktif=1 WHERE status='approved' AND aktif=0;
SELECT ROW_COUNT() as rows_restored;
SELECT username, role, status, aktif FROM users ORDER BY role, username;
" 2>/dev/null
echo "DONE"
