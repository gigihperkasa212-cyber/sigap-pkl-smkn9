<?php
// ob_start untuk menangani BOM dan whitespace sebelum output
if (ob_get_level()) ob_end_clean();
ob_start();

/**
 * SIGAP PKL SMKN 9 Official - API Adapter
 * Menangani semua request dari app.js ke database MariaDB
 */

// Set timezone ke WIB agar tanggal/jam konsisten
date_default_timezone_set('Asia/Jakarta');

// Database config — credential dipisah ke config.php (tidak di-commit ke GitHub)
// Di server produksi: file config.php berisi credential asli
// Di GitHub: hanya config.example.php yang ter-commit (credential kosong)
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} else {
    // Fallback: environment variable (untuk CI/CD atau container)
    define('DB_HOST', getenv('DB_HOST') ?: '192.168.100.1');
    define('DB_USER', getenv('DB_USER') ?: 'sigap_user');
    define('DB_PASS', getenv('DB_PASS') ?: '');
    define('DB_NAME', getenv('DB_NAME') ?: 'sigap_pkl');
}

// â”€â”€â”€ DETEKSI SSE SEBELUM APAPUN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
$_action_early = $_GET['action'] ?? '';
if ($_action_early === 'sse_events' || $_action_early === 'realtime_events') {
    // Jangan kirim header JSON sama sekali
    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache, no-store');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');

    @ob_end_clean();
    @ini_set('output_buffering', 'off');
    @ini_set('zlib.output_compression', false);
    set_time_limit(60);

    // Kirim event connected
    echo "event: connected\n";
    echo "data: " . json_encode(['status' => 'ok', 'time' => date('c'), 'source' => 'php-sse']) . "\n\n";
    flush();

    // Koneksi DB untuk polling event baru
    $sseDb = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    $sseLastId = (int)($_GET['lastEventId'] ?? 0);
    $sseStart  = time();

    while ((time() - $sseStart) < 55) {
        if (connection_aborted()) break;

        // Poll presensi terbaru
        if (!$sseDb->connect_error) {
            $sseRes = $sseDb->query("SELECT * FROM attendance WHERE id > $sseLastId ORDER BY id ASC LIMIT 5");
            if ($sseRes) {
                while ($row = $sseRes->fetch_assoc()) {
                    $sseLastId = max($sseLastId, (int)$row['id']);
                    echo "event: new_attendance\n";
                    echo "data: " . json_encode([
                        'id'          => $row['id'],
                        'studentName' => $row['student_name'] ?? $row['nama_siswa'] ?? '',
                        'status'      => $row['status'] ?? 'Hadir',
                        'date'        => $row['date'] ?? $row['tanggal'] ?? date('Y-m-d'),
                        'masuk'       => $row['check_in'] ?? $row['jam_masuk'] ?? '',
                        'pulang'      => $row['check_out'] ?? $row['jam_pulang'] ?? ''
                    ]) . "\n\n";
                    flush();
                }
            }
        }

        // Heartbeat
        echo ": heartbeat " . date('H:i:s') . "\n\n";

        // Cek flag user_updated
        $flagFile = sys_get_temp_dir() . '/sigap_user_updated.json';
        if (file_exists($flagFile)) {
            $flagData = json_decode(file_get_contents($flagFile), true);
            if ($flagData && isset($flagData['ts']) && (time() - $flagData['ts']) < 15) {
                echo "event: user_updated\n";
                echo "data: " . json_encode(['ts' => $flagData['ts']]) . "\n\n";
                flush();
                @unlink($flagFile);
            } else {
                @unlink($flagFile);
            }
        }

        // Cek flag perm_updated (izin/sakit disetujui atau ditolak)
        $permFlagFile = sys_get_temp_dir() . '/sigap_perm_updated.json';
        if (file_exists($permFlagFile)) {
            $permFlagData = json_decode(file_get_contents($permFlagFile), true);
            if ($permFlagData && isset($permFlagData['ts']) && (time() - $permFlagData['ts']) < 15) {
                echo "event: perm_updated\n";
                echo "data: " . json_encode($permFlagData) . "\n\n";
                flush();
                @unlink($permFlagFile);
            } else {
                @unlink($permFlagFile);
            }
        }

        // Cek flag attendance_updated (siswa absen via APK)
        $attFlagFile = sys_get_temp_dir() . '/sigap_attendance_updated.json';
        if (file_exists($attFlagFile)) {
            $attFlagData = json_decode(file_get_contents($attFlagFile), true);
            if ($attFlagData && isset($attFlagData['ts']) && (time() - $attFlagData['ts']) < 15) {
                echo "event: attendance_updated\n";
                echo "data: " . json_encode($attFlagData) . "\n\n";
                flush();
                @unlink($attFlagFile);
            } else {
                @unlink($attFlagFile);
            }
        }

        // Cek flag journal_updated (siswa kirim jurnal via APK)
        $jrnFlagFile = sys_get_temp_dir() . '/sigap_journal_updated.json';
        if (file_exists($jrnFlagFile)) {
            $jrnFlagData = json_decode(file_get_contents($jrnFlagFile), true);
            if ($jrnFlagData && isset($jrnFlagData['ts']) && (time() - $jrnFlagData['ts']) < 15) {
                echo "event: journal_updated\n";
                echo "data: " . json_encode($jrnFlagData) . "\n\n";
                flush();
                @unlink($jrnFlagFile);
            } else {
                @unlink($jrnFlagFile);
            }
        }

        flush();
        sleep(2);
    }

    echo "retry: 5000\n\n";
    flush();
    if (!$sseDb->connect_error) $sseDb->close();
    exit;
}

// â”€â”€â”€ HEADER JSON (hanya untuk non-SSE) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function getDB() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        jsonError('Koneksi database gagal: ' . $conn->connect_error, 500);
    }
    $conn->set_charset('utf8mb4');
    // Paksa collation koneksi sama dengan database agar tidak ada collation mismatch
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->query("SET collation_connection = utf8mb4_unicode_ci");
    return $conn;
}

function jsonSuccess($data = [], $extra = []) {
    ob_clean(); // buang BOM atau whitespace sebelum output
    echo json_encode(array_merge(['success' => true, 'status' => 'ok'], $data, $extra));
    exit();
}

function jsonError($message, $code = 400) {
    ob_clean(); // buang BOM atau whitespace sebelum output
    http_response_code($code);
    echo json_encode(['success' => false, 'status' => 'error', 'message' => $message]);
    exit();
}

function getInput() {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if ($json) return $json;
    return array_merge($_GET, $_POST);
}

// Ambil action
$method     = $_SERVER['REQUEST_METHOD'];
$_rawInput  = file_get_contents('php://input'); // baca sekali
$_jsonInput = json_decode($_rawInput, true) ?: [];
$input      = array_merge($_GET, $_POST, $_jsonInput);
$action     = $input['action'] ?? '';

// â”€â”€ DEBUG INPUT (hapus setelah selesai debug) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if ($action === 'debug_input') {
    $raw = file_get_contents('php://input');
    echo json_encode([
        'raw_length'   => strlen($raw),
        'raw_preview'  => substr($raw, 0, 200),
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
        'method'       => $_SERVER['REQUEST_METHOD'],
        'input_keys'   => array_keys($input),
        'html_val'     => substr($input['html'] ?? 'MISSING', 0, 50),
    ]);
    exit;
}

$db = getDB();

// ── Inisialisasi tabel geocode_cache (sekali, persist koordinat per nama PKL) ──
// Tabel ini sebagai cache permanen agar koordinat tidak hilang saat reset/upload ulang data siswa
$db->query("CREATE TABLE IF NOT EXISTS geocode_cache (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    location_key VARCHAR(500) NOT NULL UNIQUE COMMENT 'nama lokasi lowercase trim',
    location_name VARCHAR(500) NOT NULL,
    latitude     DOUBLE NOT NULL,
    longitude    DOUBLE NOT NULL,
    source       VARCHAR(50) DEFAULT 'nominatim' COMMENT 'nominatim|manual|kamus',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loc_key (location_key(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Cache koordinat PKL permanen'");

// ── Helper: geocode via Nominatim (server-side, untuk auto-geocode) ──
function sigap_geocode_nominatim($pklName, $db) {
    if (empty(trim($pklName))) return null;
    $cacheKey = strtolower(trim($pklName));
    // Cek cache DB dulu
    $esc = $db->real_escape_string($cacheKey);
    $cached = $db->query("SELECT latitude, longitude FROM geocode_cache WHERE location_key='$esc' LIMIT 1")->fetch_assoc();
    if ($cached) return ['lat' => floatval($cached['latitude']), 'lng' => floatval($cached['longitude']), 'source' => 'cache'];
    // Bersihkan nama: ambil sebelum koma pertama
    $clean = (strpos($pklName, ',') !== false) ? trim(explode(',', $pklName)[0]) : $pklName;
    $queries = [
        $clean . ', Malang, Jawa Timur, Indonesia',
        $clean . ', Malang',
        $pklName . ', Jawa Timur, Indonesia',
    ];
    $foundLat = 0; $foundLng = 0; $source = '';
    foreach ($queries as $q) {
        $url = 'https://nominatim.openstreetmap.org/search?q=' . urlencode($q) . '&format=json&limit=5&accept-language=id&countrycodes=id';
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'SIGAP-PKL-SMKN9/2.0 (smkn9malang.sch.id)');
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $resp = curl_exec($ch); curl_close($ch);
        if (!$resp) continue;
        $results = json_decode($resp, true);
        if (!is_array($results) || empty($results)) continue;
        foreach ($results as $r) {
            $rLat = floatval($r['lat'] ?? 0); $rLng = floatval($r['lon'] ?? 0);
            if ($rLat == 0 || $rLng == 0) continue;
            $dist = sqrt(pow($rLat - (-7.9825), 2) + pow($rLng - 112.6867, 2)) * 111.0;
            if ($dist < 100) { $foundLat = $rLat; $foundLng = $rLng; $source = 'nominatim'; break 2; }
        }
        // fallback: ambil hasil terdekat meskipun > 100km
        foreach ($results as $r) {
            $rLat = floatval($r['lat'] ?? 0); $rLng = floatval($r['lon'] ?? 0);
            if ($rLat == 0 || $rLng == 0) continue;
            $dist = sqrt(pow($rLat - (-7.9825), 2) + pow($rLng - 112.6867, 2)) * 111.0;
            if ($dist < 300) { $foundLat = $rLat; $foundLng = $rLng; $source = 'nominatim_fallback'; break 2; }
        }
    }
    if ($foundLat != 0 && $foundLng != 0) {
        // Simpan ke geocode_cache
        $escKey  = $db->real_escape_string($cacheKey);
        $escName = $db->real_escape_string($pklName);
        $escSrc  = $db->real_escape_string($source);
        $db->query("INSERT INTO geocode_cache (location_key, location_name, latitude, longitude, source)
                    VALUES ('$escKey','$escName',$foundLat,$foundLng,'$escSrc')
                    ON DUPLICATE KEY UPDATE latitude=$foundLat, longitude=$foundLng, source='$escSrc', updated_at=NOW()");
        return ['lat' => $foundLat, 'lng' => $foundLng, 'source' => $source];
    }
    return null;
}

// ============================================================
// ROUTING
// ============================================================
switch ($action) {

    // â”€â”€ LOGIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // -- VERIFY USER (ringan: SELECT id,username,role,aktif saja) --------------
    // Dipakai checkAuthSession() verifikasi sesi tanpa download seluruh data user
    case 'verify_user':
        $uid   = $db->real_escape_string($input['id']       ?? '');
        $uname = $db->real_escape_string($input['username'] ?? '');
        if (empty($uid) && empty($uname)) { jsonError('Parameter tidak valid.'); }
        $vwhere = $uid ? "id='$uid'" : "username='$uname'";
        $vrow = $db->query("SELECT id, username, role, aktif, status FROM users WHERE $vwhere LIMIT 1")->fetch_assoc();
        if (!$vrow)           { jsonError('User tidak ditemukan.', 404); }
        if ($vrow['aktif'] == 0) { jsonError('Akun tidak aktif.', 403); }
        jsonSuccess(['valid' => true, 'id' => $vrow['id'], 'username' => $vrow['username'],
                     'role'  => $vrow['role'],  'aktif' => (int)$vrow['aktif']]);
        break;
    case 'get_server_time':
        // Kembalikan timestamp server WIB — dipakai app.js untuk sinkronisasi offset waktu background
        jsonSuccess(['server_ts' => time(), 'server_time' => date('Y-m-d H:i:s'), 'tz' => 'Asia/Jakarta']);
        break;

    // ── SAVE PRINT HTML — simpan HTML ke file sementara untuk dibuka di browser eksternal APK ──
    case 'save_print_html':
        $htmlContent = $input['html'] ?? '';
        $filename    = preg_replace('/[^a-zA-Z0-9_\.-]/', '', $input['filename'] ?? 'laporan') . '_' . time() . '.html';
        if (empty($htmlContent)) { jsonError('HTML content kosong'); }

        // Buat folder print_temp jika belum ada
        $printDir = __DIR__ . '/print_temp';
        if (!is_dir($printDir)) {
            @mkdir($printDir, 0755, true);
        }

        // Cleanup: hapus file > 30 menit
        foreach (glob($printDir . '/*.html') as $oldFile) {
            if (filemtime($oldFile) < (time() - 1800)) @unlink($oldFile);
        }

        // Tambah auto-print script sebelum </body>
        $autoPrintScript = '<script>window.onload=function(){setTimeout(function(){try{window.print();}catch(e){}},500);}</script>';
        if (strpos($htmlContent, '</body>') !== false) {
            $htmlContent = str_replace('</body>', $autoPrintScript . '</body>', $htmlContent);
        } else {
            $htmlContent .= $autoPrintScript;
        }

        // Simpan file
        $filepath = $printDir . '/' . $filename;
        file_put_contents($filepath, $htmlContent);

        // Return URL HTTP 8080 (tanpa SSL) untuk dibuka di browser eksternal Android
        $httpUrl = 'https://sigap.smkn9malang.sch.id/print_temp/' . $filename;
        // Fallback ke IP langsung jika domain belum aktif
        $httpsUrl = 'https://sigap.smkn9malang.sch.id/print_temp/' . $filename;

        jsonSuccess(['url' => $httpUrl, 'https_url' => $httpsUrl, 'filename' => $filename]);
        break;

    case 'login':
        $username = $db->real_escape_string(strtolower(trim($input['username'] ?? '')));
        $password = $input['password'] ?? '';

        $row = $db->query("SELECT * FROM users WHERE (username='$username' OR nomor_induk='$username') AND aktif=1")->fetch_assoc();

        if (!$row) {
            jsonError('Username / NISN tidak ditemukan atau akun tidak aktif.', 401);
        }

        // Blokir login jika akun masih menunggu persetujuan
        if ($row['status'] === 'pending' || $row['status'] === 'pending_delete') {
            jsonError('Akun Anda masih menunggu persetujuan Master Admin.', 403);
        }

        if (!password_verify($password, $row['password'])) {
            // Cek plain password juga untuk kompatibilitas data lama
            if ($row['password'] !== $password && $row['plain_password'] !== $password) {
                jsonError('Kata sandi salah.', 401);
            }
        }

        // Buat session token
        $token = bin2hex(random_bytes(32));
        $session_id = 'ses_' . uniqid('', true);
        $user_id = $db->real_escape_string($row['id']);
        $expired = date('Y-m-d H:i:s', strtotime('+24 hours'));
        $db->query("INSERT INTO sessions (id, user_id, token, expired_at) VALUES ('$session_id', '$user_id', '$token', '$expired')");

        // Return plain_password sebagai password agar APK bisa login offline
        $row['password'] = $row['plain_password'] ?: '';
        unset($row['plain_password']);
        jsonSuccess(['user' => $row, 'token' => $token]);
        break;

    // â”€â”€ GET USERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'get_users':
        // Cache 10 detik untuk mengurangi beban DB (banyak client poll setiap 8 detik)
        $cacheFile = sys_get_temp_dir() . '/sigap_users_cache.json';
        $cacheTtl  = 10;
        $useCache  = file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl;
        $updFile   = sys_get_temp_dir() . '/sigap_user_updated.json';
        if ($useCache && file_exists($updFile) && filemtime($updFile) > filemtime($cacheFile)) {
            $useCache = false;
        }
        if ($useCache) { echo file_get_contents($cacheFile); exit; }
        // Return semua user aktif PLUS user dengan status pending (untuk persetujuan admin)
        $result = $db->query("SELECT id, username, nomor_induk, password, plain_password, name, role, kelas, jurusan, tempat_pkl, pklLocation, latitude_pkl, longitude_pkl, allowed_radius, foto, avatar, subtext, school, supervisor, status, aktif, pkl_start_date, DATE_FORMAT(created_at, '%Y-%m-%d') as created_date, data_reset_at FROM users WHERE aktif=1 OR status IN ('pending', 'pending_delete', 'pending_edit_pkl')");
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $row['pklLocation']     = $row['pklLocation'] ?: $row['tempat_pkl'];
            $row['avatar']          = $row['avatar'] ?: $row['foto'];
            $row['password']        = $row['plain_password'] ?: '123';
            unset($row['plain_password']);
            $users[] = $row;
        }
        $response = json_encode(['success' => true, 'users' => $users, 'data' => $users]);
        @file_put_contents($cacheFile, $response);
        echo $response;
        exit;

    // â”€â”€ CREATE USER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'create_user':
        $id           = 'usr_' . uniqid('', true);
        $username     = $db->real_escape_string(strtolower(trim($input['username'] ?? '')));
        $nomor_induk  = $db->real_escape_string($input['nomor_induk'] ?? $input['nisn'] ?? '');
        $name         = $db->real_escape_string($input['name'] ?? '');
        $role         = $db->real_escape_string($input['role'] ?? 'siswa');
        $kelas        = $db->real_escape_string($input['kelas'] ?? '');
        $jurusan      = $db->real_escape_string($input['jurusan'] ?? '');
        $tempat_pkl   = $db->real_escape_string($input['tempat_pkl'] ?? $input['pklLocation'] ?? '');
        $supervisor   = $db->real_escape_string($input['supervisor'] ?? '');
        $subtext      = $db->real_escape_string($input['subtext'] ?? '');
        $school       = $db->real_escape_string($input['school'] ?? 'SMK Negeri 9 Malang');
        $rawPass      = $input['password'] ?? '123';
        $plainPass    = $db->real_escape_string($rawPass);
        $password     = password_hash($rawPass, PASSWORD_BCRYPT);
        // Gunakan status dari client â€” guru kirim 'pending', admin kirim 'approved'
        $rawStatus    = $input['status'] ?? 'approved';
        $status       = in_array($rawStatus, ['approved', 'pending', 'pending_delete', 'pending_edit_pkl']) ? $rawStatus : 'approved';

        // Cek duplikat — login pakai username; nomor_induk hanya untuk data informasi
        if ($nomor_induk !== "") {
            $check = $db->query("SELECT id FROM users WHERE (username='$username' OR nomor_induk='$nomor_induk') AND aktif=1")->fetch_assoc();
        } else {
            $check = $db->query("SELECT id FROM users WHERE username='$username' AND aktif=1")->fetch_assoc();
        }
        if ($check) {
            // User sudah ada — update koordinat PKL jika masih 0/default atau lokasi berubah
            $existId  = $check['id'];
            $existing = $db->query("SELECT latitude_pkl, longitude_pkl, pklLocation FROM users WHERE id='$existId'")->fetch_assoc();
            $exLat    = floatval($existing['latitude_pkl'] ?? 0);
            $exLng    = floatval($existing['longitude_pkl'] ?? 0);
            $exLoc    = $existing['pklLocation'] ?? '';
            $newLat   = floatval($input['latitude_pkl'] ?? 0);
            $newLng   = floatval($input['longitude_pkl'] ?? 0);
            // Koordinat "tidak valid" = 0, atau default SMKN9 (-7.9825,112.6867), atau pusat Malang (-7.9700,112.6326)
            $existInvalid = ($exLat == 0 && $exLng == 0)
                || (abs($exLat - (-7.9825)) < 0.001 && abs($exLng - 112.6867) < 0.001)
                || (abs($exLat - (-7.9700)) < 0.001 && abs($exLng - 112.6326) < 0.001);
            $locationChanged = ($tempat_pkl !== '' && $tempat_pkl !== $exLoc);
            if ($existInvalid || $locationChanged) {
                // Selalu set koordinat ke 0 agar klien geocode ulang via Nominatim
                $db->query("UPDATE users SET pklLocation='$tempat_pkl', tempat_pkl='$tempat_pkl', latitude_pkl=0, longitude_pkl=0 WHERE id='$existId'");
            }
            // Kembalikan data user yang sudah ada (bukan error) agar klien bisa geocode
            $existUser = $db->query("SELECT id, username, nomor_induk, plain_password as password, name, role, kelas, jurusan, tempat_pkl, pklLocation, latitude_pkl, longitude_pkl, allowed_radius, foto, avatar, subtext, school, supervisor, status, aktif FROM users WHERE id='$existId'")->fetch_assoc();
            jsonSuccess(['message' => 'User sudah ada, lokasi diperbarui', 'user' => $existUser, 'id' => $existId, 'exists' => true]);
        }

        $pkl_start = $db->real_escape_string($input['pkl_start_date'] ?? date('Y-m-d'));
        $db->query("INSERT INTO users (id, username, nomor_induk, password, plain_password, name, role, kelas, jurusan, tempat_pkl, pklLocation, supervisor, subtext, school, status, aktif, pkl_start_date) VALUES ('$id', '$username', '$nomor_induk', '$password', '$plainPass', '$name', '$role', '$kelas', '$jurusan', '$tempat_pkl', '$tempat_pkl', '$supervisor', '$subtext', '$school', '$status', 1, '$pkl_start')");

        if ($db->affected_rows > 0) {
            $newUser = $db->query("SELECT id, username, nomor_induk, plain_password as password, name, role, kelas, jurusan, tempat_pkl, pklLocation, latitude_pkl, longitude_pkl, allowed_radius, foto, avatar, subtext, school, supervisor, status, aktif FROM users WHERE id='$id'")->fetch_assoc();
            @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'user_updated','user_id'=>$id,'ts'=>time()]));

        } else {
            jsonError('Gagal membuat user: ' . $db->error);
        }
        break;

    // â”€â”€ UPDATE USER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'update_user':
    case 'update_user_comprehensive':
        // Jika hanya update pkl_start_date (dari fix absen pertama), handle ringan
        if (isset($input['pkl_start_date']) && !isset($input['name']) && !isset($input['kelas'])) {
            $uid   = $db->real_escape_string($input['id'] ?? '');
            $pklSt = $db->real_escape_string($input['pkl_start_date'] ?? date('Y-m-d'));
            if ($uid) {
                $db->query("UPDATE users SET pkl_start_date='$pklSt' WHERE id='$uid' AND (pkl_start_date IS NULL OR pkl_start_date='' OR pkl_start_date=DATE_FORMAT(created_at,'%Y-%m-%d'))");
                @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'user_updated','ts'=>time()]));
                @unlink(sys_get_temp_dir() . '/sigap_users_cache.json');
                jsonSuccess(['message' => 'pkl_start_date updated', 'affected' => $db->affected_rows]);
            }
        }
        $id         = $db->real_escape_string($input['id'] ?? '');
        $name       = $db->real_escape_string($input['name'] ?? '');
        $username   = $db->real_escape_string(strtolower(trim($input['username'] ?? '')));
        $kelas      = $db->real_escape_string($input['kelas'] ?? '');
        $jurusan    = $db->real_escape_string($input['jurusan'] ?? '');
        $tempat_pkl = $db->real_escape_string($input['tempat_pkl'] ?? $input['pklLocation'] ?? '');
        $supervisor = $db->real_escape_string($input['supervisor'] ?? '');
        $subtext    = $db->real_escape_string($input['subtext'] ?? '');
        $lat        = floatval($input['latitude_pkl'] ?? 0);
        $lng        = floatval($input['longitude_pkl'] ?? 0);
        $radius     = intval($input['allowed_radius'] ?? 350);
        $rawPass    = trim($input['password'] ?? '');

        // Cek duplikat username (exclude user sendiri)
        if ($username) {
            $dupCheck = $db->query("SELECT id FROM users WHERE username='$username' AND id!='$id'")->fetch_assoc();
            if ($dupCheck) { jsonError('Username sudah digunakan oleh user lain.'); }
        }

        // Build SET clause â€” username & password opsional
        $setClause = "name='$name', kelas='$kelas', jurusan='$jurusan', 
                    tempat_pkl='$tempat_pkl', pklLocation='$tempat_pkl', supervisor='$supervisor',
                    subtext='$subtext', latitude_pkl=$lat, longitude_pkl=$lng, allowed_radius=$radius";
        if ($username) {
            $setClause .= ", username='$username'";
        }
        if ($rawPass !== '') {
            $hashedPass = $db->real_escape_string(password_hash($rawPass, PASSWORD_BCRYPT));
            $plainPassEsc = $db->real_escape_string($rawPass);
            $setClause .= ", password='$hashedPass', plain_password='$plainPassEsc'";
        }

        $db->query("UPDATE users SET $setClause WHERE id='$id'");

        $updated = $db->query("SELECT id, username, nomor_induk, plain_password as password, name, role, kelas, jurusan, tempat_pkl, pklLocation, latitude_pkl, longitude_pkl, allowed_radius, foto, avatar, subtext, school, supervisor, status, aktif FROM users WHERE id='$id'")->fetch_assoc();
        if ($updated && !$updated['password']) $updated['password'] = '123'; // fallback
        if ($updated) {
            @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'user_updated','user_id'=>$id,'ts'=>time()]));
        }
        // AUTO-GEOCODE: jika lokasi PKL berubah dan koordinat belum valid, geocode sekarang
        if (!empty($tempat_pkl) && ($lat == 0 || $lng == 0)) {
            $geoUpd = sigap_geocode_nominatim($tempat_pkl, $db);
            if ($geoUpd) {
                $db->query("UPDATE users SET latitude_pkl={$geoUpd['lat']}, longitude_pkl={$geoUpd['lng']} WHERE id='$id'");
                if ($updated) { $updated['latitude_pkl'] = $geoUpd['lat']; $updated['longitude_pkl'] = $geoUpd['lng']; }
            }
        }
        jsonSuccess(['message' => 'User berhasil diperbarui', 'user' => $updated]);
        break;

    // â”€â”€ UPDATE KELAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'update_kelas':
        $id    = $db->real_escape_string($input['id'] ?? '');
        $kelas = $db->real_escape_string($input['kelas'] ?? '');
        $db->query("UPDATE users SET kelas='$kelas' WHERE id='$id'");
        jsonSuccess(['message' => 'Kelas diperbarui']);
        break;

    // â”€â”€ UPDATE PKL LOCATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'update_pkl_location':
        // Admin langsung update lokasi PKL — auto-geocode jika koordinat kosong
        $id         = $db->real_escape_string($input['id'] ?? '');
        $tempat_pkl = $db->real_escape_string($input['tempat_pkl'] ?? $input['pklLocation'] ?? '');
        $lat        = floatval($input['latitude_pkl'] ?? 0);
        $lng        = floatval($input['longitude_pkl'] ?? 0);
        if (($lat == 0 || $lng == 0) && !empty($tempat_pkl)) {
            $geoLoc = sigap_geocode_nominatim($tempat_pkl, $db);
            if ($geoLoc) { $lat = $geoLoc['lat']; $lng = $geoLoc['lng']; }
        }
        $db->query("UPDATE users SET tempat_pkl='$tempat_pkl', pklLocation='$tempat_pkl', latitude_pkl=$lat, longitude_pkl=$lng WHERE id='$id'");
        @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'user_updated','user_id'=>$id,'ts'=>time()]));
        jsonSuccess(['message' => 'Lokasi PKL diperbarui', 'lat' => $lat, 'lng' => $lng]);
        break;

    case 'request_edit_pkl':
        // Guru/siswa mengajukan perubahan lokasi — pending sampai admin setujui
        $id      = $db->real_escape_string($input['id'] ?? $input['user_id'] ?? '');
        $propLoc = $db->real_escape_string($input['proposed_pkl_location'] ?? $input['pklLocation'] ?? '');
        $propLat = floatval($input['proposed_latitude_pkl'] ?? $input['latitude_pkl'] ?? 0);
        $propLng = floatval($input['proposed_longitude_pkl'] ?? $input['longitude_pkl'] ?? 0);
        $reqBy   = $db->real_escape_string($input['requested_by'] ?? $input['edit_requested_by'] ?? '');
        if (empty($id)) { jsonError('ID tidak valid'); break; }
        if (($propLat == 0 || $propLng == 0) && !empty($propLoc)) {
            $geoReq = sigap_geocode_nominatim($propLoc, $db);
            if ($geoReq) { $propLat = $geoReq['lat']; $propLng = $geoReq['lng']; }
        }
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_pkl_location VARCHAR(500) NULL");
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_latitude_pkl DOUBLE NULL");
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_longitude_pkl DOUBLE NULL");
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS edit_requested_by VARCHAR(200) NULL");
        $db->query("UPDATE users SET status='pending_edit_pkl', proposed_pkl_location='$propLoc', proposed_latitude_pkl=$propLat, proposed_longitude_pkl=$propLng, edit_requested_by='$reqBy' WHERE id='$id'");
        @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'pkl_edit_requested','user_id'=>$id,'ts'=>time()]));
        jsonSuccess(['message' => 'Pengajuan lokasi PKL berhasil dikirim', 'proposed_lat' => $propLat, 'proposed_lng' => $propLng]);
        break;

    case 'submit_pkl_coords':
        // Siswa self-report koordinat GPS dari lokasi PKL untuk diapprove admin
        $id       = $db->real_escape_string($input['user_id'] ?? $input['id'] ?? '');
        $propLat  = floatval($input['lat'] ?? $input['latitude'] ?? 0);
        $propLng  = floatval($input['lng'] ?? $input['longitude'] ?? 0);
        $propLoc  = $db->real_escape_string($input['location_name'] ?? $input['pklLocation'] ?? '');
        $accuracy = floatval($input['accuracy'] ?? 0);
        if (empty($id) || $propLat == 0 || $propLng == 0) { jsonError('Data tidak lengkap'); break; }
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_pkl_location VARCHAR(500) NULL");
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_latitude_pkl DOUBLE NULL");
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_longitude_pkl DOUBLE NULL");
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS edit_requested_by VARCHAR(200) NULL");
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE NULL");
        $db->query("UPDATE users SET status='pending_edit_pkl', proposed_pkl_location='$propLoc', proposed_latitude_pkl=$propLat, proposed_longitude_pkl=$propLng, edit_requested_by='Siswa (self-report GPS)', gps_accuracy=$accuracy WHERE id='$id'");
        @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'pkl_coords_submitted','user_id'=>$id,'ts'=>time()]));
        jsonSuccess(['message' => 'Titik koordinat PKL berhasil diajukan, menunggu persetujuan admin']);
        break;

    case 'get_geocache':
        // Ambil koordinat dari geocode_cache berdasarkan nama lokasi
        $locName  = trim($input['location_name'] ?? $_GET['location_name'] ?? '');
        if (empty($locName)) { jsonError('location_name wajib diisi'); break; }
        $locKey   = $db->real_escape_string(strtolower($locName));
        $cacheRow = $db->query("SELECT latitude, longitude, source FROM geocode_cache WHERE location_key='$locKey' LIMIT 1")->fetch_assoc();
        if ($cacheRow) {
            jsonSuccess(['lat' => floatval($cacheRow['latitude']), 'lng' => floatval($cacheRow['longitude']), 'source' => $cacheRow['source'], 'cached' => true]);
        } else {
            // Coba geocode dan simpan ke cache
            $geoNew = sigap_geocode_nominatim($locName, $db);
            if ($geoNew) {
                jsonSuccess(['lat' => $geoNew['lat'], 'lng' => $geoNew['lng'], 'source' => $geoNew['source'], 'cached' => false]);
            } else {
                jsonError('Koordinat tidak ditemukan untuk: ' . $locName);
            }
        }
        break;

    case 'approve_pkl_coords':
        // Admin menyetujui koordinat yang diajukan siswa — kunci ke DB + simpan ke geocode_cache
        $id = $db->real_escape_string($input['user_id'] ?? $input['id'] ?? '');
        if (empty($id)) { jsonError('ID tidak valid'); break; }
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_pkl_location VARCHAR(500) NULL");
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_latitude_pkl DOUBLE NULL");
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_longitude_pkl DOUBLE NULL");
        $row = $db->query("SELECT proposed_pkl_location, proposed_latitude_pkl, proposed_longitude_pkl FROM users WHERE id='$id'")->fetch_assoc();
        if (!$row) { jsonError('User tidak ditemukan'); break; }
        $newLoc = $row['proposed_pkl_location'] ?? '';
        $newLat = floatval($row['proposed_latitude_pkl'] ?? 0);
        $newLng = floatval($row['proposed_longitude_pkl'] ?? 0);
        if ($newLat == 0 || $newLng == 0) { jsonError('Koordinat tidak valid'); break; }
        // Terapkan ke users
        $escLoc = $db->real_escape_string($newLoc);
        $db->query("UPDATE users SET pklLocation='$escLoc', tempat_pkl='$escLoc', latitude_pkl=$newLat, longitude_pkl=$newLng, status='approved', proposed_pkl_location=NULL, proposed_latitude_pkl=NULL, proposed_longitude_pkl=NULL WHERE id='$id'");
        // Simpan ke geocode_cache agar tidak hilang saat reset
        if (!empty($newLoc)) {
            $cKey = $db->real_escape_string(strtolower(trim($newLoc)));
            $db->query("INSERT INTO geocode_cache (location_key, location_name, latitude, longitude, source)
                VALUES ('$cKey','$escLoc',$newLat,$newLng,'manual_approved')
                ON DUPLICATE KEY UPDATE latitude=$newLat, longitude=$newLng, source='manual_approved', updated_at=NOW()");
        }
        @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'user_updated','user_id'=>$id,'ts'=>time()]));
        jsonSuccess(['message' => 'Koordinat PKL disetujui dan dikunci', 'lat' => $newLat, 'lng' => $newLng]);
        break;

    // â”€â”€ UPDATE SUPERVISOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'update_supervisor':
        $id         = $db->real_escape_string($input['id'] ?? '');
        $supervisor = $db->real_escape_string($input['supervisor'] ?? '');
        $db->query("UPDATE users SET supervisor='$supervisor' WHERE id='$id'");
        jsonSuccess(['message' => 'Supervisor diperbarui']);
        break;

    // â”€â”€ UPDATE AVATAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'update_avatar':
        $id     = $db->real_escape_string($input['id'] ?? '');
        $avatar = $db->real_escape_string($input['avatar'] ?? $input['foto'] ?? '');
        $db->query("UPDATE users SET foto='$avatar', avatar='$avatar' WHERE id='$id'");
        jsonSuccess(['message' => 'Avatar diperbarui']);
        break;

    // â”€â”€ APPROVE USER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'approve_user':
        $id     = $db->real_escape_string($input['id'] ?? $input['user_id'] ?? '');
        $status = $db->real_escape_string($input['status'] ?? 'approved');
        if (empty($id)) { jsonError('ID tidak valid.'); }
        // Setujui â†’ aktif=1, Tolak/rejected/confirm_delete â†’ aktif=0
        $aktif = in_array($status, ['approved', 'confirm_edit_pkl', 'cancel_edit_pkl']) ? 1 : 0;
        if ($status === 'confirm_delete' || $status === 'rejected') {
            $db->query("UPDATE users SET aktif=0, status='approved' WHERE id='$id'");
        } elseif ($status === 'confirm_edit_pkl') {
            $newPkl = $db->real_escape_string($input['proposed_pkl_location'] ?? '');
            $newLat = floatval($input['proposed_latitude_pkl'] ?? 0);
            $newLng = floatval($input['proposed_longitude_pkl'] ?? 0);
            $setExtra = $newPkl ? ", tempat_pkl='$newPkl', pklLocation='$newPkl', latitude_pkl=$newLat, longitude_pkl=$newLng" : '';
            $db->query("UPDATE users SET status='approved', aktif=1 $setExtra WHERE id='$id'");
        } elseif ($status === 'cancel_edit_pkl') {
            // Tolak pengajuan — kembalikan status ke approved dan HAPUS proposed_* fields
            $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_pkl_location VARCHAR(500) NULL");
            $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_latitude_pkl DOUBLE NULL");
            $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS proposed_longitude_pkl DOUBLE NULL");
            $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS edit_requested_by VARCHAR(200) NULL");
            $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE NULL");
            $db->query("UPDATE users SET
                status='approved', aktif=1,
                proposed_pkl_location=NULL,
                proposed_latitude_pkl=NULL,
                proposed_longitude_pkl=NULL,
                edit_requested_by=NULL,
                gps_accuracy=NULL
                WHERE id='$id'");
        } else {
            $db->query("UPDATE users SET status='$status', aktif=$aktif WHERE id='$id'");
        }
        // Broadcast SSE agar semua client refresh daftar user
        @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'user_updated','ts'=>time()]));
        jsonSuccess(['message' => 'Status user diperbarui']);
        break;

    // â”€â”€ CHECK PASSWORD (untuk sync password setelah admin ganti) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'check_password':
        $id       = $db->real_escape_string($input['id'] ?? '');
        $rawPass  = $input['password'] ?? '';
        $row = $db->query("SELECT password FROM users WHERE id='$id' AND aktif=1")->fetch_assoc();
        if (!$row) { jsonError('User tidak ditemukan.', 404); }
        $valid = password_verify($rawPass, $row['password']) || ($row['password'] === $rawPass);
        jsonSuccess(['valid' => $valid]);
        break;

    // â”€â”€ RESET PASSWORD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'reset_password':
        $id       = $db->real_escape_string($input['id'] ?? '');
        $rawPass  = $input['password'] ?? $input['new_password'] ?? '123';
        $password = password_hash($rawPass, PASSWORD_BCRYPT);
        $plainPassEsc = $db->real_escape_string($rawPass);
        $db->query("UPDATE users SET password='$password', plain_password='$plainPassEsc' WHERE id='$id'");
        jsonSuccess(['message' => 'Password berhasil direset']);
        break;

    // â”€â”€ DELETE USER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'delete_user':
    case 'request_delete_user':
        $id = $db->real_escape_string($input['id'] ?? '');
        if (empty($id)) { jsonError('ID user tidak valid.'); }
        // Proteksi: admin tidak boleh dihapus
        $targetUser = $db->query("SELECT username, role FROM users WHERE id='$id'")->fetch_assoc();
        if (!$targetUser) { jsonError('User tidak ditemukan.'); }
        if ($targetUser['role'] === 'admin' || $targetUser['username'] === 'admin') {
            jsonError('Master Admin tidak dapat dihapus.');
        }
        $db->query("UPDATE users SET aktif=0 WHERE id='$id'");
        @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'user_updated','user_id'=>$id,'ts'=>time()]));
        // Log penghapusan untuk audit
        @file_put_contents('/tmp/sigap_delete_log.txt', date('Y-m-d H:i:s') . " DELETE id=$id username={$targetUser['username']}\n", FILE_APPEND);
        jsonSuccess(['message' => 'User berhasil dihapus']);
        break;

    // â”€â”€ SIMPAN PRESENSI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'simpan_presensi':
        $id       = $db->real_escape_string($input['id'] ?? ('att_' . uniqid('', true)));
        $user_id  = $db->real_escape_string($input['userId'] ?? $input['user_id'] ?? '');
        $username = $db->real_escape_string($input['username'] ?? '');
        $name     = $db->real_escape_string($input['name'] ?? $input['studentName'] ?? '');
        $type     = $db->real_escape_string($input['type'] ?? 'masuk');
        // Ambil jam masuk dari field 'masuk' atau 'server_timestamp' atau 'date'
        $masukTime  = $db->real_escape_string($input['masuk'] ?? '');
        $pulangTime = $db->real_escape_string($input['pulang'] ?? $input['pulang_time'] ?? '');
        // Normalisasi format jam: ganti titik dengan titik dua (20.29 → 20:29)
        $pulangTime = str_replace('.', ':', $pulangTime);
        // Susun timestamp dari date + masuk/pulang
        $dateOnly = $db->real_escape_string($input['date'] ?? date('Y-m-d'));
        // Gunakan server_timestamp jika ada untuk mendapat tanggal lokal yang benar
        if (isset($input['server_timestamp']) && $input['server_timestamp']) {
            // server_timestamp adalah ISO string (UTC), konversi ke WIB (+7)
            $utcTs = strtotime($input['server_timestamp']);
            if ($utcTs) {
                $wibTs   = $utcTs + (7 * 3600); // tambah 7 jam untuk WIB
                $dateOnly = date('Y-m-d', $wibTs);
            }
        }
        // Jika masuk punya jam, gabungkan dengan tanggal yang sudah dikoreksi
        if ($masukTime && $masukTime !== '-') {
            $ts = $dateOnly . ' ' . $masukTime . ':00';
        } elseif (isset($input['server_timestamp'])) {
            $ts = $db->real_escape_string($input['server_timestamp']);
        } else {
            $ts = $db->real_escape_string($input['date'] ?? $input['timestamp'] ?? date('Y-m-d H:i:s'));
        }
        $lat      = floatval($input['lat'] ?? $input['latitude'] ?? 0);
        $lng      = floatval($input['lng'] ?? $input['longitude'] ?? 0);
        $distance = floatval($input['distance'] ?? $input['distance_meters'] ?? 0);
        $status   = $db->real_escape_string($input['status'] ?? 'hadir');
        $foto     = $db->real_escape_string($input['foto'] ?? $input['image'] ?? '');
        $catatan  = $db->real_escape_string($input['catatan'] ?? $input['notes'] ?? $input['location'] ?? '');
        $foto_pulang = $db->real_escape_string($input['foto_pulang'] ?? $input['pulang_image'] ?? '');

        // Cek duplikat berdasarkan user_id + type + tanggal menggunakan range (lebih efisien dari DATE())
        $dateCheck = substr($ts, 0, 10); // YYYY-MM-DD
        $dateStart = $dateCheck . ' 00:00:00';
        $dateEnd   = $dateCheck . ' 23:59:59';
        // Gunakan user_id jika ada, fallback ke username
        if (!empty($user_id)) {
            $existRow = $db->query("SELECT id FROM attendance WHERE user_id='$user_id' AND type='$type' AND timestamp BETWEEN '$dateStart' AND '$dateEnd' LIMIT 1")->fetch_assoc();
        } elseif (!empty($username)) {
            $existRow = $db->query("SELECT id FROM attendance WHERE username='$username' AND type='$type' AND timestamp BETWEEN '$dateStart' AND '$dateEnd' LIMIT 1")->fetch_assoc();
        } else {
            $existRow = null;
        }
        // Jika user_id kosong tapi username ada, isi user_id dari tabel users
        if (empty($user_id) && !empty($username)) {
            $uRow = $db->query("SELECT id FROM users WHERE username='$username' LIMIT 1")->fetch_assoc();
            if ($uRow) {
                $user_id = $db->real_escape_string($uRow['id']);
            }
        }
        // Jika user_id dan username kosong, coba ambil dari nama
        if (empty($user_id) && empty($username) && !empty($name)) {
            $uRow = $db->query("SELECT id, username FROM users WHERE name='$name' LIMIT 1")->fetch_assoc();
            if ($uRow) {
                $user_id  = $db->real_escape_string($uRow['id']);
                $username = $db->real_escape_string($uRow['username']);
            }
        }
        if ($existRow && $existRow['id'] !== $id) {
            // Baris sudah ada dengan id berbeda — UPDATE baris lama, jangan INSERT duplikat
            $existId = $db->real_escape_string($existRow['id']);
            $updOk = $db->query("UPDATE attendance SET status='$status',
                        catatan=IF('$catatan'!='', '$catatan', catatan),
                        foto=IF('$foto'!='', '$foto', foto),
                        foto_pulang=IF('$foto_pulang'!='', '$foto_pulang', foto_pulang),
                        pulang_time=IF('$pulangTime'!='', '$pulangTime', pulang_time),
                        latitude=$lat, longitude=$lng, distance_meters=$distance
                        WHERE id='$existId'");
            if (!$updOk) { jsonError('Gagal update presensi: ' . $db->error); }
        } else {
            $insOk = $db->query("INSERT INTO attendance (id, user_id, username, name, type, timestamp, latitude, longitude, distance_meters, status, foto, catatan, foto_pulang, pulang_time)
                        VALUES ('$id', '$user_id', '$username', '$name', '$type', '$ts', $lat, $lng, $distance, '$status', '$foto', '$catatan', '$foto_pulang', '$pulangTime')
                        ON DUPLICATE KEY UPDATE status='$status', catatan=IF('$catatan'!='', '$catatan', catatan),
                        foto=IF('$foto'!='', '$foto', foto),
                        foto_pulang=IF('$foto_pulang'!='', '$foto_pulang', foto_pulang),
                        pulang_time=IF('$pulangTime'!='', '$pulangTime', pulang_time)");
            if (!$insOk) { jsonError('Gagal simpan presensi: ' . $db->error); }
        }
        @file_put_contents(sys_get_temp_dir() . '/sigap_attendance_updated.json',
            json_encode(['type'=>'attendance_updated','student'=>$name,'ts'=>time()]));
        // Hapus cache presensi agar get_presensi langsung fresh
        @unlink(sys_get_temp_dir() . '/sigap_presensi_cache.json');
        jsonSuccess(['message' => 'Presensi berhasil disimpan', 'id' => $id]);
        break;

    // â”€â”€ GET PRESENSI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'get_presensi':
        $user_id = $db->real_escape_string($input['user_id'] ?? $_GET['user_id'] ?? '');
        $where   = $user_id ? "WHERE user_id='$user_id'" : '';
        // Cache 5 detik untuk get_presensi tanpa filter (global sync) — mengurangi beban DB
        if (empty($user_id)) {
            $pcacheFile = sys_get_temp_dir() . '/sigap_presensi_cache.json';
            $pAttFile   = sys_get_temp_dir() . '/sigap_attendance_updated.json';
            // TTL 3 detik — cukup pendek agar pulang langsung terlihat
            $pUseCache  = file_exists($pcacheFile) && (time() - filemtime($pcacheFile)) < 3;
            if ($pUseCache && file_exists($pAttFile) && filemtime($pAttFile) >= filemtime($pcacheFile)) {
                $pUseCache = false; // ada update lebih baru dari cache
            }
            if ($pUseCache) { echo file_get_contents($pcacheFile); exit; }
        } else {
            $pcacheFile = null; $pUseCache = false;
        }
        $result  = $db->query("SELECT * FROM attendance $where ORDER BY timestamp DESC LIMIT 5000");
        $logs = [];
        while ($row = $result->fetch_assoc()) {
            // Kompatibilitas field nama lama
            $ts = $row['timestamp'] ?? '';
            // date: ambil YYYY-MM-DD saja dari timestamp
            $row['date']        = $ts ? substr($ts, 0, 10) : date('Y-m-d');
            $row['userId']      = $row['user_id'];
            $row['studentName'] = $row['name'] ?: ($row['username'] ?? '');
            $row['lat']         = $row['latitude'];
            $row['lng']         = $row['longitude'];
            $row['distance']    = $row['distance_meters'];
            $row['image']       = $row['foto'];
            $row['pulang_image']= $row['foto_pulang'] ?? null;
            $row['notes']       = $row['catatan'];
            $row['location']    = $row['catatan'] ?? '';
            // Field masuk: hanya ambil jam dari timestamp jika type='masuk'
            // type='pulang' TIDAK mengisi jam masuk (itu dicatat di baris terpisah type='masuk')
            $timeOnly = $ts ? substr($ts, 11, 5) : '-';
            $row['masuk']  = ($row['type'] === 'masuk') ? $timeOnly : '-';
            // pulang: utamakan kolom pulang_time, fallback ke timestamp jika type='pulang'
            $pulangVal = $row['pulang_time'] ?? '';
            // Normalisasi format: titik → titik dua (20.29 → 20:29), potong detik
            $pulangVal = str_replace('.', ':', $pulangVal);
            if (strlen($pulangVal) >= 8) $pulangVal = substr($pulangVal, 0, 5); // "HH:MM:SS" → "HH:MM"
            if ($row['type'] === 'pulang' && (!$pulangVal || $pulangVal === '-' || $pulangVal === 'NULL' || $pulangVal === '')) {
                // pulang_time belum diisi tapi type=pulang → gunakan timestamp sebagai jam pulang
                $pulangVal = $timeOnly;
            }
            $row['pulang'] = ($pulangVal && $pulangVal !== '-' && $pulangVal !== 'NULL') ? $pulangVal : '-';
            $logs[] = $row;
        }
        $presResponse = json_encode(['success' => true, 'logs' => $logs, 'data' => $logs]);
        if (!empty($pcacheFile)) @file_put_contents($pcacheFile, $presResponse);
        echo $presResponse;
        exit;

    // â”€â”€ GET PERMISSIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'get_permissions':
        $user_id = $db->real_escape_string($input['user_id'] ?? $_GET['user_id'] ?? '');
        $where   = $user_id ? "WHERE user_id='$user_id'" : '';
        $result  = $db->query("SELECT * FROM permissions $where ORDER BY created_at DESC");
        $perms = [];
        while ($row = $result->fetch_assoc()) {
            // Normalize field names agar konsisten dengan app.js
            $row['startDate']   = $row['tanggal'] ?? $row['created_at'] ?? date('Y-m-d');
            $row['endDate']     = $row['tanggal'] ?? $row['created_at'] ?? date('Y-m-d');
            $row['type']        = $row['type'] ?? 'izin';
            $row['studentName'] = $row['name'] ?? $row['username'] ?? '';
            $row['reason']      = $row['alasan'] ?? $row['reason'] ?? '';
            // Normalize status â€” pastikan case konsisten: 'Pending', 'Disetujui', 'Ditolak'
            $rawStatus = trim($row['status'] ?? 'pending');
            if (strtolower($rawStatus) === 'disetujui') {
                $row['status'] = 'Disetujui';
            } elseif (strtolower($rawStatus) === 'ditolak') {
                $row['status'] = 'Ditolak';
            } else {
                $row['status'] = 'Pending';
            }
            // Fallback: jika status masih Pending tapi approver_name sudah ada,
            // berarti UPDATE partial â€” re-query untuk memastikan status terbaru
            if ($row['status'] === 'Pending' && !empty($row['approver_name'])) {
                $freshRow = $db->query("SELECT status, approver_name FROM permissions WHERE id='" . $db->real_escape_string($row['id']) . "'")->fetch_assoc();
                if ($freshRow) {
                    $freshStatus = trim($freshRow['status'] ?? 'Pending');
                    if (strtolower($freshStatus) === 'disetujui') $row['status'] = 'Disetujui';
                    elseif (strtolower($freshStatus) === 'ditolak') $row['status'] = 'Ditolak';
                }
            }
            $row['supervisor']  = $row['supervisor'] ?? '';
            $perms[] = $row;
        }
        jsonSuccess(['permissions' => $perms, 'data' => $perms]);
        break;

    // â”€â”€ CREATE PERMISSION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'create_permission':
        $id         = $db->real_escape_string($input['id'] ?? ('izn_' . uniqid('', true)));
        $user_id    = $db->real_escape_string($input['userId'] ?? $input['user_id'] ?? '');
        $username   = $db->real_escape_string($input['username'] ?? '');
        $name       = $db->real_escape_string($input['name'] ?? $input['studentName'] ?? '');
        $tanggal    = $db->real_escape_string($input['startDate'] ?? $input['tanggal'] ?? date('Y-m-d'));
        $alasan     = $db->real_escape_string($input['reason'] ?? $input['alasan'] ?? '');
        $foto       = $db->real_escape_string($input['foto'] ?? '');
        $type       = $db->real_escape_string($input['type'] ?? 'izin');
        // Ambil supervisor dari request atau lookup dari tabel users
        $supervisor = $db->real_escape_string($input['supervisor'] ?? '');
        if (empty($supervisor) && !empty($user_id)) {
            $supRow = $db->query("SELECT supervisor FROM users WHERE id='$user_id' OR username='$username'")->fetch_assoc();
            if ($supRow) $supervisor = $db->real_escape_string($supRow['supervisor'] ?? '');
        }
        $status = 'Pending';

        $db->query("INSERT INTO permissions (id, user_id, username, name, tanggal, alasan, foto, type, supervisor, status)
                    VALUES ('$id', '$user_id', '$username', '$name', '$tanggal', '$alasan', '$foto', '$type', '$supervisor', '$status')
                    ON DUPLICATE KEY UPDATE alasan='$alasan', type='$type', supervisor=IF(supervisor IS NULL OR supervisor='', '$supervisor', supervisor)");
        // Broadcast SSE agar guru/admin notified
        @file_put_contents(sys_get_temp_dir() . '/sigap_perm_updated.json', json_encode(['type'=>'perm_updated','ts'=>time()]));
        jsonSuccess(['message' => 'Izin berhasil diajukan', 'id' => $id]);
        break;

    // â”€â”€ APPROVE PERMISSION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'approve_permission':
        $id           = $db->real_escape_string($input['id'] ?? $input['perm_id'] ?? '');
        $statusRaw    = trim($input['status'] ?? 'Disetujui');
        // Normalize status â€” pastikan konsisten dengan nilai yang disimpan di DB
        if (strtolower($statusRaw) === 'disetujui' || strtolower($statusRaw) === 'approved') {
            $statusRaw = 'Disetujui';
        } elseif (strtolower($statusRaw) === 'ditolak' || strtolower($statusRaw) === 'rejected') {
            $statusRaw = 'Ditolak';
        }
        $status       = $db->real_escape_string($statusRaw);
        $approverName = $db->real_escape_string($input['approver_name'] ?? '');
        $approverRole = $db->real_escape_string($input['approver_role'] ?? '');
        $approvedAt   = $db->real_escape_string($input['approved_at'] ?? date('Y-m-d H:i:s'));

        if (empty($id)) {
            jsonError('ID izin tidak ditemukan');
            break;
        }

        // Update status di tabel permissions
        $updateOk = $db->query("UPDATE permissions SET
            status='$status',
            approver_name='$approverName',
            approver_role='$approverRole',
            approved_at='$approvedAt'
            WHERE id='$id'");

        $affectedRows = $db->affected_rows;
        // Jika id tidak cocok (0 rows), coba cari dengan LIKE sebagai fallback
        if ($affectedRows === 0) {
            // Log untuk debug
            error_log("[SIGAP] approve_permission: id='$id' not found or no change. DB error: " . $db->error);
        }

        // Jika disetujui, simpan ke attendance sebagai catatan
        if ($status === 'Disetujui') {
            $perm = $db->query("SELECT * FROM permissions WHERE id='$id'")->fetch_assoc();
            if ($perm) {
                $attId   = 'att_perm_' . $perm['id'];
                $student = $db->real_escape_string($perm['name'] ?? '');
                $tanggal = $perm['tanggal'] ?? date('Y-m-d');
                $attTs   = $db->real_escape_string($tanggal . ' 08:00:00');
                $permType = strtolower($perm['type'] ?? 'izin');
                // type di attendance adalah enum('masuk','pulang','izin') â€” pakai 'izin' sebagai default
                $attType = 'izin';
                $alasan  = $db->real_escape_string($perm['alasan'] ?? '');
                $catatan = $db->real_escape_string("Surat {$perm['type']}: $alasan [Disetujui oleh $approverRole: $approverName]");
                $userId  = $db->real_escape_string($perm['user_id'] ?? '');
                $uname   = $db->real_escape_string($perm['username'] ?? '');

                $db->query("INSERT INTO attendance (id, user_id, username, name, type, timestamp, status, catatan)
                    VALUES ('$attId', '$userId', '$uname', '$student', '$attType', '$attTs', 'izin', '$catatan')
                    ON DUPLICATE KEY UPDATE status='izin', catatan='$catatan'");
                if ($db->error) error_log("[SIGAP] attendance insert error: " . $db->error);
            }
        } elseif ($status === 'Ditolak') {
            $perm = $db->query("SELECT * FROM permissions WHERE id='$id'")->fetch_assoc();
            if ($perm) {
                $attId   = 'att_perm_rej_' . $perm['id'];
                $student = $db->real_escape_string($perm['name'] ?? '');
                $tanggal = $perm['tanggal'] ?? date('Y-m-d');
                $attTs   = $db->real_escape_string($tanggal . ' 08:00:00');
                $catatan = $db->real_escape_string("Permohonan Izin Ditolak oleh $approverRole: $approverName");
                $userId  = $db->real_escape_string($perm['user_id'] ?? '');
                $uname   = $db->real_escape_string($perm['username'] ?? '');

                $db->query("INSERT INTO attendance (id, user_id, username, name, type, timestamp, status, catatan)
                    VALUES ('$attId', '$userId', '$uname', '$student', 'izin', '$attTs', 'alpa', '$catatan')
                    ON DUPLICATE KEY UPDATE status='alpa', catatan='$catatan'");
                if ($db->error) error_log("[SIGAP] attendance insert error: " . $db->error);
            }
        }

        // Broadcast SSE agar semua client sync
        @file_put_contents(sys_get_temp_dir() . '/sigap_perm_updated.json', json_encode([
            'type' => 'perm_updated', 'id' => $id, 'status' => $status,
            'approver' => $approverName, 'ts' => time()
        ]));
        jsonSuccess(['message' => "Izin $status oleh $approverName"]);
        break;

    // â”€â”€ GPS LOCATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // ── GET STUDENT PKL LOCATION ─────────────────────────────────────────────
    // Endpoint khusus untuk mengambil koordinat PKL siswa dari DB secara langsung.
    // Dipanggil saat login siswa agar TARGET_LOCATION di-lock ke koordinat resmi dari admin.
    // Response: { success, ready_to_lock, lat, lng, radius, name }
    case 'get_student_pkl_location':
        $uid = $db->real_escape_string($_GET['user_id'] ?? $input['user_id'] ?? '');
        if (!$uid) { jsonError('user_id required'); break; }

        $row = $db->query(
            "SELECT tempat_pkl, pklLocation, latitude_pkl, longitude_pkl, allowed_radius
               FROM users WHERE (id='$uid' OR username='$uid') AND aktif=1 LIMIT 1"
        )->fetch_assoc();

        if (!$row) { jsonError('User tidak ditemukan'); break; }

        $dbLat    = floatval($row['latitude_pkl'] ?? 0);
        $dbLng    = floatval($row['longitude_pkl'] ?? 0);
        $dbRadius = intval($row['allowed_radius'] ?? 350);
        $dbName   = $row['pklLocation'] ?: $row['tempat_pkl'] ?: '';
        if ($dbRadius < 50 || $dbRadius > 2000) $dbRadius = 350;

        // Koordinat valid jika: bukan 0, bukan default SMKN9 (kecuali nama memang SMKN9), bukan pusat kota
        $nameLow       = strtolower($dbName);
        $isSmkn9Name   = (strpos($nameLow, 'smk') !== false || strpos($nameLow, '9 malang') !== false);
        $isSmkn9Coords = (abs($dbLat - (-7.9825)) < 0.0005 && abs($dbLng - 112.6867) < 0.0005);
        $isCenterCoord = (abs($dbLat - (-7.9700)) < 0.0005 && abs($dbLng - 112.6326) < 0.0005);
        $isZero        = ($dbLat == 0 || $dbLng == 0);

        $coordsValid = !$isZero && !$isCenterCoord && (!$isSmkn9Coords || $isSmkn9Name);

        if ($coordsValid) {
            echo json_encode([
                'success'       => true,
                'ready_to_lock' => true,
                'lat'           => $dbLat,
                'lng'           => $dbLng,
                'radius'        => $dbRadius,
                'name'          => $dbName,
            ]);
        } else {
            // Koordinat belum diisi admin atau masih default → klien perlu geocode
            echo json_encode([
                'success'       => true,
                'ready_to_lock' => false,
                'lat'           => 0,
                'lng'           => 0,
                'radius'        => $dbRadius,
                'name'          => $dbName,
            ]);
        }
        exit;
case 'gps_location':
        $user_id = $db->real_escape_string($input['user_id'] ?? $input['userId'] ?? '');
        $lat     = floatval($input['lat'] ?? $input['latitude'] ?? 0);
        $lng     = floatval($input['lng'] ?? $input['longitude'] ?? 0);
        if ($user_id && $lat && $lng) {
            $db->query("UPDATE users SET latitude_pkl=$lat, longitude_pkl=$lng WHERE id='$user_id'");
        }
        jsonSuccess(['message' => 'Lokasi GPS diperbarui']);
        break;

    // ── BATCH GEOCODE ULANG — pakai alamat lengkap untuk presisi maksimal ──────
    // Dijalankan admin untuk geocode ulang semua siswa dengan koordinat 0 atau default SMKN9
    // Strategi: pakai nama PKL LENGKAP (ada nama jalan) → Nominatim lebih presisi
    case 'batch_geocode_all':
        $force = ($input['force'] ?? $_GET['force'] ?? '0') === '1'; // force=1: geocode ulang semua
        $limit = min(intval($input['limit'] ?? $_GET['limit'] ?? 20), 50);

        // Ambil siswa yang koordinatnya belum valid atau perlu refresh
        $whereClause = $force
            ? "role='siswa' AND aktif=1 AND pklLocation != ''"
            : "role='siswa' AND aktif=1 AND pklLocation != '' AND (
                latitude_pkl = 0 OR longitude_pkl = 0 OR
                (ABS(latitude_pkl - (-7.9825)) < 0.001 AND ABS(longitude_pkl - 112.6867) < 0.001) OR
                (ABS(latitude_pkl - (-7.9437)) < 0.001 AND ABS(longitude_pkl - 112.6136) < 0.001) OR
                (ABS(latitude_pkl - (-7.9797)) < 0.001 AND ABS(longitude_pkl - 112.6304) < 0.001) OR
                (ABS(latitude_pkl - (-8.0028)) < 0.001 AND ABS(longitude_pkl - 112.6571) < 0.001) OR
                (ABS(latitude_pkl - (-8.0007)) < 0.001 AND ABS(longitude_pkl - 112.6157) < 0.001)
              )";

        $result = $db->query("SELECT id, username, pklLocation, latitude_pkl, longitude_pkl
            FROM users WHERE $whereClause LIMIT $limit");

        $processed = 0; $success = 0; $failed = [];

        while ($row = $result->fetch_assoc()) {
            $pklFull = trim($row['pklLocation'] ?? '');
            if (empty($pklFull)) continue;

            // Strategi multi-query: dari paling spesifik ke umum
            // Keuntungan: pklLocation sudah mengandung nama jalan/kelurahan → Nominatim presisi
            $hasJalan = (stripos($pklFull, 'jl.') !== false || stripos($pklFull, 'jalan') !== false);
            $queries = [
                $pklFull . ', Indonesia',                           // alamat lengkap + negara
                $hasJalan ? $pklFull . ', Jawa Timur' : $pklFull . ', Malang, Jawa Timur, Indonesia',
            ];

            $foundLat = 0; $foundLng = 0; $bestDist = PHP_FLOAT_MAX;

            foreach ($queries as $q) {
                $url = 'https://nominatim.openstreetmap.org/search?q=' . urlencode($q)
                     . '&format=json&limit=5&addressdetails=1&countrycodes=id';
                $ch = curl_init($url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_USERAGENT, 'SIGAP-PKL-SMKN9/2.0');
                curl_setopt($ch, CURLOPT_TIMEOUT, 8);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                $resp = curl_exec($ch); curl_close($ch);
                if (!$resp) continue;
                $results2 = json_decode($resp, true);
                if (empty($results2)) continue;

                foreach ($results2 as $r2) {
                    $rLat = floatval($r2['lat']); $rLng = floatval($r2['lon']);
                    if ($rLat == 0 || $rLng == 0) continue;
                    // Jarak dari pusat Malang
                    $dist = sqrt(pow($rLat-(-7.9825),2)+pow($rLng-112.6867,2))*111.0;
                    if ($dist < $bestDist && $dist < 200) {
                        $bestDist = $dist; $foundLat = $rLat; $foundLng = $rLng;
                    }
                }
                if ($foundLat != 0 && $bestDist < 50) break; // presisi tinggi, stop
            }

            $processed++;
            if ($foundLat != 0 && $foundLng != 0) {
                $uid = $db->real_escape_string($row['id']);
                $db->query("UPDATE users SET latitude_pkl=$foundLat, longitude_pkl=$foundLng WHERE id='$uid'");
                // Simpan ke geocode_cache
                $locKey  = $db->real_escape_string(strtolower(trim($pklFull)));
                $locName = $db->real_escape_string($pklFull);
                $db->query("INSERT INTO geocode_cache (location_key, location_name, latitude, longitude, source)
                    VALUES ('$locKey','$locName',$foundLat,$foundLng,'batch_full_addr')
                    ON DUPLICATE KEY UPDATE latitude=$foundLat, longitude=$foundLng, source='batch_full_addr', updated_at=NOW()");
                $success++;
            } else {
                $failed[] = $row['username'] . ': ' . substr($pklFull, 0, 40);
            }

            usleep(1200000); // 1.2 detik jeda (Nominatim rate limit)
        }

        jsonSuccess([
            'processed' => $processed,
            'success'   => $success,
            'failed'    => count($failed),
            'failed_list' => array_slice($failed, 0, 10),
            'message'   => "Geocode selesai: $success berhasil dari $processed siswa"
        ]);
        break;

    // â”€â”€ SAVE JOURNAL HARIAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'save_journal':
        // Buat tabel journals jika belum ada
        $db->query("CREATE TABLE IF NOT EXISTS journals (
            id          VARCHAR(100) NOT NULL PRIMARY KEY,
            user_id     VARCHAR(50)  NOT NULL,
            username    VARCHAR(100),
            student_name VARCHAR(150),
            supervisor  VARCHAR(200),
            date        DATE         NOT NULL,
            time        VARCHAR(10),
            narasi      TEXT,
            image       LONGTEXT,
            created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_date (user_id, date),
            INDEX idx_student_date (student_name, date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $jId         = $db->real_escape_string($input['id'] ?? ('jrn_' . uniqid('', true)));
        $jUserId     = $db->real_escape_string($input['userId'] ?? $input['user_id'] ?? '');
        $jUsername   = $db->real_escape_string($input['username'] ?? '');
        $jName       = $db->real_escape_string($input['studentName'] ?? $input['name'] ?? '');
        $jSupervisor = $db->real_escape_string($input['supervisor'] ?? '');
        $jDate       = $db->real_escape_string($input['date'] ?? date('Y-m-d'));
        $jTime       = $db->real_escape_string($input['time'] ?? date('H:i'));
        $jNarasi     = $db->real_escape_string($input['narasi'] ?? '');
        $jImage      = $db->real_escape_string($input['image'] ?? '');
        $jCreated    = $db->real_escape_string($input['createdAt'] ?? date('Y-m-d H:i:s'));

        // Satu jurnal per hari per siswa (ON DUPLICATE KEY UPDATE)
        $db->query("INSERT INTO journals (id, user_id, username, student_name, supervisor, date, time, narasi, image, created_at)
                    VALUES ('$jId','$jUserId','$jUsername','$jName','$jSupervisor','$jDate','$jTime','$jNarasi','$jImage','$jCreated')
                    ON DUPLICATE KEY UPDATE
                        narasi='$jNarasi', image='$jImage', time='$jTime', created_at='$jCreated'");
        if ($db->error) error_log('[SIGAP] save_journal error: ' . $db->error);

        // Broadcast SSE agar semua client refresh
        @file_put_contents(sys_get_temp_dir() . '/sigap_journal_updated.json',
            json_encode(['type'=>'journal_updated','student'=>$jName,'date'=>$jDate,'ts'=>time()]));
        jsonSuccess(['message' => 'Jurnal berhasil disimpan', 'id' => $jId]);
        break;

    // â”€â”€ GET JOURNALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'get_journals':
        $jUidQ  = $db->real_escape_string($_GET['user_id'] ?? $input['user_id'] ?? '');
        $jNameQ = $db->real_escape_string($_GET['student_name'] ?? $input['student_name'] ?? '');
        $jWhere = '';
        if ($jUidQ)  $jWhere = "WHERE user_id='$jUidQ'";
        elseif ($jNameQ) $jWhere = "WHERE student_name='$jNameQ'";
        // Buat tabel jika belum ada sebelum query
        $db->query("CREATE TABLE IF NOT EXISTS journals (
            id VARCHAR(100) NOT NULL PRIMARY KEY, user_id VARCHAR(50) NOT NULL,
            username VARCHAR(100), student_name VARCHAR(150), supervisor VARCHAR(200),
            date DATE NOT NULL, time VARCHAR(10), narasi TEXT, image LONGTEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $jResult = $db->query("SELECT id, user_id, username, student_name AS studentName,
            supervisor, date, time, narasi, created_at,
            '' AS image FROM journals $jWhere ORDER BY date DESC LIMIT 500");
        $jRows = [];
        if ($jResult) while ($jr = $jResult->fetch_assoc()) $jRows[] = $jr;
        jsonSuccess(['journals' => $jRows, 'data' => $jRows]);
        break;

    // â”€â”€ SAVE MONTHLY REPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'save_monthly_report':
        $user_id    = $db->real_escape_string($input['user_id'] ?? $input['userId'] ?? '');
        $username   = $db->real_escape_string($input['username'] ?? '');
        $name       = $db->real_escape_string($input['name'] ?? '');
        $type       = 'monthly_report';
        $dataJson   = $db->real_escape_string(json_encode($input['data'] ?? $input));
        $id         = 'rep_' . uniqid('', true);

        $db->query("INSERT INTO approval_reports (id, user_id, username, name, type, data)
                    VALUES ('$id', '$user_id', '$username', '$name', '$type', '$dataJson')");
        jsonSuccess(['message' => 'Laporan bulanan disimpan', 'id' => $id]);
        break;

    // â”€â”€ GET MONTHLY REPORTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'get_monthly_reports':
        $user_id = $db->real_escape_string($_GET['user_id'] ?? '');
        $where   = $user_id ? "WHERE user_id='$user_id' AND type='monthly_report'" : "WHERE type='monthly_report'";
        $result  = $db->query("SELECT * FROM approval_reports $where ORDER BY created_at DESC");
        $reports = [];
        while ($row = $result->fetch_assoc()) {
            $row['data'] = json_decode($row['data'], true);
            $reports[] = $row;
        }
        jsonSuccess(['reports' => $reports, 'data' => $reports]);
        break;

    // â”€â”€ RESET DATABASE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'reset_database':
        // Hanya admin yang boleh reset â€” hapus semua data kecuali akun admin
        $db->query("DELETE FROM attendance");
        $db->query("DELETE FROM permissions");
        $db->query("DELETE FROM approval_reports");
        $db->query("DELETE FROM sessions");
        // Hapus semua user kecuali Master Admin
        $db->query("DELETE FROM users WHERE role != 'admin' AND username != 'admin'");
        // Reset koordinat admin ke default SMKN 9 Malang
        $db->query("UPDATE users SET aktif=1 WHERE username='admin' OR role='admin'");
        // Broadcast SSE agar semua client sync
        @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'user_updated','ts'=>time()]));
        jsonSuccess(['message' => 'Database berhasil direset, semua user (kecuali admin) dihapus']);
        break;

    // â”€â”€ RESET ATTENDANCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'reset_attendance_data':
        $db->query("DELETE FROM attendance");
        $db->query("DELETE FROM permissions");
        jsonSuccess(['message' => 'Data presensi dan izin berhasil direset']);
        break;

    case 'reset_presensi_logs_only':
        $db->query("DELETE FROM attendance");
        jsonSuccess(['message' => 'Data presensi berhasil direset']);
        break;

    // ── RESET DATA SATU SISWA ─────────────────────────────────────────────
    case 'reset_student_data':
        $studentId   = $db->real_escape_string($input['student_id'] ?? '');
        $studentName = $db->real_escape_string($input['student_name'] ?? '');
        if (empty($studentId) && empty($studentName)) {
            jsonError('student_id atau student_name wajib diisi', 400);
        }

        // Resolve username dari DB dulu — collation sudah diset uniform di getDB()
        $studentUsername = '';
        if (!empty($studentId)) {
            $uRow = $db->query("SELECT username, name FROM users WHERE id = '$studentId' LIMIT 1");
            $uRow = $uRow ? $uRow->fetch_assoc() : null;
            if ($uRow) {
                $studentUsername = $db->real_escape_string($uRow['username'] ?? '');
                if (empty($studentName)) $studentName = $db->real_escape_string($uRow['name'] ?? '');
            }
        }
        if (empty($studentUsername) && !empty($studentName)) {
            $uRow = $db->query("SELECT username FROM users WHERE name = '$studentName' LIMIT 1");
            $uRow = $uRow ? $uRow->fetch_assoc() : null;
            if ($uRow) $studentUsername = $db->real_escape_string($uRow['username'] ?? '');
        }

        // Bangun WHERE pakai nilai literal
        $condParts = [];
        if (!empty($studentId))       $condParts[] = "user_id = '$studentId'";
        if (!empty($studentUsername)) $condParts[] = "username = '$studentUsername'";
        $whereBase = empty($condParts) ? "1=0" : "(" . implode(' OR ', $condParts) . ")";

        // attendance & permissions pakai kolom name
        $whereWithName = $whereBase . (!empty($studentName) ? " OR name = '$studentName'" : '');
        // journals pakai kolom student_name
        $whereJrn = $whereBase . (!empty($studentName) ? " OR student_name = '$studentName'" : '');

        $db->query("DELETE FROM attendance WHERE $whereWithName");
        $db->query("DELETE FROM permissions WHERE $whereWithName");
        // Hapus jurnal jika tabel ada
        $checkJournal = $db->query("SHOW TABLES LIKE 'journals'");
        if ($checkJournal && $checkJournal->num_rows > 0) {
            $db->query("DELETE FROM journals WHERE $whereJrn");
        }
        // Invalidasi cache presensi agar data langsung fresh
        @unlink(sys_get_temp_dir() . '/sigap_presensi_cache.json');
        @unlink(sys_get_temp_dir() . '/sigap_users_cache.json');
        @file_put_contents(sys_get_temp_dir() . '/sigap_attendance_updated.json', json_encode(['type'=>'attendance_updated','ts'=>time()]));
        @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'user_updated','ts'=>time()]));
        // Hapus cache users agar data_reset_at langsung tersedia ke client
        @unlink(sys_get_temp_dir() . '/sigap_users_cache.json');
        // Tandai kapan data direset agar device siswa tahu perlu hapus localStorage
        $db->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS data_reset_at DATETIME NULL");
        if (!empty($studentId)) {
            $db->query("UPDATE users SET data_reset_at=NOW() WHERE id='$studentId'");
        } elseif (!empty($studentUsername)) {
            $db->query("UPDATE users SET data_reset_at=NOW() WHERE username='$studentUsername'");
        }
        jsonSuccess(['message' => "Semua data (kehadiran, izin, alpa, jurnal) $studentName berhasil direset", 'reset_ts' => time()]);
        break;

    // â”€â”€ DEFAULT: tidak dikenal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â”€â”€ GENERATE PDF via PUPPETEER (pixel-perfect, sama persis dengan tampilan) â”€â”€
    case 'generate_pdf_base64':
        $html     = $input['html'] ?? '';
        $filename = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $input['filename'] ?? 'laporan') . '.pdf';
        if (empty($html)) { jsonError('Konten HTML kosong', 400); }

        // Tulis HTML ke file temp
        $tmpDir  = sys_get_temp_dir();
        $htmlId  = uniqid('sigap_', true);
        $htmlFile = $tmpDir . '/' . $htmlId . '.html';
        $pdfFile  = $tmpDir . '/' . $htmlId . '.pdf';

        file_put_contents($htmlFile, $html);

        // Jalankan pdf_generator.js via sudo node (agar Chromium bisa berjalan)
        $nodeScript = __DIR__ . '/pdf_generator.js';
        $cmd = 'sudo /usr/bin/node ' . escapeshellarg($nodeScript) . ' ' . escapeshellarg($htmlFile) . ' ' . escapeshellarg($pdfFile) . ' 2>&1';
        $output = shell_exec($cmd);

        // Cleanup HTML temp
        @unlink($htmlFile);

        if (!file_exists($pdfFile) || filesize($pdfFile) < 100) {
            jsonError('PDF generation gagal: ' . ($output ?? 'unknown error'), 500);
        }

        // Baca PDF, encode base64, kirim ke client
        $pdfContent = file_get_contents($pdfFile);
        @unlink($pdfFile);
        $base64 = base64_encode($pdfContent);
        jsonSuccess(['base64' => $base64, 'filename' => $filename, 'size' => strlen($pdfContent)]);
        break;

    // â”€â”€ GENERATE PDF (simpan ke file) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'generate_pdf':
        $html     = $input['html'] ?? '';
        $filename = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $input['filename'] ?? 'laporan') . '.pdf';
        if (empty($html)) { jsonError('Konten HTML kosong', 400); }

        $autoload = __DIR__ . '/vendor/autoload.php';
        if (!file_exists($autoload)) { jsonError('mPDF tidak terinstall di server', 500); }
        require_once $autoload;

        try {
            $mpdf = new \Mpdf\Mpdf([
                'mode'              => 'utf-8',
                'format'            => 'A4',
                'margin_top'        => 15,
                'margin_right'      => 10,
                'margin_bottom'     => 15,
                'margin_left'       => 10,
                'default_font'      => 'dejavusans',
                'default_font_size' => 10,
                'tempDir'           => sys_get_temp_dir(),
            ]);
            $mpdf->SetTitle(str_replace('_', ' ', $filename));
            $mpdf->SetAuthor('SIGAP PKL SMKN 9 Malang');
            $mpdf->shrink_tables_to_fit = 1;
            $mpdf->simpleTables         = true;
            $mpdf->useSubstitutions     = true;

            // Strip tag script dan link external sebelum render
            $cleanHtml = preg_replace('/<script\b[^>]*>[\s\S]*?<\/script>/i', '', $html);
            $cleanHtml = preg_replace('/<link[^>]*(fonts\.googleapis|cdnjs|unpkg|cloudflare)[^>]*>/i', '', $cleanHtml);

            $mpdf->WriteHTML($cleanHtml);

            // Simpan ke file temp
            $tmpDir = __DIR__ . '/tmp_reports';
            if (!is_dir($tmpDir)) { mkdir($tmpDir, 0755, true); }
            // Hapus file lama > 1 jam
            foreach (glob($tmpDir . '/*.pdf') as $f) {
                if (filemtime($f) < time() - 3600) { @unlink($f); }
            }
            $pdfPath = $tmpDir . '/' . $filename;
            $mpdf->Output($pdfPath, \Mpdf\Output\Destination::FILE);

            jsonSuccess([
                'url'      => '/tmp_reports/' . $filename,
                'filename' => $filename
            ]);
        } catch (\Exception $e) {
            jsonError('PDF generation failed: ' . $e->getMessage(), 500);
        }
        break;

    // â”€â”€ SAVE TEMP PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'save_temp_pdf':
        $filename = preg_replace('/[^a-zA-Z0-9_\-\.]/', '', $input['filename'] ?? ('laporan_' . time() . '.html'));
        $content  = $input['content'] ?? '';
        if (empty($content)) { jsonError('Konten kosong', 400); }
        $tmpDir = __DIR__ . '/tmp_reports';
        if (!is_dir($tmpDir)) { mkdir($tmpDir, 0755, true); }
        // Hapus file lama (lebih dari 1 jam)
        foreach (glob($tmpDir . '/*.html') as $f) {
            if (filemtime($f) < time() - 3600) { unlink($f); }
        }
        $filePath = $tmpDir . '/' . $filename;
        file_put_contents($filePath, $content);
        jsonSuccess(['url' => '/tmp_reports/' . $filename, 'filename' => $filename]);
        break;

    default:
        jsonError("Action '$action' tidak dikenal.", 404);
        break;
}

$db->close();
?>
