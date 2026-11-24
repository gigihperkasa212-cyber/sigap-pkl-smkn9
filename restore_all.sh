#!/bin/bash
echo "=== Restore semua user approved ke aktif=1 ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE users SET aktif=1 WHERE aktif=0 AND status='approved';
SELECT ROW_COUNT() as restored;
SELECT username, name, role, status, aktif FROM users ORDER BY role, username;
" 2>/dev/null

echo ""
echo "=== Final API verify ==="
pct exec 102 -- curl -sk "https://localhost/api.php?action=get_users" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('Total users:', len(u))
for x in u: print(' -', x.get('username'), x.get('role'), x.get('status'))
" 2>&1
