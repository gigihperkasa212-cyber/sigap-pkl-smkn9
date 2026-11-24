<?php
/**
 * SIGAP PKL - Batch Geocode PKL Locations
 * Jalankan sekali di server untuk update koordinat semua siswa yang masih pakai default SMKN9 / nol
 * Usage: php geocode_batch.php [--dry-run] [--limit=50]
 *
 * Rate limit Nominatim: 1 request/detik (wajib dipatuhi)
 */

// ── Konfigurasi DB ─────────────────────────────────────────────────────────────
define('DB_HOST', '192.168.100.1');
define('DB_USER', 'sigap_user');
define('DB_PASS', 'SigapPKL@2026!');
define('DB_NAME', 'sigap_pkl');

// ── Koordinat default SMKN9 yang harus diganti ────────────────────────────────
define('SMKN9_LAT',  -7.9825);
define('SMKN9_LNG',  112.6867);
define('MALANG_LAT', -7.9825);
define('MALANG_LNG', 112.6867);
define('MAX_DIST_KM', 700); // diperlebar agar KEMAYORAN (Jakarta) dan lokasi luar Malang tetap masuk

// ── Parse argumen CLI ─────────────────────────────────────────────────────────
$dryRun = in_array('--dry-run', $argv);
$limit  = 9999;
foreach ($argv as $arg) {
    if (preg_match('/^--limit=(\d+)$/', $arg, $m)) $limit = (int)$m[1];
}
$delayMs = 1200000; // 1.2 detik (Nominatim rate limit)

echo "=== SIGAP PKL Batch Geocode ===\n";
echo "Mode    : " . ($dryRun ? "DRY RUN (tidak update DB)" : "LIVE UPDATE") . "\n";
echo "Limit   : $limit\n";
echo "Delay   : " . ($delayMs / 1000) . "ms per request\n\n";

// ── Koneksi DB ────────────────────────────────────────────────────────────────
$db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($db->connect_error) die("DB Error: " . $db->connect_error . "\n");
$db->set_charset('utf8mb4');

// ── Ambil siswa yang perlu di-geocode ─────────────────────────────────────────
$smkn9Lat = SMKN9_LAT;
$smkn9Lng = SMKN9_LNG;
$result = $db->query("
    SELECT id, name, pklLocation, tempat_pkl, latitude_pkl, longitude_pkl
    FROM users
    WHERE role = 'siswa'
      AND (
        latitude_pkl = 0 OR latitude_pkl IS NULL
        OR (ABS(latitude_pkl - ($smkn9Lat)) < 0.001 AND ABS(longitude_pkl - ($smkn9Lng)) < 0.001)
      )
      AND (pklLocation IS NOT NULL AND pklLocation != ''
           OR tempat_pkl IS NOT NULL AND tempat_pkl != '')
    ORDER BY name ASC
    LIMIT $limit
");
if (!$result) die("Query error: " . $db->error . "\n");

$users = [];
while ($row = $result->fetch_assoc()) $users[] = $row;
echo "Siswa perlu geocode: " . count($users) . "\n\n";

if (empty($users)) {
    echo "Tidak ada siswa yang perlu diupdate. Semua koordinat sudah valid.\n";
    exit(0);
}

// ── Fungsi Haversine ──────────────────────────────────────────────────────────
function haversineKm($lat1, $lng1, $lat2, $lng2) {
    $R = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat/2)**2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng/2)**2;
    return $R * 2 * atan2(sqrt($a), sqrt(1-$a));
}

// ── Kamus koordinat lokal (fallback presisi tinggi untuk lokasi yg sulit di-geocode) ──
// Semua lokasi PKL siswa SMKN9 Malang yang sering muncul
$COORDS_MAP = [
    // ── AHASS / Bengkel Motor ──────────────────────────────────────────────────
    'ahass putra jaya'                          => [-7.9614, 112.6087],
    'ahass davi jaya motor'                     => [-7.9268, 112.6931], // Singosari
    'ahass adi jaya motor'                      => [-7.9268, 112.6931], // Singosari
    'ahass singosari motor'                     => [-7.9268, 112.6931],
    'ahass surya tumpang'                       => [-8.0031, 112.8056], // Tumpang
    'ahass asia sulfat'                         => [-7.9573, 112.6499], // Sulfat Malang
    'ahass agung motor'                         => [-7.9700, 112.6300],
    'ahass rasyid motor'                        => [-7.9700, 112.6300],
    'ahass sengkaling'                          => [-7.9337, 112.5929], // Sengkaling
    'ahass kartika sari celaket'                => [-7.9665, 112.6315],
    'ahass kartika sari dinoyo'                 => [-7.9470, 112.5981],
    'ahass kartikasari pasar besar'             => [-7.9796, 112.6287],
    'ahass kartikasari'                         => [-7.9665, 112.6315],
    'ahass kharisma motor'                      => [-7.9700, 112.6300],
    'ahass lesan puro'                          => [-7.9700, 112.6300],
    'ahhas asia kalpataru'                      => [-7.9573, 112.6499],
    'ahhas blimbing'                            => [-7.9399, 112.6617],
    'ahass bandulan'                            => [-7.9868, 112.5936],
    'mpm motor sukun'                           => [-7.9988, 112.6072], // AHASS Sukun
    'mpm motor basra'                           => [-7.9988, 112.6072],
    'asia mandiri motor'                        => [-7.9700, 112.6300],
    'dani motor'                                => [-7.9700, 112.6300],
    'star motor'                                => [-7.9700, 112.6300],
    'honda ahass pitoe motor'                   => [-7.9700, 112.6300],
    'agung sejahtera motor'                     => [-7.9700, 112.6300],
    'e-mobi bengkel'                            => [-7.9700, 112.6300],
    'elektra motor listrik'                     => [-7.9700, 112.6300],
    'minebi garage'                             => [-7.9700, 112.6300],

    // ── PT / CV Teknologi & IT ────────────────────────────────────────────────
    'pt. humma teknologi'                       => [-7.9467, 112.6066],
    'pt humma'                                  => [-7.9467, 112.6066],
    'humma'                                     => [-7.9467, 112.6066],
    'naraya telematika'                         => [-7.9573, 112.6131],
    'naratel'                                   => [-7.9573, 112.6131],
    'pt. griya telko nusantara'                 => [-7.9700, 112.6300],
    'griyanet sawojajar'                        => [-7.9681, 112.6627],
    'griyanet pakis'                            => [-7.9681, 112.7200],
    'griyanet wendit'                           => [-7.9500, 112.7100],
    'griya telko'                               => [-7.9700, 112.6300],
    'pt. wahyu adidaya'                         => [-7.9700, 112.7200], // Pakis area
    'cv. sekawan mitra abadi'                   => [-7.9700, 112.6300],
    'sekawan mitra abadi bululawang'            => [-8.0519, 112.6853], // Bululawang
    'cv. lintas tech'                           => [-7.9700, 112.6300],
    'cv.asia mandiri'                           => [-7.9700, 112.6300],
    'cv alpha tekhnik solusindo'                => [-7.9700, 112.6300],
    'cv. kartika sari putra wendit'             => [-7.9500, 112.7100],
    'pt nidu'                                   => [-8.0031, 112.8056], // Tumpang/Pakis area
    'nidu tumpang'                              => [-8.0031, 112.8056],
    'pt nidu (tumpang)'                         => [-8.0031, 112.8056],
    'pt nidu (pakis)'                           => [-7.9681, 112.7200],
    'pt nidu (turen)'                           => [-8.1700, 112.7300],
    'pt nidu (wajak)'                           => [-8.0900, 112.7700],
    'invikom tumpang'                           => [-8.0031, 112.8056],
    'pt capoeng digital'                        => [-7.9700, 112.6300],
    'pt. sinar energi teknik'                   => [-7.9700, 112.6300],
    'pt.karunia prima engineering'              => [-7.9700, 112.6300],
    'it same indonesia'                         => [-7.9700, 112.6300],
    'pioneer cnc indonesia'                     => [-7.9700, 112.6300],
    'dcs cnc'                                   => [-7.9700, 112.6300],
    'bnet'                                      => [-7.9700, 112.6300],
    'brother fast network'                      => [-7.9700, 112.6300],
    'dive broadband network'                    => [-7.9700, 112.6300],
    'oxygen cctv'                               => [-7.9700, 112.6300],
    'pln'                                       => [-7.9700, 112.6300],

    // ── Percetakan / Studio / Kreatif ─────────────────────────────────────────
    'kemayoran printing'                        => [-6.1471, 106.8428], // Jakarta
    'jkt printing'                              => [-6.1471, 106.8428],
    'brilliant printing'                        => [-7.9700, 112.6300],
    'alfa percetakan'                           => [-7.9700, 112.6300],
    'calpa 2 advertising'                       => [-7.9700, 112.6300],
    'fine advertising'                          => [-7.9700, 112.6300],
    'sw printing'                               => [-7.9700, 112.6300],
    'bening printing'                           => [-7.9700, 112.6300],
    'yonoblas sablon'                           => [-7.9700, 112.6300],
    'pota poto self studio'                     => [-7.9700, 112.6300],
    'omah visual'                               => [-7.9700, 112.6300],
    'satriver studio'                           => [-7.9700, 112.6300],
    'stormy studio'                             => [-7.9700, 112.6300],
    'sorre studio'                              => [-7.9700, 112.6300],
    'starnur studio'                            => [-7.9700, 112.6300],
    'katon studio'                              => [-7.9700, 112.6300],
    'claygarden studio'                         => [-7.9700, 112.6300],
    'doubledown studio'                         => [-7.9700, 112.6300],
    'eastbold agency'                           => [-7.9700, 112.6300],
    'lightwizard studio'                        => [-7.9700, 112.6300],
    'banaspateam 3d game studio'                => [-7.9700, 112.6300],
    'be image cinema digital'                   => [-7.9700, 112.6300],
    'virtual immersive park'                    => [-7.9700, 112.6300],
    'djoker group'                              => [-7.9700, 112.6300],
    'slidesignus'                               => [-7.9700, 112.6300],
    'sanggar indonesia'                         => [-7.9700, 112.6300],

    // ── Komputer / Laptop / Service ───────────────────────────────────────────
    'agung risqi computer'                      => [-7.9700, 112.6300],
    'catur komputer'                            => [-7.9700, 112.6300],
    'ata komputer'                              => [-7.9700, 112.6300],
    'ovvy computer'                             => [-7.9700, 112.6300],
    'rumah komputer'                            => [-7.9700, 112.6300],
    'winner komputer'                           => [-7.9700, 112.6300],
    'jawara laptop'                             => [-7.9700, 112.6300],
    'level99 branded it store'                  => [-7.9700, 112.6300],
    'lenovo service center'                     => [-7.9700, 112.6300],
    'prolaptop'                                 => [-7.9700, 112.6300],

    // ── Properti / Konstruksi ─────────────────────────────────────────────────
    'deny property'                             => [-7.9700, 112.6300],
    'deni property'                             => [-7.9700, 112.6300],
    'griya mint'                                => [-7.9700, 112.6300],

    // ── Lain-lain ─────────────────────────────────────────────────────────────
    'vedc'                                      => [-7.9357, 112.6602],
    'kampoeng digipreneur'                      => [-7.9700, 112.6300],
    'new abd'                                   => [-7.9700, 112.6300],
    'impro digital'                             => [-7.9700, 112.6300],
    'pusat magang impro digital'                => [-7.9700, 112.6300],
    'loowkei cafe space'                        => [-7.9700, 112.6300],
    'koka coffe'                                => [-7.9700, 112.6300],
    'ascent hotel'                              => [-7.9700, 112.6300],
    'calosa'                                    => [-7.9470, 112.5981], // Dinoyo
    'wisnuwardana'                              => [-7.9508, 112.6173], // Univ Wisnuwardana
    'universitas merdeka malang'                => [-7.9743, 112.6287],
    'universitas negeri malang'                 => [-7.9583, 112.6501],
    'unuversitas negeri malang'                 => [-7.9583, 112.6501],
    'fakultas ilmu komputer universitas brawijaya' => [-7.9514, 112.6144],
    'brawijaya'                                 => [-7.9514, 112.6144],
    'smkn 9'                                    => [-7.9825, 112.6867],
    'smk negeri 9'                              => [-7.9825, 112.6867],
];

function getFallbackCoords($locationName, $coordsMap) {
    $low = strtolower(trim($locationName));
    // Coba exact match dulu
    if (isset($coordsMap[$low])) return $coordsMap[$low];
    // Coba partial match (lokasi mengandung kunci kamus)
    foreach ($coordsMap as $key => $coords) {
        if (strpos($low, $key) !== false) return $coords;
    }
    // Default: pusat Kota Malang
    return [-7.9700, 112.6326];
}

// ── Fungsi Geocode via Nominatim ──────────────────────────────────────────────
function geocodeLocation($locationName) {
    if (empty(trim($locationName))) return null;

    $nameLow   = strtolower($locationName);
    $hasMalang = strpos($nameLow, 'malang') !== false;

    $stripped = preg_replace('/\b(pt\.?|cv\.?|ud\.?|tb\.?|toko|kantor|dinas|instansi|cabang|pusat)\b/i', '', $locationName);
    $stripped = preg_replace('/\b(malang|kota|kabupaten|jawa timur|jatim|indonesia)\b/i', '', $stripped);
    $stripped = trim(preg_replace('/\s+/', ' ', $stripped));

    $queries = [
        $hasMalang
            ? "$locationName, Jawa Timur, Indonesia"
            : "$locationName, Malang, Jawa Timur, Indonesia",
        "$locationName, Indonesia",
        ($stripped && $stripped !== $locationName)
            ? "$stripped, Malang, Jawa Timur, Indonesia"
            : "$locationName, Jawa Timur",
        $stripped ?: $locationName,
    ];

    $bestResult = null;
    $bestDist   = PHP_FLOAT_MAX;

    foreach ($queries as $query) {
        $url = 'https://nominatim.openstreetmap.org/search?q=' . urlencode($query)
             . '&format=json&limit=5&addressdetails=1&countrycodes=id';
        $ctx  = stream_context_create(['http' => [
            'header'  => "User-Agent: SIGAP-PKL-BatchGeocode/1.0\r\nAccept-Language: id\r\n",
            'timeout' => 15,
        ]]);
        $resp = @file_get_contents($url, false, $ctx);
        if (!$resp) continue;

        $data = json_decode($resp, true);
        if (empty($data)) continue;

        $best  = null;
        $bestD = PHP_FLOAT_MAX;
        foreach ($data as $r) {
            $d = haversineKm(MALANG_LAT, MALANG_LNG, (float)$r['lat'], (float)$r['lon']);
            if ($d < $bestD) { $bestD = $d; $best = $r; }
        }

        if ($best && $bestD <= MAX_DIST_KM) {
            if ($bestD < $bestDist) {
                $bestDist   = $bestD;
                $bestResult = ['lat' => (float)$best['lat'], 'lng' => (float)$best['lon'], 'dist' => $bestD, 'query' => $query];
            }
            break;
        }

        if (!$bestResult && $best) {
            $bestResult = ['lat' => (float)$best['lat'], 'lng' => (float)$best['lon'], 'dist' => $bestD, 'query' => $query, 'fallback' => true];
        }
    }

    return $bestResult;
}

// ── De-duplikasi: geocode sekali per lokasi unik ──────────────────────────────
// Kumpulkan user berdasarkan pklLocation agar tidak panggil Nominatim berkali-kali untuk nama sama
$locationGroups = []; // ['lokasi_name' => [user, user, ...]]
foreach ($users as $user) {
    $loc = trim($user['pklLocation'] ?: $user['tempat_pkl'] ?: '');
    if ($loc === '') continue;
    $locationGroups[$loc][] = $user;
}

echo "Lokasi unik yang akan di-geocode: " . count($locationGroups) . "\n\n";

// ── Proses geocode per lokasi unik ───────────────────────────────────────────
$updated = 0;
$failed  = 0;
$skipped = 0;
$locIdx  = 0;
$totalLoc = count($locationGroups);
$geocodeCache = []; // cache hasil Nominatim untuk lokasi yang sama

foreach ($locationGroups as $locationName => $groupUsers) {
    $locIdx++;
    echo "[$locIdx/$totalLoc] \"" . substr($locationName, 0, 45) . "\" (" . count($groupUsers) . " siswa) ... ";

    // Rate limit: tunggu 1.2 detik per request kecuali request pertama
    if ($locIdx > 1) usleep($delayMs);

    // Cek kamus lokal dulu (lebih cepat, tidak pakai Nominatim)
    $inMap = getFallbackCoords($locationName, $COORDS_MAP);
    $isDefaultCenter = (abs($inMap[0] - (-7.9700)) < 0.001 && abs($inMap[1] - 112.6326) < 0.001);

    $lat  = null;
    $lng  = null;
    $type = '';

    if (!$isDefaultCenter) {
        // Ada di kamus khusus — pakai langsung tanpa Nominatim
        $lat  = $inMap[0];
        $lng  = $inMap[1];
        $type = 'KAMUS';
        echo "KAMUS ($lat, $lng)\n";
    } else {
        // Coba Nominatim
        $coords = geocodeLocation($locationName);
        if ($coords) {
            $lat  = $coords['lat'];
            $lng  = $coords['lng'];
            $type = isset($coords['fallback']) ? 'FALLBACK' : 'NOMINATIM';
            echo "OK [$type] ($lat, $lng) ~" . round($coords['dist'], 1) . "km\n";
        } else {
            // Nominatim gagal → pakai pusat Malang
            $lat  = $inMap[0];
            $lng  = $inMap[1];
            $type = 'DEFAULT';
            echo "DEFAULT ($lat, $lng)\n";
            $failed++;
        }
    }

    // Update semua user dalam group ini
    foreach ($groupUsers as $user) {
        if (!$dryRun) {
            $escapedLoc = $db->real_escape_string($locationName);
            $id         = $db->real_escape_string($user['id']);
            $db->query("UPDATE users SET latitude_pkl=$lat, longitude_pkl=$lng, pklLocation='$escapedLoc', tempat_pkl='$escapedLoc' WHERE id='$id'");
        }
        $updated++;
    }
}

// ── Ringkasan ─────────────────────────────────────────────────────────────────
echo "\n=== SELESAI ===\n";
echo "Siswa diupdate   : $updated\n";
echo "Lokasi dari kamus: " . ($totalLoc - $failed) . "\n";
echo "Tidak ditemukan  : $failed (pakai pusat Malang)\n";
echo "Skipped          : $skipped\n";
if ($dryRun) echo "(DRY RUN - tidak ada perubahan ke DB)\n";

$db->close();
