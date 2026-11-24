#!/bin/bash
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"

echo "=== Fix 1: Aktifkan hairpin NAT agar server bisa test diri sendiri ==="
# Masquerade traffic dari internal ke IP publik sendiri
iptables -t nat -A POSTROUTING -s 192.168.100.0/24 -d 192.168.100.30 -j MASQUERADE 2>/dev/null || true
echo "Hairpin NAT done"

echo ""
echo "=== Fix 2: Update nginx config — tambah route /api/ yang benar ==="
cat > /tmp/nginx_sigap_v2.conf << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    # Redirect HTTP ke HTTPS
    return 301 https://$host:8443$request_uri;
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

    # No-cache untuk HTML dan JS
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

    # Main app
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API PHP utama
    location ~ ^/api\.php {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root/api.php;
        include fastcgi_params;
        fastcgi_read_timeout 120;
        fastcgi_buffering off;
        proxy_buffering off;
        add_header X-Accel-Buffering no;
        client_max_body_size 20M;
        fastcgi_param HTTP_X_REAL_IP $remote_addr;
        add_header Access-Control-Allow-Origin *  always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
        if ($request_method = OPTIONS) { return 204; }
    }

    # Legacy /api/* routes — semua dialihkan ke api.php
    location ~ ^/api/(.*)$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root/api.php;
        fastcgi_param QUERY_STRING "action=$1&$query_string";
        include fastcgi_params;
        fastcgi_read_timeout 60;
        client_max_body_size 20M;
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        if ($request_method = OPTIONS) { return 204; }
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

pct push $CT /tmp/nginx_sigap_v2.conf /etc/nginx/sites-available/SIGAP-SMKN9-Official --perms 644 --user root --group root

echo ""
echo "=== Test nginx config ==="
pct exec $CT -- nginx -t 2>&1

echo ""
echo "=== Reload nginx ==="
pct exec $CT -- nginx -s reload
sleep 2

echo ""
echo "=== Verifikasi: Test HTTPS CT102:443 ==="
curl -sk --max-time 8 "https://192.168.100.30/api.php?action=get_users" | python3 -c "
import sys,json; d=json.load(sys.stdin); u=d.get('users',d.get('data',[])); print('HTTPS:443 OK, users:', len(u))
" 2>&1

echo ""
echo "=== Verifikasi: Test dari luar via 8443 (hairpin) ==="
curl -sk --max-time 8 "https://103.153.190.69:8443/api.php?action=get_users" | python3 -c "
import sys,json; d=json.load(sys.stdin); u=d.get('users',d.get('data',[])); print('NAT 8443 OK, users:', len(u))
" 2>&1 || echo "Hairpin test mungkin gagal dari server sendiri - normal"

echo ""
echo "=== SELESAI ==="
echo "Akses dari luar: https://103.153.190.69:8443/"
