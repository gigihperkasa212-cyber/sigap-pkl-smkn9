#!/bin/bash
pct push 102 /tmp/api.php /var/www/html/SIGAP-SMKN9-Official/api.php --perms 755 --user 33 --group 33
echo "API_PUSHED"
pct exec 102 -- stat /var/www/html/SIGAP-SMKN9-Official/api.php | grep Modify
