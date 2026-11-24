#!/bin/bash
CT=102; WEB="/var/www/html/SIGAP-SMKN9-Official"
pct push $CT /tmp/app.js     $WEB/js/app.js   --perms 755 --user 33 --group 33 && echo "app pushed"
pct push $CT /tmp/index.html $WEB/index.html  --perms 755 --user 33 --group 33 && echo "index pushed"
pct push $CT /tmp/api.php    $WEB/api.php     --perms 755 --user 33 --group 33 && echo "api pushed"
pct exec $CT -- grep "app.js" $WEB/index.html
