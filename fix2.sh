#!/bin/bash
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "UPDATE users SET aktif=1 WHERE status IN ('pending','pending_delete','pending_edit_pkl') AND aktif=0; SELECT username,role,status,aktif FROM users ORDER BY role;" 2>/dev/null
pct push 102 /tmp/api.php /var/www/html/SIGAP-SMKN9-Official/api.php --perms 755 --user 33 --group 33
pct push 102 /tmp/app.js /var/www/html/SIGAP-SMKN9-Official/js/app.js --perms 755 --user 33 --group 33
pct push 102 /tmp/index.html /var/www/html/SIGAP-SMKN9-Official/index.html --perms 755 --user 33 --group 33
echo "DONE"
pct exec 102 -- grep "app.js" /var/www/html/SIGAP-SMKN9-Official/index.html
