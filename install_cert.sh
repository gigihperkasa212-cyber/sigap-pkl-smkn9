#!/bin/bash
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"

echo "=== Buat halaman download cert ==="
# Copy cert ke web root agar bisa didownload dari browser
pct exec $CT -- cp /etc/ssl/certs/ssl-cert-snakeoil.pem /var/www/html/SIGAP-SMKN9-Official/sigap_cert.crt
pct exec $CT -- chmod 644 /var/www/html/SIGAP-SMKN9-Official/sigap_cert.crt
echo "cert tersedia di: https://103.153.190.69:8443/sigap_cert.crt"

echo ""
echo "=== Verifikasi cert file ==="
pct exec $CT -- ls -la /var/www/html/SIGAP-SMKN9-Official/sigap_cert.crt
pct exec $CT -- openssl x509 -in /etc/ssl/certs/ssl-cert-snakeoil.pem -noout -subject -dates 2>/dev/null
