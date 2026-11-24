GOLDEN BACKUP - APK v2.2.112
Tanggal: 2026-10-20
Status: BERFUNGSI PENUH

Isi:
- app.js    : 941KB (source v2.2.29)
- index.html: 137KB (source v2.2.29)
- FA icons  : CDN cdnjs.cloudflare.com
- Database  : 192.168.100.1, sigap_pkl
- Users     : 370, Absen: 700+

CARA RESTORE JIKA APK RUSAK:
Di Proxmox Shell jalankan:

cp -r /opt/sigap-build/golden_backup_v2.2.112/cordova.js /opt/sigap-build/android/app/src/main/assets/public/
cp -r /opt/sigap-build/golden_backup_v2.2.112/index.html /opt/sigap-build/android/app/src/main/assets/public/
cp -r /opt/sigap-build/golden_backup_v2.2.112/js/ /opt/sigap-build/android/app/src/main/assets/public/
cp -r /opt/sigap-build/golden_backup_v2.2.112/css/ /opt/sigap-build/android/app/src/main/assets/public/
cp -r /opt/sigap-build/golden_backup_v2.2.112/img/ /opt/sigap-build/android/app/src/main/assets/public/
rm -f /opt/sigap-build/.last_build_hash
cd /opt/sigap-build && bash auto_build.sh
