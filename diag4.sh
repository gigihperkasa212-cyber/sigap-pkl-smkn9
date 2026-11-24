#!/bin/bash
echo "=== Test HTTPS port 8443 dari Proxmox host ==="
curl -sk --max-time 5 "https://127.0.0.1:8443/api.php?action=get_users" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print('HTTPS 8443 OK, users:', len(d.get('users',d.get('data',[]))))
except Exception as e:
    raw=sys.stdin.read()
    print('PARSE ERROR:', e, '| RAW:', raw[:300])
" 2>&1 || echo "HTTPS 8443 curl failed"

echo ""
echo "=== Port 8443 listening? ==="
ss -tlnp | grep 8443 || netstat -tlnp 2>/dev/null | grep 8443 || echo "Port 8443 tidak ditemukan"

echo ""
echo "=== Nginx config port 8443 ==="
grep -r "8443\|ssl\|listen" /etc/nginx/ 2>/dev/null | grep -v "#" | head -20 || echo "No nginx config"

echo ""
echo "=== Apache config port 8443 ==="  
grep -r "8443\|ssl\|Listen" /etc/apache2/ 2>/dev/null | grep -v "#" | head -20 || echo "No apache config"

echo ""
echo "=== CT 102 IP ==="
pct exec 102 -- ip addr show | grep inet | head -5

echo ""
echo "=== NAT/iptables rules untuk port 8443 ==="
iptables -t nat -L PREROUTING -n --line-numbers 2>/dev/null | grep 8443 || echo "No NAT rule for 8443"

echo ""
echo "=== Test dari Proxmox ke CT102 langsung ==="
CT_IP=$(pct exec 102 -- hostname -I | awk '{print $1}')
echo "CT102 IP: $CT_IP"
curl -sk --max-time 5 "https://$CT_IP/api.php?action=get_users" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print('CT102 HTTPS direct OK, users:', len(d.get('users',d.get('data',[]))))
except:
    print('RAW:', sys.stdin.read()[:200])
" 2>&1
