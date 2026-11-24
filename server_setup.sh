#!/bin/bash
# SIGAP PKL K9 - Setup Server Debian 13
# Tidak pakai set -e agar tidak disconnect saat ada warning

ANDROID_SDK="/opt/android-sdk"
SIGAP_DIR="/opt/sigap-build"

echo "======================================================"
echo " SIGAP PKL K9 - Server Setup (Debian 13 Trixie)"
echo " $(date)"
echo "======================================================"

# ── 1. Install JDK 17 ──────────────────────────────────────
echo ""
echo "[1/4] Install JDK 17..."
apt-get update -qq 2>&1 | tail -2
apt-get install -y -qq openjdk-17-jdk-headless unzip wget curl 2>&1 | tail -3
JAVA_VER=$(java -version 2>&1 | head -1)
echo "  OK: $JAVA_VER"

# ── 2. Android command-line tools ──────────────────────────
echo ""
echo "[2/4] Download Android SDK tools..."
mkdir -p "$ANDROID_SDK/cmdline-tools"
cd /tmp

if [ ! -f "/tmp/cmdline-tools.zip" ]; then
    echo "  Downloading (100MB)..."
    wget -q --show-progress \
        "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" \
        -O /tmp/cmdline-tools.zip 2>&1
    echo "  Download OK"
else
    echo "  Sudah ada, skip download"
fi

echo "  Extract..."
unzip -q -o /tmp/cmdline-tools.zip -d "$ANDROID_SDK/cmdline-tools" 2>/dev/null
if [ -d "$ANDROID_SDK/cmdline-tools/cmdline-tools" ]; then
    rm -rf "$ANDROID_SDK/cmdline-tools/latest"
    mv "$ANDROID_SDK/cmdline-tools/cmdline-tools" "$ANDROID_SDK/cmdline-tools/latest"
fi
echo "  Android SDK tools OK"

# ── 3. Set env dan accept licenses ─────────────────────────
echo ""
echo "[3/4] Setup env + install SDK packages..."
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$ANDROID_SDK
export ANDROID_SDK_ROOT=$ANDROID_SDK
export PATH=$PATH:$JAVA_HOME/bin:$ANDROID_SDK/cmdline-tools/latest/bin:$ANDROID_SDK/platform-tools

# Simpan ke profile
cat > /etc/profile.d/sigap_build.sh << 'EOF'
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$PATH:$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
EOF

yes | sdkmanager --licenses --sdk_root=$ANDROID_SDK > /dev/null 2>&1
sdkmanager "platform-tools" "build-tools;36.0.0" "platforms;android-36" \
    --sdk_root=$ANDROID_SDK 2>&1 | grep -E "Downloading|Installing|done" | head -10
echo "  SDK packages OK"

# ── 4. Verifikasi ───────────────────────────────────────────
echo ""
echo "[4/4] Verifikasi instalasi..."
echo "  Java   : $(java -version 2>&1 | head -1)"
echo "  aapt   : $(ls $ANDROID_SDK/build-tools/36.0.0/aapt 2>/dev/null && echo OK || echo MISSING)"
echo "  Disk   : $(df -h / | tail -1 | awk '{print $4}') tersedia"
echo "  Build  : $SIGAP_DIR"

echo ""
echo "======================================================"
echo " SETUP SELESAI!"
echo "======================================================"
