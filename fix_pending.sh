#!/bin/bash
echo "=== Restore user pending ke aktif=1 ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE users SET aktif=1 WHERE status IN ('pending', 'pending_delete', 'pending_edit_pkl') AND aktif=0;
SELECT ROW_COUNT() as rows_updated;
SELECT username, name, role, status, aktif FROM users ORDER BY role, username;
" 2>/dev/null

echo ""
echo "=== Push api.php baru ==="
pct push 102 /tmp/api.php /var/www/html/SIGAP-SMKN9-Official/api.php --perms 755 --user 33 --group 33
pct push 102 /tmp/app.js /var/www/html/SIGAP-SMKN9-Official/js/app.js --perms 755 --user 33 --group 33
pct push 102 /tmp/index.html /var/www/html/SIGAP-SMKN9-Official/index.html --perms 755 --user 33 --group 33
echo "PUSH_DONE"
pct exec 102 -- grep "app.js" /var/www/html/SIGAP-SMKN9-Official/index.html

echo ""
echo "=== Verifikasi API setelah fix ==="
pct exec 102 -- curl -sk "https://localhost/api.php?action=get_users" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('Total:', len(u))
for x in u:
    print(' -', x.get('username'), '|', x.get('role'), '|', x.get('status'))
" 2>&1
