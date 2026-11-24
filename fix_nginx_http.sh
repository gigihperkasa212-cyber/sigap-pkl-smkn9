#!/bin/bash
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"

echo "=== Cek nginx config saat ini ==="
pct exec $CT -- cat /etc/nginx/sites-available/SIGAP-SMKN9-Official | grep -A3 "listen 80"

echo ""
echo "=== Update nginx: port 80 serve langsung (tanpa redirect) ==="
cat > /tmp/nginx_sigap_fixed.conf << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    root /var/www/html/SIGAP-SMKN9-Official;
    index index.html index.php;

    # CORS headers untuk semua response
    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;

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
    location ~ ^/api\.php {
        if ($request_method = OPTIONS) { return 204; }
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root/api.php;
        include fastcgi_params;
        fastcgi_read_timeout 120;
        fastcgi_buffering off;
        proxy_buffering off;
        add_header X-Accel-Buffering no;
        client_max_body_size 20M;
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    }
    location ~ ^/api/(.*)$ {
        if ($request_method = OPTIONS) { return 204; }
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root/api.php;
        fastcgi_param QUERY_STRING "action=$1&$query_string";
        include fastcgi_params;
        client_max_body_size 20M;
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    }
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

    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;

    location ~* \.(html)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri $uri/ /index.html;
    }
    location ~* /js/app\.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    location / { try_files $uri $uri/ /index.html; }
    location ~ ^/api\.php {
        if ($request_method = OPTIONS) { return 204; }
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root/api.php;
        include fastcgi_params;
        fastcgi_read_timeout 120;
        fastcgi_buffering off;
        proxy_buffering off;
        add_header X-Accel-Buffering no;
        client_max_body_size 20M;
        add_header Access-Control-Allow-Origin * always;
    }
    location ~ ^/api/(.*)$ {
        if ($request_method = OPTIONS) { return 204; }
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root/api.php;
        fastcgi_param QUERY_STRING "action=$1&$query_string";
        include fastcgi_params;
        client_max_body_size 20M;
        add_header Access-Control-Allow-Origin * always;
    }
    location /tmp_reports/ {
        add_header Content-Disposition "attachment";
        add_header Cache-Control no-store;
    }
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
NGINXEOF

pct push $CT /tmp/nginx_sigap_fixed.conf /etc/nginx/sites-available/SIGAP-SMKN9-Official --perms 644 --user root --group root

echo ""
echo "=== Test nginx config ==="
pct exec $CT -- nginx -t 2>&1

echo ""
echo "=== Reload nginx ==="
pct exec $CT -- nginx -s reload
sleep 2

echo ""
echo "=== Verifikasi HTTP port 80 tidak redirect ==="
curl -s --max-time 5 -I "http://192.168.100.30/" | grep -E "HTTP|Location|location" | head -5

echo ""
echo "=== Test API via HTTP ==="
curl -s --max-time 5 "http://192.168.100.30/api.php?action=get_users" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('HTTP API OK, users:', len(u))
for x in u[:3]: print(' -', x.get('username'), x.get('role'))
" 2>&1
