#!/bin/bash
# ============================================================
# SIGAP PKL K9 - Init Server (jalankan SEKALI dari Git Bash)
# Usage: cd "d:/absen pkl update" && bash init_server.sh
# Minta password SSH server SEKALI, selanjutnya otomatis
# ============================================================

SERVER="root@103.153.190.69"
KEY="$HOME/.ssh/sigap_pkl_key"
SIGAP_DIR="/opt/sigap-build"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "======================================================"
echo " SIGAP PKL K9 - Inisialisasi Server (sekali saja)"
echo "======================================================"

# ── 1. Generate SSH key jika belum ada ─────────────────────
echo ""
echo "[1/5] Cek SSH key..."
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
if [ ! -f "$KEY" ]; then
    ssh-keygen -t ed25519 -f "$KEY" -N "" -C "sigap-pkl-deploy"
    echo "  Key baru dibuat: $KEY"
else
    echo "  Key sudah ada: $KEY"
fi

# ── 2. Daftarkan SSH key ke server (butuh password sekali) ──
echo ""
echo "[2/5] Daftarkan SSH key ke server..."
echo "  >> MASUKKAN PASSWORD ROOT SERVER SEKARANG <<"
PUB=$(cat "${KEY}.pub")
ssh -o StrictHostKeyChecking=no "$SERVER" bash -c "
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    if ! grep -qF '${PUB}' ~/.ssh/authorized_keys 2>/dev/null; then
        echo '${PUB}' >> ~/.ssh/authorized_keys
    fi
    chmod 600 ~/.ssh/authorized_keys
    echo SSH_KEY_OK
"
echo "  Tidak perlu password lagi setelah ini!"

# ── 3. Setup folder di server ──────────────────────────────
echo ""
echo "[3/5] Setup folder di server..."
ssh -o StrictHostKeyChecking=no -i "$KEY" "$SERVER" "
    mkdir -p $SIGAP_DIR/js
    mkdir -p $SIGAP_DIR/output
    mkdir -p $SIGAP_DIR/android/app/src/main/assets
    echo FOLDER_OK
"
echo "  Folder $SIGAP_DIR siap"

# ── 4. Upload Android project ke server ────────────────────
echo ""
echo "[4/5] Upload Android project ke server (mungkin 2-5 menit)..."

# Upload seluruh android folder kecuali build/
rsync -av --exclude='build/' --exclude='.gradle/' --exclude='.idea/' \
    -e "ssh -o StrictHostKeyChecking=no -i '$KEY'" \
    "$SCRIPT_DIR/android/" \
    "$SERVER:$SIGAP_DIR/android/" 2>&1 | tail -5

# Upload keystore
scp -o StrictHostKeyChecking=no -i "$KEY" \
    "$SCRIPT_DIR/android/release.keystore" \
    "$SERVER:$SIGAP_DIR/android/release.keystore"
echo "  Android project uploaded"

# Upload web files
scp -o StrictHostKeyChecking=no -i "$KEY" \
    "$SCRIPT_DIR/js/app.js" \
    "$SCRIPT_DIR/index.html" \
    "$SCRIPT_DIR/api.php" \
    "$SERVER:$SIGAP_DIR/"
echo "  Web files uploaded"

# Upload build script
scp -o StrictHostKeyChecking=no -i "$KEY" \
    "$SCRIPT_DIR/server_setup.sh" \
    "$SCRIPT_DIR/server_build.sh" \
    "$SERVER:/tmp/"
echo "  Build scripts uploaded"

# ── 5. Jalankan setup JDK + Android SDK ────────────────────
echo ""
echo "[5/5] Install JDK 17 + Android SDK di server..."
echo "  (5-10 menit, tergantung kecepatan server)"
ssh -o StrictHostKeyChecking=no -i "$KEY" "$SERVER" \
    "chmod +x /tmp/server_setup.sh && bash /tmp/server_setup.sh"

echo ""
echo "======================================================"
echo " INISIALISASI SELESAI!"
echo ""
echo " Selanjutnya, untuk deploy + build APK:"
echo "   Klik dua kali: deploy_all.bat"
echo ""
echo " Atau dari terminal:"
echo "   deploy_all.bat"
echo "======================================================"
