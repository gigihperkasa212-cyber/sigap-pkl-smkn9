#!/bin/bash
# Jalankan di Proxmox HOST
CT=102
WEB="/var/www/html/SIGAP-SMKN9-Official"

echo "=== Fix webfonts path ==="

# CSS pakai ../webfonts/ yang resolve ke /webfonts/ di web root
# Buat symlink: /var/www/html/SIGAP-SMKN9-Official/webfonts -> css/webfonts
pct exec $CT -- bash -c "
  cd $WEB
  # Cek kondisi saat ini
  echo 'css/webfonts isi:'; ls css/webfonts/ 2>&1
  echo 'webfonts/ (root):'; ls webfonts/ 2>&1

  # Buat symlink webfonts -> css/webfonts jika belum ada
  if [ ! -d webfonts ] && [ ! -L webfonts ]; then
    ln -s css/webfonts webfonts
    echo 'Symlink dibuat: webfonts -> css/webfonts'
  elif [ -L webfonts ]; then
    echo 'Symlink sudah ada'
  else
    echo 'webfonts/ sudah ada sebagai direktori'
  fi

  # Verifikasi
  echo 'Verifikasi:'; ls -la webfonts/ 2>&1
  echo 'Test font accessible:'; ls webfonts/fa-solid-900.woff2 2>&1
"
echo "DONE"
