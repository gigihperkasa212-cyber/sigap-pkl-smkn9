#!/bin/bash
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"
SIGAP_DIR="/opt/sigap-build"

echo "=== Deploy CSS/FA ==="
pct push $CT $SIGAP_DIR/css/all.min.css $WEB/css/all.min.css --perms 644 --user 33 --group 33
echo "all.min.css pushed"

echo "=== Verify @font-face count ==="
pct exec $CT -- grep -c '@font-face' $WEB/css/all.min.css 2>&1
echo "=== Verify file size ==="
pct exec $CT -- ls -lh $WEB/css/all.min.css 2>&1
echo "DONE"
