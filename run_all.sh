#!/bin/bash
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"

echo "=== 1. Push api.php ==="
pct push $CT /tmp/api.php $WEB/api.php --perms 755 --user 33 --group 33
echo "api.php pushed: $?"

echo ""
echo "=== 2. Restore pending users ke aktif=1 ==="
pct exec $CT -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE users SET aktif=1 WHERE status IN ('pending','pending_delete','pending_edit_pkl') AND aktif=0;
SELECT username, name, role, status, aktif FROM users ORDER BY role, status;
" 2>/dev/null

echo ""
echo "=== 3. Verifikasi API ==="
pct exec $CT -- curl -sk "https://localhost/api.php?action=get_users" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('Total users:', len(u))
for x in u:
    print(' -', x.get('username'), '|', x.get('role'), '|', x.get('status'))
" 2>&1
