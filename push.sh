#!/bin/bash
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"
pct push $CT /tmp/app.js      $WEB/js/app.js      --perms 755 --user 33 --group 33
pct push $CT /tmp/index.html  $WEB/index.html     --perms 755 --user 33 --group 33
pct push $CT /tmp/styles.css  $WEB/css/styles.css --perms 755 --user 33 --group 33
pct push $CT /tmp/api.php     $WEB/api.php        --perms 755 --user 33 --group 33
echo "PUSH_DONE"
# Verifikasi versi
pct exec $CT -- grep "app.js" $WEB/index.html
# Verifikasi API
pct exec $CT -- curl -sk "http://127.0.0.1/api.php?action=get_users" | python3 -c "import sys,json; d=json.load(sys.stdin); u=d.get('users',[]); print('API_USERS:',len(u))"
