#!/bin/bash
CT=102; WEB="/var/www/html/SIGAP-SMKN9-Official"
pct push $CT /tmp/app.js     $WEB/js/app.js   --perms 755 --user 33 --group 33 && echo "app pushed"
pct push $CT /tmp/index.html $WEB/index.html  --perms 755 --user 33 --group 33 && echo "index pushed"
pct push $CT /tmp/api.php    $WEB/api.php     --perms 755 --user 33 --group 33 && echo "api pushed"
pct exec $CT -- grep "app.js" $WEB/index.html

# Fix pending users di DB
pct exec $CT -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE users SET aktif=1 WHERE status IN ('pending', 'pending_delete', 'pending_edit_pkl') AND aktif=0;
SELECT ROW_COUNT() as pending_restored;
SELECT username, role, status, aktif FROM users ORDER BY status;
" 2>/dev/null

echo "DONE"
