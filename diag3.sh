#!/bin/bash
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"

echo "=== 1. Versi file di server ==="
pct exec $CT -- grep "app.js" $WEB/index.html

echo ""
echo "=== 2. API get_users lengkap ==="
pct exec $CT -- curl -sk "http://127.0.0.1/api.php?action=get_users" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('success:', d.get('success'), '| total:', len(u))
for x in u:
    print(' ID:', x.get('id','?')[:20], '| user:', x.get('username','?'), '| role:', x.get('role','?'), '| pwd_len:', len(str(x.get('password',''))), '| aktif:', x.get('aktif','?'))
"

echo ""
echo "=== 3. Test HTTPS API dari luar (port 8443) ==="
pct exec $CT -- curl -sk "https://103.153.190.69:8443/api.php?action=get_users" -o /tmp/https_test.json 2>&1
pct exec $CT -- python3 -c "
import json
try:
    d=json.load(open('/tmp/https_test.json'))
    u=d.get('users',d.get('data',[]))
    print('HTTPS API total users:', len(u))
except Exception as e:
    print('ERROR:', e)
    print('RAW:', open('/tmp/https_test.json').read()[:200])
"

echo ""
echo "=== 4. Cek nginx/apache config port 8443 ==="
pct exec $CT -- nginx -T 2>/dev/null | grep -E "listen|root|ssl" | head -20 || true
pct exec $CT -- cat /etc/nginx/sites-enabled/* 2>/dev/null | grep -E "listen|root|ssl" | head -20 || true

echo ""
echo "=== 5. Cek CORS header API ==="
pct exec $CT -- curl -sk -I "http://127.0.0.1/api.php?action=get_users" | grep -i "access-control\|content-type\|HTTP"
