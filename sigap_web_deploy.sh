#!/bin/bash
#!/bin/bash
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"
SIGAP_DIR="/opt/sigap-build"

echo "=== SIGAP Web Deploy ==="
pct push $CT $SIGAP_DIR/js/app.js $WEB/js/app.js --perms 755 --user 33 --group 33
echo "app.js OK"
pct push $CT $SIGAP_DIR/api.php $WEB/api.php --perms 755 --user 33 --group 33
echo "api.php OK"
pct push $CT $SIGAP_DIR/index.html $WEB/index.html --perms 755 --user 33 --group 33
echo "index.html OK"
# Strip BOM UTF-8 dari api.php jika ada (file dari Windows kadang punya BOM)
pct exec $CT -- sed -i '1s/^\xEF\xBB\xBF//' $WEB/api.php
echo "BOM check api.php done"
cp $SIGAP_DIR/js/app.js $SIGAP_DIR/android/app/src/main/assets/public/js/app.js
cp $SIGAP_DIR/index.html $SIGAP_DIR/android/app/src/main/assets/public/index.html
echo "assets synced"
# Hapus cache lama agar data langsung fresh
pct exec $CT -- rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json 2>/dev/null
echo "cache cleared"
echo "=== VERIFY ==="
pct exec $CT -- wc -l $WEB/js/app.js $WEB/api.php $WEB/index.html 2>&1
pct exec $CT -- head -c 5 $WEB/api.php | od -An -tx1
echo "ALL_DONE"
