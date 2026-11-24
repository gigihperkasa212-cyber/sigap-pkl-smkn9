#!/bin/bash
# SIGAP PKL K9 - Deploy web + trigger build APK background
# Dipanggil dari Kiro Hook setiap kali file disimpan

CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"
SIGAP_DIR="/opt/sigap-build"
LOG="$SIGAP_DIR/build.log"

# Deploy web files ke container
[ -f "$SIGAP_DIR/js/app.js" ]    && pct push $CT $SIGAP_DIR/js/app.js   $WEB/js/app.js   --perms 755 --user 33 --group 33
[ -f "$SIGAP_DIR/index.html" ]   && pct push $CT $SIGAP_DIR/index.html  $WEB/index.html  --perms 755 --user 33 --group 33
[ -f "$SIGAP_DIR/api.php" ]      && pct push $CT $SIGAP_DIR/api.php     $WEB/api.php     --perms 755 --user 33 --group 33

echo "$(date '+%H:%M:%S') WEB_DEPLOYED" | tee -a $LOG

# Trigger build APK di background (tidak block SSH session)
nohup bash $SIGAP_DIR/auto_build.sh >> $LOG 2>&1 &
BUILD_PID=$!
echo "$(date '+%H:%M:%S') APK_BUILD_STARTED (PID: $BUILD_PID)" | tee -a $LOG

echo "DEPLOY_OK BUILD_TRIGGERED"
