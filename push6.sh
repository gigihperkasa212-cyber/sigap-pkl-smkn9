#!/bin/bash
CT=102; WEB="/var/www/html/SIGAP-SMKN9-Official"
pct push $CT /tmp/app.js     $WEB/js/app.js   --perms 755 --user 33 --group 33
pct push $CT /tmp/index.html $WEB/index.html  --perms 755 --user 33 --group 33
pct push $CT /tmp/api.php    $WEB/api.php     --perms 755 --user 33 --group 33
echo "PUSH_DONE"
pct exec $CT -- grep "app.js" $WEB/index.html
echo "=== Verifikasi DB ==="
pct exec $CT -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "SELECT username,role,aktif FROM users;" 2>/dev/null
