#!/bin/bash
echo "=== NAT rules sebelum fix ==="
iptables -t nat -L PREROUTING -n --line-numbers | head -20

echo ""
echo "=== Cek port 443 di CT102 ==="
pct exec 102 -- ss -tlnp | grep -E "443|80|nginx"

echo ""
echo "=== Nginx config CT102 — cek SSL cert ==="
pct exec 102 -- ls -la /etc/ssl/certs/ssl-cert-snakeoil.pem 2>/dev/null || echo "snakeoil not found"
pct exec 102 -- ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "letsencrypt not found"

echo ""
echo "=== Cek apakah nginx bisa listen SSL di CT102 ==="
pct exec 102 -- nginx -t 2>&1

echo ""
echo "=== Aktifkan SSL di nginx CT102 ==="
# Backup config lama
pct exec 102 -- cp /etc/nginx/sites-available/SIGAP-SMKN9-Official /etc/nginx/sites-available/SIGAP-SMKN9-Official.bak

# Tulis config baru dengan SSL + HTTP
cat > /tmp/nginx_sigap.conf << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    root /var/www/html/SIGAP-SMKN9-Official;
    index index.html index.php;

    location ~* \.(html)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }
    location ~* /js/app\.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
    location ~ ^/api\.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 120;
        fastcgi_buffering off;
        proxy_buffering off;
        add_header X-Accel-Buffering no;
        client_max_body_size 20M;
        fastcgi_param HTTP_X_REAL_IP $remote_addr;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }
    location /api/ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    location ~ /api/config\.php$ { deny all; }
    location /tmp_reports/ {
        add_header Content-Disposition "attachment";
        add_header Cache-Control no-store;
    }
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}

server {
    listen 443 ssl;
    server_name _;
    root /var/www/html/SIGAP-SMKN9-Official;
    index index.html index.php;

    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location ~* \.(html)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }
    location ~* /js/app\.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
    location ~ ^/api\.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 120;
        fastcgi_buffering off;
        proxy_buffering off;
        add_header X-Accel-Buffering no;
        client_max_body_size 20M;
        fastcgi_param HTTP_X_REAL_IP $remote_addr;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }
    location /api/ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    location ~ /api/config\.php$ { deny all; }
    location /tmp_reports/ {
        add_header Content-Disposition "attachment";
        add_header Cache-Control no-store;
    }
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
NGINXEOF

pct push 102 /tmp/nginx_sigap.conf /etc/nginx/sites-available/SIGAP-SMKN9-Official --perms 644 --user root --group root

echo ""
echo "=== Test nginx config ==="
pct exec 102 -- nginx -t 2>&1

echo ""
echo "=== Reload nginx ==="
pct exec 102 -- nginx -s reload 2>&1
echo "Nginx reload exit: $?"

echo ""
echo "=== Update NAT: 8443 → CT102:443 ==="
# Hapus rule lama (rule 9: 8443 → 192.168.100.30:80)
iptables -t nat -D PREROUTING -p tcp --dport 8443 -j DNAT --to-destination 192.168.100.30:80 2>/dev/null
# Tambah rule baru: 8443 → CT102:443
iptables -t nat -A PREROUTING -p tcp --dport 8443 -j DNAT --to-destination 192.168.100.30:443
echo "NAT rule baru ditambahkan: 8443 → 192.168.100.30:443"

echo ""
echo "=== NAT rules setelah fix ==="
iptables -t nat -L PREROUTING -n --line-numbers | grep 8443

echo ""
echo "=== Simpan iptables agar persistent ==="
iptables-save > /etc/iptables/rules.v4 2>/dev/null || \
  iptables-save > /etc/iptables.rules 2>/dev/null || \
  echo "WARNING: iptables tidak tersimpan persistent, perlu setup manual"

echo ""
echo "=== Test HTTPS 8443 setelah fix ==="
sleep 2
curl -sk --max-time 8 "https://103.153.190.69:8443/api.php?action=get_users" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    u=d.get('users',d.get('data',[]))
    print('HTTPS 8443 OK! users:', len(u))
    for x in u: print(' -', x.get('username'), x.get('role'))
except Exception as e:
    print('ERROR:', e)
    import sys
    raw=open('/dev/stdin').read() if False else ''
    print('Check manually')
" 2>&1
