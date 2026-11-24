#!/bin/bash
echo "=== Nginx listen ports ==="
pct exec 102 -- ss -tlnp | grep nginx

echo "=== Test HTTP port 80 dari CT102 ==="
pct exec 102 -- curl -s --max-time 3 "http://localhost/api.php?action=get_users" | python3 -c "import sys,json; d=json.load(sys.stdin); print('HTTP OK, users:', len(d.get('users',d.get('data',[]))))" 2>&1

echo "=== NAT rules port 80 ==="
iptables -t nat -L PREROUTING -n | grep "dpt:80 "

echo "=== UFW status ==="
ufw status 2>/dev/null | head -20

echo "=== Test dari Proxmox curl ke IP publik port 80 ==="
curl -s --max-time 5 "http://103.153.190.69/api.php?action=get_users" | head -c 100 && echo "" && echo "SUCCESS_80" || echo "FAIL_80"
