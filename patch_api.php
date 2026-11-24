<?php
// patch_api.php — tambahkan endpoint server_geocode ke api.php
// Geocode dari server PHP via Nominatim, simpan langsung ke DB

$apiFile = '/var/www/html/SIGAP-SMKN9-Official/api.php';
$content = file_get_contents($apiFile);

// Endpoint baru: server_geocode
// Dipanggil oleh client JS saat koordinat siswa = 0 atau generic
// Server PHP yang query Nominatim dan simpan ke DB
$newCase = "    case 'server_geocode':
        // Geocode nama PKL dari server PHP → Nominatim → simpan ke DB
        // Lebih akurat dari client JS karena tidak ada batasan CORS
        \$userId   = \$db->real_escape_string(\$input['user_id'] ?? \$input['id'] ?? '');
        \$pklName  = trim(\$input['pklLocation'] ?? \$input['pkl_name'] ?? '');
        if (empty(\$userId) || empty(\$pklName)) { jsonError('user_id dan pklLocation wajib diisi'); }

        // Cek apakah sudah punya koordinat valid di DB (skip jika sudah)
        \$existing = \$db->query(\"SELECT latitude_pkl, longitude_pkl FROM users WHERE id='\$userId'\")->fetch_assoc();
        if (\$existing) {
            \$exLat = floatval(\$existing['latitude_pkl']);
            \$exLng = floatval(\$existing['longitude_pkl']);
            // Koordinat valid = bukan 0, bukan default SMKN9, dalam radius Malang (< 100km)
            \$distFromMalang = sqrt(pow(\$exLat - (-7.9825), 2) + pow(\$exLng - 112.6867, 2)) * 111.0;
            \$isSmkn9Default = (abs(\$exLat - (-7.9825)) < 0.001 && abs(\$exLng - 112.6867) < 0.001);
            \$isGenericBad   = (abs(\$exLat - (-7.9437)) < 0.001 && abs(\$exLng - 112.6136) < 0.001)
                            || (abs(\$exLat - (-7.9797)) < 0.001 && abs(\$exLng - 112.6304) < 0.001)
                            || (abs(\$exLat - (-8.0028)) < 0.001 && abs(\$exLng - 112.6571) < 0.001);
            \$coordAlreadyValid = (\$exLat != 0 && \$exLng != 0 && !\$isSmkn9Default && !\$isGenericBad && \$distFromMalang < 100);
            if (\$coordAlreadyValid) {
                jsonSuccess(['lat' => \$exLat, 'lng' => \$exLng, 'source' => 'db_existing', 'cached' => true]);
                break;
            }
        }

        // Bersihkan nama: ambil bagian pertama sebelum koma (nama bisnis saja)
        \$cleanName = \$pklName;
        if (strpos(\$pklName, ',') !== false) {
            \$parts = explode(',', \$pklName);
            \$cleanName = trim(\$parts[0]);
        }

        // Query Nominatim dengan beberapa strategi
        \$queries = [
            urlencode(\$cleanName . ', Malang, Jawa Timur, Indonesia'),
            urlencode(\$cleanName . ', Malang'),
            urlencode(\$pklName . ', Malang, Jawa Timur'),
        ];

        \$foundLat = 0; \$foundLng = 0; \$foundSource = '';
        foreach (\$queries as \$q) {
            \$url = 'https://nominatim.openstreetmap.org/search?q=' . \$q . '&format=json&limit=5&accept-language=id';
            \$ch = curl_init(\$url);
            curl_setopt(\$ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt(\$ch, CURLOPT_USERAGENT, 'SIGAP-PKL-K9/1.0 (smkn9malang.sch.id)');
            curl_setopt(\$ch, CURLOPT_TIMEOUT, 8);
            curl_setopt(\$ch, CURLOPT_SSL_VERIFYPEER, false);
            \$resp = curl_exec(\$ch);
            curl_close(\$ch);
            if (!\$resp) continue;
            \$results = json_decode(\$resp, true);
            if (!is_array(\$results) || count(\$results) === 0) continue;
            // Pilih hasil paling dekat Malang (dalam radius 50km)
            foreach (\$results as \$res) {
                \$rLat = floatval(\$res['lat'] ?? 0);
                \$rLng = floatval(\$res['lon'] ?? 0);
                if (\$rLat == 0 || \$rLng == 0) continue;
                \$dist = sqrt(pow(\$rLat - (-7.9825), 2) + pow(\$rLng - 112.6867, 2)) * 111.0;
                if (\$dist < 50) { // dalam radius 50km dari Malang
                    \$foundLat = \$rLat;
                    \$foundLng = \$rLng;
                    \$foundSource = 'nominatim';
                    break 2; // keluar dari kedua loop
                }
            }
            // Jika tidak ada dalam 50km, ambil yang paling dekat dalam 150km
            foreach (\$results as \$res) {
                \$rLat = floatval(\$res['lat'] ?? 0);
                \$rLng = floatval(\$res['lon'] ?? 0);
                if (\$rLat == 0 || \$rLng == 0) continue;
                \$dist = sqrt(pow(\$rLat - (-7.9825), 2) + pow(\$rLng - 112.6867, 2)) * 111.0;
                if (\$dist < 150) {
                    \$foundLat = \$rLat;
                    \$foundLng = \$rLng;
                    \$foundSource = 'nominatim_fallback';
                    break 2;
                }
            }
        }

        if (\$foundLat != 0 && \$foundLng != 0) {
            // Simpan ke DB
            \$db->query(\"UPDATE users SET latitude_pkl=\$foundLat, longitude_pkl=\$foundLng WHERE id='\$userId'\");
            jsonSuccess(['lat' => \$foundLat, 'lng' => \$foundLng, 'source' => \$foundSource, 'name' => \$pklName]);
        } else {
            jsonError('Koordinat tidak ditemukan untuk: ' . \$pklName);
        }
        break;

    case 'geocode_all_students':
        // Geocode semua siswa yang koordinatnya 0 atau default
        // Dijalankan sekali oleh admin untuk seed koordinat awal
        \$result = \$db->query(\"SELECT id, name, pklLocation FROM users WHERE role='siswa' AND (latitude_pkl=0 OR latitude_pkl IS NULL OR (ABS(latitude_pkl - (-7.9825)) < 0.001 AND ABS(longitude_pkl - 112.6867) < 0.001)) LIMIT 50\");
        \$processed = 0; \$success = 0;
        while (\$row = \$result->fetch_assoc()) {
            \$pklName  = trim(\$row['pklLocation'] ?? '');
            if (empty(\$pklName)) continue;
            \$cleanName = strpos(\$pklName, ',') !== false ? trim(explode(',', \$pklName)[0]) : \$pklName;
            \$url = 'https://nominatim.openstreetmap.org/search?q=' . urlencode(\$cleanName . ', Malang, Jawa Timur') . '&format=json&limit=3&accept-language=id';
            \$ch = curl_init(\$url);
            curl_setopt(\$ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt(\$ch, CURLOPT_USERAGENT, 'SIGAP-PKL-K9/1.0 (smkn9malang.sch.id)');
            curl_setopt(\$ch, CURLOPT_TIMEOUT, 5);
            curl_setopt(\$ch, CURLOPT_SSL_VERIFYPEER, false);
            \$resp = curl_exec(\$ch);
            curl_close(\$ch);
            usleep(1100000); // 1.1 detik jeda (Nominatim rate limit: max 1 req/detik)
            \$processed++;
            if (!\$resp) continue;
            \$res = json_decode(\$resp, true);
            if (!is_array(\$res) || count(\$res) === 0) continue;
            foreach (\$res as \$r) {
                \$rLat = floatval(\$r['lat'] ?? 0);
                \$rLng = floatval(\$r['lon'] ?? 0);
                \$dist = sqrt(pow(\$rLat - (-7.9825), 2) + pow(\$rLng - 112.6867, 2)) * 111.0;
                if (\$dist < 80) {
                    \$uid = \$db->real_escape_string(\$row['id']);
                    \$db->query(\"UPDATE users SET latitude_pkl=\$rLat, longitude_pkl=\$rLng WHERE id='\$uid'\");
                    \$success++;
                    break;
                }
            }
        }
        jsonSuccess(['processed' => \$processed, 'success' => \$success, 'message' => \"Berhasil geocode \$success dari \$processed siswa\"]);
        break;

";

// Sisipkan sebelum case 'update_pkl_location'
$insertBefore = "    case 'update_pkl_location':";
if (strpos($content, "case 'server_geocode':") !== false) {
    echo "SKIP: server_geocode sudah ada\n";
} elseif (strpos($content, $insertBefore) === false) {
    echo "ERROR: update_pkl_location case not found\n";
    exit(1);
} else {
    $content = str_replace($insertBefore, $newCase . $insertBefore, $content);
    file_put_contents($apiFile, $content);
    echo "OK: server_geocode dan geocode_all_students ditambahkan\n";
}
