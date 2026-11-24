<?php
/**
 * patch_api_geo.php
 * FIX 1: Jangan reset koordinat ke 0 saat update lokasi — simpan jika valid
 * FIX 2: Tambah endpoint get_student_pkl_location — ambil koordinat siswa dari DB
 * FIX 3: Perbaiki batch geocode agar lebih efektif
 */

$apiFile = '/var/www/html/SIGAP-SMKN9-Official/api.php';
$content = file_get_contents($apiFile);

// ── FIX 1: Jangan reset koordinat ke 0 ──────────────────────────────────
// Ganti: selalu set koordinat ke 0 agar klien geocode ulang
// Dengan: hanya reset jika koordinat baru tidak dikirim, dan preserve koordinat lama jika masih valid
$old1 = '            if ($existInvalid || $locationChanged) {
                // Selalu set koordinat ke 0 agar klien geocode ulang via Nominatim
                $db->query("UPDATE users SET pklLocation=\'$tempat_pkl\', tempat_pkl=\'$tempat_pkl\', latitude_pkl=0, longitude_pkl=0 WHERE id=\'$existId\'");
            }';

$new1 = '            if ($existInvalid || $locationChanged) {
                // FIX: Jangan selalu reset ke 0
                // Jika client kirim koordinat valid → simpan ke DB
                // Jika client kirim koordinat 0/default → reset ke 0 agar client geocode ulang
                $clientSentValidCoords = ($newLat != 0 && $newLng != 0
                    && abs($newLat - (-7.9825)) > 0.001
                    && abs($newLat - (-7.9700)) > 0.001);
                if ($clientSentValidCoords) {
                    // Simpan koordinat yang dikirim client (hasil geocode sebelumnya)
                    $db->query("UPDATE users SET pklLocation=\'$tempat_pkl\', tempat_pkl=\'$tempat_pkl\', latitude_pkl=$newLat, longitude_pkl=$newLng WHERE id=\'$existId\'");
                } else {
                    // Client tidak kirim koordinat valid — reset ke 0 agar geocode ulang
                    $db->query("UPDATE users SET pklLocation=\'$tempat_pkl\', tempat_pkl=\'$tempat_pkl\', latitude_pkl=0, longitude_pkl=0 WHERE id=\'$existId\'");
                }
            }';

if (strpos($content, $old1) !== false) {
    $content = str_replace($old1, $new1, $content);
    echo "OK: FIX1 — server tidak lagi reset koordinat ke 0 saat ada koordinat valid\n";
} else {
    echo "SKIP FIX1: pattern not found (mungkin sudah di-patch)\n";
}

// ── FIX 2: Endpoint get_student_pkl_location ─────────────────────────────
// Endpoint khusus untuk ambil koordinat siswa dari DB
// Digunakan JS saat login: fetch koordinat definitif dari server, bukan bergantung geocode
$newEndpoint = "    case 'get_student_pkl_location':
        // Ambil koordinat PKL siswa langsung dari DB — sumber kebenaran tunggal
        // Dipanggil saat login siswa untuk lock TARGET_LOCATION ke koordinat DB
        \$userId = \$db->real_escape_string(\$input['user_id'] ?? \$_GET['user_id'] ?? '');
        if (empty(\$userId)) { jsonError('user_id wajib'); }
        \$row = \$db->query(\"SELECT id, name, pklLocation, latitude_pkl, longitude_pkl, allowed_radius
                             FROM users WHERE id='\$userId' AND role='siswa'\")->fetch_assoc();
        if (!\$row) { jsonError('Siswa tidak ditemukan'); }
        \$lat = floatval(\$row['latitude_pkl']);
        \$lng = floatval(\$row['longitude_pkl']);
        \$radius = intval(\$row['allowed_radius'] ?? 350);
        if (\$radius < 50) \$radius = 350;

        // Cek apakah koordinat di DB valid
        \$isSmkn9 = (abs(\$lat - (-7.9825)) < 0.001 && abs(\$lng - 112.6867) < 0.001);
        \$isGenericBad = (\$lat != 0 && (
            (abs(\$lat - (-7.9437)) < 0.001 && abs(\$lng - 112.6136) < 0.001) ||
            (abs(\$lat - (-7.9797)) < 0.001 && abs(\$lng - 112.6304) < 0.001) ||
            (abs(\$lat - (-8.0028)) < 0.001 && abs(\$lng - 112.6571) < 0.001) ||
            (abs(\$lat - (-8.0007)) < 0.001 && abs(\$lng - 112.6157) < 0.001)
        ));
        \$hasValidCoords = (\$lat != 0 && \$lng != 0 && !\$isSmkn9 && !\$isGenericBad);

        if (\$hasValidCoords) {
            // Koordinat valid — kembalikan langsung, client bisa lock
            jsonSuccess([
                'has_coords'    => true,
                'lat'           => \$lat,
                'lng'           => \$lng,
                'name'          => \$row['pklLocation'],
                'radius'        => \$radius,
                'source'        => 'db',
                'ready_to_lock' => true
            ]);
        } else {
            // Koordinat tidak valid — kembalikan nama PKL agar client geocode
            jsonSuccess([
                'has_coords'    => false,
                'lat'           => 0,
                'lng'           => 0,
                'name'          => \$row['pklLocation'],
                'radius'        => \$radius,
                'source'        => 'none',
                'ready_to_lock' => false
            ]);
        }
        break;

";

if (strpos($content, "case 'get_student_pkl_location':") !== false) {
    echo "SKIP FIX2: get_student_pkl_location sudah ada\n";
} else {
    $insertBefore = "    case 'server_geocode':";
    if (strpos($content, $insertBefore) !== false) {
        $content = str_replace($insertBefore, $newEndpoint . $insertBefore, $content);
        echo "OK: FIX2 — endpoint get_student_pkl_location ditambahkan\n";
    } else {
        echo "SKIP FIX2: insert point not found\n";
    }
}

// ── FIX 3: Perbaiki update_pkl_location — simpan koordinat dengan benar ──
$old3 = "    case 'update_pkl_location':
    case 'request_edit_pkl':
        \$id         = \$db->real_escape_string(\$input['id'] ?? '');
        \$tempat_pkl = \$db->real_escape_string(\$input['tempat_pkl'] ?? \$input['pklLocation'] ?? '');
        \$lat        = floatval(\$input['latitude_pkl'] ?? 0);
        \$lng        = floatval(\$input['longitude_pkl'] ?? 0);
        \$db->query(\"UPDATE users SET tempat_pkl='\$tempat_pkl', pklLocation='\$tempat_pkl', latitude_pkl=\$lat, longitude_pkl=\$lng WHERE id='\$id'\");
        jsonSuccess(['message' => 'Lokasi PKL diperbarui']);
        break;";

$new3 = "    case 'update_pkl_location':
    case 'request_edit_pkl':
        \$id         = \$db->real_escape_string(\$input['id'] ?? '');
        \$tempat_pkl = \$db->real_escape_string(\$input['tempat_pkl'] ?? \$input['pklLocation'] ?? '');
        \$lat        = floatval(\$input['latitude_pkl'] ?? 0);
        \$lng        = floatval(\$input['longitude_pkl'] ?? 0);
        // FIX3: Validasi sebelum simpan — jangan simpan koordinat generic
        \$isGenericBad3 = (\$lat != 0 && (
            (abs(\$lat - (-7.9437)) < 0.001 && abs(\$lng - 112.6136) < 0.001) ||
            (abs(\$lat - (-7.9797)) < 0.001 && abs(\$lng - 112.6304) < 0.001) ||
            (abs(\$lat - (-8.0028)) < 0.001 && abs(\$lng - 112.6571) < 0.001)
        ));
        if (\$isGenericBad3) {
            // Koordinat generik tidak akurat — simpan nama saja, reset koordinat ke 0
            \$db->query(\"UPDATE users SET tempat_pkl='\$tempat_pkl', pklLocation='\$tempat_pkl', latitude_pkl=0, longitude_pkl=0 WHERE id='\$id'\");
        } else {
            \$db->query(\"UPDATE users SET tempat_pkl='\$tempat_pkl', pklLocation='\$tempat_pkl', latitude_pkl=\$lat, longitude_pkl=\$lng WHERE id='\$id'\");
        }
        jsonSuccess(['message' => 'Lokasi PKL diperbarui', 'lat' => \$lat, 'lng' => \$lng]);
        break;";

if (strpos($content, $old3) !== false) {
    $content = str_replace($old3, $new3, $content);
    echo "OK: FIX3 — update_pkl_location validasi koordinat generic\n";
} else {
    echo "SKIP FIX3: pattern not found\n";
}

file_put_contents($apiFile, $content);
echo "\napi.php patched successfully\n";
echo "Size: " . strlen($content) . " bytes\n";
