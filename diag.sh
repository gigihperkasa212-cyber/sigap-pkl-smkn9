#!/bin/bash
# Diagnosa API server SIGAP
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"

echo "=== File versions di CT102 ==="
pct exec $CT -- head -1 $WEB/js/app.js
pct exec $CT -- grep -o "v=[0-9.]*" $WEB/index.html | tail -1

echo ""
echo "=== API get_users test ==="
pct exec $CT -- curl -sk "http://127.0.0.1/api.php?action=get_users" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    u=d.get('users',d.get('data',[]))
    print('success:',d.get('success'))
    print('total users:',len(u))
    for x in u[:8]:
        print(' -', x.get('username','?'), '|', x.get('role','?'), '| pwd_has_value:', bool(x.get('password','').strip()), '| status:', x.get('status','?'))
except Exception as e:
    print('ERROR parsing JSON:',e)
    print('RAW:',sys.stdin.read()[:200])
"

echo ""
echo "=== Cek tabel users di DB ==="
pct exec $CT -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "SELECT username, role, LENGTH(password) as pwd_len, status, aktif FROM users LIMIT 10;" 2>/dev/null || echo "DB direct failed"

echo ""
echo "=== api.php get_users SELECT query ==="
pct exec $CT -- grep -A3 "case 'get_users'" $WEB/api.php | head -5
