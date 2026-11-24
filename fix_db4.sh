#!/bin/bash
echo "=== Semua user di DB (termasuk aktif=0) ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT id, username, name, role, status, aktif FROM users ORDER BY aktif DESC, role, username;
" 2>/dev/null

echo ""
echo "=== Restore semua siswa ke aktif=1 agar tampil di admin ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE users SET aktif=1 WHERE aktif=0;
SELECT ROW_COUNT() as restored;
" 2>/dev/null

echo ""
echo "=== Final: semua user ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT username, name, role, status, aktif FROM users ORDER BY role, username;
" 2>/dev/null
