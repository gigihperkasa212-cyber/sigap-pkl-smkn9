#!/bin/bash
CT=102; WEB="/var/www/html/SIGAP-SMKN9-Official"
pct push $CT /tmp/sigap_logo.png     $WEB/img/sigap_logo.png     --perms 755 --user 33 --group 33
pct push $CT /tmp/sigap_logo_new.png $WEB/img/sigap_logo_new.png --perms 755 --user 33 --group 33
pct push $CT /tmp/logo_smkn9.png     $WEB/img/logo_smkn9.png     --perms 755 --user 33 --group 33
echo "Images pushed"
pct exec $CT -- ls -la $WEB/img/
