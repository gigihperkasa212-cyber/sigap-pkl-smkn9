#!/bin/bash
echo "=== Port yang terbuka saat ini ==="
iptables -t nat -L PREROUTING -n | grep -E "8080|8443|2202"

echo ""
echo "=== Cek apakah ada FORWARD rule untuk 8080 ==="
iptables -L FORWARD -n | grep "192.168.100.30" | head -5

echo ""
echo "=== Tambah FORWARD rule untuk 8080 ==="
# Pastikan traffic dari luar bisa masuk ke CT102
iptables -I FORWARD -p tcp -d 192.168.100.30 --dport 80 -j ACCEPT 2>/dev/null
iptables -I FORWARD -p tcp -s 192.168.100.30 -j ACCEPT 2>/dev/null
echo "FORWARD rules added"

echo ""
echo "=== Cek MASQUERADE ==="
iptables -t nat -L POSTROUTING -n | head -10

echo ""
echo "=== Pastikan MASQUERADE aktif untuk LAN ==="
iptables -t nat -A POSTROUTING -s 192.168.100.0/24 -o vmbr0 -j MASQUERADE 2>/dev/null || true

echo ""
echo "=== Test dari Proxmox ke CT102 port 80 ==="
curl -s --max-time 5 "http://192.168.100.30/api.php?action=get_users" | head -c 100

echo ""
echo "=== Test dari Proxmox via NAT 8080 ==="  
curl -s --max-time 5 "http://127.0.0.1:8080/api.php?action=get_users" | head -c 100
