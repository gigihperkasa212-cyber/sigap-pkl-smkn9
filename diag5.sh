#!/bin/bash
CT=102
echo "=== Nginx sites-enabled di CT102 ==="
pct exec $CT -- ls -la /etc/nginx/sites-enabled/

echo ""
echo "=== Nginx SIGAP config (active) ==="
pct exec $CT -- cat /etc/nginx/sites-enabled/SIGAP-SMKN9-Official 2>/dev/null || pct exec $CT -- cat /etc/nginx/sites-available/SIGAP-SMKN9-Official 2>/dev/null

echo ""
echo "=== Port yang di-listen nginx CT102 ==="
pct exec $CT -- ss -tlnp | grep -E "nginx|80|443"

echo ""
echo "=== Test HTTP port 80 di CT102 ==="
curl -sk --max-time 5 "http://192.168.100.30/api.php?action=get_users" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print('HTTP:80 OK, users:', len(d.get('users',d.get('data',[]))))
except Exception as e:
    print('HTTP:80 ERROR:', e, '| RAW:', sys.stdin.read()[:200])
" 2>&1

echo ""
echo "=== Test HTTPS port 443 di CT102 ==="
curl -sk --max-time 5 "https://192.168.100.30/api.php?action=get_users" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print('HTTPS:443 OK, users:', len(d.get('users',d.get('data',[]))))
except Exception as e:
    print('HTTPS:443 ERROR:', e, '| RAW:', sys.stdin.read()[:200])
" 2>&1

echo ""
echo "=== NAT rules lengkap ==="
iptables -t nat -L PREROUTING -n --line-numbers 2>/dev/null | head -20
