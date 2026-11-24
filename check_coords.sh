#!/bin/bash
echo "=== Siswa dengan koordinat 0 di DB ==="
mysql -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT name, username, pklLocation, 
       ROUND(latitude_pkl,4) as lat, 
       ROUND(longitude_pkl,4) as lng
FROM users 
WHERE role='siswa' 
  AND (latitude_pkl=0 OR longitude_pkl=0 OR latitude_pkl IS NULL)
ORDER BY name
LIMIT 20;" 2>&1

echo ""
echo "=== Total siswa dengan koordinat valid ==="
mysql -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT 
  COUNT(*) as total_siswa,
  SUM(CASE WHEN latitude_pkl != 0 AND longitude_pkl != 0 THEN 1 ELSE 0 END) as valid_coords,
  SUM(CASE WHEN latitude_pkl = 0 OR longitude_pkl = 0 THEN 1 ELSE 0 END) as no_coords
FROM users WHERE role='siswa';" 2>&1
