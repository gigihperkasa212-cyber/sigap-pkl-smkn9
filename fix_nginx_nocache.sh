#!/bin/bash
# Jalankan di Proxmox HOST, bukan CT-102
# Patch nginx config di CT-102 untuk tambah no-cache CSS

CONFIG_IN_CT="/etc/nginx/sites-available/SIGAP-SMKN9-Official"

# Tarik config dari CT-102 ke host
pct pull 102 "$CONFIG_IN_CT" /tmp/sigap_nginx_orig.conf

# Cek apakah sudah ada no-cache CSS
if grep -q 'no-cache.*css\|css.*no-cache\|location.*\.css' /tmp/sigap_nginx_orig.conf 2>/dev/null; then
    echo "CSS no-cache sudah ada"
else
    # Patch: insert location block untuk CSS sebelum "location / {"
    python3 - << 'PYEOF'
import re

with open('/tmp/sigap_nginx_orig.conf', 'r') as f:
    content = f.read()

css_block = '''    # No-cache untuk CSS dan font agar update langsung terlihat
    location ~* \.(css)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }
    location ~* \.(woff2|woff|ttf|eot)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        expires -1;
    }
    '''

# Insert sebelum "    location / {"
patched = content.replace('    location / {', css_block + '    location / {', 1)

with open('/tmp/sigap_nginx_patched.conf', 'w') as f:
    f.write(patched)

print("Patch applied")
PYEOF
fi

# Push config yang sudah di-patch kembali ke CT-102
pct push 102 /tmp/sigap_nginx_patched.conf "$CONFIG_IN_CT" --perms 644 --user 0 --group 0

# Test dan reload nginx di CT-102
pct exec 102 -- nginx -t 2>&1
pct exec 102 -- nginx -s reload 2>&1
echo "=== Verify CSS location block ==="
pct exec 102 -- grep -A3 'location.*css' "$CONFIG_IN_CT" 2>&1
echo "ALL_DONE"
