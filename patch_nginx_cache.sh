#!/bin/bash
CONFIG="/etc/nginx/sites-available/SIGAP-SMKN9-Official"

# Tambah location block no-cache untuk CSS dan fonts sebelum location /
# Cek apakah sudah ada
if grep -q 'all.min.css\|woff2.*no-cache\|css.*no-cache\|no-cache.*css' "$CONFIG" 2>/dev/null; then
    echo "CSS no-cache sudah ada, skip"
else
    # Insert sebelum baris "location / {"
    sed -i 's|    location / {|    # No-cache untuk CSS dan font agar perubahan langsung terlihat\n    location ~* \.(css)$ {\n        add_header Cache-Control "no-cache, no-store, must-revalidate" always;\n        add_header Pragma "no-cache" always;\n        add_header Expires "0" always;\n    }\n    location ~* \.(woff2|woff|ttf|eot)$ {\n        add_header Cache-Control "no-cache, no-store, must-revalidate" always;\n        expires -1;\n    }\n    location / {|' "$CONFIG"
    echo "CSS no-cache block ditambahkan"
fi

# Test dan reload nginx
nginx -t 2>&1 && nginx -s reload && echo "NGINX_RELOADED" || echo "NGINX_ERROR"
