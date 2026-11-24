#!/bin/bash
echo "=== Hapus semua user kecuali admin ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
DELETE FROM users WHERE role != 'admin' AND username != 'admin';
DELETE FROM attendance;
DELETE FROM permissions;
SELECT 'Cleanup done. Remaining users:' as msg;
SELECT id, username, role, aktif FROM users;
" 2>/dev/null

echo ""
echo "=== Verifikasi API ==="
pct exec 102 -- curl -sk "https://localhost/api.php?action=get_users" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('users remaining:', len(u))
for x in u: print(' -', x.get('username'), x.get('role'), '| pwd:', x.get('password',''))
"
