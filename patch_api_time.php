<?php
// patch_api_time.php — tambahkan endpoint get_server_time ke api.php
$apiFile = '/var/www/html/SIGAP-SMKN9-Official/api.php';
$content = file_get_contents($apiFile);

$newCase = "    case 'get_server_time':
        // RULE 4: Kembalikan timestamp server yang akurat
        // Client menggunakan ini untuk sinkronisasi waktu absen
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('Pragma: no-cache');
        jsonSuccess([
            'server_ts'      => time(),             // Unix timestamp detik
            'server_datetime'=> date('Y-m-d H:i:s'), // Human readable WIB
            'timezone'       => 'Asia/Jakarta',
            'utc_offset'     => '+07:00'
        ]);
        break;

";

$insertBefore = "    case 'server_geocode':";
if (strpos($content, "case 'get_server_time':") !== false) {
    echo "SKIP: get_server_time sudah ada\n";
} elseif (strpos($content, $insertBefore) === false) {
    // Fallback: sisipkan sebelum case 'update_pkl_location'
    $insertBefore = "    case 'update_pkl_location':";
    if (strpos($content, $insertBefore) === false) {
        echo "ERROR: insert point not found\n";
        exit(1);
    }
}

if (strpos($content, "case 'get_server_time':") === false) {
    $content = str_replace($insertBefore, $newCase . $insertBefore, $content);
    file_put_contents($apiFile, $content);
    echo "OK: get_server_time ditambahkan\n";
}
