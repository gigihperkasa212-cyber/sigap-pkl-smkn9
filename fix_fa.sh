#!/bin/bash
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"
SIGAP_DIR="/opt/sigap-build"

echo "=== Fix Font Awesome - Download fresh from CDN with @font-face ==="

# Download all.min.css versi LENGKAP yang berisi @font-face dan path ../webfonts/
# Ini adalah file npm package resmi (bukan CDN) yang berisi @font-face
curl -sL "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" -o /tmp/fa_cdn.css

# Cek apakah CDN punya @font-face
FA_COUNT=$(grep -c '@font-face' /tmp/fa_cdn.css 2>/dev/null || echo 0)
echo "CDN @font-face count: $FA_COUNT"

# CDN biasanya punya @font-face. Jika tidak, buat sendiri dengan menambahkan @font-face di depan
if [ "$FA_COUNT" -lt 3 ]; then
    echo "CDN tidak lengkap, buat manual @font-face..."
    cat > /tmp/fa_fontface.css << 'EOFCSS'
@font-face{font-family:"Font Awesome 6 Brands";font-style:normal;font-weight:400;font-display:block;src:url(../webfonts/fa-brands-400.woff2) format("woff2")}
@font-face{font-family:"Font Awesome 6 Free";font-style:normal;font-weight:400;font-display:block;src:url(../webfonts/fa-regular-400.woff2) format("woff2")}
@font-face{font-family:"Font Awesome 6 Free";font-style:normal;font-weight:900;font-display:block;src:url(../webfonts/fa-solid-900.woff2) format("woff2")}
EOFCSS
    cat /tmp/fa_fontface.css /tmp/fa_cdn.css > /tmp/fa_complete.css
else
    cp /tmp/fa_cdn.css /tmp/fa_complete.css
fi

FA_FINAL=$(grep -c '@font-face' /tmp/fa_complete.css)
FA_SIZE=$(wc -c < /tmp/fa_complete.css)
echo "Final: $FA_FINAL @font-face, $FA_SIZE bytes"

# Copy ke sigap-build
cp /tmp/fa_complete.css $SIGAP_DIR/css/all.min.css

# Push ke CT-102
pct push $CT $SIGAP_DIR/css/all.min.css $WEB/css/all.min.css --perms 644 --user 33 --group 33
echo "Pushed to CT-102"

# Verifikasi
VERIFY=$(pct exec $CT -- grep -c '@font-face' $WEB/css/all.min.css 2>&1)
echo "CT-102 @font-face count: $VERIFY"

echo "DONE"
