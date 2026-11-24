<?php
/**
 * SIGAP PKL - Batch Geocode v2 (Live Nominatim Sync)
 * Geocode SEMUA siswa via Nominatim live — tidak pakai kamus lokal
 * Hanya kunci koordinat ke DB jika Nominatim memberikan hasil yang presisi (dalam radius dari Malang)
 *
 * Usage:
 *   php geocode_batch_v2.php              -- update semua yang belum presisi
 *   php geocode_batch_v2.php --dry-run    -- preview tanpa update DB
 *   php geocode_batch_v2.php --force-all  -- update semua termasuk yang sudah presisi
 *   php geocode_batch_v2.php --limit=50   -- batasi jumlah lokasi unik
 */

define('DB_HOST', '192.168.100.1');
define('DB_USER', 'sigap_user');
define('DB_PASS', 'SigapPKL@2026!');
define('DB_NAME', 'sigap_pkl');

define('MALANG_LAT',    -7.9825);
define('MALANG_LNG',    112.6867);
define('SMKN9_LAT',     -7.9825);
define('SMKN9_LNG',     112.6867);
define('CENTER_MALANG_LAT', -7.9700);
define('CENTER_MALANG_LNG', 112.6326);
define('MAX_DIST_KM',   700);  // seluruh Indonesia tapi tetap ada batas
define('DELAY_US',      1300000); // 1.3 detik per Nominatim request

// ── Parse args ───────────────────────────────────────────────────────────────
$dryRun   = in_array('--dry-run',   $argv);
$forceAll = in_array('--force-all', $argv);
$limit    = 9999;
foreach ($argv as $arg) {
    if (preg_match('/^--limit=(\d+)$/', $arg, $m)) $limit = (int)$m[1];
}

echo "=== SIGAP PKL Batch Geocode v2 (Live Nominatim) ===\n";
echo "Mode    : " . ($dryRun ? "DRY RUN" : "LIVE UPDATE") . ($forceAll ? " + FORCE ALL" : "") . "\n";
echo "Delay   : " . (DELAY_US / 1000) . "ms per request\n\n";

// ── DB ───────────────────────────────────────────────────────────────────────
$db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($db->connect_error) die("DB Error: " . $db->connect_error . "\n");
$db->set_charset('utf8mb4');

// ── Ambil semua lokasi unik yang perlu di-geocode ────────────────────────────
// "Belum presisi" = koordinat 0, NULL, = SMKN9 default, = pusat Malang perkiraan
$whereClause = $forceAll
    ? "role = 'siswa' AND pklLocation IS NOT NULL AND pklLocation != ''"
    : "role = 'siswa' AND pklLocation IS NOT NULL AND pklLocation != ''
       AND (
         latitude_pkl IS NULL OR latitude_pkl = 0
         OR (ABS(latitude_pkl - (" . SMKN9_LAT . ")) < 0.001 AND ABS(longitude_pkl - (" . SMKN9_LNG . ")) < 0.001)
         OR (ABS(latitude_pkl - (" . CENTER_MALANG_LAT . ")) < 0.001 AND ABS(longitude_pkl - (" . CENTER_MALANG_LNG . ")) < 0.001)
       )";

// Ambil lokasi unik beserta semua ID yang pakai lokasi itu
$res = $db->query("SELECT pklLocation, GROUP_CONCAT(id SEPARATOR '|') as ids, COUNT(*) as jml
                   FROM users WHERE $whereClause
                   GROUP BY pklLocation ORDER BY jml DESC");

$locationGroups = [];
while ($row = $res->fetch_assoc()) {
    $locationGroups[] = [
        'name' => $row['pklLocation'],
        'ids'  => explode('|', $row['ids']),
        'jml'  => (int)$row['jml'],
    ];
}
$locationGroups = array_slice($locationGroups, 0, $limit);

$totalLocs = count($locationGroups);
$totalSiswa = array_sum(array_column($locationGroups, 'jml'));
echo "Lokasi unik perlu geocode: $totalLocs (total $totalSiswa siswa)\n\n";

if ($totalLocs === 0) {
    echo "Semua koordinat sudah presisi. Gunakan --force-all untuk re-geocode semua.\n";
    exit(0);
}

// ── Fungsi Haversine ─────────────────────────────────────────────────────────
function haversineKm($lat1, $lng1, $lat2, $lng2) {
    $R    = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a    = sin($dLat/2)**2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng/2)**2;
    return $R * 2 * atan2(sqrt($a), sqrt(1-$a));
}

// ── Fungsi Nominatim geocode dengan multi-strategy ───────────────────────────
function nominatimGeocode($locationName) {
    // Bersihkan nama dari kata generik
    $stripped = preg_replace('/\b(pt\.?|cv\.?|ud\.?|tb\.?|toko|kantor|dinas|instansi|cabang|pusat)\b/i', '', $locationName);
    $stripped = preg_replace('/\b(malang|kota|kabupaten|jawa timur|jatim|indonesia)\b/i', '', $stripped);
    $stripped = trim(preg_replace('/\s+/', ' ', $stripped));

    $hasMalang = stripos($locationName, 'malang') !== false;
    $hasJakarta = stripos($locationName, 'jakarta') !== false || stripos($locationName, 'kemayoran') !== false || stripos($locationName, 'jkt') !== false;

    // Strategi query berurutan dari paling spesifik ke paling umum
    if ($hasJakarta) {
        $queries = [
            "$locationName, Jakarta, Indonesia",
            "$locationName, Indonesia",
            $stripped,
        ];
    } elseif ($hasMalang) {
        $queries = [
            "$locationName, Jawa Timur, Indonesia",
            "$locationName, Indonesia",
            $stripped ? "$stripped, Malang" : "$locationName",
        ];
    } else {
        $queries = [
            "$locationName, Malang, Jawa Timur, Indonesia",
            "$locationName, Jawa Timur, Indonesia",
            "$locationName, Indonesia",
            $stripped ? "$stripped, Malang" : null,
            $stripped ?: null,
        ];
    }
    $queries = array_filter($queries); // hapus null

    $bestResult   = null;
    $bestDistKm   = PHP_FLOAT_MAX;
    $bestFallback = null;

    foreach ($queries as $qIdx => $query) {
        if (empty(trim($query))) continue;

        // Rate limit antar query dalam satu lokasi
        if ($qIdx > 0) usleep(600000); // 0.6 detik antar sub-query

        $url = 'https://nominatim.openstreetmap.org/search?q=' . urlencode($query)
             . '&format=json&limit=5&addressdetails=1&countrycodes=id';
        $ctx = stream_context_create(['http' => [
            'header'  => "User-Agent: SIGAP-PKL-BatchGeocode-v2/2.0\r\nAccept-Language: id\r\n",
            'timeout' => 12,
        ]]);
        $resp = @file_get_contents($url, false, $ctx);
        if (!$resp) continue;

        $data = json_decode($resp, true);
        if (empty($data)) continue;

        // Cari hasil terdekat Malang dari semua kandidat
        foreach ($data as $r) {
            $rlat = (float)$r['lat'];
            $rlng = (float)$r['lon'];
            $dist = haversineKm(MALANG_LAT, MALANG_LNG, $rlat, $rlng);

            // Prioritaskan yang dalam radius 500km sebagai presisi
            if ($dist <= 500 && $dist < $bestDistKm) {
                $bestDistKm   = $dist;
                $bestResult   = [
                    'lat'     => $rlat,
                    'lng'     => $rlng,
                    'dist'    => $dist,
                    'display' => $r['display_name'],
                    'query'   => $query,
                ];
            }
            // Simpan candidate terbaik meski di luar radius sebagai fallback
            if (!$bestFallback || $dist < haversineKm(MALANG_LAT, MALANG_LNG, $bestFallback['lat'], $bestFallback['lng'])) {
                $bestFallback = ['lat' => $rlat, 'lng' => $rlng, 'dist' => $dist, 'display' => $r['display_name'], 'query' => $query, 'fallback' => true];
            }
        }

        // Kalau sudah dapat presisi, hentikan loop query
        if ($bestResult) break;
    }

    // Kembalikan presisi jika ada, fallback jika tidak
    return $bestResult ?: ($bestFallback ?: null);
}

// ── Proses batch ─────────────────────────────────────────────────────────────
$updated  = 0;
$notFound = 0;
$skipped  = 0;
$locIdx   = 0;

foreach ($locationGroups as $grp) {
    $locIdx++;
    $locName = $grp['name'];
    $ids     = $grp['ids'];
    $jml     = $grp['jml'];

    echo "[$locIdx/$totalLocs] \"" . substr($locName, 0, 50) . "\" ($jml siswa)\n";
    echo "         Geocoding via Nominatim... ";

    // Rate limit antar lokasi
    if ($locIdx > 1) usleep(DELAY_US);

    $coords = nominatimGeocode($locName);

    if ($coords) {
        $lat    = $coords['lat'];
        $lng    = $coords['lng'];
        $isFb   = !empty($coords['fallback']);
        $distKm = round($coords['dist'], 1);
        $disp   = substr($coords['display'], 0, 60);
        $type   = $isFb ? 'FALLBACK' : 'PRESISI';

        echo "[$type] ($lat, $lng) ~{$distKm}km\n";
        echo "         Alamat  : $disp\n";

        if (!$dryRun) {
            // Update semua siswa yang pakai nama lokasi ini
            $escapedLoc = $db->real_escape_string($locName);
            foreach ($ids as $id) {
                $escapedId = $db->real_escape_string($id);
                $db->query("UPDATE users SET latitude_pkl=$lat, longitude_pkl=$lng, pklLocation='$escapedLoc', tempat_pkl='$escapedLoc' WHERE id='$escapedId'");
            }
        }
        $updated += $jml;
    } else {
        echo "TIDAK DITEMUKAN\n";
        $notFound += $jml;
    }
    echo "\n";
}

// ── Ringkasan ─────────────────────────────────────────────────────────────────
echo "=== SELESAI ===\n";
echo "Updated     : $updated siswa\n";
echo "Tidak ditemukan: $notFound siswa\n";
if ($dryRun) echo "(DRY RUN - tidak ada perubahan)\n";

$db->close();
