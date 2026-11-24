#!/bin/bash
# ============================================================
# SIGAP PKL K9 - Build APK + Deploy Web di Server Proxmox
# Dipanggil dari deploy_all.bat via SSH
# ============================================================

SIGAP_DIR="/opt/sigap-build"
ANDROID_SDK="/opt/android-sdk"
JAVA_HOME_PATH="/usr/lib/jvm/java-21-openjdk-amd64"
CT="102"
WEB="/var/www/html/SIGAP-SMKN9-Official"
OUTPUT_DIR="$SIGAP_DIR/output"

export JAVA_HOME=$JAVA_HOME_PATH
export ANDROID_HOME=$ANDROID_SDK
export ANDROID_SDK_ROOT=$ANDROID_SDK
export PATH=$PATH:$JAVA_HOME_PATH/bin:$ANDROID_SDK/cmdline-tools/latest/bin:$ANDROID_SDK/platform-tools

echo "======================================================"
echo " SIGAP PKL K9 - Build + Deploy"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

# ── 1. Deploy web files ke container ───────────────────────
echo ""
echo "[1/3] Deploy web files..."
pct push $CT $SIGAP_DIR/js/app.js   $WEB/js/app.js   --perms 755 --user 33 --group 33 && echo "  app.js    OK" || echo "  app.js    WARN"
pct push $CT $SIGAP_DIR/index.html  $WEB/index.html  --perms 755 --user 33 --group 33 && echo "  index.html OK" || echo "  index.html WARN"
pct push $CT $SIGAP_DIR/api.php     $WEB/api.php     --perms 755 --user 33 --group 33 && echo "  api.php   OK" || echo "  api.php   WARN"

WEB_VER=$(pct exec $CT -- grep -o 'app\.js?v=[^"<]*' $WEB/index.html 2>/dev/null | head -1 || echo "?")
echo "  Versi live: $WEB_VER"

# ── 2. Build APK ────────────────────────────────────────────
echo ""
echo "[2/3] Build APK..."
cd $SIGAP_DIR/android
chmod +x gradlew

# Gradle build dengan log ringkas
./gradlew assembleRelease \
    --no-daemon \
    --quiet \
    2>&1 | grep -E "BUILD|FAIL|error:|Error:|exception" | tail -10

# Cek hasil build
BUILD_STATUS=${PIPESTATUS[0]}
APK_SRC=$(find $SIGAP_DIR/android/app/build/outputs/apk/release/ -name "*.apk" 2>/dev/null | head -1)

if [ -z "$APK_SRC" ]; then
    echo "  ERROR: APK tidak ditemukan, build mungkin gagal"
    # Coba ulang dengan output lengkap
    echo "  Retry dengan verbose..."
    ./gradlew assembleRelease --no-daemon 2>&1 | tail -30
    exit 1
fi
echo "  Build OK: $(basename $APK_SRC)"

# ── 3. Simpan APK ───────────────────────────────────────────
echo ""
echo "[3/3] Simpan APK..."
mkdir -p "$OUTPUT_DIR"

VER=$(grep versionName $SIGAP_DIR/android/app/build.gradle | grep -oP '"\K[^"]+' | head -1)
APK_OUT="$OUTPUT_DIR/SIGAP-PKL-K9-v${VER}.apk"

# Hapus APK lama versi sama jika ada
rm -f "$APK_OUT"
cp "$APK_SRC" "$APK_OUT"
chmod 644 "$APK_OUT"

SIZE=$(du -h "$APK_OUT" | cut -f1)

echo ""
echo "======================================================"
echo " SELESAI!"
echo " Web : $WEB_VER (live)"
echo " APK : SIGAP-PKL-K9-v${VER}.apk ($SIZE)"
echo " Path: $APK_OUT"
echo "======================================================"
