#!/bin/bash
echo "=== Restore semua user approved ke aktif=1 ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE users SET aktif=1 WHERE status='approved' AND aktif=0;
SELECT ROW_COUNT() as rows_updated;
SELECT username, name, role, status, aktif FROM users ORDER BY role, username;
" 2>/dev/null

echo ""
echo "=== Verifikasi get_users setelah fix ==="
pct exec 102 -- curl -sk "http://127.0.0.1/api.php?action=get_users" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('success:', d.get('success'))
print('total users:', len(u))
for x in u:
    print(' -', x.get('username','?'), '|', x.get('role','?'), '|', x.get('name','?'), '| pwd:', bool(x.get('password','').strip()))
"
