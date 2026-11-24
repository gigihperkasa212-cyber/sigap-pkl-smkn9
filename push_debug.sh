#!/bin/bash
pct push 102 /tmp/apk_debug.html /var/www/html/SIGAP-SMKN9-Official/apk_debug.html --perms 755 --user 33 --group 33
echo "PUSHED"
pct exec 102 -- ls -la /var/www/html/SIGAP-SMKN9-Official/apk_debug.html
