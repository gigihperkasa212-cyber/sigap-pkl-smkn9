#!/bin/bash
pct push 102 /tmp/install_cert_guide.html /var/www/html/SIGAP-SMKN9-Official/install_cert.html --perms 755 --user 33 --group 33
echo "cert guide pushed: $?"
pct exec 102 -- ls -la /var/www/html/SIGAP-SMKN9-Official/sigap_cert.crt /var/www/html/SIGAP-SMKN9-Official/install_cert.html
