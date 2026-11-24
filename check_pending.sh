#!/bin/bash
echo "=== Users dengan status pending di DB ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT id, username, name, role, status, aktif FROM users ORDER BY status, role;
" 2>/dev/null

echo ""
echo "=== get_users API return ==="
pct exec 102 -- curl -sk "https://localhost/api.php?action=get_users" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('Total:', len(u))
for x in u:
    print(' -', x.get('username'), '|', x.get('role'), '|', x.get('status'), '| aktif:', x.get('aktif'))
" 2>&1
