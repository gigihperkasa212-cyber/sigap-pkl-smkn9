#!/bin/bash
CT=102; WEB="/var/www/html/SIGAP-SMKN9-Official"
pct push $CT /tmp/app.js     $WEB/js/app.js   --perms 755 --user 33 --group 33
pct push $CT /tmp/index.html $WEB/index.html  --perms 755 --user 33 --group 33
echo "DONE"; pct exec $CT -- grep "app.js" $WEB/index.html
# Test HTTP port 8080
curl -s --max-time 5 "http://192.168.100.30/api.php?action=get_users" | python3 -c "import sys,json; d=json.load(sys.stdin); print('HTTP:80 OK, users:', len(d.get('users',d.get('data',[]))))" 2>&1
