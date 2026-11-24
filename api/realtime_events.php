<?php
/**
 * SIGAP PKL SMKN 9 Official - Server-Sent Events (SSE)
 * Push data realtime ke browser tanpa polling
 */

// Database config
define('DB_HOST', '192.168.100.1');
define('DB_USER', 'sigap_user');
define('DB_PASS', 'SigapPKL@2026!');
define('DB_NAME', 'sigap_pkl');

// SSE Headers — koneksi tetap terbuka
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Nonaktifkan buffering Nginx
header('Access-Control-Allow-Origin: *');

// Matikan output buffering agar data langsung terkirim
if (ob_get_level()) ob_end_clean();
set_time_limit(0);
ignore_user_abort(false);

function getDB() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) return null;
    $conn->set_charset('utf8mb4');
    return $conn;
}

function sendEvent($event, $data) {
    echo "event: {$event}\n";
    echo "data: " . json_encode($data) . "\n\n";
    flush();
}

function sendComment($msg) {
    echo ": {$msg}\n\n";
    flush();
}

// Kirim event connected pertama
sendEvent('connected', ['status' => 'ok', 'message' => 'SIGAP PKL SSE Connected', 'time' => date('Y-m-d H:i:s')]);

$db = getDB();
if (!$db) {
    sendEvent('error', ['message' => 'Database connection failed']);
    exit();
}

// Ambil timestamp absensi terakhir saat koneksi dibuka
$lastAttendanceId = '';
$lastGpsUpdate    = time();
$lastPingTime     = time();
$loopCount        = 0;

$row = $db->query("SELECT id FROM attendance ORDER BY created_at DESC LIMIT 1")->fetch_assoc();
if ($row) $lastAttendanceId = $row['id'];

// Loop utama SSE
while (true) {
    // Cek apakah client masih terhubung
    if (connection_aborted()) {
        $db->close();
        exit();
    }

    $now = time();
    $loopCount++;

    // ── Cek absensi baru setiap 3 detik ────────────────────
    $result = $db->query("SELECT a.*, u.pklLocation, u.tempat_pkl 
                          FROM attendance a 
                          LEFT JOIN users u ON a.user_id = u.id
                          WHERE a.created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
                          ORDER BY a.created_at DESC LIMIT 5");

    if ($result && $result->num_rows > 0) {
        while ($att = $result->fetch_assoc()) {
            if ($att['id'] !== $lastAttendanceId) {
                $lastAttendanceId = $att['id'];

                // Format data kompatibel dengan app.js
                $eventData = [
                    'id'          => $att['id'],
                    'studentName' => $att['name'],
                    'username'    => $att['username'],
                    'userId'      => $att['user_id'],
                    'type'        => $att['type'],
                    'status'      => $att['status'],
                    'date'        => $att['timestamp'],
                    'timestamp'   => $att['timestamp'],
                    'lat'         => floatval($att['latitude']),
                    'lng'         => floatval($att['longitude']),
                    'distance'    => floatval($att['distance_meters']),
                    'pklLocation' => $att['pklLocation'] ?: $att['tempat_pkl'],
                    'foto'        => $att['foto'],
                    'catatan'     => $att['catatan'],
                ];
                sendEvent('new_attendance', $eventData);
            }
        }
    }

    // ── Kirim update GPS semua siswa aktif setiap 15 detik ─
    if ($now - $lastGpsUpdate >= 15) {
        $lastGpsUpdate = $now;

        $gpsResult = $db->query("SELECT id, username, name, role, latitude_pkl, longitude_pkl, tempat_pkl, pklLocation 
                                  FROM users 
                                  WHERE role='siswa' AND aktif=1 
                                  AND latitude_pkl != 0 AND longitude_pkl != 0");

        if ($gpsResult && $gpsResult->num_rows > 0) {
            $locations = [];
            while ($u = $gpsResult->fetch_assoc()) {
                $locations[] = [
                    'user_id'     => $u['id'],
                    'username'    => $u['username'],
                    'studentName' => $u['name'],
                    'latitude'    => floatval($u['latitude_pkl']),
                    'longitude'   => floatval($u['longitude_pkl']),
                    'pklLocation' => $u['pklLocation'] ?: $u['tempat_pkl'],
                ];
            }
            sendEvent('gps_update', ['locations' => $locations]);
        }
    }

    // ── Heartbeat ping setiap 25 detik agar koneksi tidak timeout ─
    if ($now - $lastPingTime >= 25) {
        $lastPingTime = $now;
        sendComment('ping ' . date('H:i:s'));
    }

    // Tunggu 3 detik sebelum loop berikutnya
    sleep(3);

    // Reconnect DB setiap 100 loop untuk hindari timeout
    if ($loopCount % 100 === 0) {
        $db->close();
        $db = getDB();
        if (!$db) {
            sendEvent('error', ['message' => 'Database reconnect failed']);
            exit();
        }
    }
}
?>
