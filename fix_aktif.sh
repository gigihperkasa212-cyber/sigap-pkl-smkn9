#!/bin/bash
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE users SET aktif=1 WHERE status='approved' AND aktif=0;
SELECT username, role, aktif, plain_password FROM users ORDER BY role, username;
" 2>/dev/null
echo "rows_updated done"
# Verifikasi via HTTPS API
pct exec 102 -- curl -sk "https://localhost/api.php?action=get_users" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('API users:', len(u))
for x in u:
    print(' -', x.get('username'), x.get('role'), '| pwd:', x.get('password',''))
"
