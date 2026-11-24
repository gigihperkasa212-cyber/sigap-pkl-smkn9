#!/bin/bash
echo "=== Tambah NAT port 8888 → CT102:80 ==="
iptables -t nat -D PREROUTING -p tcp --dport 8888 -j DNAT --to-destination 192.168.100.30:80 2>/dev/null
iptables -t nat -I PREROUTING 1 -p tcp --dport 8888 -j DNAT --to-destination 192.168.100.30:80
iptables -I FORWARD 1 -p tcp -d 192.168.100.30 --dport 80 -j ACCEPT
echo "Port 8888 → CT102:80 added"

echo ""
echo "=== Simpan iptables ==="
iptables-save > /etc/iptables/rules.v4 2>/dev/null || iptables-save > /etc/iptables.rules 2>/dev/null || echo "WARNING: tidak tersimpan"

echo ""
echo "=== Test dari Proxmox ke port 8888 ==="
sleep 1
curl -s --max-time 5 "http://103.153.190.69:8888/api.php?action=get_users" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    u=d.get('users',d.get('data',[]))
    print('PORT 8888 OK! users:', len(u))
    for x in u: print(' -', x.get('username'), x.get('role'))
except Exception as e:
    import sys as s2; raw=sys.stdin.read()
    print('FAIL:', e, '| raw:', raw[:100])
" 2>&1
