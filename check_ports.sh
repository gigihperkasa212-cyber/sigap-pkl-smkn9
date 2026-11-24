#!/bin/bash
echo "=== Semua NAT rules ==="
iptables -t nat -L PREROUTING -n --line-numbers

echo ""
echo "=== FORWARD rules ==="
iptables -L FORWARD -n | head -20

echo ""
echo "=== Coba tambah port 80 langsung ke public ==="
# Cek apakah ada DNAT untuk port 80
iptables -t nat -L PREROUTING -n | grep "dpt:80 "

echo ""
echo "=== Test dari Proxmox host: apakah kita bisa curl ke IP publik:8080 ==="
curl -s --max-time 5 "http://103.153.190.69:8080/api.php?action=get_users" | head -c 100 && echo "SUCCESS" || echo "FAILED"

echo ""
echo "=== Tambah port 80 public → CT102:80 ==="
# Hapus rule lama port 80 jika ada
iptables -t nat -D PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.100.30:80 2>/dev/null || true
# Tambah rule baru
iptables -t nat -I PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.100.30:80
echo "Port 80 → CT102:80 added"
iptables -t nat -L PREROUTING -n | grep "dpt:80 "
