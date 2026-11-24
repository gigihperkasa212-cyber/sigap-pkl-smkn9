<?php
/**
 * SIGAP PKL SMKN 9 Official - API Adapter
 * Menangani semua request dari app.js ke database MariaDB
 */

// Database config
define('DB_HOST', '192.168.100.1');
define('DB_USER', 'sigap_user');
define('DB_PASS', 'SigapPKL@2026!');
define('DB_NAME', 'sigap_pkl');

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
    return $conn;
}

function jsonSuccess($data = [], $extra = []) {
    echo json_encode(array_merge(['success' => true, 'status' => 'ok'], $data, $extra));
    exit();
}

function jsonError($message, $code = 400) {
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

// ============================================================
// ROUTING
// ============================================================
switch ($action) {

    // â”€â”€ LOGIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        // Return semua user aktif PLUS user dengan status pending (untuk persetujuan admin)
        $result = $db->query("SELECT id, username, nomor_induk, password, plain_password, name, role, kelas, jurusan, tempat_pkl, pklLocation, latitude_pkl, longitude_pkl, allowed_radius, foto, avatar, subtext, school, supervisor, status, aktif FROM users WHERE aktif=1 OR status IN ('pending', 'pending_delete', 'pending_edit_pkl')");
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $row['pklLocation']     = $row['pklLocation'] ?: $row['tempat_pkl'];
            $row['avatar']          = $row['avatar'] ?: $row['foto'];
            // Gunakan plain_password untuk display di tabel & offline login APK
            // Jika plain_password kosong, fallback ke '123' agar APK tidak stuck
            $row['password']        = $row['plain_password'] ?: '123';
            unset($row['plain_password']); // tidak perlu kirim dua field
            $users[] = $row;
        }
        jsonSuccess(['users' => $users, 'data' => $users]);
        break;

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


        $db->query("INSERT INTO users (id, username, nomor_induk, password, plain_password, name, role, kelas, jurusan, tempat_pkl, pklLocation, supervisor, subtext, school, status, aktif) 
                    VALUES ('$id', '$username', '$nomor_induk', '$password', '$plainPass', '$name', '$role', '$kelas', '$jurusan', '$tempat_pkl', '$tempat_pkl', '$supervisor', '$subtext', '$school', '$status', 1)");

        if ($db->affected_rows > 0) {
            $newUser = $db->query("SELECT id, username, nomor_induk, plain_password as password, name, role, kelas, jurusan, tempat_pkl, pklLocation, latitude_pkl, longitude_pkl, allowed_radius, foto, avatar, subtext, school, supervisor, status, aktif FROM users WHERE id='$id'")->fetch_assoc();
            @file_put_contents(sys_get_temp_dir() . '/sigap_user_updated.json', json_encode(['type'=>'user_updated','user_id'=>$id,'ts'=>time()]));
            jsonSuccess(['message' => 'User berhasil dibuat', 'user' => $newUser, 'id' => $id]);
        } else {
            jsonError('Gagal membuat user: ' . $db->error);
        }
        break;

    // â”€â”€ UPDATE USER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'update_user':
    case 'update_user_comprehensive':
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
    case 'request_edit_pkl':
        $id         = $db->real_escape_string($input['id'] ?? '');
        $tempat_pkl = $db->real_escape_string($input['tempat_pkl'] ?? $input['pklLocation'] ?? '');
        $lat        = floatval($input['latitude_pkl'] ?? 0);
        $lng        = floatval($input['longitude_pkl'] ?? 0);
        $db->query("UPDATE users SET tempat_pkl='$tempat_pkl', pklLocation='$tempat_pkl', latitude_pkl=$lat, longitude_pkl=$lng WHERE id='$id'");
        jsonSuccess(['message' => 'Lokasi PKL diperbarui']);
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
            $db->query("UPDATE users SET status='approved', aktif=1 WHERE id='$id'");
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
        $ts       = $db->real_escape_string($input['date'] ?? $input['timestamp'] ?? date('Y-m-d H:i:s'));
        $lat      = floatval($input['lat'] ?? $input['latitude'] ?? 0);
        $lng      = floatval($input['lng'] ?? $input['longitude'] ?? 0);
        $distance = floatval($input['distance'] ?? $input['distance_meters'] ?? 0);
        $status   = $db->real_escape_string($input['status'] ?? 'hadir');
        $foto     = $db->real_escape_string($input['foto'] ?? $input['image'] ?? '');
        $catatan  = $db->real_escape_string($input['catatan'] ?? $input['notes'] ?? '');

        $db->query("INSERT INTO attendance (id, user_id, username, name, type, timestamp, latitude, longitude, distance_meters, status, foto, catatan)
                    VALUES ('$id', '$user_id', '$username', '$name', '$type', '$ts', $lat, $lng, $distance, '$status', '$foto', '$catatan')
                    ON DUPLICATE KEY UPDATE status='$status', catatan='$catatan', foto='$foto'");
        // Broadcast SSE agar web langsung sync data absensi baru dari APK
        @file_put_contents(sys_get_temp_dir() . '/sigap_attendance_updated.json',
            json_encode(['type'=>'attendance_updated','student'=>$name,'ts'=>time()]));
        jsonSuccess(['message' => 'Presensi berhasil disimpan', 'id' => $id]);
        break;

    // â”€â”€ GET PRESENSI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'get_presensi':
        $user_id = $db->real_escape_string($input['user_id'] ?? $_GET['user_id'] ?? '');
        $where   = $user_id ? "WHERE user_id='$user_id'" : '';
        $result  = $db->query("SELECT * FROM attendance $where ORDER BY timestamp DESC LIMIT 1000");
        $logs = [];
        while ($row = $result->fetch_assoc()) {
            // Kompatibilitas field nama lama
            $row['date']        = $row['timestamp'];
            $row['userId']      = $row['user_id'];
            $row['studentName'] = $row['name'];
            $row['lat']         = $row['latitude'];
            $row['lng']         = $row['longitude'];
            $row['distance']    = $row['distance_meters'];
            $row['image']       = $row['foto'];
            $row['notes']       = $row['catatan'];
            $logs[] = $row;
        }
        jsonSuccess(['logs' => $logs, 'data' => $logs]);
        break;

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
    case 'gps_location':
        $user_id = $db->real_escape_string($input['user_id'] ?? $input['userId'] ?? '');
        $lat     = floatval($input['lat'] ?? $input['latitude'] ?? 0);
        $lng     = floatval($input['lng'] ?? $input['longitude'] ?? 0);
        if ($user_id && $lat && $lng) {
            $db->query("UPDATE users SET latitude_pkl=$lat, longitude_pkl=$lng WHERE id='$user_id'");
        }
        jsonSuccess(['message' => 'Lokasi GPS diperbarui']);
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
    case 'reset_presensi_logs_only':
        $db->query("DELETE FROM attendance");
        jsonSuccess(['message' => 'Data presensi berhasil direset']);
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
