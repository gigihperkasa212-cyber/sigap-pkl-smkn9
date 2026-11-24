#!/bin/bash
echo "=== Hapus siswa2 (222) dari DB ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
DELETE FROM users WHERE username='222' OR nomor_induk='222';
SELECT ROW_COUNT() as deleted;
" 2>/dev/null

echo ""
echo "=== Restore semua user pending ke aktif=1 ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE users SET aktif=1 WHERE status IN ('pending','pending_delete','pending_edit_pkl') AND aktif=0;
SELECT ROW_COUNT() as restored;
" 2>/dev/null

echo ""
echo "=== Status DB sekarang ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT username, name, role, status, aktif FROM users ORDER BY role, aktif DESC, username;
" 2>/dev/null

echo ""
echo "=== Deploy api.php terbaru ==="
CT=102; WEB="/var/www/html/SIGAP-SMKN9-Official"
pct push $CT /tmp/api.php $WEB/api.php --perms 755 --user 33 --group 33
echo "api.php pushed"

echo ""
echo "=== Verifikasi API ==="
pct exec 102 -- curl -sk "https://localhost/api.php?action=get_users" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('API total users:', len(u))
for x in u:
    print(' -', x.get('username'), '|', x.get('role'), '|', x.get('status'), '| aktif:', x.get('aktif'))
" 2>&1
