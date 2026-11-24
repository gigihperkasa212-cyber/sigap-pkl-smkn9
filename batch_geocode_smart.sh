#!/bin/bash
# Batch geocode cerdas: ekstrak nama utama, coba beberapa variasi query
php -r "
define('DB_HOST','192.168.100.1');
define('DB_USER','sigap_user');
define('DB_PASS','SigapPKL@2026!');
define('DB_NAME','sigap_pkl');

\$db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if (\$db->connect_error) die('DB: '.\$db->connect_error.PHP_EOL);

\$result = \$db->query(\"SELECT id, name, pklLocation FROM users 
  WHERE role='siswa' AND (latitude_pkl=0 OR longitude_pkl=0) 
  AND pklLocation != '' LIMIT 100\");

\$ok=0; \$fail=0;

function geocode(\$q) {
  \$url = 'https://nominatim.openstreetmap.org/search?q='.urlencode(\$q).'&format=json&limit=5&countrycodes=id&addressdetails=1';
  \$ch = curl_init(\$url);
  curl_setopt_array(\$ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_USERAGENT=>'SIGAP-PKL/2.0', CURLOPT_TIMEOUT=>8, CURLOPT_SSL_VERIFYPEER=>false]);
  \$r = curl_exec(\$ch); curl_close(\$ch);
  return \$r ? json_decode(\$r,true) : [];
}

function bestResult(\$res) {
  \$best=null; \$bestDist=9999;
  foreach(\$res as \$r) {
    \$lat=floatval(\$r['lat']); \$lng=floatval(\$r['lon']);
    \$d=sqrt(pow(\$lat-(-7.9825),2)+pow(\$lng-112.6867,2))*111;
    if(\$d < \$bestDist && \$d < 400) { \$bestDist=\$d; \$best=['lat'=>\$lat,'lng'=>\$lng,'d'=>round(\$d,1)]; }
  }
  return \$best;
}

while(\$row = \$result->fetch_assoc()) {
  \$full = trim(\$row['pklLocation']);
  
  // Ekstrak nama utama: ambil teks sebelum 'Jl.', 'Jalan', alamat detail
  \$name = preg_split('/\s+(Jl\.|Jalan|Jln\.|\d+\/\d+|RT\.|RW\.|Blok|No\.|Gg\.|Gang|Dusun|Desa|Kel\.)/i', \$full)[0];
  \$name = trim(\$name);
  
  // Bersihkan karakter khusus
  \$name = preg_replace('/[()]/','',\$name);
  \$name = preg_replace('/\s+/',' ',\$name);
  
  // Queries dari spesifik ke umum
  \$queries = [
    \$name . ', Malang, Jawa Timur',
    \$name . ', Jawa Timur, Indonesia',
    \$name . ', Indonesia',
    \$name,
  ];
  
  \$found=false;
  foreach(\$queries as \$q) {
    if(strlen(trim(\$q)) < 4) continue;
    \$res = geocode(\$q);
    \$best = bestResult(\$res);
    if(\$best) {
      \$uid=\$db->real_escape_string(\$row['id']);
      \$db->query(\"UPDATE users SET latitude_pkl={\$best['lat']}, longitude_pkl={\$best['lng']} WHERE id='\$uid'\");
      echo 'OK: '.\$row['name'].' | '.\$name.' -> '.\$best['lat'].','.\$best['lng'].' ('.\$best['d'].'km)'.PHP_EOL;
      \$ok++; \$found=true; break;
    }
    usleep(500000);
  }
  
  if(!\$found) {
    echo 'FAIL: '.\$row['name'].' | '.\$name.PHP_EOL;
    \$fail++;
  }
  
  usleep(1000000);
}
echo PHP_EOL.'SELESAI: '.\$ok.' OK, '.\$fail.' FAIL'.PHP_EOL;
"
