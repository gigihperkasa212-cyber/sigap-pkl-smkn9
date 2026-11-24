#!/bin/bash
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"
pct push $CT /tmp/app.js     $WEB/js/app.js   --perms 755 --user 33 --group 33
pct push $CT /tmp/index.html $WEB/index.html  --perms 755 --user 33 --group 33
echo "PUSH_DONE"
pct exec $CT -- grep "app.js" $WEB/index.html
