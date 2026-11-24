<?php
// Fix: restore pending users ke aktif=1 dan deploy api.php baru
define('DB_HOST', '192.168.100.1');
define('DB_USER', 'sigap_user');
define('DB_PASS', 'SigapPKL@2026!');
define('DB_NAME', 'sigap_pkl');

$db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($db->connect_error) {
    die(json_encode(['error' => $db->connect_error]));
}
$db->set_charset('utf8mb4');

// Restore pending users ke aktif=1
$db->query("UPDATE users SET aktif=1 WHERE status IN ('pending', 'pending_delete', 'pending_edit_pkl') AND aktif=0");
$updated = $db->affected_rows;

// Get all users dengan status
$result = $db->query("SELECT username, name, role, status, aktif FROM users ORDER BY role, username");
$users = [];
while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}

echo json_encode([
    'success' => true,
    'rows_updated' => $updated,
    'users' => $users
]);
