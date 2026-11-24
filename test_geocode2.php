<?php
$data = json_encode(['user_id'=>'test_only','pklLocation'=>'Ahass Kartika Sari Dinoyo']);
$ch = curl_init('http://localhost/api.php?action=server_geocode');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);
$r = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);
if ($err) { echo "CURL ERROR: $err\n"; } else { echo $r; }
