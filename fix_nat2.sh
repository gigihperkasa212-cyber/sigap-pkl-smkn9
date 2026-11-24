#!/bin/bash
echo "=== Semua NAT rules dengan nomor ==="
iptables -t nat -L PREROUTING -n --line-numbers

echo ""
echo "=== Port 80 ke server mana? ==="
# Cek rule no 1 (port 443 → 192.168.100.10) dan rule port 80
iptables -t nat -L PREROUTING -n | grep -E "dpt:80|dpt:443" | head -10

echo ""
echo "=== Siapa yang listen di 192.168.100.10? ==="
# Cek CT list
pct list 2>/dev/null || qm list 2>/dev/null

echo ""
echo "=== Hapus rule port 80 yang konflik dan tambah ulang di posisi awal ==="
# Hapus semua rule port 80 dulu
iptables -t nat -D PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.100.30:80 2>/dev/null
iptables -t nat -D PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.100.30:80 2>/dev/null
# Insert di posisi 1 (paling atas) agar prioritas tertinggi
iptables -t nat -I PREROUTING 1 -p tcp --dport 80 -j DNAT --to-destination 192.168.100.30:80
echo "Rule port 80 diinsert di posisi 1"
iptables -t nat -L PREROUTING -n | grep "dpt:80"

echo ""
echo "=== Test ulang curl HTTP port 80 ==="
sleep 1
curl -s --max-time 5 "http://103.153.190.69/api.php?action=get_users" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print('HTTP:80 OK, users:', len(d.get('users',d.get('data',[]))))
except Exception as e:
    import sys as s
    print('RAW:', open('/dev/stdin').read()[:100] if False else 'parse error: '+str(e))
" 2>&1

echo ""
echo "=== Coba port 8080 ==="
curl -s --max-time 5 "http://103.153.190.69:8080/api.php?action=get_users" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print('HTTP:8080 OK, users:', len(d.get('users',d.get('data',[]))))
except:
    print('RAW:', sys.stdin.read()[:100])
" 2>&1
