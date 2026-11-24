#!/bin/bash
CT=102

echo "=== Port yang di-listen nginx CT102 sekarang ==="
pct exec $CT -- ss -tlnp | grep nginx

echo ""
echo "=== Test HTTPS langsung ke CT102:443 ==="
curl -sk --max-time 8 "https://192.168.100.30/api.php?action=get_users" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    u=d.get('users',d.get('data',[]))
    print('CT102 HTTPS:443 OK! users:', len(u))
    for x in u[:5]: print(' -', x.get('username'), x.get('role'))
except Exception as e:
    import sys as sys2
    print('PARSE ERROR:', e)
" 2>&1

echo ""
echo "=== Test melalui NAT 8443 ==="
curl -sk --max-time 8 "https://103.153.190.69:8443/api.php?action=get_users" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    u=d.get('users',d.get('data',[]))
    print('NAT 8443 OK! users:', len(u))
    for x in u[:5]: print(' -', x.get('username'), x.get('role'))
except Exception as e:
    print('PARSE ERROR:', e)
" 2>&1

echo ""
echo "=== SSL handshake debug ==="
echo | openssl s_client -connect 192.168.100.30:443 -brief 2>&1 | head -5

echo ""
echo "=== Nginx error log CT102 ==="
pct exec $CT -- tail -20 /var/log/nginx/error.log 2>/dev/null || echo "No error log"

echo ""
echo "=== Cek ssl_certificate path di nginx ==="
pct exec $CT -- ls -la /etc/ssl/certs/ssl-cert-snakeoil.pem
pct exec $CT -- ls -la /etc/ssl/private/ssl-cert-snakeoil.key
