#!/bin/bash
echo "=== Batch Geocode dari Server ==="
echo "Total proses: max 50 per batch, jeda 1.2 detik per request"
echo "Mulai..."

# Jalankan batch geocode lewat PHP CLI langsung (bypass HTTP/SSL)
php -r "
define('DB_HOST','192.168.100.1');
define('DB_USER','sigap_user');
define('DB_PASS','SigapPKL@2026!');
define('DB_NAME','sigap_pkl');

\$db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if (\$db->connect_error) { die('DB error: '.\$db->connect_error); }

\$result = \$db->query(\"SELECT id, username, name, pklLocation FROM users WHERE role='siswa' AND (latitude_pkl=0 OR longitude_pkl=0) AND pklLocation != '' LIMIT 50\");

\$success = 0; \$failed = 0;

while (\$row = \$result->fetch_assoc()) {
  \$loc = \$row['pklLocation'];
  
  // Buat beberapa query dari spesifik ke umum
  \$queries = [
    \$loc . ', Malang, Jawa Timur, Indonesia',
    \$loc . ', Indonesia',
    \$loc . ', Jawa Timur'
  ];
  
  \$found = false;
  foreach (\$queries as \$q) {
    \$url = 'https://nominatim.openstreetmap.org/search?q=' . urlencode(\$q) . '&format=json&limit=5&countrycodes=id';
    \$ch = curl_init(\$url);
    curl_setopt(\$ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt(\$ch, CURLOPT_USERAGENT, 'SIGAP-PKL-SMKN9/2.0');
    curl_setopt(\$ch, CURLOPT_TIMEOUT, 10);
    curl_setopt(\$ch, CURLOPT_SSL_VERIFYPEER, false);
    \$resp = curl_exec(\$ch);
    curl_close(\$ch);
    
    if (!\$resp) continue;
    \$res = json_decode(\$resp, true);
    if (empty(\$res)) continue;
    
    // Cari yang paling dekat Malang
    \$bestLat = 0; \$bestLng = 0; \$bestDist = 9999;
    foreach (\$res as \$r) {
      \$rLat = floatval(\$r['lat']); \$rLng = floatval(\$r['lon']);
      \$dist = sqrt(pow(\$rLat-(-7.9825),2)+pow(\$rLng-112.6867,2))*111;
      if (\$dist < \$bestDist && \$dist < 300) {
        \$bestDist = \$dist; \$bestLat = \$rLat; \$bestLng = \$rLng;
      }
    }
    
    if (\$bestLat != 0) {
      \$uid = \$db->real_escape_string(\$row['id']);
      \$db->query(\"UPDATE users SET latitude_pkl=\$bestLat, longitude_pkl=\$bestLng WHERE id='\$uid'\");
      echo 'OK: '.\$row['name'].' -> '.round(\$bestLat,4).', '.round(\$bestLng,4).PHP_EOL;
      \$success++;
      \$found = true;
      break;
    }
  }
  
  if (!\$found) {
    echo 'FAIL: '.\$row['name'].' ['.\$loc.']'.PHP_EOL;
    \$failed++;
  }
  
  usleep(1200000); // 1.2 detik jeda Nominatim
}

echo PHP_EOL.'=== SELESAI: '.\$success.' berhasil, '.\$failed.' gagal ==='.PHP_EOL;
"
